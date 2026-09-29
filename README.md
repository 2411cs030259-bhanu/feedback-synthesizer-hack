# User Feedback Synthesizer — AI Agent with Persistent Memory

> An intelligent, autonomous AI feedback agent that learns and remembers customer feedback over time using **Hindsight** memory and **Groq** reasoning, uncovering recurring complaints and cross-channel friction instead of treating every feedback item as an isolated event.

---

## 1. What the Project Does

Traditional customer feedback systems operate in silos:
- When a user submits a ticket saying *"I still don't understand how to get started"*, support agents treat it as a routine one-off inquiry.
- Months earlier, a prospect on a sales demo complained: *"Our team struggled during initial setup"*.
- In between, negative product reviews noted: *"Onboarding lacks clear walkthroughs"*.

Because organizations lack unified temporal memory across customer channels, **recurring product issues continue for months without detection**.

**User Feedback Synthesizer** solves this by introducing an **AI Agent with Persistent Memory**. It receives feedback across Support, Product Reviews, Sales Calls, and User Interviews, retains structured experiences into a persistent memory bank (via **Hindsight**), semantically recalls historical experiences across time, detects recurring underlying problems, and synthesizes evidence-based insights with exact customer citations.

---

## 2. Why an AI Agent is Used

A simple chatbot merely answers questions or generates text on demand:
$$\text{User Prompt} \longrightarrow \text{LLM} \longrightarrow \text{Response}$$

An **autonomous agent**, by contrast, operates through an explicit decision and tool-use loop:
$$\text{Observe} \longrightarrow \text{Understand} \longrightarrow \text{Decide} \longrightarrow \text{Recall} \longrightarrow \text{Reason} \longrightarrow \text{Detect} \longrightarrow \text{Retain} \longrightarrow \text{Insight}$$

The agent:
1. Determines whether historical context matters before acting.
2. Chooses when and how to query the memory bank.
3. Weighs multi-channel evidence across dates (January through September).
4. Maintains an audit trail (`agent_runs`) of every decision.

---

## 3. Why Memory is Necessary

LLM context windows are stateless, expensive, and limited. Feeding an entire company's historical tickets into every prompt is impractical, slow, and does not build durable beliefs.

**Persistent memory enables:**
- **Cross-Channel Connection**: Linking a September support ticket to a June sales call and a January review.
- **Temporal Progression**: Knowing when a problem first appeared, when it recurred, and whether it has worsened.
- **Semantic Continuity**: Connecting *"setup was difficult"* with *"struggling to start"* without requiring identical wording.

---

## 4. What Hindsight Does (Persistent Memory Layer)

**Hindsight** is the persistent memory system for the agent:
- **RETAIN**: When feedback arrives, Hindsight extracts structured facts, temporal metadata, entities, and tags, storing them in a dedicated memory bank (`feedback-synthesizer`).
- **RECALL**: Hindsight performs multi-strategy retrieval (semantic similarity, keyword BM25, entity matching, and temporal traversal) to retrieve ranked historical experiences.
- **Bank Isolation**: The memory bank keeps customer feedback organized and separate from transient data.

---

## 5. What Groq Does (Reasoning & Synthesis Engine)

**Groq** (`llama-3.3-70b-versatile`) acts as the reasoning engine:
- Extracts structured sentiment, sentiment scores ($-1.0$ to $1.0$), topics, subcategories, problems, keywords, and urgency.
- Evaluates recalled memories against incoming feedback to determine if they represent the same underlying friction.
- Formulates answers to natural-language investigation questions, strictly citing dates, sources, and verbatim customer quotes.

> **Note**: Groq is the *reasoning* engine, **not** the memory. Hindsight is the *memory* system.

---

## 6. Architecture

```text
                           NEW FEEDBACK (Support, Sales, Reviews, CSV, Transcript)
                                              |
                                              v
                                       AI FEEDBACK AGENT
                                              |
                     ┌────────────────────────┴────────────────────────┐
                     v                                                 v
             GROQ AI ENGINE                                  HINDSIGHT MEMORY BANK
            (Reasoning / LLM)                                (Persistent Experiences)
                     |                                                 |
         [Extract Problem & Topic]                               [Semantic RECALL]
                     |                                                 |
                     └────────────────────────┬────────────────────────┘
                                              |
                                     HISTORICAL EXPERIENCES
                                              |
                                              v
                                    AGENT REASONING LOOP
                                              |
                                              v
                                  RECURRING COMPLAINT CLUSTER
                             (Timeline, Channels, First/Last Seen)
                                              |
                                              v
                                       HINDSIGHT RETAIN
                                  (Persist Updated Experience)
                                              |
                                              v
                                     EVIDENCE-BASED INSIGHT
```

---

## 7. RETAIN Workflow

