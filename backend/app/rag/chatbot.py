"""
RAG Chatbot — retrieves relevant chunks and generates answers with Gemini.
All Gemini API calls are lazy (inside functions) to ensure dotenv has
loaded GOOGLE_GEMINI_API_KEY before any genai.configure() call.
"""
import os
import time
import google.generativeai as genai
from .indexer import get_collection

# Model preference order — first working free-tier model is used
_GENERATION_MODELS = [
    'gemini-flash-lite-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
]

SYSTEM_PROMPT = """You are AnnaDaan Assistant, a helpful AI chatbot for the AnnaDaan food donation platform.
AnnaDaan connects food donors (restaurants, hotels, households) with NGOs across India, governed by FSSAI.

Your role:
- Answer questions about how the platform works
- Help donors understand how to submit donations and track them
- Help NGOs understand how to accept donations and raise food requests
- Help admins understand platform features and controls
- Explain the AI agent pipeline (urgency scoring, Gemini matching, routing)
- Answer technical questions about APIs, data models, and system behavior

Rules:
- Only answer based on the provided context from the knowledge base
- If the answer is not in the context, say so honestly and suggest where to find help
- Be concise but complete (2-5 sentences for simple questions, more for complex ones)
- Use bullet points for lists; keep language friendly and professional
- Always refer to the platform as "AnnaDaan"
- Never make up API endpoints, field names, or feature descriptions
"""


def _configure():
    genai.configure(api_key=os.getenv('GOOGLE_GEMINI_API_KEY', ''))


def _generate(prompt: str, retries: int = 3) -> str:
    """Try each model in preference order; retry on 429 with backoff."""
    _configure()
    last_err = None
    for model_name in _GENERATION_MODELS:
        delay = 40
        for attempt in range(retries):
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                err = str(e)
                if '429' in err:
                    if attempt < retries - 1:
                        print(f'[RAG] {model_name} rate limited. Retrying in {delay}s...')
                        time.sleep(delay)
                        delay = min(delay * 2, 120)
                    else:
                        last_err = e
                        break   # try next model
                elif '404' in err or 'not found' in err.lower():
                    last_err = e
                    break       # model not available, try next
                else:
                    raise       # unexpected error, propagate
    raise Exception(f'All models exhausted. Last error: {last_err}')


def _embed_query(query: str) -> list[float]:
    _configure()
    result = genai.embed_content(
        model='models/gemini-embedding-001',
        content=query,
        task_type='retrieval_query'
    )
    return result['embedding']


def ask(question: str, top_k: int = 5, chat_history: list = None) -> dict:
    """
    RAG query: embed question -> retrieve top_k chunks -> generate answer.
    Returns { answer, sources, retrieved_chunks }
    """
    # Get vector store
    try:
        col = get_collection()
    except Exception as e:
        return {
            'answer': f'The knowledge base is still loading. Please try again in a moment.',
            'sources': [],
            'retrieved_chunks': 0
        }

    # Embed the question
    try:
        q_emb = _embed_query(question)
    except Exception as e:
        return {
            'answer': f'Sorry, I could not process your question right now. ({str(e)[:80]})',
            'sources': [],
            'retrieved_chunks': 0
        }

    # Retrieve top-k chunks
    results = col.query(
        query_embeddings=[q_emb],
        n_results=min(top_k, col.count()),
        include=['documents', 'metadatas', 'distances']
    )
    docs      = results['documents'][0]
    metas     = results['metadatas'][0]
    distances = results['distances'][0]

    # Build context (cosine distance < 1.5 = relevant)
    context_parts, sources = [], []
    for doc, meta, dist in zip(docs, metas, distances):
        if dist > 1.5:
            continue
        context_parts.append(f"[Source: {meta['source']} - {meta['heading']}]\n{doc}")
        sources.append({'source': meta['source'], 'heading': meta['heading']})

    context = '\n\n---\n\n'.join(context_parts) if context_parts else 'No relevant context found.'

    # Build history string (last 3 exchanges)
    history_text = ''
    if chat_history:
        for msg in chat_history[-6:]:
            role = 'User' if msg['role'] == 'user' else 'Assistant'
            history_text += f'{role}: {msg["content"]}\n'

    prompt = f"""{SYSTEM_PROMPT}

CONVERSATION HISTORY:
{history_text or "(No previous messages)"}

KNOWLEDGE BASE CONTEXT:
{context}

USER QUESTION: {question}

ANSWER:"""

    try:
        answer = _generate(prompt)
    except Exception as e:
        answer = (
            'I am temporarily unable to generate a response due to API rate limits. '
            'Please wait 1 minute and try again.'
        )

    return {
        'answer': answer,
        'sources': sources,
        'retrieved_chunks': len(context_parts)
    }
