// src/helper/attributeNet.js
import { getAttributeVector } from "./modelAttributes.js";
import {
    MODEL_ATTRIBUTE_KEYS,
    MODEL_ATTRIBUTE_LABELS,
  } from "./modelAttributes.js";
import { drawText } from "./typography.js";

const N = MODEL_ATTRIBUTE_KEYS.length;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function P(x, y) {
  return { x: Math.round(x), y: Math.round(y) };
}

function angleForAxis(i) {
  return -Math.PI / 2 + (i * 2 * Math.PI) / N;
}

function pointOnAxis(cx, cy, i, radius, value) {
    const v = clamp(value, -1, 1);
    const t = (v + 1) / 2; // -1 → Mitte, +1 → Ring
    const a = angleForAxis(i);
    return P(cx + Math.cos(a) * radius * t, cy + Math.sin(a) * radius * t);
}

function drawPixelLine(ctx, from, to, color) {
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  ctx.fillStyle = color;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function drawHexSkeleton(ctx, cx, cy, R, stroke) {
  for (let ring = 1; ring <= 4; ring++) {
    const r = (ring / 4) * R;
    const pts = [];
    for (let i = 0; i < N; i++) {
      pts.push(
        P(cx + Math.cos(angleForAxis(i)) * r, cy + Math.sin(angleForAxis(i)) * r)
      );
    }
    for (let i = 0; i < N; i++) {
      drawPixelLine(ctx, pts[i], pts[(i + 1) % N], stroke);
    }
  }
  const r0 = R * 0.5;
  for (let i = 0; i < N; i++) {
    const p = P(
      cx + Math.cos(angleForAxis(i)) * r0,
      cy + Math.sin(angleForAxis(i)) * r0
    );
    drawPixelLine(ctx, P(cx, cy), p, stroke);
  }
}

/**
 * @param {object} opts
 * @param {string} [opts.strokeGrid]  Hex-Gitter
 * @param {string} [opts.strokeShape]  Polygon
 * @param {string} [opts.node]        Eckpunkte
 */
export function drawAttributeNet(ctx, cx, cy, radius, model, opts = {}) {
  const strokeGrid = opts.strokeGrid ?? "#3d3248";
  const strokeShape = opts.strokeShape ?? "#e9c46a";
  const node = opts.node ?? "#f4d35e";

  const values = getAttributeVector(model);

  ctx.imageSmoothingEnabled = false;
  drawHexSkeleton(ctx, cx, cy, radius, strokeGrid);

  const pts = values.map((v, i) => pointOnAxis(cx, cy, i, radius, v));
  for (let i = 0; i < pts.length; i++) {
    drawPixelLine(ctx, pts[i], pts[(i + 1) % pts.length], strokeShape);
  }
  for (const p of pts) {
    ctx.fillStyle = "#000";
    ctx.fillRect(p.x - 2, p.y - 2, 5, 5);
    ctx.fillStyle = node;
    ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
  }

  if (opts.showLabels !== false) {
    const labelColor = "white";
    const labelR = radius + 14;
    for (let i = 0; i < N; i++) {
      const a = angleForAxis(i);
      const lx = Math.round(cx + Math.cos(a) * labelR);
      const ly = Math.round(cy + Math.sin(a) * labelR);
      drawText(ctx, MODEL_ATTRIBUTE_LABELS[i] ?? "", lx, ly, "h2", {
        align: "center",
        color: labelColor,
      });
    }
  }
}