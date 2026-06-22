# What-If Engine

An **interrogatable alternate-history engine**. Pick a famous historical event, see what really happened, then ask your own *"what if"* questions. Each question grows a **named branch** on a timeline; follow-ups grow **sub-branches** — building a tree you explore, a world you interrogate rather than a one-shot essay.

## Why it's different

It beats typing a what-if into a generic chatbot in three ways:

1. **Structured, branching output** — a tree of named branches, not a wall of prose.
2. **Internal consistency** — the alternate world never contradicts itself, however deep you dig.
3. **Honest confidence** — every branch reports how confident it is, and uncertainty grows the further a consequence sits from the point of divergence.

## How it works

There is **no history database** — the language model's own knowledge is the data. The cleverness is in how consistency is enforced:

- Every node stores the **new facts** its branch makes true (e.g. *"Gandhi alive past 1948"*).
- When you ask a follow-up on any node, the app walks **up** the tree, collects every ancestor's facts, and injects them back into the prompt as *established facts*.
- Because the model is always handed everything already true higher up the tree, it **cannot contradict the world already built**.

It's plain state-passing — collect facts, pass them to the next prompt — not retrieval-augmented generation.

```
[ Real-history anchor ]  +  [ Established facts from ancestors ]  +  [ Your question ]
                                   → model → one structured branch
```

## Tech stack

| Layer    | Tech                                   |
|----------|----------------------------------------|
| Frontend | React + Vite                           |
| Backend  | Node.js + Express (stateless, one API) |
| Model    | Provider-agnostic — any OpenAI-compatible chat-completions endpoint |

The backend exists only to **keep the API key off the browser** and to **validate the model's JSON** before it reaches the UI. The client owns the tree; the server is stateless.

## Project structure

```
client/                 # React + Vite app (owns the tree, renders branches)
  src/
    components/          # EventHeader, NodeCard, QuestionInput
    lib/                 # tree.js (fact-inheritance), api.js
    data/                # the seed event
server/                 # Express backend
  src/
    index.js             # POST /api/generate
    prompt.js            # system prompt + prompt assembly
    llm.js               # provider-agnostic LLM call
    validate.js          # JSON validation + one retry
```

## Getting started

**Prerequisites:** Node.js 18+ and an API key for any OpenAI-compatible model provider.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # then fill in the LLM_* values (see below)
npm run dev                 # starts on http://localhost:3001

# 2. Frontend (in a second terminal)
cd client
npm install
npm run dev                 # open the printed local URL
```

The Vite dev server proxies `/api` to the backend, so the frontend just calls a relative `/api/generate`.

### Environment variables (`server/.env`)

```
LLM_API_KEY=    # your provider key
LLM_BASE_URL=   # any OpenAI-compatible endpoint
LLM_MODEL=      # the model id to use
PORT=3001
```

Because it targets the OpenAI-compatible shape, you can point it at a range of providers (e.g. Groq, Gemini's compatibility endpoint, or a local Ollama) by changing only these three values — no code changes. The key is read on the server only and never reaches the browser.

## Roadmap

- **Phase 0 — the engine** ✅ Branching tree, fact-inheritance consistency, honest confidence, plain card UI.
- **Phase 1 — the visual** A cinematic branching-timeline view with an animated detail panel, reading the same node data.
- **Later** More curated events, a world-map of consequences, retrieval to go beyond famous events, and shareable timelines.

## License

To be decided by the project owner.
