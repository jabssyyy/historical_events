import { useState } from "react";

import { GANDHI_EVENT } from "./data/events.js";
import { collectInheritedFacts, addNode } from "./lib/tree.js";
import { generateBranch } from "./lib/api.js";
import EventHeader from "./components/EventHeader.jsx";
import NodeCard from "./components/NodeCard.jsx";

// Phase 0 caps branching at depth 5. Longer chains mean longer prompts, and the
// model starts losing track of the earliest established facts — which is exactly
// the consistency we're trying to prove. Short chains keep it tight.
const DEPTH_CAP = 5;

// The root node = real history. parentId null marks it as the trunk. It has no
// question, full confidence, and no newFacts (real history establishes nothing
// "new" in the alternate sense — branches do).
const ROOT_NODE = {
  id: "root",
  parentId: null,
  question: "",
  branchName: "Real history",
  description: GANDHI_EVENT.anchor,
  confidence: 1,
  newFacts: [],
  butterflies: [],
  children: [],
};

export default function App() {
  // The whole tree lives here as a flat map. The client OWNS the tree; the
  // server is stateless and only sees one request at a time.
  const [nodes, setNodes] = useState({ root: ROOT_NODE });
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [error, setError] = useState(null);

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
        children: [],
        ...branch,
      };

      setNodes((prev) => addNode(prev, child));
    } catch (err) {
      setError(err.message ?? "Generation failed. Please try again.");
    } finally {
      setLoading(nodeId, false);
    }
  }

  return (
    <div className="app">
      <EventHeader event={GANDHI_EVENT} />

      {error && <p className="error" id="error-message">{error}</p>}

      <NodeCard
        node={nodes.root}
        nodes={nodes}
        depth={0}
        depthCap={DEPTH_CAP}
        onAsk={handleAsk}
        loadingIds={loadingIds}
        starterHint={GANDHI_EVENT.starter}
      />
    </div>
  );
}
