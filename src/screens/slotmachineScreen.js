// src/screens/slotmachineScreen.js
import { screenManager } from "../helper/screenManager.js";
import { models } from "../helper/modelData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../helper/timer.js";
import { Sprite } from "../helper/sprite.js";
import { drawText } from "../helper/typography.js";

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
let slotSprite = null;

let buttonImage_D = null;
let buttonImage_E = null;
let joystickImage = null;


const modelSize = 48; // every model is 48x48

// upper left corner of every 48x48 model
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

  buttonImage_D = new Image();
  buttonImage_D.src = "assets/images/UI/button_D.png";
  buttonImage_E = new Image();
  buttonImage_E.src = "assets/images/UI/button_E.png";
  joystickImage = new Image();
  joystickImage.src = "assets/images/UI/joystick_down.png";

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
    const iw = modelSize;
    const ih = modelSize;
    const model = slotDisplayModels[i];
    const modelSprite = new Sprite(model.image, 48, 48, 2, 8);

    modelSprite.currentFrame = 0;
    modelSprite.draw(ctx, ix + 24, iy + 24, 1);
  }

  // draw hint text
  if (isSpinning && !isStopping) {
    // Load button image
    if (buttonImage_D && buttonImage_D.complete) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buttonImage_D, centerX - 20, 224, 12, 12);
      drawText(ctx, "STOP", centerX, 228, "h2", { align: "left"});
    } else {
      drawText(ctx, "PRESS D TO STOP", centerX, 228, "h2", { align: "center"});
    }
    //drawText(ctx, "PRESS D TO STOP", centerX, centerY + 100, "h2", { align: "center"});
  } else if (slotsStopped) {
    if (buttonImage_E && buttonImage_E.complete && joystickImage && joystickImage.complete) {
      ctx.imageSmoothingEnabled = false;
      
      ctx.drawImage(buttonImage_E, centerX - 100, 224, 12, 12);
      drawText(ctx, "CONTINUE", centerX - 80 , 228, "h2", { align: "left"});

      ctx.drawImage(joystickImage, centerX + 25, 224, 12, 12);
      drawText(ctx, "RESHUFFLE", centerX + 45 , 228, "h2", { align: "left"});

    } else {
      drawText(ctx, "PRESS D TO STOP", centerX, 228, "h2", { align: "center"});
    }
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
  isSpinning = false;
  isStopping = false;
  modelsOutput = [];
  slotDisplayModels = [null, null, null];
}