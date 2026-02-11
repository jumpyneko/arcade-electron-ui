// src/screens/slotmachineScreen.js
import { screenManager } from "../screenManager.js";
import { models } from "../modelData.js";

const STOP_KEY = "x";
const SLOT_STOP_DELAY_MS = 400;
const CYCLE_MS = 120;

let modelsLeft = [];
let modelsOutput = [];
let slotDisplayModels = [null, null, null]; // stores model objects instead of ids
const imageCache = new Map(); // image path -> HTMLImageElement
let isSpinning = true;
let isStopping = false;
let stopKeyHandler = null;
let cycleTimer = null;
let continueBtn = null;
let reshuffleBtn = null;

function pick3Random(fromArray) {
  if (fromArray.length < 3) return fromArray.slice();
  const shuffled = [...fromArray].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function preloadImages(modelArray) {
    for (const m of modelArray) {
      if (m.image && !imageCache.has(m.image)) {
        const img = new Image();
        img.src = m.image;
        imageCache.set(m.image, img);
      }
    }
  }

function startSpinning() {
  isSpinning = true;
  isStopping = false;
  modelsOutput = pick3Random(modelsLeft);
  slotDisplayModels = [...modelsOutput];
  removeButtons();
  cycleTimer = setInterval(() => {
    if (!isSpinning || isStopping) return;
    if (modelsLeft.length === 0) return;
    slotDisplayModels = slotDisplayModels.map(() => {
      return modelsLeft[Math.floor(Math.random() * modelsLeft.length)];
    });
  }, CYCLE_MS);
}

function stopSlotMachine() {
    if (!isSpinning || isStopping) return;
    isStopping = true;
    if (cycleTimer) {
      clearInterval(cycleTimer);
      cycleTimer = null;
    }
    slotDisplayModels[0] = modelsOutput[0];
    setTimeout(() => {
      slotDisplayModels[1] = modelsOutput[1];
      setTimeout(() => {
        slotDisplayModels[2] = modelsOutput[2];
        isSpinning = false;
        showButtons();
      }, SLOT_STOP_DELAY_MS);
    }, SLOT_STOP_DELAY_MS);
  }

function showButtons() {
  if (continueBtn) return;
  continueBtn = document.createElement("button");
  continueBtn.textContent = "Continue";
  continueBtn.style.cssText =
    "position:fixed;bottom:80px;left:50%;transform:translateX(-120px);padding:12px 24px;font-size:18px;z-index:1001;cursor:pointer;";
  continueBtn.onclick = () => screenManager.next({ slotMachineModels: modelsOutput });
  document.body.appendChild(continueBtn);

  reshuffleBtn = document.createElement("button");
  reshuffleBtn.textContent = "Reshuffle";
  reshuffleBtn.style.cssText =
    "position:fixed;bottom:80px;left:50%;transform:translateX(20px);padding:12px 24px;font-size:18px;z-index:1001;cursor:pointer;";
  reshuffleBtn.onclick = () => {
    if (modelsLeft.length < 3) return;
    removeButtons();
    startSpinning();
  };
  document.body.appendChild(reshuffleBtn);
}

function removeButtons() {
  if (continueBtn) {
    continueBtn.remove();
    continueBtn = null;
  }
  if (reshuffleBtn) {
    reshuffleBtn.remove();
    reshuffleBtn = null;
  }
}

export function init() {
  console.log("Slotmachine screen initialized");
  if (!screenManager.sharedData.modelsLeft || screenManager.sharedData.modelsLeft.length === 0) {
    screenManager.sharedData.modelsLeft = models.map((m) => ({ ...m }));
  }
  modelsLeft = screenManager.sharedData.modelsLeft;
  preloadImages(modelsLeft);

  stopKeyHandler = (e) => {
    if (e.key.toLowerCase() === STOP_KEY) stopSlotMachine();
  };
  window.addEventListener("keydown", stopKeyHandler);
  startSpinning();
}

export function render(ctx, canvas) {
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerY = canvas.height / 2;
  const slotWidth = 180;
  const gap = 40;
  const totalWidth = 3 * slotWidth + 2 * gap;
  const startX = (canvas.width - totalWidth) / 2 + slotWidth / 2 + gap / 2;

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (slotWidth + gap);
    const slotX = x - slotWidth / 2 - 8;
    const slotY = centerY - 80;
    const slotW = slotWidth + 16;
    const slotH = 160;

    // Slot background
    ctx.fillStyle = "#1a0a2e";
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(slotX, slotY, slotW, slotH);
    ctx.fill();
    ctx.stroke();

    const model = slotDisplayModels[i];
    const img = model && model.image ? imageCache.get(model.image) : null;

    if (img && img.complete && img.naturalWidth > 0) {
      // Draw image scaled to fit inside slot with some padding
      const pad = 10;
      const drawW = slotW - pad * 2;
      const drawH = slotH - pad * 2;
      ctx.drawImage(img, slotX + pad, slotY + pad, drawW, drawH);
    } else {
      // Fallback: show model id as text
      ctx.fillStyle = "white";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(model ? String(model.id) : "?", x, centerY);
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "24px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`Press ${STOP_KEY.toUpperCase()} to stop`, canvas.width / 2, centerY + 120);
}

export function cleanup() {
  if (stopKeyHandler) {
    window.removeEventListener("keydown", stopKeyHandler);
    stopKeyHandler = null;
  }
  if (cycleTimer) {
    clearInterval(cycleTimer);
    cycleTimer = null;
  }
  removeButtons();
}