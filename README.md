# 🛡️ Incident Mind AI — SRE Copilot & Incident Management System

Incident Mind AI is a state-of-the-art SRE (Site Reliability Engineering) intelligence platform designed to accelerate incident diagnostics and resolutions. By combining conversational AI assistance, automated scanner diagnostics, and local vector similarity memory, it helps engineering teams learn from past outages, find matching root causes, and execute repairs in seconds.

---

## 🚀 Key SRE Features

1. **AI Incident Analysis**: Automatically parses raw alert messages and symptoms to predict severity (Low, Medium, High, Critical), identify affected services, outline probable root causes, and draft SRE diagnostics.
2. **Semantic Similar Incident Memory**: Utilizes local vector memory database (powered by ChromaDB and Sentence-Transformers) to retrieve past incidents with similar symptoms, displaying resolutions side-by-side with cosine similarity matching scores (~0.8+).
3. **Conversational SRE Copilot**: A rich interactive chatbot that guides engineers through self-help diagnostic paths (like SSO auth lockouts or DNS failures) and processes natural language outage reports.
4. **Interactive Scan & Auto-Fix Console**: Runs automated diagnostics on website URLs to check reachability and lets engineers execute simulated multi-step bash repair runbooks directly from the chat.
5. **Incident Feedback & Self-Learning**: Engineers can vote `Yes`/`No` on chatbot troubleshooting advice. If successful, the fix is instantly saved in ChromaDB vector memory for future recall. If not, it automatically drafts a new incident ticket.
6. **Causal Knowledge Graph**: Generates a dynamic SVG relationships graph connecting system areas to recurring root causes.
7. **Postmortem PDF Generator**: Auto-drafts SRE Incident Postmortem narratives in JSON format and compiles downloadable, print-ready PDF reports.

---

## 🎨 Technology Stack

* **Backend**: FastAPI (Python 3.10+), SQLAlchemy (PostgreSQL / SQLite fallback).
* **AI Engine**: Groq API (Llama 3.3 70B), Gemini Pro, or OpenAI GPT-4.
* **Vector Database**: ChromaDB + HuggingFace `all-MiniLM-L6-v2` Sentence-Transformers embeddings.
* **Frontend**: React 18, Tailwind CSS, Vite, Recharts, and React Icons.

---

## 🔑 Configuration (.env)

Configure your `.env` file in the workspace root or `backend/.env` with your API keys:

```bash
# ── Active AI Provider ────────────────────────────────────────────────────────
AI_PROVIDER=groq # Options: gemini, openai, groq

# ── API Keys ──────────────────────────────────────────────────────────────────
GROQ_API_KEY=your_groq_api_key
# GEMINI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=your_openai_api_key

# ── Database & Cache Config ───────────────────────────────────────────────────
POSTGRES_USER=incident_user
POSTGRES_PASSWORD=incident_pass
POSTGRES_DB=incidents
DATABASE_URL=postgresql://incident_user:incident_pass@localhost:5432/incidents
CHROMA_HOST=localhost
CHROMA_PORT=8001
CHROMA_COLLECTION=incidents
```

*Note: If PostgreSQL or ChromaDB are not running locally, the system automatically falls back to a local SQLite database (`incidents.db`) and keyword-hashing in-memory vector store.*

---

## 🐳 Running with Docker Compose (Recommended)

To spin up the entire system including PostgreSQL, ChromaDB, Frontend, and Backend:

```bash
# In the project root folder
docker compose up --build
```
* **Frontend**: `http://localhost:3000`
* **Backend API Docs**: `http://localhost:8000/docs`

---

## 💻 Local Manual Setup

### 📦 Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations & start backend server:
   ```bash
   alembic upgrade head
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

### 📦 Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```
* Access the app at `http://localhost:3000`.

---

## 🧪 Testing and Verification

To verify that the entire SRE backend pipeline, LLM connection, and diagnostic routes are 100% operational, run:

```bash
cd backend
.\venv\Scripts\python verify_all.py
```
This runs a simulated incident diagnostic suite, checking incident creation, similarity querying, PDF compilation, and chatbot agent triggers.
