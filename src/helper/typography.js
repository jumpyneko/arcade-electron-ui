import { s } from "./uiScale.js";
import { loadBitmapFont, drawBitmapText } from "./bitmapFont.js";

let bitmapFont = null;
export const TEXT_STYLES = {
  h1: { scale: 2, align: "center" },
  h2: { scale: 1, align: "center" },
  body: { scale: 1, align: "left" },
  hint: { scale: 2, align: "center" }
};
export async function initTypography() {
  // gleiche Font überall
  bitmapFont = await loadBitmapFont(
    "assets/fonts/round_6x6.png",
    "assets/fonts/round_6x6.xml"
  );
}
export function drawText(ctx, text, x, y, styleKey = "body", overrides = {}) {
  if (!bitmapFont) return;
  const style = { ...TEXT_STYLES[styleKey], ...overrides };
  drawBitmapText(ctx, bitmapFont, text, Math.round(x), Math.round(y), style);
}

export function drawdoubleText(ctx, text, x, y, styleKey = "body", {
    shadowColor = "#FFD800", // z.B. arcadeYellow
    shadowOffsetX = 1,
    shadowOffsetY = 0,
    ...overrides
  } = {} ) {
  if (!bitmapFont) return;

  // 1) shadow / offset draw
  drawText(ctx, text, x + shadowOffsetX, y + shadowOffsetY, styleKey, {
    ...overrides,
    color: shadowColor,
  });

  // 2) main draw (uses overrides.color if provided, otherwise default style color)
  drawText(ctx, text, x, y, styleKey, overrides);
}

/**
 * Word-wrap for bitmap text used with drawText(): joins lines with \n.
 * Long words without spaces are hard-split at maxCharsPerLine.
 */
export function wrapBitmapText(text, maxCharsPerLine = 34) {
  const maxChars = Math.max(1, Math.floor(maxCharsPerLine));
  const words = String(text ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = "";

  const pushLong = (w) => {
    let rest = w;
    while (rest.length > maxChars) {
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    return rest;
  };

  for (const w of words) {
    const piece = w.length > maxChars ? pushLong(w) : w;
    if (!piece) continue;
    const test = line ? `${line} ${piece}` : piece;
    if (test.length > maxChars) {
      if (line) lines.push(line);
      line = piece;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export const FONTS = {
  h1: `16px "04B03"`,
  h2: `${s(22)}px "Early GameBoy"`,
  h3: `${s(18)}px "Early GameBoy"`,
  h3_names: `${s(16)}px monospace`,
  hint: `${s(14)}px monospace`,
};