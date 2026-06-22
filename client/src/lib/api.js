// Thin wrapper around POST /api/generate.
//
// We hit a RELATIVE url ("/api/generate"), not an absolute one. The Vite dev
// proxy (vite.config.js) forwards /api to the backend on :3001. Keeping it
// relative means the backend host — and therefore which LLM provider sits behind
// it — never appears anywhere in client code. In production the same relative
// path is served behind whatever reverse proxy we choose.

export async function generateBranch({ anchor, inheritedFacts, question }) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anchor, inheritedFacts, question }),
  });

  // Try to parse a JSON body either way — the server sends { error } on failure.
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data; // { branchName, description, confidence, newFacts, butterflies }
}
