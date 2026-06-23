import { motion, AnimatePresence } from "framer-motion";
import QuestionInput from "./QuestionInput.jsx";
import { getDepth } from "../lib/tree.js";

// Returns a semantic class for confidence-based colouring.
function confidenceLevel(c) {
  if (c >= 0.65) return "high";
  if (c >= 0.35) return "mid";
  return "low";
}

// The glassmorphic detail panel. Slides up from the bottom when a node is
// selected. Shows the full node data: branch name, question, description,
// confidence meter, newFacts, butterflies, and the ask box (if within depth cap).
// Reuses the existing QuestionInput component.
export default function DetailPanel({
  node,
  nodes,
  depthCap,
  onAsk,
  onClose,
  loadingIds,
  starterHint,
}) {
  if (!node) return null;

  const isRoot = node.parentId == null;
  const isReal = node.kind === "real";
  const depth = getDepth(nodes, node.id);
  const canAsk = depth < depthCap;
  const isLoading = loadingIds.has(node.id);
  const level = !isReal ? confidenceLevel(node.confidence) : null;

  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Panel — no blocking backdrop, so you can keep clicking timeline
              events to switch the panel. Close with the ✕ button. */}
          <motion.div
            className="detail-panel"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            {/* Top accent bar — color matches confidence */}
            <div
              className={`panel-accent ${isReal ? "root" : level || ""}`}
            />

            {/* Close button */}
            <button className="panel-close" onClick={onClose} aria-label="Close panel">
              ✕
            </button>

            {/* Scrollable content */}
            <div className="panel-content">
              {/* Branch name */}
              <h2 className="panel-title">
                {!isReal && (
                  <span className="panel-branch-icon" aria-hidden="true">
                    ⑂
                  </span>
                )}
                {node.branchName}
              </h2>

              {/* Real-history badge */}
              {isReal && (
                <div
                  className="panel-real-badge"
                  style={{
                    display: "inline-block",
                    marginBottom: 12,
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: "#D9ECFF",
                    background: "rgba(217,236,255,0.08)",
                    border: "1px solid rgba(217,236,255,0.18)",
                  }}
                >
                  ◆ REAL HISTORY{node.year ? ` · ${node.year}` : ""}
                </div>
              )}

              {/* The question that spawned this branch */}
              {node.question && (
                <p className="panel-question">"{node.question}"</p>
              )}

              {/* Description */}
              <p className="panel-description">{node.description}</p>

              {/* Confidence meter (generated branches only) */}
              {!isReal && (
                <div className="panel-confidence">
                  <span className="panel-confidence-label">Confidence</span>
                  <div className="panel-confidence-track">
                    <motion.div
                      className={`panel-confidence-fill ${level}`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.round(node.confidence * 100)}%`,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className={`panel-confidence-value ${level}`}>
                    {(node.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}

              {/* New Facts */}
              {!isReal && node.newFacts && node.newFacts.length > 0 && (
                <div className="panel-section">
                  <div className="panel-section-label">
                    <span className="label-icon">📌</span> New facts in this
                    branch
                  </div>
                  <ul className="panel-tags">
                    {node.newFacts.map((fact, i) => (
                      <li className="panel-tag" key={i}>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Butterfly Effects */}
              {!isReal && node.butterflies && node.butterflies.length > 0 && (
                <div className="panel-section">
                  <div className="panel-section-label">
                    <span className="label-icon">🦋</span> Butterfly effects
                  </div>
                  <ul className="panel-butterflies">
                    {node.butterflies.map((b, i) => (
                      <li className="panel-butterfly-item" key={i}>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Depth indicator */}
              <div className="panel-depth">
                <span className="panel-depth-label">Depth</span>
                <span className="panel-depth-value">{depth} / {depthCap}</span>
              </div>

              {/* Ask box or cap note */}
              {canAsk ? (
                <QuestionInput
                  onSubmit={(q) => onAsk(node.id, q)}
                  loading={isLoading}
                  starterHint={node.starter}
                />
              ) : (
                <p className="panel-cap-note">
                  ✋ Depth limit reached — deeper chains lose track of early
                  facts, so branching stops here in Phase 0.
                </p>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="panel-loading">
                  <div className="spinner" />
                  <span>Generating branch…</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
