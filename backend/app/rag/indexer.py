"""
RAG Indexer — loads AnnaDaan docs, chunks them, embeds via Gemini, stores in ChromaDB.
Run once (or whenever docs change) to build/refresh the vector index.
"""
import os
import re
import time
import chromadb
from chromadb.config import Settings
import google.generativeai as genai

# ── Config ────────────────────────────────────────────────────────────────────
DOCS_DIR   = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'docs', 'rag')
CHROMA_DIR = os.path.join(os.path.dirname(__file__), 'chroma_store')
COLLECTION = 'annadaan_knowledge'
# NOTE: genai.configure() is called INSIDE functions so the API key is
# always read AFTER python-dotenv has loaded the .env file.


def _embed(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts using Gemini text-embedding-004."""
    result = genai.embed_content(
        model='models/text-embedding-004',
        content=texts,
        task_type='retrieval_document'
    )
    return result['embedding'] if isinstance(texts, str) else result['embedding']


def _chunk_doc(text: str, source: str) -> list[dict]:
    """Split document at --- separators; keep heading context."""
    # Split on horizontal rules
    sections = re.split(r'\n---+\n', text)
    chunks = []
    for i, section in enumerate(sections):
        section = section.strip()
        if len(section) < 40:
            continue
        # Extract heading for context
        heading_match = re.search(r'^#{1,3}\s+(.+)$', section, re.MULTILINE)
        heading = heading_match.group(1) if heading_match else f'Section {i+1}'
        chunks.append({
            'text': section,
            'source': source,
            'heading': heading,
            'chunk_id': f'{source.replace(".md", "")}_{i}'
        })
    # If no --- splits, treat whole file as one chunk
    if not chunks:
        heading_match = re.search(r'^#{1,3}\s+(.+)$', text, re.MULTILINE)
        heading = heading_match.group(1) if heading_match else source
        chunks.append({
            'text': text.strip(),
            'source': source,
            'heading': heading,
            'chunk_id': f'{source.replace(".md", "")}_0'
        })
    return chunks


def build_index(force_rebuild: bool = False) -> chromadb.Collection:
    """Load docs, chunk, embed, and store in ChromaDB. Returns the collection."""
    # Configure Gemini here (after dotenv has loaded)
    genai.configure(api_key=os.getenv('GOOGLE_GEMINI_API_KEY', ''))

    client = chromadb.PersistentClient(
        path=CHROMA_DIR,
        settings=Settings(anonymized_telemetry=False)
    )

    # Check if already built
    existing = [c.name for c in client.list_collections()]
    if COLLECTION in existing and not force_rebuild:
        col = client.get_collection(COLLECTION)
        if col.count() > 0:
            print(f'[RAG] Using existing index with {col.count()} chunks.')
            return col
        client.delete_collection(COLLECTION)

    col = client.get_or_create_collection(
        name=COLLECTION,
        metadata={'hnsw:space': 'cosine'}
    )

    # Load all markdown docs
    docs_path = os.path.abspath(DOCS_DIR)
    if not os.path.exists(docs_path):
        raise FileNotFoundError(f'Docs directory not found: {docs_path}')

    all_chunks = []
    for filename in sorted(os.listdir(docs_path)):
        if not filename.endswith('.md') or filename == 'README.md':
            continue
        filepath = os.path.join(docs_path, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        chunks = _chunk_doc(content, filename)
        all_chunks.extend(chunks)
        print(f'[RAG] Loaded {filename} → {len(chunks)} chunks')

    if not all_chunks:
        raise ValueError('No document chunks found. Check docs/rag/ directory.')

    # Embed one chunk at a time with rate-limit protection
    import time

    def _embed_one(text: str, retries: int = 5) -> list[float]:
        delay = 25  # start with 25s backoff on 429
        for attempt in range(retries):
            try:
                result = genai.embed_content(
                    model='models/gemini-embedding-001',
                    content=text,
                    task_type='retrieval_document'
                )
                return result['embedding']
            except Exception as e:
                if '429' in str(e) and attempt < retries - 1:
                    print(f'[RAG] Rate limited. Waiting {delay}s before retry {attempt+1}…')
                    time.sleep(delay)
                    delay = min(delay * 2, 120)
                else:
                    raise

    all_ids, all_texts, all_metas, all_embeddings = [], [], [], []
    for idx, chunk in enumerate(all_chunks):
        emb = _embed_one(chunk['text'])
        all_ids.append(chunk['chunk_id'])
        all_texts.append(chunk['text'])
        all_metas.append({'source': chunk['source'], 'heading': chunk['heading']})
        all_embeddings.append(emb)
        if (idx + 1) % 10 == 0:
            print(f'[RAG] Embedded {idx+1}/{len(all_chunks)} chunks…')
        time.sleep(0.7)  # ~85 req/min — safely under 100/min free tier

    col.add(
        ids=all_ids,
        documents=all_texts,
        metadatas=all_metas,
        embeddings=all_embeddings
    )

    print(f'[RAG] Index built: {col.count()} chunks stored in ChromaDB.')
    return col


def get_collection() -> chromadb.Collection:
    """Get the existing ChromaDB collection (build if missing)."""
    client = chromadb.PersistentClient(
        path=CHROMA_DIR,
        settings=Settings(anonymized_telemetry=False)
    )
    existing = [c.name for c in client.list_collections()]
    if COLLECTION not in existing:
        return build_index()
    col = client.get_collection(COLLECTION)
    if col.count() == 0:
        return build_index(force_rebuild=True)
    return col
