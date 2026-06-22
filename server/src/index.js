// Express app — the entire backend surface for Phase 0: one endpoint.
//
// The server is STATELESS. It does not own the tree, has no sessions, and stores
// nothing between requests. The client owns the tree, walks it to collect the
// inheritedFacts, and sends everything the model needs in the request body. The
// server's only jobs are: (1) keep the API key off the browser, and (2) never
// return anything but validated, schema-correct JSON.

import "dotenv/config";
import express from "express";
import cors from "cors";

import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";
import { callLLM } from "./llm.js";
import { parseBranch } from "./validate.js";

const app = express();
app.use(cors()); // allow the Vite dev origin to call us
app.use(express.json());

// Simple liveness check — handy to confirm the server booted before .env is set.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/generate", async (req, res) => {
  const { anchor, inheritedFacts, question } = req.body ?? {};

  // Validate the REQUEST before spending an LLM call.
  if (typeof anchor !== "string" || anchor.trim() === "") {
    return res.status(400).json({ error: "anchor is required." });
  }
  if (typeof question !== "string" || question.trim() === "") {
    return res.status(400).json({ error: "question is required." });
  }
  const facts = Array.isArray(inheritedFacts) ? inheritedFacts : [];

  const userPrompt = buildUserPrompt({ anchor, inheritedFacts: facts, question });

  // Log the fully assembled prompt. Phase 0's whole point is verifying that
  // inheritedFacts accumulate correctly down the tree — this is how we check.
  console.log("\n=== /api/generate ===");
  console.log("inheritedFacts:", facts);
  console.log("question:", question);

  try {
    // Attempt 1.
    let raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    let result = parseBranch(raw);

    // Attempt 2 (one retry) — append a blunt instruction reminding the model to
    // return ONLY the JSON object. We append rather than replace so it still has
    // all the context (anchor + facts + question).
    if (!result.ok) {
      console.warn("First generation invalid:", result.error, "— retrying once.");
      const retryPrompt =
        userPrompt +
        "\n\nYour previous output was not valid JSON matching the schema. Return ONLY the JSON object, nothing else.";
      raw = await callLLM(SYSTEM_PROMPT, retryPrompt);
      result = parseBranch(raw);
    }

    if (!result.ok) {
      // Still bad after a retry — tell the client to let the user try again.
      console.error("Generation failed after retry:", result.error);
      return res
        .status(502)
        .json({ error: "Generation failed — the model returned invalid output. Please try again." });
    }

    return res.json(result.branch);
  } catch (err) {
    // This is where missing/invalid LLM_* env vars will surface, plus network
    // errors from the provider. Expected before the owner fills in .env.
    console.error("LLM call threw:", err?.message ?? err);
    return res
      .status(502)
      .json({ error: "Could not reach the LLM provider. Check the server LLM_* env vars." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`What-If Engine server listening on http://localhost:${PORT}`);
  if (!process.env.LLM_BASE_URL || !process.env.LLM_MODEL) {
    console.warn(
      "NOTE: LLM_* env vars are not fully set. The server is up, but /api/generate " +
        "will fail until you fill in server/.env (LLM_API_KEY, LLM_BASE_URL, LLM_MODEL)."
    );
  }
});
