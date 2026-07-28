// src/helper/debugOverlay.js
import { models } from "./modelData.js";
import { screenManager } from "./screenManager.js";
import { drawText } from "./typography.js";
import { debugSettings, timingSettingDefinitions, adjustTimingSetting } from "./debugSettings.js";

const MAX_LOG = 8;
const log = []; // { dir: "IN"|"OUT", address, args, t }
let selectedSetting = 0;
let lastMaxHeartbeatAt = -Infinity;

export let debugVisible = false;

export function toggleDebugOverlay() {
  debugVisible = !debugVisible;
}

export function markMaxAlive() {
  lastMaxHeartbeatAt = performance.now();
}

window.addEventListener("keydown", (event) => {
  if (!debugVisible) return;
  const key = event.key.toLowerCase();
  if (!["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (key === "arrowup") {
    selectedSetting = (selectedSetting - 1 + timingSettingDefinitions.length) % timingSettingDefinitions.length;
  } else if (key === "arrowdown") {
    selectedSetting = (selectedSetting + 1) % timingSettingDefinitions.length;
  } else if (key === "arrowleft") {
    adjustTimingSetting(selectedSetting, -1, event.shiftKey);
  } else if (key === "arrowright") {
    adjustTimingSetting(selectedSetting, 1, event.shiftKey);
  }
}, true);

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

  const w = 310;
  const h = 220;
  const x = Math.round((canvas.width - w) / 2);
  const y = Math.round((canvas.height - h) / 2);

  // panel background
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const dividerX = x + 151;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.moveTo(dividerX + 0.5, y + 30);
  ctx.lineTo(dividerX + 0.5, y + h - 8);
  ctx.stroke();

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
    const clipped = line.length > 20 ? line.slice(0, 20) + ".." : line;
    drawText(ctx, clipped, x + 8, ty, "h2", { align: "left", color });
    ty += 10;
    if (ty > y + h - 8) break;
  }

  let settingsY = y + 34;
  drawText(ctx, "TIMERS (seconds)", dividerX + 8, settingsY, "h2", { align: "left", color: "white" });
  settingsY += 12;

  timingSettingDefinitions.forEach((definition, index) => {
    const selected = index === selectedSetting;
    const prefix = selected ? ">" : " ";
    drawText(ctx, `${prefix}${definition.label}: ${debugSettings[definition.key]}`, dividerX + 8, settingsY, "h2", {
      align: "left",
      color: selected ? "#FFD800" : "#CCCCCC",
    });
    settingsY += 12;
  });

  drawText(ctx, "UP/DOWN select", dividerX + 8, y + h - 34, "h2", { align: "left", color: "#888888" });
  drawText(ctx, "LEFT/RIGHT change", dividerX + 8, y + h - 22, "h2", { align: "left", color: "#888888" });

  const heartbeatElapsed = performance.now() - lastMaxHeartbeatAt;
  const heartbeatOn = heartbeatElapsed < 300 && Math.floor(heartbeatElapsed / 75) % 2 === 0;
  const heartbeatColor = heartbeatOn ? "#00FF88" : "#345047";
  ctx.fillStyle = heartbeatColor;
  ctx.beginPath();
  ctx.arc(x + w - 92, y + h - 10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, "Max Connected", x + w - 84, y + h - 13, "h2", { align: "left", color: heartbeatColor });
}
