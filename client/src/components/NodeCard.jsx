import QuestionInput from "./QuestionInput.jsx";

// Returns a semantic class for confidence-based colouring.
// High (>= 0.65) = green, Mid (>= 0.35) = amber, Low (< 0.35) = red.
function confidenceLevel(c) {
  if (c >= 0.65) return "high";
  if (c >= 0.35) return "mid";
  return "low";
}

// Renders ONE node, then recurses into its children. The root node is special:
// it's real history, so we skip the confidence / facts chrome that only makes
// sense for generated branches and just show its description as the anchor.
//
// Depth indentation is handled via marginLeft to support dynamic nesting.
// Phase 1 replaces this with D3 timeline using the same node data.
export default function NodeCard({
  node,
  nodes,
  depth,
  depthCap,
  onAsk,
  loadingIds,
  starterHint,
}) {
  const isRoot = node.parentId == null;
  const canAsk = depth < depthCap;
  const isLoading = loadingIds.has(node.id);
  const level = !isRoot ? confidenceLevel(node.confidence) : null;

  return (
    <div
      className={`node-wrapper depth-${depth}`}
      style={{ marginLeft: depth * 32 }}
      id={`node-${node.id}`}
    >
      <div className={`node-card${isRoot ? " root" : ""}`}>
        {/* Branch name with icon for generated branches */}
        <h2 className="branch-name">
          {!isRoot && (
            <span className="branch-icon" aria-hidden="true">⑂</span>
          )}
          {node.branchName}
        </h2>

        {/* The question that created this branch (root has none). */}
        {node.question && <p className="question">"{node.question}"</p>}

        <p className="description">{node.description}</p>

        {/* Confidence + facts/butterflies only apply to generated branches. */}
        {!isRoot && (
          <>
            {/* Visual confidence bar */}
            <div className="confidence">
              <span className="confidence-label">Confidence</span>
              <div className="confidence-bar-track">
                <div
                  className={`confidence-bar-fill ${level}`}
                  style={{ width: `${Math.round(node.confidence * 100)}%` }}
                />
              </div>
              <span className={`confidence-value ${level}`}>
                {(node.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {node.newFacts.length > 0 && (
              <>
                <div className="section-label">
                  <span className="label-icon">📌</span> New facts in this branch
                </div>
                <ul className="tags">
                  {node.newFacts.map((fact, i) => (
                    <li className="tag" key={i}>
                      {fact}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {node.butterflies.length > 0 && (
              <>
                <div className="section-label">
                  <span className="label-icon">🦋</span> Butterfly effects
                </div>
                <ul className="butterflies">
                  {node.butterflies.map((b, i) => (
                    <li className="butterfly-item" key={i}>{b}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {/* Ask box — hidden once we hit the depth cap. */}
        {canAsk ? (
          <QuestionInput
            onSubmit={(q) => onAsk(node.id, q)}
            loading={isLoading}
            starterHint={isRoot ? starterHint : undefined}
          />
        ) : (
          <p className="cap-note">
            ✋ Depth limit reached — deeper chains start to lose track of early
            facts, so branching stops here in Phase 0.
          </p>
        )}

        {/* Inline loading indicator when generating */}
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner" />
            <span>Generating branch…</span>
          </div>
        )}
      </div>

      {/* Recurse into children. */}
      {node.children.map((childId) => (
        <NodeCard
          key={childId}
          node={nodes[childId]}
          nodes={nodes}
          depth={depth + 1}
          depthCap={depthCap}
          onAsk={onAsk}
          loadingIds={loadingIds}
        />
      ))}
    </div>
  );
}
