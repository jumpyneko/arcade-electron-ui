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

export const FONTS = {
  h1: `16px "04B03"`,
  h2: `${s(22)}px "Early GameBoy"`,
  h3: `${s(18)}px "Early GameBoy"`,
  h3_names: `${s(20)}px monospace`,
  hint: `${s(14)}px monospace`,
};