When a feedback item is ingested:
1. Normalizes the feedback into the standard structure (`id`, `source`, `customer`, `feedback_text`, `created_at`, `sentiment`, `topic`, `problem`).
2. Constructs a rich semantic memory payload including original text, problem statement, and metadata tags (`topic`, `source`, `sentiment`).
3. Calls Hindsight API: `POST /banks/{bank_id}/retain`.
4. Hindsight indexes the structured memory and returns the retained document ID.
5. In Local Fallback mode, the experience is persisted to SQLite with multi-strategy tokenization.

---

## 8. RECALL Workflow

When new feedback or an investigation question arrives:
1. The agent extracts the semantic core of the problem (e.g. `onboarding getting started setup confusion`).
2. Calls Hindsight API: `POST /banks/{bank_id}/recall` with topic and source tags.
3. Retrieves the top relevant experiences ranked by semantic relevance and temporal alignment.
4. Returns structured memories with metadata, sources, dates, and similarity scores.

---

## 9. Recurring Complaint Detection

The agent compares the recalled memories against the incoming complaint:
- **Same Underlying Friction**: Determines if issues represent the same root problem (e.g. initial configuration ambiguity) even if wording differs.
- **Dynamic Calculation**: Calculates real statistics directly from the dataset:
  - `cluster_id`
  - `title` (e.g. *Onboarding & Initial Setup Confusion*)
  - `occurrence_count` (e.g. 7 recorded items)
  - `source_count` & `sources` (e.g. Support, Product Review, Sales, Interview)
  - `first_seen` (e.g. January 12, 2026)
  - `last_seen` (e.g. September 22, 2026)
  - `sentiment_trend` (e.g. *Repeated cross-channel feedback*)
- **No Hardcoded Counts**: All metrics are calculated dynamically from actual stored feedback records.

---

## 10. Step-by-Step: Push to GitHub, Run on Localhost & Host on Vercel

### Part A — Push the Project to GitHub

1. **Download & Extract the Project ZIP**
   Click the **"Download ZIP"** button in the top navigation bar (`user-feedback-synthesizer.zip`) and unzip it on your computer:
   ```bash
   unzip user-feedback-synthesizer.zip
   cd user-feedback-synthesizer
   ```

