import { screenManager } from "../screenManager.js";
import { POVS, getPovById } from "../povData.js";

let currentPov = null;

export function init() {
  const selectedId = screenManager.sharedData.lastRouletteSector ?? 1;
  currentPov = getPovById(Number(selectedId));
  console.log("Playmode screen initialized, POV:", currentPov?.name, "id:", selectedId);
}

export function render(ctx, canvas) {
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "48px monospace";
  ctx.textAlign = "center";
  const displayName = currentPov ? currentPov.name : "Unknown";
  ctx.fillText(`playmode ${displayName} was started`, canvas.width / 2, canvas.height / 2);
}

export function cleanup() {
  // todo
}