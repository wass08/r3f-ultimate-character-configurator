import { useEffect, useRef } from "react";
import { useCharacterStore } from "../../actions/characterStore";

// A full-viewport 2D canvas that paints the VFX layer for the active action.
// Pointer-events:none so it never blocks the character or UI. Each action's
// `vfx` id spawns a short particle burst that fades on its own; the canvas idles
// when nothing is playing.

const COLORS = ["#ffd34e", "#ff7ec8", "#27ff7c", "#6aa0ff", "#ff4d4d", "#ffffff"];
const MATRIX_GLYPHS = "0101ｱｲｳｴｵｶｷｸｹｺ<>/{}=$#";

export const ActionFX = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const current = useCharacterStore((s) => s.current);

  // Spawn particles when a new action with a vfx becomes active.
  useEffect(() => {
    if (!current?.vfx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const accent = current.accent || "#ffffff";
    spawn(particlesRef.current, current.vfx, w, h, accent);
  }, [current?.event?.id, current?.vfx]);

  // Single shared animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (t) => {
      const dt = Math.min(48, t - (lastRef.current || t));
      lastRef.current = t;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        update(p, dt, w, h);
        if (p.life <= 0 || p.y > h + 80) {
          ps.splice(i, 1);
          continue;
        }
        draw(ctx, p);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 30,
      }}
    />
  );
};

// ---- particle factory ------------------------------------------------------

function spawn(arr, vfx, w, h, accent) {
  const cx = w / 2;
  switch (vfx) {
    case "confetti":
      for (let i = 0; i < 120; i++) {
        arr.push({
          type: "rect",
          x: cx + rand(-40, 40),
          y: h * 0.3 + rand(-20, 20),
          vx: rand(-0.45, 0.45),
          vy: rand(-0.9, -0.2),
          g: 0.0016,
          size: rand(5, 11),
          rot: rand(0, 6.28),
          vrot: rand(-0.02, 0.02),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 1,
          decay: rand(0.0009, 0.0016),
        });
      }
      break;
    case "matrix": {
      const cols = Math.floor(w / 18);
      for (let c = 0; c < cols; c++) {
        arr.push({
          type: "matrix",
          x: c * 18 + 4,
          y: rand(-h, 0),
          vy: rand(0.25, 0.7),
          glyphs: Array.from({ length: 12 }, () => randGlyph()),
          life: 1,
          decay: 0.0007,
          color: "#27ff7c",
        });
      }
      break;
    }
    case "projectile":
      // The "angry bird": flies from the character toward the notification card.
      arr.push({
        type: "emoji",
        char: "🐦",
        x: w * 0.4,
        y: h * 0.62,
        vx: (w * 0.55 - w * 0.4) / 700,
        vy: (h * 0.16 - h * 0.62) / 700,
        g: 0.00018,
        size: 46,
        rot: 0,
        vrot: 0.01,
        life: 1,
        decay: 0.0011,
        burst: true,
        color: accent,
      });
      break;
    case "hearts":
      for (let i = 0; i < 14; i++) {
        arr.push({
          type: "emoji",
          char: Math.random() > 0.5 ? "💗" : "✨",
          x: cx + rand(-60, 60),
          y: h * 0.55 + rand(0, 40),
          vx: rand(-0.06, 0.06),
          vy: rand(-0.18, -0.08),
          g: -0.00002,
          size: rand(18, 30),
          rot: 0,
          vrot: rand(-0.01, 0.01),
          life: 1,
          decay: rand(0.0008, 0.0013),
        });
      }
      break;
    case "raincloud":
      arr.push({
        type: "emoji",
        char: "🌧️",
        x: cx,
        y: h * 0.22,
        vx: 0,
        vy: 0,
        size: 56,
        rot: 0,
        vrot: 0,
        life: 1,
        decay: 0.00045,
      });
      for (let i = 0; i < 70; i++) {
        arr.push({
          type: "rain",
          x: cx + rand(-70, 70),
          y: h * 0.28 + rand(0, 30),
          vy: rand(0.5, 1.1),
          len: rand(8, 16),
          life: 1,
          decay: rand(0.001, 0.002),
          color: "#6aa0ff",
        });
      }
      break;
    case "pulse":
      for (let i = 0; i < 3; i++) {
        arr.push({
          type: "ring",
          x: cx,
          y: h * 0.5,
          r: 10,
          vr: 0.35 + i * 0.05,
          life: 1,
          delay: i * 220,
          decay: 0.0009,
          color: accent,
        });
      }
      break;
    case "thought":
    default:
      arr.push({
        type: "emoji",
        char: "💭",
        x: cx + 70,
        y: h * 0.38,
        vx: 0.02,
        vy: -0.03,
        size: 44,
        rot: 0,
        vrot: 0,
        life: 1,
        decay: 0.0006,
      });
      break;
  }
}

// ---- per-particle update / draw -------------------------------------------

function update(p, dt, w, h) {
  if (p.delay && p.delay > 0) {
    p.delay -= dt;
    return;
  }
  switch (p.type) {
    case "rect":
    case "emoji":
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += (p.vrot || 0) * dt;
      if (p.burst && p.life < 0.45 && !p.didBurst) {
        p.didBurst = true; // projectile pops into sparks near the card
      }
      break;
    case "matrix":
      p.y += p.vy * dt;
      if (Math.random() < 0.04) p.glyphs[(Math.random() * p.glyphs.length) | 0] = randGlyph();
      break;
    case "rain":
      p.y += p.vy * dt;
      break;
    case "ring":
      p.r += p.vr * dt;
      break;
  }
  p.life -= (p.decay || 0.001) * dt;
}

function draw(ctx, p) {
  if (p.delay && p.delay > 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
  switch (p.type) {
    case "rect":
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      break;
    case "emoji":
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.char, 0, 0);
      break;
    case "matrix":
      ctx.font = "15px monospace";
      ctx.textAlign = "center";
      p.glyphs.forEach((g, i) => {
        ctx.fillStyle = i === p.glyphs.length - 1 ? "#d6ffe4" : p.color;
        ctx.globalAlpha = Math.max(0, p.life) * (1 - i / (p.glyphs.length + 2));
        ctx.fillText(g, p.x, p.y - i * 16);
      });
      break;
    case "rain":
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 1, p.y + p.len);
      ctx.stroke();
      break;
    case "ring":
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

// ---- helpers ---------------------------------------------------------------
const rand = (a, b) => a + Math.random() * (b - a);
const randGlyph = () => MATRIX_GLYPHS[(Math.random() * MATRIX_GLYPHS.length) | 0];
