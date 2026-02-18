// src/screens/modelpickerScreen.js
import { screenManager } from "../screenManager.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { modelPicked } from "../maxOutput.js";

let slotModels = [];
let focusIndex = 0;
const imageCache = new Map();
const TIMER_SECONDS = 80;

function preloadImages() {
  for (const m of slotModels) {
    if (m.image && !imageCache.has(m.image)) {
      const img = new Image();
      img.src = m.image;
      imageCache.set(m.image, img);
    }
  }
}

function pickModel() {
  if (slotModels.length === 0) return;
  const model = slotModels[focusIndex];
  const id = model.id;

  if (screenManager.sharedData.modelsLeft) {
    screenManager.sharedData.modelsLeft = screenManager.sharedData.modelsLeft.filter(
      (m) => m.id !== id
    );
  }

  stopTimer();
  console.log(`Model picked: ${model.name} (id ${id})`);
  modelPicked(id);

  const DELAY_MS = 3000;
  setTimeout(() => {
    screenManager.next({ chosenModelId: id });
  }, DELAY_MS);
}

// --- Lifecycle ---

export function init() {
  console.log("Modelpicker screen initialized");
  slotModels = screenManager.sharedData.slotMachineModels || [];
  focusIndex = 0;
  preloadImages();

  startTimer(TIMER_SECONDS, () => {
    pickModel();
  });
}

// --- Input handlers ---

export function onButton(action) {
  if (action === "buttonE") {
    pickModel();
  }
}

export function onJoystick(x, y) {
  if (slotModels.length === 0) return;
  if (x > 0.5) {
    focusIndex = (focusIndex + 1) % slotModels.length;
  } else if (x < -0.5) {
    focusIndex = (focusIndex - 1 + slotModels.length) % slotModels.length;
  }
}

// --- Rendering ---

export function render(ctx, canvas) {
  updateTimer();

  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = "white";
  ctx.font = "36px monospace";
  ctx.textAlign = "center";
  ctx.fillText("Choose a model", canvas.width / 2, 80);

  // Layout the 3 model cards
  const cardWidth = 280;
  const cardHeight = 340;
  const gap = 40;
  const totalWidth = slotModels.length * cardWidth + (slotModels.length - 1) * gap;
  const startX = (canvas.width - totalWidth) / 2;
  const cardY = (canvas.height - cardHeight) / 2;

  for (let i = 0; i < slotModels.length; i++) {
    const model = slotModels[i];
    const x = startX + i * (cardWidth + gap);
    const isFocused = i === focusIndex;

    // Card background + highlight
    if (isFocused) {
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(x - 6, cardY - 6, cardWidth + 12, cardHeight + 12);
    }
    ctx.fillStyle = isFocused ? "#3a2060" : "#1a0a2e";
    ctx.fillRect(x, cardY, cardWidth, cardHeight);

    // Border
    ctx.strokeStyle = isFocused ? "#FFD700" : "#555";
    ctx.lineWidth = isFocused ? 3 : 1;
    ctx.strokeRect(x, cardY, cardWidth, cardHeight);

    // Model image
    const img = model.image ? imageCache.get(model.image) : null;
    const imgPad = 15;
    const imgH = 200;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x + imgPad, cardY + imgPad, cardWidth - imgPad * 2, imgH);
    } else {
      ctx.fillStyle = "#333";
      ctx.fillRect(x + imgPad, cardY + imgPad, cardWidth - imgPad * 2, imgH);
      ctx.fillStyle = "#888";
      ctx.font = "20px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No image", x + cardWidth / 2, cardY + imgPad + imgH / 2);
    }

    // Model name
    ctx.fillStyle = isFocused ? "#FFD700" : "white";
    ctx.font = isFocused ? "bold 22px monospace" : "20px monospace";
    ctx.textAlign = "center";
    ctx.fillText(model.name, x + cardWidth / 2, cardY + imgH + 50);

    // Model id
    ctx.fillStyle = "#aaa";
    ctx.font = "16px monospace";
    ctx.fillText(`#${model.id}`, x + cardWidth / 2, cardY + imgH + 80);
  }

  // Hint text
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "22px monospace";
  ctx.textAlign = "center";
  ctx.fillText("← → Joystick to browse  |  E to select", canvas.width / 2, canvas.height - 50);

  drawTimer(ctx, canvas);
}

export function cleanup() {
  stopTimer();
  focusIndex = 0;
}