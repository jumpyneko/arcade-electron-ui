// src/screens/modelpickerScreen.js
import { screenManager } from "../helper/screenManager.js";
import { isTimerRunning, setTimerExpireCallback, startTimer, stopTimer, updateTimer, drawTimer } from "../helper/timer.js";
import { drawText, wrapBitmapText } from "../helper/typography.js";
import { COLORS } from "../helper/colors.js";
import { Sprite } from "../helper/sprite.js";
import { drawAttributeSliders } from "../helper/attributeSliders.js";



let slotModels = [];
let focusIndex = 0;
const imageCache = new Map();
const TIMER_SECONDS = 500;//80;

const MODEL_IMG_SIZE = 48;
const spriteCache = new Map(); // key: model.image, value: Sprite
let activeSprite = null;
let activeSpriteKey = null;

let buttonImage = null;
let joystickImage_left = null;
let joystickImage_right = null;

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

  console.log(`Model picked: ${model.name} (id ${id})`);

  // Change from original: defer the Max output until the player confirms a nickname on nameScreen.
  const DELAY_MS = 1000;
  setTimeout(() => {
    screenManager.next({ chosenModelId: id });
  }, DELAY_MS);
}

export function init() {
  console.log("Modelpicker screen initialized");
  slotModels = screenManager.sharedData.slotMachineModels || [];
  focusIndex = 0;
  preloadImages();

  buttonImage = new Image();
  buttonImage.src = "assets/images/UI/button_D.png";
  joystickImage_left = new Image();
  joystickImage_left.src = "assets/images/UI/joystick_left.png";
  joystickImage_right = new Image();
  joystickImage_right.src = "assets/images/UI/joystick_right.png";

  if (isTimerRunning()) {
    // Reuse the slotmachine timer and only replace what happens when it expires here.
    setTimerExpireCallback(() => {
      pickModel();
    });
  } else {
    startTimer(TIMER_SECONDS, () => {
      pickModel();
    });
  }

  const first = slotModels[focusIndex];
  if (first?.image) {
    activeSpriteKey = first.image;
    activeSprite = spriteCache.get(activeSpriteKey);
    if (!activeSprite) {
      activeSprite = new Sprite(activeSpriteKey, 48, 48, 2, 16);
      spriteCache.set(activeSpriteKey, activeSprite);
    }
    activeSprite.reset();
  }
}

export function onButton(action) {
  if (action === "buttonD") {
    pickModel();
  }
}

export function onJoystick2(x, y) {
  if (slotModels.length === 0) return;
  if (x > 0.5) {
    focusIndex = (focusIndex + 1) % slotModels.length;
    updateSprite(); 
  } else if (x < -0.5) {
    focusIndex = (focusIndex - 1 + slotModels.length) % slotModels.length;
    updateSprite();
  }
}

export function updateSprite() {
  const m = slotModels[focusIndex];
  const key = m?.image;
  if (key && key !== activeSpriteKey) {
    activeSpriteKey = key;
    activeSprite = spriteCache.get(key);
    if (!activeSprite) {
      activeSprite = new Sprite(key, 48, 48, 2, 16);
      spriteCache.set(key, activeSprite);
    }
    activeSprite.reset();
  }
}

export function render(ctx, canvas) {
  updateTimer();

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const halfW = canvas.width / 2;
  const leftCenterX = 12;

  const centerX = canvas.width / 2;
  const textWidthPx = centerX - 12;
  const maxChars = Math.max(8, Math.floor(centerX / 6));

  if (slotModels.length === 0) {
    drawText(ctx, "No models", leftCenterX, canvas.height / 2, "h1", {
      align: "center",
      color: "white",
    });
    drawTimer(ctx, canvas);
    return;
  }

  let imgY = 36
  const model = slotModels[focusIndex];
  
  if (activeSprite) {
    activeSprite.update();
    activeSprite.draw(ctx, leftCenterX + 48, imgY + 48, 2);
  }

  let y = imgY + MODEL_IMG_SIZE * 2 + 8;

  drawText(ctx, model.name, leftCenterX, 12, "h1", {
    align: "left",
    color: COLORS.arcadeYellow,
  });

  const descText = wrapBitmapText(model.description ?? "", maxChars);
  drawText(ctx, descText, leftCenterX, y, "h2", {
    align: "left"
  });

  drawAttributeSliders(ctx, 166, 36, 142, model, {
    rowStep: 28,
    labelColor: "white",
    gradientSteps: 16,
    indicatorInnerR: 3,
    indicatorOuterR: 4
  });

  // draw hint text left
  if (joystickImage_left && joystickImage_left.complete) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(joystickImage_left, 12, 224, 12, 12);
    drawText(ctx, "PREV MODEL", 32 , 228, "h2", { align: "left"});
  } else {
    drawText(ctx, "< PREV MODEL", 12, 228, "h2", { align: "left"});
  }

  // draw hint text middle
  if (buttonImage && buttonImage.complete) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buttonImage, centerX - 25, 224, 12, 12);
    drawText(ctx, "SELECT", centerX - 5 , 228, "h2", { align: "left"});
  } else {
    drawText(ctx, "D  SELECT", centerX, 228, "h2", { align: "center"});
  }

  // draw hint text right
  if (joystickImage_right && joystickImage_right.complete) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(joystickImage_right, 296, 224, 12, 12);
    drawText(ctx, "NEXT MODEL", 290 , 228, "h2", { align: "right"});
  } else {
    drawText(ctx, "NEXT MODEL >", 308, 228, "h2", { align: "right"});
  }

  drawTimer(ctx, canvas);
}

export function cleanup() {
  // Do not stop the timer here; nameScreen continues using it.
  focusIndex = 0;
}
