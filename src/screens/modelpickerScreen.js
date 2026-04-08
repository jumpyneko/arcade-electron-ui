// src/screens/modelpickerScreen.js
import { screenManager } from "../helper/screenManager.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../helper/timer.js";
import { modelPicked } from "../communication/maxOutput.js";
import { drawText } from "../helper/typography.js";
import { COLORS } from "../helper/colors.js";
import { Sprite } from "../helper/sprite.js";
import { drawAttributeNet } from "../helper/attributeNet.js";
import { drawAttributeSliders } from "../helper/attributeSliders.js";



let slotModels = [];
let focusIndex = 0;
const imageCache = new Map();
const TIMER_SECONDS = 500;//80;

const MODEL_IMG_SIZE = 48;
const spriteCache = new Map(); // key: model.image, value: Sprite
let activeSprite = null;
let activeSpriteKey = null;

/** Word-wrap for bitmap text: maxCharsPerLine ≈ panel width / 6px at scale 1 */
function wrapBitmapText(text, maxCharsPerLine) {
  const words = String(text ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = "";

  const pushLong = (w) => {
    let rest = w;
    while (rest.length > maxCharsPerLine) {
      lines.push(rest.slice(0, maxCharsPerLine));
      rest = rest.slice(maxCharsPerLine);
    }
    return rest;
  };

  for (const w of words) {
    const piece = w.length > maxCharsPerLine ? pushLong(w) : w;
    if (!piece) continue;
    const test = line ? `${line} ${piece}` : piece;
    if (test.length > maxCharsPerLine) {
      if (line) lines.push(line);
      line = piece;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

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

  startTimer(TIMER_SECONDS, () => {
    pickModel();
  });

  const first = slotModels[focusIndex];
  if (first?.image) {
    activeSpriteKey = first.image;
    activeSprite = spriteCache.get(activeSpriteKey);
    if (!activeSprite) {
      activeSprite = new Sprite(activeSpriteKey, 48, 48, 2, 8);
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
      activeSprite = new Sprite(key, 48, 48, 2, 8);
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

  //draw attribute net
  /*const rightPanelCx = canvas.width * 0.75; // 240 bei 320px
  const netCy = 100;
  const netR = 52;
  drawAttributeNet(ctx, rightPanelCx, netCy, netR, model, {
    strokeGrid: "#3d3248",
    strokeShape: COLORS.arcadeYellow,
    node: COLORS.arcadeOrange,
  });*/

  drawAttributeSliders(ctx, 166, 36, 142, model, {
    rowStep: 28,
    labelColor: "white",
    gradientSteps: 16,
    indicatorInnerR: 3,
    indicatorOuterR: 4
  });

  // draw hint text
  drawText(ctx, "< PREV MODEL", 12, 228, "h2", { align: "left"});
  drawText(ctx, "PRESS D TO SELECT", centerX, 228, "h2", { align: "center"});
  drawText(ctx, "NEXT MODEL >", 308, 228, "h2", { align: "right"});

  drawTimer(ctx, canvas);
}

export function cleanup() {
  stopTimer();
  focusIndex = 0;
}