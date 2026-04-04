# AnnaDaan RAG Knowledge Base — Index

This folder contains the complete documentation for the AnnaDaan food donation platform, structured for use as a RAG (Retrieval-Augmented Generation) knowledge base.

## Documents

| File | Contents |
|---|---|
| `01_platform_overview.md` | What AnnaDaan is, mission, target users, technology stack, donation lifecycle states |
| `02_user_roles_and_authentication.md` | Role types, registration, login, JWT auth, notifications system |
| `03_donation_flow.md` | Complete end-to-end donation journey: submit → AI match → accept → transit → deliver |
| `04_ai_agent_pipeline.md` | All 4 AI agents: InputAgent, MatchingAgent, NotificationAgent, RoutingAgent + Batch Dispatch |
| `05_api_reference.md` | Every API endpoint with method, path, auth requirements, and response shapes |
| `06_frontend_pages.md` | All pages and routes per role, components, design system, map components |
| `07_database_schema.md` | All MongoDB collections with full field definitions, types, and indexes |
| `08_faq.md` | 40+ Q&A pairs covering general, donor, NGO, admin, and technical questions |

## Recommended RAG Chunking Strategy

For best retrieval quality, chunk these documents as follows:

1. **Split at `---` horizontal rules** — Each section is a natural semantic unit
2. **Keep code blocks intact** — JSON schemas and API examples should not be split
3. **Add document title as metadata** — Include the filename and H1 as chunk metadata for source attribution
4. **Recommended chunk size**: 400–800 tokens per chunk with 50-token overlap

## Key Entities for RAG

When users ask about these topics, use these documents:

| Topic | Primary Document |
|---|---|
| "How do I donate food?" | `03_donation_flow.md` + `08_faq.md` |
| "How does AI matching work?" | `04_ai_agent_pipeline.md` |
| "What is urgency score?" | `04_ai_agent_pipeline.md` + `08_faq.md` |
| "How to track a delivery?" | `03_donation_flow.md` + `06_frontend_pages.md` |
| "What APIs are available?" | `05_api_reference.md` |
| "Database structure?" | `07_database_schema.md` |
| "User registration?" | `02_user_roles_and_authentication.md` |
| "Admin features?" | `06_frontend_pages.md` + `08_faq.md` |
| "FSSAI compliance?" | `01_platform_overview.md` + `04_ai_agent_pipeline.md` |
| "NGO workflow?" | `03_donation_flow.md` + `06_frontend_pages.md` |
