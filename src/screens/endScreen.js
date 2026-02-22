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
  const text = `Pick your Miniature ${displayName} from the library, and place it in The Model Nation. You may visit it anytime.`;

  wrapText(ctx, text, canvas.width / 2, canvas.height / 2 - 40, canvas.width - 120, 36);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

export function onData(type, data) {
  if (type === "restartGame") {
    screenManager.restartGame();
  }
}

export function cleanup() {
  // todo
}