// src/screens/slotmachineScreen.js
import { screenManager } from "../screenManager.js";
import { models } from "../modelData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { COLORS } from "../colors.js";
import { drawWrappedText } from "../textLayout.js";

const SLOT_STOP_DELAY_MS = 400;
const CYCLE_MS = 120;
const TIMER_SECONDS = 400;

let modelsLeft = [];
let modelsOutput = [];
let slotDisplayModels = [null, null, null];
const imageCache = new Map();
let isSpinning = true;
let isStopping = false;
let slotsStopped = false; // true after all 3 slots have landed
let cycleTimer = null;
const PX = 6; // pixel scale for chunky UI

let slotMachineFrame = null;

const FRAME_SRC = "assets/images/slotmachine2.png";
const FRAME_SIZE = 130; // source image is 180x180

// Window rects measured in source-image pixels (tune a little if needed)
const REEL_WINDOWS_SRC = [
  { x: 11, y: 51, w: 25, h: 23 }, // left
  { x: 53, y: 51, w: 25, h: 23 }, // center
  { x: 92, y: 51, w: 25, h: 23 }, // right
];

function px(v) {
  return Math.round(v / PX) * PX;
}

function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px(x), px(y), px(w), px(h));
}

function drawPixelBorder(ctx, x, y, w, h, thickness, color) {
  drawPixelRect(ctx, x, y, w, thickness, color);
  drawPixelRect(ctx, x, y + h - thickness, w, thickness, color);
  drawPixelRect(ctx, x, y, thickness, h, color);
  drawPixelRect(ctx, x + w - thickness, y, thickness, h, color);
}

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

  if (!slotMachineFrame) {
    slotMachineFrame = new Image();
    slotMachineFrame.src = FRAME_SRC;
  }

  if (!screenManager.sharedData.modelsLeft || screenManager.sharedData.modelsLeft.length === 0) {
    screenManager.sharedData.modelsLeft = models.filter((m) => !m.isPlaced).map((m) => ({ ...m }));  }
  modelsLeft = screenManager.sharedData.modelsLeft;
  preloadImages(modelsLeft);

  startTimer(TIMER_SECONDS, () => {
    if (isSpinning) {
        stopSlotMachine();
        setTimeout(() => {
          confirmAndContinue();
        }, SLOT_STOP_DELAY_MS * 2 + 200);
      } else {
        confirmAndContinue();
      }
  });

  startSpinning();
}

// --- Input handlers ---

export function onButton(action) {
  if (action === "buttonD") {
    stopSlotMachine();
  } else if (action === "buttonE") {
    confirmAndContinue();
  }
}

export function onJoystick2(x, y) {
  if (y < -0.5) reshuffle();
}

// --- Rendering ---
export function render(ctx, canvas) {
  updateTimer();

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cw = canvas.width;
  const ch = canvas.height;

  // Scale slotmachine2.png up to occupy most of the screen
  // Keep slot machine square, large, and centered
  const drawW = Math.round(Math.min(cw, ch));
  const drawH = drawW;
  const drawX = Math.round((cw - drawW) / 2);
  const drawY = Math.round((ch - drawH) / 2);

  // Source->screen scale for reel windows
  const scale = drawW / FRAME_SIZE;

  // Draw frame/background
  if (slotMachineFrame && slotMachineFrame.complete && slotMachineFrame.naturalWidth > 0) {
    ctx.drawImage(slotMachineFrame, drawX, drawY, drawW, drawH);
  }

  // Draw the 3 model reels inside the frame windows
  for (let i = 0; i < 3; i++) {
    const srcRect = REEL_WINDOWS_SRC[i];

    // Map source-image window rect to canvas
    const rx = Math.round(drawX + srcRect.x * scale);
    const ry = Math.round(drawY + srcRect.y * scale);
    const rw = Math.round(srcRect.w * scale);
    const rh = Math.round(srcRect.h * scale);

    const model = slotDisplayModels[i];
    const img = model?.image ? imageCache.get(model.image) : null;

    // Small inset so frame border remains visible
    const pad = Math.max(1, scale);
    const ix = rx + pad;
    const iy = ry + pad;
    const iw = Math.max(1, rw - pad * 2);
    const ih = Math.max(1, rh - pad * 2);

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, ix, iy, iw, ih);
    } else {
      ctx.fillStyle = "white";
      ctx.font = `${Math.max(14, Math.round(14 * scale))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(model ? String(model.id) : "?", rx + rw / 2, ry + rh / 2);
    }

    // Show model names only after all slots have fully stopped
    if (slotsStopped && model?.name) {
      const labelPadX = Math.round(1 * scale);
      const labelX = rx - labelPadX;
      const labelY = ry + rh + Math.round(5 * scale);
      const labelW = rw + labelPadX * 2;

      ctx.fillStyle = "black";
      ctx.font = `${Math.max(8, Math.round(2.4 * scale))}px Early GameBoy`;
      drawWrappedText(
        ctx,
        model.name,
        labelX,
        ch/2+170,
        labelW,
        Math.max(8, Math.round(3.8 * scale)),
        { align: "center", maxLines: 1, overflow: "ellipsis" }
      );
    }
  }
  
  // Draw the instructions text 
  ctx.fillStyle = "white";
  ctx.font = "22px Early GameBoy";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (isSpinning && !isStopping) {
    ctx.fillText("PRESS D TO STOP", cw / 2, ch / 2 + 400);
  } else if (slotsStopped) {
    ctx.fillText("E = CONTINUE    JOYSTICK DOWN = RESHUFFLE", cw / 2, ch / 2 + 400);
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