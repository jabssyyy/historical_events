// layout.js — positions for the MCU-Loki "Sacred Timeline".
//
// THE CONCEPT (Loki's branching timeline):
//   • REAL history is ONE bright, STRAIGHT, continuous horizontal beam (the
//     spine). We return the ordered spine points so the view can draw it as a
//     single connected line, not separate segments.
//   • Each "what if" is a DIVERGENCE: a branch splits off at the exact event it
//     diverges from and grows AWAY from the spine as a tendril (up or down).
//   • A branch can itself branch — sub-tendrils.
//
// Every branch node is positioned RELATIVE to its own parent (parent.x + step,
// parent.y + away), so the link from parent to child always emanates cleanly
// from the divergence point. Read-only — never mutates engine data.

const X_STEP = 260; // rightward growth per level (wider spine)
const RISE = 120; // how far a branch climbs away from its parent each level

export function computeLayout(nodes) {
  const root = nodes["root"];
  if (!root) return { positionedNodes: [], links: [], spine: [] };

  const depthOf = (id) => {
    let d = 0;
    let c = nodes[id];
    while (c && c.parentId != null) {
      d += 1;
      c = nodes[c.parentId];
    }
    return d;
  };
  const childrenOf = (id) =>
    (nodes[id].children || []).map((cid) => nodes[cid]).filter(Boolean);

  const pos = {};

  // 1) The spine: the real-history chain, perfectly straight on y = 0.
  let cur = root;
  while (cur) {
    pos[cur.id] = { x: depthOf(cur.id) * X_STEP, y: 0, depth: depthOf(cur.id) };
    cur = childrenOf(cur.id).find((n) => n.kind === "real") || null;
  }

  // Ordered spine points (for drawing one continuous beam).
  const spine = [];
  let sp = root;
  while (sp) {
    spine.push({ id: sp.id, x: pos[sp.id].x, y: pos[sp.id].y });
    sp = childrenOf(sp.id).find((n) => n.kind === "real") || null;
  }

  // 2) Branch tendrils — each grows right + away from its parent.
  function placeBranch(node, parentPos, dir) {
    const x = parentPos.x + X_STEP;
    const y = parentPos.y + dir * RISE;
    pos[node.id] = { x, y, depth: depthOf(node.id) };

    const kids = childrenOf(node.id);
    kids.forEach((kid, i) => {
      const kidDir = kids.length > 1 && i % 2 === 1 ? -dir : dir;
      placeBranch(kid, { x, y }, kidDir);
    });
  }

  const spineBranchRoots = [];
  let s = root;
  while (s) {
    for (const kid of childrenOf(s.id)) {
      if (kid.kind !== "real") spineBranchRoots.push({ kid, parentId: s.id });
    }
    s = childrenOf(s.id).find((n) => n.kind === "real") || null;
  }

  let dir = -1; // first branch goes up
  for (const { kid, parentId } of spineBranchRoots) {
    placeBranch(kid, pos[parentId], dir);
    dir *= -1;
  }

  // 3) Outputs — positions and links both come from the same `pos` map.
  const positionedNodes = Object.values(nodes).map((n) => {
    const p = pos[n.id] || { x: depthOf(n.id) * X_STEP, y: 0, depth: depthOf(n.id) };
    return { id: n.id, x: p.x, y: p.y, depth: p.depth, node: n };
  });

  const links = [];
  for (const n of Object.values(nodes)) {
    if (n.parentId != null && pos[n.id] && pos[n.parentId]) {
      links.push({
        source: { id: n.parentId, x: pos[n.parentId].x, y: pos[n.parentId].y },
        target: { id: n.id, x: pos[n.id].x, y: pos[n.id].y },
      });
    }
  }

  return { positionedNodes, links, spine };
}
