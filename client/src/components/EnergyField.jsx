import { useRef, useEffect, useCallback } from "react";

// Full-screen canvas layer behind the SVG timeline. Renders drifting glow
// particles and a subtle horizon band for the "Sacred Timeline" cinematic feel.
// Performance-safe: uses requestAnimationFrame and respects prefers-reduced-motion.

const PARTICLE_COUNT = 60;
const COLORS = [
  "rgba(87, 219, 255, 0.4)",  // cyan
  "rgba(155, 140, 250, 0.3)", // violet
  "rgba(184, 216, 255, 0.25)",// white-cyan
  "rgba(217, 236, 255, 0.15)",// white
];

function createParticle(w, h) {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2.5 + 0.5,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.15,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: Math.random() * 0.5 + 0.2,
    phase: Math.random() * Math.PI * 2,
  };
}

export default function EnergyField() {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  // Check reduced motion preference.
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMouseMove = useCallback((e) => {
    mouseRef.current = {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    };
  }, []);

  useEffect(() => {
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Re-init particles on resize
      particles.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(canvas.width, canvas.height)
      );
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    let time = 0;

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      time += 0.005;

      // Clear with near-transparent fill for trail effect.
      ctx.fillStyle = "rgba(6, 7, 15, 0.15)";
      ctx.fillRect(0, 0, w, h);

      // Horizon band — a soft horizontal glow at the center.
      const horizY = h * 0.48 + Math.sin(time * 0.3) * 10;
      const horizGrad = ctx.createLinearGradient(0, horizY - 60, 0, horizY + 60);
      horizGrad.addColorStop(0, "rgba(87, 219, 255, 0)");
      horizGrad.addColorStop(0.4, "rgba(87, 219, 255, 0.012)");
      horizGrad.addColorStop(0.5, "rgba(184, 216, 255, 0.028)");
      horizGrad.addColorStop(0.6, "rgba(87, 219, 255, 0.012)");
      horizGrad.addColorStop(1, "rgba(87, 219, 255, 0)");
      ctx.fillStyle = horizGrad;
      ctx.fillRect(0, horizY - 60, w, 120);

      // Subtle parallax shift based on mouse.
      const mx = (mouseRef.current.x - 0.5) * 8;
      const my = (mouseRef.current.y - 0.5) * 4;

      // Draw particles.
      for (const p of particles.current) {
        p.x += p.dx + mx * 0.02;
        p.y += p.dy + my * 0.02;

        // Oscillate alpha.
        const osc = Math.sin(time * 2 + p.phase) * 0.2;
        const a = Math.max(0, Math.min(1, p.alpha + osc));

        // Wrap around edges.
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Draw soft glow circle.
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [prefersReduced, handleMouseMove]);

  if (prefersReduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className="energy-field"
      aria-hidden="true"
    />
  );
}
