// src/helper/debugOverlay.js
import { models } from "./modelData.js";
import { screenManager } from "./screenManager.js";
import { drawText } from "./typography.js";

const MAX_LOG = 8;
const log = []; // { dir: "IN"|"OUT", address, args, t }

export let debugVisible = false;

export function toggleDebugOverlay() {
  debugVisible = !debugVisible;
}

export function logOsc(dir, address, args = []) {
  const flat = (Array.isArray(args) ? args : [args]).map((a) =>
    a?.value !== undefined ? a.value : a
  );
  log.push({
    dir,
    address,
    args: flat,
    t: Date.now(),
  });
  if (log.length > MAX_LOG) log.shift();
}

export function renderDebugOverlay(ctx, canvas) {
  if (!debugVisible) return;

  const w = 280;
  const h = 200;
  const x = Math.round((canvas.width - w) / 2);
  const y = Math.round((canvas.height - h) / 2);

  // panel background
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  let ty = y + 8;

  drawText(ctx, "DEBUG (O to close)", x + 8, ty, "h2", {
    align: "left",
    color: "white",
  });
  ty += 12;

  drawText(ctx, `SCREEN: ${screenManager.getCurrentScreen()}`, x + 8, ty, "h2", {
    align: "left",
    color: "#FFD800",
  });
  ty += 14;

  // placed models
  const placed = models.filter((m) => m.isPlaced);
  const placedStr =
    placed.length === 0
      ? "(none)"
      : placed.map((m) => m.id).join(",");

  drawText(ctx, "PLACED:", x + 8, ty, "h2", { align: "left", color: "white" });
  ty += 10;
  drawText(ctx, placedStr, x + 8, ty, "h2", { align: "left", color: "#00FF88" });
  ty += 14;

  drawText(ctx, "OSC LOG:", x + 8, ty, "h2", { align: "left", color: "white" });
  ty += 10;

  for (const entry of [...log].reverse()) {
    const argStr = entry.args.length ? ` ${entry.args.join(" ")}` : "";
    const line = `${entry.dir} ${entry.address}${argStr}`;
    const color = entry.dir === "IN" ? "#66CCFF" : "#FF8844";
    // trim so it fits the panel
    const clipped = line.length > 40 ? line.slice(0, 40) + ".." : line;
    drawText(ctx, clipped, x + 8, ty, "h2", { align: "left", color });
    ty += 10;
    if (ty > y + h - 8) break;
  }
}