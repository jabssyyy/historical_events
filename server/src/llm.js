// CROWN JEWEL 2 — provider-agnostic LLM call.
//
// The whole project deliberately avoids committing to one LLM vendor. Every
// major provider (Groq, Gemini's compat endpoint, local Ollama, OpenAI itself)
// speaks the same "OpenAI chat-completions" wire format. So we point the OpenAI
// SDK at whatever baseURL the owner puts in .env and the rest of the code never
// has to care which provider is behind it. Switching providers = edit 3 env
// vars, zero code changes.
//
// We intentionally read the env vars *inside* the function (lazily) rather than
// constructing the client at import time. That way the server can boot even
// before .env is filled in — only an actual /api/generate call will fail, which
// is the behaviour the spec wants.

import OpenAI from "openai";

let client; // cached so we don't rebuild the SDK client on every request

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL, // e.g. Groq / Gemini-compat / local Ollama
    });
  }
  return client;
}

// Simple sleep helper for retry back-off.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLLM(systemPrompt, userPrompt) {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await getClient().chat.completions.create({
        model: process.env.LLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        // Some providers support JSON mode. If yours does, uncommenting this makes
        // malformed output far less likely. If yours doesn't, the system prompt
        // still enforces JSON and validate.js cleans up the rest.
        // response_format: { type: "json_object" },
      });
      return res.choices[0].message.content;
    } catch (err) {
      const status = err?.status ?? err?.response?.status;

      // 429 = rate limited. Wait and retry with exponential back-off.
      if (status === 429 && attempt < MAX_RETRIES) {
        const waitMs = attempt * 2000; // 2s, 4s
        console.warn(
          `Rate limited (429) on attempt ${attempt}/${MAX_RETRIES}. Waiting ${waitMs}ms before retry…`
        );
        await sleep(waitMs);
        continue;
      }

      // Not retryable, or final attempt — rethrow with a clearer message.
      const msg = err?.message ?? String(err);
      throw new Error(
        status === 429
          ? `Rate limited by the LLM provider after ${MAX_RETRIES} attempts. Wait a moment and try again.`
          : status === 401 || status === 403
            ? `Authentication failed (${status}). Check that LLM_API_KEY in server/.env is a valid key for this provider.`
            : msg
      );
    }
  }
}
