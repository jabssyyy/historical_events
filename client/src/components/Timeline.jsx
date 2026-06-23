import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { linkHorizontal } from "d3-shape";
import { computeLayout } from "../lib/layout.js";

// Generates a curved SVG path between two points using d3's linkHorizontal.
// linkHorizontal maps x → horizontal and y → vertical. It expects
// { source: {x,y}, target: {x,y} } — NOT arrays.
const linkPathGenerator = linkHorizontal()
  .x((d) => d[0])
  .y((d) => d[1]);

// Maps confidence → color. High = bright cyan-white, low = dim violet.
function confidenceColor(c) {
  if (c >= 0.7) return "#B8D8FF";
  if (c >= 0.4) return "#57DBFF";
  return "#9B8CFA";
}

// Maps confidence → stroke width.
function confidenceWidth(c) {
  if (c >= 0.7) return 3;
  if (c >= 0.4) return 2.2;
  return 1.5;
}

// Maps confidence → glow blur radius.
function confidenceGlow(c) {
  if (c >= 0.7) return 12;
  if (c >= 0.4) return 8;
  return 4;
}

// A glowing link from a parent event to its child branch. Uses SVG pathLength=1
// so a CSS "draw-in" works regardless of the path's real length (robust — the
// old getTotalLength approach could leave links invisible).
function BranchLink({ link, nodes }) {
  const targetNode = nodes[link.target.id];
  const conf = targetNode ? targetNode.confidence : 0.5;
  // Glow hue still encodes confidence (cyan = high → violet = low).
  const glowColor = confidenceColor(conf);

  const pathD = linkPathGenerator({
    source: [link.source.x, link.source.y],
    target: [link.target.x, link.target.y],
  });

  return (
    <g>
      {/* Wide outer bloom */}
      <path
        d={pathD}
        fill="none"
        stroke={glowColor}
        strokeWidth={28}
        strokeLinecap="round"
        filter="url(#energy-glow)"
        style={{ mixBlendMode: "screen", opacity: 0.4 }}
      />
      {/* Colored halo (additive so crossing strands brighten) */}
      <path
        d={pathD}
        fill="none"
        stroke={glowColor}
        strokeWidth={13}
        strokeLinecap="round"
        filter="url(#energy-glow)"
        style={{ mixBlendMode: "screen", opacity: 0.8 }}
      />
      {/* White-hot core that draws itself in */}
      <path
        className="branch-link"
        d={pathD}
        pathLength="1"
        fill="none"
        stroke="#EAF6FF"
        strokeWidth={3}
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 3px #bfe6ff)" }}
      />
    </g>
  );
}

// A single node orb with bloom-in animation (pure CSS, no framer-motion in SVG).
function NodeOrb({ pn, isSelected, isLoading, onSelect }) {
  const isRoot = pn.id === "root";
  const isReal = pn.node.kind === "real";
  const conf = pn.node.confidence;
  const color = isReal ? "#D9ECFF" : confidenceColor(conf);
  const radius = isRoot ? 14 : isReal ? 11 : 9;

  return (
    <g transform={`translate(${pn.x}, ${pn.y})`}>
      <g
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pn.id);
        }}
        style={{ cursor: "pointer" }}
        className={`timeline-node ${isSelected ? "selected" : ""}`}
      >
      {/* Selection ring */}
      {isSelected && (
        <circle
          r={radius + 8}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.4}
          className="selection-ring"
        />
      )}

      {/* Outer glow halo — use a radial gradient fill instead of filter to
          avoid the grey bounding-box artifact on certain browsers. */}
      <circle r={radius + 6} fill={`url(#halo-${isReal ? "root" : "branch"})`} />

      {/* Core orb */}
      <circle
        r={radius}
        fill={isReal ? "#EAF4FF" : color}
        opacity={isReal ? 0.95 : 0.9}
      />

      {/* Inner bright core */}
      <circle r={radius * 0.4} fill="#fff" opacity={0.9} />

      {/* Loading pulse ring — uses SVG <animate> because CSS cannot
          animate the SVG 'r' attribute. */}
      {isLoading && (
        <circle
          r={radius + 16}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.5}
        >
          <animate
            attributeName="r"
            from={radius + 16}
            to={radius + 36}
            dur="1.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.5"
            to="0"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Branch name label */}
      <text
        y={radius + 22}
        textAnchor="middle"
        className="node-label"
        fill={color}
        fontSize="12"
        fontWeight="600"
        fontFamily="Inter, sans-serif"
      >
        {pn.node.branchName.length > 26
          ? pn.node.branchName.slice(0, 25) + "…"
          : pn.node.branchName}
      </text>

      {/* Real nodes show their year; branches show confidence. */}
      {isReal ? (
        pn.node.year && (
          <text
            y={radius + 36}
            textAnchor="middle"
            className="node-year-label"
            fill={color}
            fontSize="10"
            fontFamily="'JetBrains Mono', monospace"
            opacity={0.65}
          >
            {pn.node.year}
          </text>
        )
      ) : (
        <text
          y={radius + 36}
          textAnchor="middle"
          className="node-confidence-label"
          fill={color}
          fontSize="10"
          fontFamily="'JetBrains Mono', monospace"
          opacity={0.7}
        >
          {(conf * 100).toFixed(0)}%
        </text>
      )}
      </g>
    </g>
  );
}