2. **Create a New Empty Repository on GitHub**
   - Go to [https://github.com/new](https://github.com/new)
   - Repository name: `user-feedback-synthesizer`
   - Leave *"Initialize with README"* **unchecked**
   - Click **Create repository** and copy the repository URL (e.g., `https://github.com/<your-username>/user-feedback-synthesizer.git`).

3. **Push Using One Command (or Manual Git Commands)**
   - **Windows (Command Prompt / PowerShell):**
     ```bat
     push-to-github.bat https://github.com/<your-username>/user-feedback-synthesizer.git
     ```
   - **macOS / Linux:**
     ```bash
     chmod +x push-to-github.sh
     ./push-to-github.sh https://github.com/<your-username>/user-feedback-synthesizer.git
     ```
   - **Or run standard Git commands manually:**
     ```bash
     git init
     git add .
     git commit -m "Initial commit: User Feedback Synthesizer"
     git branch -M main
     git remote add origin https://github.com/<your-username>/user-feedback-synthesizer.git
     git push -u origin main
     ```
   *(Note: `.gitignore` is pre-configured so `.env` secrets, `node_modules/`, `.venv/`, and local SQLite `.db` files are never uploaded to GitHub.)*

---

### Part B — Run on Localhost

You can start the entire stack on your local machine in two ways:

#### Option 1: One-Click Localhost Launcher
- **Windows (Command Prompt):** Double-click `run-local.bat` or run:
  ```bat
  run-local.bat
  ```
- **Windows (PowerShell):**
  ```powershell
  .\run-local.ps1
  ```
- **macOS / Linux:**
  ```bash
  chmod +x run-local.sh
  ./run-local.sh
  ```

#### Option 2: Separated Frontend & Python FastAPI Backend (2 Terminals in VS Code / Antigravity)
- **Terminal 1 — Python FastAPI Backend (Port 8000):**
  ```bash
  python -m venv .venv
  # Activate venv:
  # Windows: .venv\Scripts\activate
  # macOS/Linux: source .venv/bin/activate
  pip install -r backend/requirements.txt
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Terminal 2 — React + Vite Frontend (Port 3000):**
  ```bash
  npm install
  npx vite --port 3000
  ```
- Open **Frontend UI**: `http://localhost:3000`
- Open **FastAPI Swagger Docs**: `http://localhost:8000/docs`

---

### Part C — Host on Vercel (After Pushing to GitHub)

#### Mode 1: Direct Full-Stack Deployment on Vercel (Recommended Quick Deploy)
The repository includes `vercel.json` and `api/index.ts` pre-configured for zero-config Vercel deployment:
1. Go to [https://vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Click **Import** next to your `user-feedback-synthesizer` GitHub repository.
3. Keep the default settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `vite build`
   - **Output Directory:** `dist`
4. Open **Environment Variables** and add (optional — local fallback works automatically if left blank):
   - `GROQ_API_KEY` = `your_groq_api_key`
   - `GROQ_MODEL` = `llama-3.3-70b-versatile`
   - `HINDSIGHT_URL` = `https://your-hindsight-instance-url`
   - `HINDSIGHT_API_KEY` = `your_hindsight_api_key`
   - `HINDSIGHT_BANK` = `feedback-synthesizer`
5. Click **Deploy**. Your app and `/api/*` endpoints will be live on your `.vercel.app` URL.

#### Mode 2: Separated Frontend (Vercel) + Python FastAPI Backend (Render / Railway / Fly.io)
If you want to host the Python FastAPI backend separately in production:
1. **Deploy Python FastAPI Backend** (on Render, Railway, or Fly.io) from the same GitHub repo:
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Add environment variables: `GROQ_API_KEY`, `HINDSIGHT_URL`, `HINDSIGHT_API_KEY`, `HINDSIGHT_BANK`.
   - Copy your live FastAPI URL (e.g., `https://feedback-synthesizer-api.onrender.com`).
2. **Deploy React + Vite Frontend on Vercel**:
   - Import the GitHub repository in Vercel.
   - Add Environment Variable in Vercel:
     - `VITE_API_BASE_URL` = `https://feedback-synthesizer-api.onrender.com`
   - Click **Deploy**. The React frontend on Vercel will communicate directly with your Python FastAPI backend over REST.

---

## 11. Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

`.env` configuration options:

```env
# Groq AI Configuration (Reasoning Engine)
GROQ_API_KEY="your-groq-api-key-here"
GROQ_MODEL="llama-3.3-70b-versatile"

# Hindsight Configuration (Persistent Memory Bank)
HINDSIGHT_URL="http://localhost:8888"
HINDSIGHT_API_KEY=""
HINDSIGHT_BANK="feedback-synthesizer"

# Server Configuration
PORT=3000
```

> **All API keys are optional.** If no keys are provided or services are offline, the application seamlessly activates its robust local fallback providers.

---

## 12. Starting Hindsight (Optional)

If running a local Hindsight server instance via Docker:

```bash
docker run -p 8888:8888 vectorize/hindsight:latest
```

When running, the application connects to `http://localhost:8888` and displays:
`Memory Mode: Hindsight`.

---

## 13. Starting the Application

The full-stack application runs with an Express API backend and Vite React frontend on a single unified port:

```bash
# Start the full-stack development server on port 3000
npm run dev
```

Visit `http://localhost:3000` in your browser.

To run automated tests:

```bash
npm test
```

To build for production:

```bash
npm run build
npm start
```

---

## 14. Loading Sample Data

Click the **"Load Sample Data"** button in the top navigation bar, or run:

```bash
curl -X POST http://localhost:3000/api/feedback/seed
```

This ingests 27+ multi-channel historical feedback items spanning January through September 2026 across Support, Product Reviews, Sales Calls, and User Interviews.

---

## 15. Running the Main Hackathon Demo

Navigate to the **Agent Demo** tab:

1. **Step 1**: Click **"Process & Retain Baseline"** to store historical multi-channel feedback in memory.
2. **Step 2**: Enter the test complaint:
   > *"Our team still doesn't understand how to get started."*
3. **Step 3**: Click **"Investigate with Agent & Memory"**.
4. **Observe the Live 8-Step Pipeline**:
   - `OBSERVE`: Incoming support ticket received and normalized.
   - `UNDERSTAND`: Sentiment analyzed as negative ($-0.70$), topic identified as *onboarding*.
   - `DECIDE`: Agent planner determines historical context is relevant.
   - `RECALL`: Semantic recall from Hindsight retrieves historical setup feedback from March, June, and August.
   - `REASON`: Agent compares recalled memories with current feedback.
   - `DETECT`: Flags recurring problem: *"Onboarding & Initial Setup Confusion"*, reported across 3 channels.
   - `RETAIN`: Persists the new experience into Hindsight memory bank.
   - `INSIGHT`: Generates final evidence-backed synthesis with chronological citations.

---

## 16. Fallback Mode

The application never fabricates connection status:
- If Groq is connected $\rightarrow$ `AI Mode: Groq (llama-3.3-70b-versatile)`
- If Groq is not configured $\rightarrow$ `AI Mode: Local Template (Deterministic NLP)`
- If Hindsight is connected $\rightarrow$ `Memory Mode: Hindsight (feedback-synthesizer)`
- If Hindsight is offline $\rightarrow$ `Memory Mode: Local Fallback (SQLite Semantic Memory)`

Both local fallback providers implement genuine semantic classification, multi-strategy token recall, and evidence extraction so the application remains 100% functional offline.

---

## 17. Troubleshooting

- **Port in use**: Set `PORT=3001` in `.env` if 3000 is occupied.
- **Resetting data**: Click **"Clear Database"** on the Ingestion tab, then click **"Load Sample Data"** to re-seed.
- **Status check**: Click the **Memory / AI status pill** in the top navigation bar to open the diagnostic inspection modal.
