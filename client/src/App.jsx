import { useState } from "react";

import { GANDHI_EVENT, REAL_TIMELINE } from "./data/events.js";
import { collectInheritedFacts, addNode } from "./lib/tree.js";
import { generateBranch } from "./lib/api.js";
import EnergyField from "./components/EnergyField.jsx";
import Timeline from "./components/Timeline.jsx";
import DetailPanel from "./components/DetailPanel.jsx";

// Phase 0 caps branching at depth 5. Longer chains mean longer prompts, and the
// model starts losing track of the earliest established facts — which is exactly
// the consistency we're trying to prove. Short chains keep it tight.
const DEPTH_CAP = 5;

// Seed the initial tree from the REAL historical timeline — the bright trunk of
// the Sacred Timeline. Each real event is a node chained to the previous one
// (kind: "real"). The user branches a what-if off any of these points. Real
// nodes establish no alternate facts (newFacts stays empty); they are the ground
// truth the branches diverge from. The first event keeps id "root".
function seedRealTimeline(events) {
  const map = {};
  events.forEach((e, i) => {
    map[e.id] = {
      id: e.id,
      parentId: i === 0 ? null : events[i - 1].id,
      question: "",
      kind: "real",
      year: e.year,
      branchName: e.branchName,
      description: e.description,
      starter: e.starter, // present only on the divergence (assassination) node
      confidence: 1,
      newFacts: [],
      butterflies: [],
      children: i < events.length - 1 ? [events[i + 1].id] : [],
    };
  });
  return map;
}

export default function App() {
  // The whole tree lives here as a flat map. The client OWNS the tree; the
  // server is stateless and only sees one request at a time.
  const [nodes, setNodes] = useState(() => seedRealTimeline(REAL_TIMELINE));
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [error, setError] = useState(null);

  // Phase 1: which node is currently selected (shown in the detail panel).
  // Starts with root selected so the user immediately sees the anchor.
  const [selectedId, setSelectedId] = useState("root");

  function setLoading(id, on) {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // The core action. nodeId is the card the user asked on; the new branch
  // becomes its child.
  async function handleAsk(nodeId, question) {
    setError(null);
    setLoading(nodeId, true);

    try {
      // INCLUSIVE walk from the clicked node up to root. Because the new child's
      // parent is `nodeId`, it must inherit the clicked node's facts plus all
      // ancestors' — this single call gives us exactly that flat list, which the
      // server injects into the prompt as ESTABLISHED FACTS. This is the entire
      // consistency mechanism.
      const inheritedFacts = collectInheritedFacts(nodes, nodeId);

      const branch = await generateBranch({
        anchor: GANDHI_EVENT.anchor,
        inheritedFacts,
        question,
      });

      // Client assigns id/parentId/question/children; the rest comes from the
      // validated server response (branchName, description, confidence,
      // newFacts, butterflies).
      const child = {
        id: crypto.randomUUID(),
        parentId: nodeId,
        question,
        kind: "branch",
        children: [],
        ...branch,
      };

      setNodes((prev) => addNode(prev, child));

      // Auto-select the new branch so the user sees its details immediately.
      setSelectedId(child.id);
    } catch (err) {
      setError(err.message ?? "Generation failed. Please try again.");
    } finally {
      setLoading(nodeId, false);
    }
  }

  const selectedNode = selectedId ? nodes[selectedId] : null;

  return (
    <div className="app-phase1">
      {/* Cinematic particle canvas behind everything */}
      <EnergyField />

      {/* Header bar */}
      <header className="phase1-header" id="event-header">
        <h1>{GANDHI_EVENT.title}</h1>
        <p className="phase1-pivot">
          {GANDHI_EVENT.pivot} ({GANDHI_EVENT.year})
        </p>
      </header>

      {/* Error toast */}
      {error && (
        <div className="phase1-error" id="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Instructions hint */}
      <div className="phase1-hint">
        Click a node to view details · Scroll to zoom · Drag to pan
      </div>

      {/* SVG branching timeline — the star of Phase 1 */}
      <Timeline
        nodes={nodes}
        selectedId={selectedId}
        onSelect={setSelectedId}
        loadingIds={loadingIds}
      />

      {/* Glassmorphic detail panel */}
      <DetailPanel
        node={selectedNode}
        nodes={nodes}
        depthCap={DEPTH_CAP}
        onAsk={handleAsk}
        onClose={() => setSelectedId(null)}
        loadingIds={loadingIds}
        starterHint={GANDHI_EVENT.starter}
      />
    </div>
  );
}
