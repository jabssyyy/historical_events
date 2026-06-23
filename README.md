# What-If Engine

Pick a famous historical event, see what actually happened, then ask your own
"what if" questions. Each question adds a named branch to a timeline, and
follow-up questions branch off those, so you end up with a tree of alternate
histories you can explore instead of a single block of text.

The current build ships one scenario: Gandhi surviving Godse's 1948
assassination attempt.

## The idea

Typing a what-if into a normal chatbot gives you one essay and no memory. This
tries to do better in three ways:

1. The output is a tree of named branches, not a wall of prose.
2. The alternate world stays consistent. Dig deeper and it won't contradict
   things it already established.
3. Confidence is shown honestly. The further a consequence sits from the moment
   history diverged, the lower the confidence on that branch.

## How consistency works

There is no history database. The model's own training knowledge is the data.
The interesting part is how the app stops the model contradicting itself.

Every node records the new facts its branch makes true, for example "Gandhi is
alive past 1948". When you ask a follow-up on a node, the app walks up the tree
to the root, gathers every ancestor's facts, and feeds them back into the next
prompt as established facts. Since the model always receives everything already
true higher up the tree, it has no room to deny it.

```
real-history anchor  +  established facts from ancestors  +  your question
                              -> model -> one structured branch
```

This is plain state-passing (collect facts, pass them along), not
retrieval-augmented generation.

## Stack

- Frontend: React + Vite. The branching timeline is hand-built SVG; the
  background particle layer is a canvas element; panel animations use
  framer-motion; tree layout uses d3-hierarchy and d3-shape.
- Backend: Node.js + Express, stateless, one endpoint (`POST /api/generate`).
- Model: any OpenAI-compatible chat-completions endpoint.

The server only exists to keep the API key out of the browser and to validate
the model's JSON before it reaches the UI. The client holds the whole tree in
React state; the server never stores anything between requests.

## Project layout

```
client/
  src/
    App.jsx              tree state, the ask handler, layout of the page
    components/
      Timeline.jsx       SVG timeline: the real-history beam and branch tendrils
      EnergyField.jsx    canvas background (particles, glow)
      DetailPanel.jsx    selected-node panel: facts, confidence, ask box
      QuestionInput.jsx  the what-if input
    lib/
      tree.js            fact inheritance, depth, immutable node insert
      layout.js          turns the flat node map into positioned nodes + links
      api.js             wrapper around POST /api/generate
    data/
      events.js          the seed event and the real timeline
server/
  src/
    index.js             Express app and the /api/generate route
    prompt.js            system prompt and prompt assembly
    llm.js               the provider-agnostic model call
    validate.js          JSON validation with one retry
```

## Running it locally

You need Node.js 18+ and an API key for any OpenAI-compatible model provider.

```bash
# backend
cd server
npm install
cp .env.example .env     # fill in the LLM_* values below
npm run dev              # http://localhost:3001

# frontend, in a second terminal
cd client
npm install
npm run dev              # open the URL it prints
```

Vite proxies `/api` to the backend, so the frontend just calls `/api/generate`.

### server/.env

```
LLM_API_KEY=    # your provider key
LLM_BASE_URL=   # any OpenAI-compatible endpoint
LLM_MODEL=      # the model id
PORT=3001
```

Switching providers (Groq, Gemini's OpenAI-compatible endpoint, a local Ollama,
and so on) is just a matter of changing those three values. No code changes. The
key is read on the server only and never reaches the browser.

## Status

- Phase 0, the engine: done. Branching tree, the fact-inheritance consistency
  mechanism, honest confidence, JSON validation with retry.
- Phase 1, the visual: done. The card list is replaced by an animated branching
  timeline modelled on the "sacred timeline" look, with a slide-up detail panel.
  Same node data underneath; the engine did not change.

Possible next steps: more curated events, a consequence map, retrieval so it can
handle events the model knows less well, and shareable timelines.

## License

Not decided yet.
