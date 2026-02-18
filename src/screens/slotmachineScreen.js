// src/screens/slotmachineScreen.js
import { screenManager } from "../screenManager.js";
import { models } from "../modelData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";

const SLOT_STOP_DELAY_MS = 400;
const CYCLE_MS = 120;
const TIMER_SECONDS = 40;

let modelsLeft = [];
let modelsOutput = [];
let slotDisplayModels = [null, null, null];
const imageCache = new Map();
let isSpinning = true;
let isStopping = false;
let slotsStopped = false; // true after all 3 slots have landed
let cycleTimer = null;

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
  slotsStopped = false;
  modelsOutput = pick3Random(modelsLeft);
  slotDisplayModels = [...modelsOutput];
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
      slotsStopped = true;
    }, SLOT_STOP_DELAY_MS);
  }, SLOT_STOP_DELAY_MS);
}

function reshuffle() {
  if (isSpinning) return;
  if (modelsLeft.length < 3) return;
  startSpinning();
}

function confirmAndContinue() {
  if (!slotsStopped) return;
  screenManager.next({ slotMachineModels: modelsOutput });
}

// --- Lifecycle ---

export function init() {
  console.log("Slotmachine screen initialized");
  //document.body.classList.add("flipped");

  if (!screenManager.sharedData.modelsLeft || screenManager.sharedData.modelsLeft.length === 0) {
    screenManager.sharedData.modelsLeft = models.map((m) => ({ ...m }));
  }
  modelsLeft = screenManager.sharedData.modelsLeft;
  preloadImages(modelsLeft);

  startTimer(TIMER_SECONDS, () => {
    if (isSpinning) stopSlotMachine();
  });

  startSpinning();
}

// --- Input handlers ---

export function onButton(action) {
  if (action === "buttonC") {
    stopSlotMachine();
  } else if (action === "buttonD") {
    confirmAndContinue();
  }
}

export function onJoystick(x, y) {
  if (y < -0.5) {
    reshuffle();
  }
}

// --- Rendering ---

export function render(ctx, canvas) {
  updateTimer();

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
      const pad = 10;
      const drawW = slotW - pad * 2;
      const drawH = slotH - pad * 2;
      ctx.drawImage(img, slotX + pad, slotY + pad, drawW, drawH);
    } else {
      ctx.fillStyle = "white";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(model ? String(model.id) : "?", x, centerY);
    }
  }

  // Hint text
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "24px monospace";
  ctx.textAlign = "center";
  if (isSpinning && !isStopping) {
    ctx.fillText("Press C to stop", canvas.width / 2, centerY + 120);
  } else if (slotsStopped) {
    ctx.fillText("D = continue  |  Joystick ↓ = reshuffle", canvas.width / 2, centerY + 120);
  }

  drawTimer(ctx, canvas);
}

export function cleanup() {
  stopTimer();
  if (cycleTimer) {
    clearInterval(cycleTimer);
    cycleTimer = null;
  }
  slotsStopped = false;
}