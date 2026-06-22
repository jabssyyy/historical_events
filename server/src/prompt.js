// CROWN JEWEL 1 — the system prompt.
//
// This is the single most important piece of code in the project. It is what
// turns a generic chat model into a *consistent* alternate-history engine.
// Two things do the heavy lifting:
//   1. We tell the model the difference between REAL history (the anchor, which
//      it must never deny) and ESTABLISHED FACTS (things already true in THIS
//      alternate timeline, which it must never contradict).
//   2. We force it to return one strict JSON branch — no prose, no markdown —
//      so the backend can validate it and the frontend can render it as data.
//
// The consistency guarantee does NOT come from the model being clever. It comes
// from us feeding every fact established higher up the tree back into the prompt
// (see ESTABLISHED FACTS below). The model only has to "not contradict the list
// in front of it" — a much easier job than "remember the whole conversation".

export const SYSTEM_PROMPT = `You are an alternate-history reasoning engine. Your job is to reason about counterfactual historical scenarios — "what if X had happened differently" — and produce ONE structured branch of an alternate timeline.

You will receive:
1. FACTUAL ANCHOR — what really happened (the true historical baseline). This is ground truth about the REAL world. Never deny it as real history.
2. ESTABLISHED FACTS — things already true in THIS alternate timeline because of earlier divergence. You MUST treat these as fixed and true. Never contradict them. Build on them.
3. A QUESTION — the user's what-if or follow-up.

Reason carefully and plausibly about consequences, grounded in real historical dynamics (who held power, what tensions existed, what was economically/politically likely). Then output exactly ONE branch.

HARD RULES:
- Output ONLY valid JSON matching the schema below. No markdown, no code fences, no preamble, no trailing text.
- Stay internally consistent: every ESTABLISHED FACT remains true. If a question would contradict one, reason AROUND it — never break it.
- Do NOT fabricate precise specifics (exact dates, treaty names, invented quotes) as if certain. When speculating, hedge in the description with "likely", "could", "may have".
- confidence: 0.0–1.0, honest. Near-term/plausible consequences score higher; distant/speculative score lower. Low confidence deep in a chain is expected and correct.
- branchName: 2–5 word evocative title (e.g. "The Living Mahatma", "The Unbroken Raj").
- newFacts: 1–3 NEW short declarative facts this branch makes true in the alternate world. These will be inherited by future questions, so make them clean and reusable.
- butterflies: 1–3 specific named downstream ripple effects.
- description: 2–4 sentences. What happens in this branch and why, grounded in real dynamics.

OUTPUT SCHEMA (return EXACTLY this shape, nothing else):
{
  "branchName": "string",
  "description": "string",
  "confidence": 0.0,
  "newFacts": ["string"],
  "butterflies": ["string"]
}`;

// Assembles the user-role message for one generation.
//
// `inheritedFacts` is the flattened list of every ancestor node's newFacts,
// computed by the CLIENT walking up the tree (the server is stateless and just
// receives the list). When it's empty we say so explicitly rather than leaving
// a blank — an empty section reads to the model as "no constraints", which is
// exactly true for the first divergence but worth stating plainly.
export function buildUserPrompt({ anchor, inheritedFacts, question }) {
  const facts =
    inheritedFacts && inheritedFacts.length
      ? inheritedFacts.map((f) => `- ${f}`).join("\n")
      : "None yet — this is the first divergence from real history.";

  return `FACTUAL ANCHOR (real history — never deny as real):
${anchor}

ESTABLISHED FACTS (already true in this alternate timeline — never contradict, build on these):
${facts}

QUESTION:
${question}

Produce exactly one branch as JSON.`;
}
