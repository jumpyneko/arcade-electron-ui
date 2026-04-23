// src/helper/attributeSliders.js
import { COLORS } from "./colors.js";
import { MODEL_ATTRIBUTE_KEYS, MODEL_ATTRIBUTE_LABELS } from "./modelAttributes.js";
import { getAttributeVector } from "./modelAttributes.js";
import { drawText } from "./typography.js";

const N = MODEL_ATTRIBUTE_KEYS.length;

function hexToRgb(hex) {
  const s = hex.replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/** t ∈ [0,1]: links (−1) → rechts (+1). Blau → gelbgrün → rot */
function heatmapRgb(t, midHex) {
  const u = Math.max(0, Math.min(1, t));
  const negative = hexToRgb(COLORS.arcadeRed);
  const mid = hexToRgb(COLORS.arcadeYellow);
  const positive = hexToRgb(COLORS.arcadeGreen);

  if (u <= 0.5) {
    const k = u * 2;
    return {
      r: lerp(negative.r, mid.r, k),
      g: lerp(negative.g, mid.g, k),
      b: lerp(negative.b, mid.b, k),
    };
  }
  const k = (u - 0.5) * 2;
  return {
    r: lerp(mid.r, positive.r, k),
    g: lerp(mid.g, positive.g, k),
    b: lerp(mid.b, positive.b, k),
  };
}

function rgbFill(ctx, rgb) {
  ctx.fillStyle = `rgb(${rgb.r | 0},${rgb.g | 0},${rgb.b | 0})`;
}

/** Wenige gleichfarbige Segmente über die Breite */
function drawSteppedHeatmapTrack(ctx, x, y, w, h, midHex, segments) {
  const ww = Math.max(1, Math.round(w));
  const hh = Math.max(1, Math.round(h));
  const xi = Math.round(x);
  const yi = Math.round(y);
  const seg = Math.max(2, Math.round(segments));

  for (let s = 0; s < seg; s++) {
    const x0 = Math.floor(xi + (s / seg) * ww);
    const x1 = Math.floor(xi + ((s + 1) / seg) * ww);
    const bw = Math.max(1, x1 - x0);
    const t = seg <= 1 ? 0.5 : s / (seg - 1);
    rgbFill(ctx, heatmapRgb(t, midHex));
    ctx.fillRect(x0, yi, bw, hh);
  }
}

function valueToCenterX(v, trackLeft, trackW) {
  const w = Math.max(1, Math.round(trackW));
  return Math.round(trackLeft + ((v + 1) / 2) * (w - 1));
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/** Low-Res-Pixel-Kreis, außen schwarz */
function drawPixelCircleIndicator(ctx, cx, cy, innerR, outerR, rgb) {
  const rIn = Math.max(1, innerR);
  const rOut = Math.max(rIn + 1, outerR);
  const rIn2 = rIn * rIn;
  const rOut2 = rOut * rOut;
  ctx.imageSmoothingEnabled = false;
  for (let dy = -rOut; dy <= rOut; dy++) {
    for (let dx = -rOut; dx <= rOut; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > rOut2) continue;
      const px = cx + dx;
      const py = cy + dy;
      if (d2 <= rIn2) {
        rgbFill(ctx, rgb);
      } else {
        ctx.fillStyle = "#000";
      }
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

/**
 * @param {number} [opts.gradientSteps] z.B. 5–8 = grobere Stufen
 * @param {number} [opts.indicatorInnerR] default 3
 * @param {number} [opts.indicatorOuterR] default 4 (inkl. Rand)
 * @param {boolean} [opts.showScaleLabels] −1 / 0 / +1 under the track (default true)
 * @param {string} [opts.scaleLabelColor]
 */
export function drawAttributeSliders(ctx, xLeft, yTop, trackW, model, opts = {}) {
  const rowStep = opts.rowStep ?? 30;
  const trackH = opts.trackH ?? 3;
  const labelColor = opts.labelColor ?? "white";
  const midHex = opts.midHex ?? "#d4e157";
  const gradientSteps = opts.gradientSteps ?? 8;
  const innerR = opts.indicatorInnerR ?? 3;
  const outerR = opts.indicatorOuterR ?? 4;
  const showScaleLabels = opts.showScaleLabels !== false;
  const scaleLabelColor = opts.scaleLabelColor ?? "white";

  const values = getAttributeVector(model);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < N; i++) {
    const yLabel = Math.round(yTop + i * rowStep);
    const yTrack = yLabel + 12;
    const w = Math.max(12, Math.round(trackW));
    const x = Math.round(xLeft);

    const labelText = MODEL_ATTRIBUTE_LABELS[i] ?? "";
    drawText(ctx, labelText, x, yLabel, "h2", { align: "left", color: labelColor });

    drawSteppedHeatmapTrack(ctx, x, yTrack, w, trackH, midHex, gradientSteps);

    const midX = x + Math.floor(w / 2);
    rgbFill(ctx, heatmapRgb(0.5, midHex));
    ctx.fillRect(midX, yTrack - 1, 1, trackH + 2);

    let v = values[i];
    v = Math.max(-1, Math.min(1, v));
    let cxThumb = valueToCenterX(v, x, w);
    cxThumb = clamp(cxThumb, x + outerR, x + w - 1 - outerR);
    const cyThumb = Math.round((yTrack + trackH / 2) -1);

    const tThumb = w <= 1 ? 0.5 : (cxThumb - x) / (w - 1);
    const segF = Math.max(1, Math.round(gradientSteps) - 1);
    const steppedT = Math.round(tThumb * segF) / segF;
    const thumbRgb = heatmapRgb(steppedT, midHex);

    drawPixelCircleIndicator(ctx, cxThumb, cyThumb, innerR, outerR, thumbRgb);
    if (showScaleLabels) {
        const yTick = yTrack + trackH + 2;
        drawText(ctx, "-", x, yTick, "h2", {
          align: "left",
          color: scaleLabelColor,
        });
        drawText(ctx, "+", x + w, yTick, "h2", {
          align: "right",
          color: scaleLabelColor,
        });
      }
  }

  ctx.restore();
}