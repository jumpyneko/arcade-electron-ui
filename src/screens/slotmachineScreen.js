// src/screens/slotmachineScreen.js
import { screenManager } from "../screenManager.js";
import { models } from "../modelData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { Sprite } from "../sprite.js";
import { drawWrappedText } from "../textLayout.js";
import { drawText } from "../typography.js";

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
let slotSprite = null;

//const FRAME_SRC = "assets/images/slotmachine5.png";
//const FRAME_SIZE = 180; // source image is 180x180

const LOGICAL_W = 320;
const LOGICAL_H = 240;
const THUMB = 48; // jedes Modell genau 60×60
// Obere linke Ecke jedes 60×60-Feldes (Canvas-Koordinaten 0..320, 0..240)
// Werte an deine Grafik anpassen, bis es passt:
const REEL_TOP_LEFT = [
  { x: 67, y: 120 },   // links
  { x: 136, y: 120 }, // mitte
  { x: 205, y: 120 }, // rechts
];

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

  slotSprite = new Sprite("assets/sprites/slotSprite.png", 320, 240, 2, 8);

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
  updateTimer();

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isSpinning) {
    slotSprite.update();
    slotSprite.draw(ctx, centerX, centerY + 20, 1);
  } else {
    slotSprite.currentFrame = 1;
    slotSprite.draw(ctx, centerX, centerY + 20, 1);
  }

  for (let i = 0; i < 3; i++) {
    const { x, y } = REEL_TOP_LEFT[i];
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = THUMB;
    const ih = THUMB;
    const model = slotDisplayModels[i];
    const img = model?.image ? imageCache.get(model.image) : null;

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, ix, iy, iw, ih);
    }
    if (slotsStopped && model?.name) {
     // drawText(ctx, model.name, ix, iy + ih + 4, "h2", { align: "center"});
     
    /*  drawWrappedText(
        ctx,
        model.name,
        ix,
        iy + ih + 4,
        iw,
        10, // Zeilenhöhe – ggf. anpassen
        { align: "center", maxLines: 2, overflow: "ellipsis" }
      );*/
    }
  }

  // Hinweise – cw/ch statt undefined:
  if (isSpinning && !isStopping) {
    drawText(ctx, "PRESS D TO STOP", centerX, centerY + 100, "h2", { align: "center"});
  } else if (slotsStopped) {
    drawText(ctx, "PRESS E TO CONTINUE or JOYSTICK DOWN TO RESHUFFLE", centerX, centerY + 100, "h2", { align: "center"});
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