// The SVG branching timeline. Renders the tree as curved links + glowing
// node orbs. Clicking a node fires `onSelect`. Panning + zooming is handled
// by mouse drag / wheel on the container.
export default function Timeline({ nodes, selectedId, onSelect, loadingIds }) {
  const containerRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: -200, y: -200, w: 1200, h: 700 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const didDrag = useRef(false);

  // Compute layout from the flat node map.
  const { positionedNodes, links, spine } = useMemo(
    () => computeLayout(nodes),
    [nodes]
  );

  // One continuous beam through the real spine, extended past both ends so it
  // reads like the Loki "Sacred Timeline" flowing in from and out to infinity.
  const beamD =
    spine && spine.length >= 2
      ? `M ${spine[0].x - 220} ${spine[0].y} ` +
        spine.map((p) => `L ${p.x} ${p.y}`).join(" ") +
        ` L ${spine[spine.length - 1].x + 220} ${spine[spine.length - 1].y}`
      : null;

  // Fit the whole tree into view, matching the container's aspect ratio so the
  // SVG fills the viewport without squishing. Guards against a zero-sized
  // container on first paint (which previously collapsed everything to a point).
  const fitView = useCallback(() => {
    if (positionedNodes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of positionedNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    // Asymmetric padding: extra room below each node for its two label lines.
    const padX = 220;
    const padTop = 140;
    const padBottom = 160;
    let cw = maxX - minX + padX * 2;
    let ch = maxY - minY + padTop + padBottom;

    let aspect = 16 / 9;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) aspect = rect.width / rect.height;
    }
    if (cw / ch > aspect) ch = cw / aspect;
    else cw = ch * aspect;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewBox({ x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch });
  }, [positionedNodes]);

  // Refit after paint (so the container has a real size) and on window resize.
  useEffect(() => {
    const raf = requestAnimationFrame(fitView);
    window.addEventListener("resize", fitView);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fitView);
    };
  }, [fitView]);

  // Pan handlers — track drag distance to distinguish click vs. drag.
  const handlePointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      didDrag.current = false;
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        vx: viewBox.x,
        vy: viewBox.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [viewBox]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isPanning) return;
      const container = containerRef.current;
      if (!container) return;

      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;

      // Only start dragging after a 4px threshold.
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        didDrag.current = true;
      }

      const rect = container.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;

      setViewBox((prev) => ({
        ...prev,
        x: panStart.current.vx - dx * scaleX,
        y: panStart.current.vy - dy * scaleY,
      }));
    },
    [isPanning, viewBox.w, viewBox.h]
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Click on empty space (not a node) deselects — but only if it wasn't a drag.
  const handleContainerClick = useCallback(() => {
    if (!didDrag.current) {
      // Don't deselect — keep the current selection. User must use the close
      // button on the panel. This avoids accidental deselect.
    }
  }, []);

  // Zoom handler.
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mx = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
      const my = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;

      setViewBox({
        x: mx - (mx - viewBox.x) * zoomFactor,
        y: my - (my - viewBox.y) * zoomFactor,
        w: viewBox.w * zoomFactor,
        h: viewBox.h * zoomFactor,
      });
    },
    [viewBox]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div
      className="timeline-container"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleContainerClick}
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
    >
      <svg
        className="timeline-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filters for branch links — use filterUnits="userSpaceOnUse"
              would cause sizing issues, so we use a large filter region instead. */}
          {[4, 8, 12].map((blur) => (
            <filter
              key={blur}
              id={`branch-glow-${blur}`}
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {/* Strong soft glow used to build the "energy filament" look: a
              blurred colored stroke sits UNDER a thin bright-white core, so each
              line reads as a white-hot filament wrapped in a colored halo. */}
          <filter id="energy-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>

          {/* Radial gradient halos for nodes — avoids the grey-box artefact
              that SVG filters cause on some renderers. */}
          <radialGradient id="halo-root">
            <stop offset="0%" stopColor="#D9ECFF" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#D9ECFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#D9ECFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo-branch">
            <stop offset="0%" stopColor="#57DBFF" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#57DBFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#57DBFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Links */}
        <g className="timeline-links">
          {/* The continuous Sacred Timeline beam (real history) */}
          {beamD && (
            <g>
              {/* Wide outer bloom */}
              <path
                d={beamD}
                fill="none"
                stroke="#5aa8ff"
                strokeWidth={48}
                strokeLinecap="round"
                filter="url(#energy-glow)"
                style={{ mixBlendMode: "screen", opacity: 0.45 }}
              />
              {/* Mid cyan halo */}
              <path
                d={beamD}
                fill="none"
                stroke="#9fd8ff"
                strokeWidth={22}
                strokeLinecap="round"
                filter="url(#energy-glow)"
                style={{ mixBlendMode: "screen", opacity: 0.85 }}
              />
              {/* White-hot core */}
              <path
                className="spine-beam"
                d={beamD}
                fill="none"
                stroke="#ffffff"
                strokeWidth={6}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 9px #bfe6ff)" }}
              />
            </g>
          )}
          {/* Branch tendrils only — the beam already covers the trunk links */}
          {links
            .filter(
              (l) => nodes[l.target.id] && nodes[l.target.id].kind !== "real"
            )
            .map((link) => (
              <BranchLink
                key={`${link.source.id}-${link.target.id}`}
                link={link}
                nodes={nodes}
              />
            ))}
        </g>

        {/* Nodes — orbs representing each branch */}
        <g className="timeline-nodes">
          {positionedNodes.map((pn) => (
            <NodeOrb
              key={pn.id}
              pn={pn}
              isSelected={pn.id === selectedId}
              isLoading={loadingIds.has(pn.id)}
              onSelect={onSelect}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
