import { screenManager } from "../screenManager.js";
import { models, getModelById } from "../modelData.js";

let currentModel = null;

export function init() {
  const selectedId = screenManager.sharedData.chosenModelId ?? 1;
  currentModel = getModelById(Number(selectedId));
  console.log("Modelnumber:", currentModel?.name, "id:", selectedId);
}

export function render(ctx, canvas) {
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "24px monospace";
  ctx.textAlign = "center";
  const displayName = currentModel ? currentModel.name : "Unknown";
  ctx.fillText(`Please pick up Model number ${displayName} from the library.`, canvas.width / 2, canvas.height / 2);
}

export function cleanup() {
  // todo
}