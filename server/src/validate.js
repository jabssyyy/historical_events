// CROWN JEWEL 3 — validation + coercion of the LLM's JSON.
//
// LLMs occasionally wrap JSON in ```code fences```, add a "Sure! Here's..."
// preamble, or get a type slightly wrong (a number as a string, 4 facts instead
// of 3, confidence of 1.3). The backend's second job (after hiding the API key)
// is to guarantee the frontend NEVER receives anything but a clean, schema-
// correct branch. So we parse defensively and coerce what we safely can.
//
// `parseBranch` returns { ok: true, branch } on success or { ok: false, error }
// on failure. index.js uses that result to decide whether to retry the LLM once.

const MAX_LIST = 3; // newFacts / butterflies are capped at 3 per the data contract

// LLMs love to fence JSON even when told not to. Strip ```json ... ``` wrappers
// and any leading/trailing prose so JSON.parse has a clean shot.
function stripFences(raw) {
  if (typeof raw !== "string") return "";
  let text = raw.trim();

  // Remove a leading ```json or ``` and a trailing ```
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  // If there's still surrounding prose, grab the outermost { ... } block.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  return text.trim();
}

// Coerce a value into an array of <= MAX_LIST non-empty strings.
function toStringList(value) {
  if (!Array.isArray(value)) return null;
  const cleaned = value
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, MAX_LIST);
  return cleaned;
}

export function parseBranch(raw) {
  const text = stripFences(raw);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Response was not valid JSON." };
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "Response JSON was not an object." };
  }

  // branchName + description must be present, non-empty strings.
  if (typeof data.branchName !== "string" || data.branchName.trim() === "") {
    return { ok: false, error: "Missing or invalid branchName." };
  }
  if (typeof data.description !== "string" || data.description.trim() === "") {
    return { ok: false, error: "Missing or invalid description." };
  }

  // confidence: accept a number or a numeric string, then clamp to [0, 1].
  let confidence = data.confidence;
  if (typeof confidence === "string") confidence = Number(confidence);
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return { ok: false, error: "Missing or invalid confidence." };
  }
  confidence = Math.min(1, Math.max(0, confidence)); // clamp rather than reject

  // newFacts / butterflies: must be arrays of strings. We require at least one
  // newFact (it's the whole point — descendants inherit these); butterflies may
  // legitimately be empty, but the prompt asks for 1–3.
  const newFacts = toStringList(data.newFacts);
  if (!newFacts || newFacts.length === 0) {
    return { ok: false, error: "Missing or invalid newFacts (need 1-3 strings)." };
  }
  const butterflies = toStringList(data.butterflies) ?? [];

  // Return ONLY the schema fields, in canonical shape — strip anything extra
  // the model may have added.
  return {
    ok: true,
    branch: {
      branchName: data.branchName.trim(),
      description: data.description.trim(),
      confidence,
      newFacts,
      butterflies,
    },
  };
}
