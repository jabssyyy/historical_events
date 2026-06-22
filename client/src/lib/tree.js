// Tree helpers — the heart of the consistency mechanism on the client side.
//
// WHY a flat map { [id]: node } instead of a nested tree?
// Lookups and walking-up-by-parentId are O(1) per hop and trivial to write.
// A nested structure would force a recursive search just to find a node before
// we could walk its ancestors. We still render hierarchically by following each
// node's `children` array of ids.
//
// THE KEY IDEA: we never STORE a node's inherited facts on the node. We compute
// them on demand by walking ancestors. Storing them would duplicate state (the
// same fact living on every descendant) and invite drift — if a parent ever
// changed, every copy would be stale. Compute-on-demand is always correct.

// Depth convention: the root is depth 0, a direct child of root is depth 1, etc.
// Used to enforce the Phase 0 depth cap (hide the ask box beyond depth 5).
export function getDepth(nodes, nodeId) {
  let depth = 0;
  let current = nodes[nodeId];
  while (current && current.parentId != null) {
    depth += 1;
    current = nodes[current.parentId];
  }
  return depth;
}

// Walk from `startId` UP to the root, concatenating each node's newFacts.
//
// INCLUSIVE of startId's own newFacts. This matters: when the user asks a
// question on a clicked node, the new child's parent IS that clicked node, so
// the child must inherit the clicked node's facts PLUS everything above it. We
// therefore call this with the clicked node's id. The root contributes nothing
// (its newFacts is [] by construction), so being inclusive is always safe.
//
// Returns a flat array, root-most first (order doesn't matter to the prompt).
export function collectInheritedFacts(nodes, startId) {
  if (startId == null) return [];

  const chain = [];
  let current = nodes[startId];
  while (current) {
    chain.push(current); // collect node, then climb
    current = current.parentId != null ? nodes[current.parentId] : null;
  }

  // chain is leaf->root; reverse so accumulated facts read root->leaf, then flatten.
  chain.reverse();
  return chain.flatMap((node) => node.newFacts ?? []);
}

// Immutably insert a new node: returns a NEW map (so React sees a change) with
// the node added AND its id pushed into its parent's children array. The input
// map is never mutated.
export function addNode(nodes, newNode) {
  const next = { ...nodes, [newNode.id]: newNode };

  const parent = next[newNode.parentId];
  if (parent) {
    next[parent.id] = {
      ...parent,
      children: [...parent.children, newNode.id],
    };
  }
  return next;
}
