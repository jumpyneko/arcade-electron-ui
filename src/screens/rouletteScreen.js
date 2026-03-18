// src/screens/rouletteScreen.js
import { screenManager } from "../screenManager.js";
import { POVS } from "../povData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { startPlaymode } from "../maxOutput.js";
import { COLORS } from "../colors.js";
import { s } from "../uiScale.js";
import { FONTS } from "../typography.js";

// State variables
let wheelAngle = 0;
let targetAngle = 0;
let isSpinning = false;
let isStopping = false;
let spinSpeed = 0;
let deceleration = 0.02;
let targetPovId = null; // POV id received from Max (via nextPOV)
let innerCircleImage = null;
const INNER_CIRCLE_SRC = "assets/images/innerCircle.png";

const TIMER_SECONDS = 10;

const PIXEL_SCALE = s(4); // each drawn pixel becomes a 4×4 block on screen
let wheelOffscreen = null;
let wheelOffCtx = null;


const NUM_SECTORS = POVS.length;
const SECTOR_ANGLE = (2 * Math.PI) / NUM_SECTORS;

const sectorIcons = new Map(); // key: pov.id, value: HTMLImageElement

const TWO_PI = Math.PI * 2;
const OUTER_RING_THICKNESS = 3;
const OUTER_RING_STRIPE_INNER = 2;
const OUTER_RING_STRIPE_OUTER = 1;
const CENTER_RING_THICKNESS = 1;
const SEPARATOR_THICKNESS = 0.015;

function normalizeAngle(angle) {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

function putPixel(data, offW, offH, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= offW || y < 0 || y >= offH) return;
  const p = (y * offW + x) * 4;
  data[p] = r;
  data[p + 1] = g;
  data[p + 2] = b;
  data[p + 3] = a;
}

function preloadSectorIcons() {
  for (const pov of POVS) {
    const img = new Image();
    img.src = pov.icon;
    sectorIcons.set(pov.id, img);
  }
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF];
}

export function init() {
  console.log("Roulette screen initialized");

  // Reset state
  wheelAngle = 0;
  targetAngle = 0;
  isSpinning = false;
  isStopping = false;
  spinSpeed = 0;
  targetPovId = null;

  if (!innerCircleImage) {
    innerCircleImage = new Image();
    innerCircleImage.src = INNER_CIRCLE_SRC;
  }

  preloadSectorIcons();

  // Start the countdown — auto-stops when it expires
  startTimer(TIMER_SECONDS, () => {
    stopSpin();
  });

  // Wheel starts spinning immediately
  startSpin();
}

// --- Input handlers ---

export function onButton(action) {
  if (action === "buttonA") {
    stopSpin();
  }
}

export function onData(type, data) {
  if (type === "nextPOV") {
    targetPovId = data; // Max tells us which POV the wheel should land on
    console.log(`Roulette received target POV: ${targetPovId}`);
  }
}

// --- Wheel logic ---

function startSpin() {
  if (isSpinning) return;
  isSpinning = true;
  isStopping = false;
  spinSpeed = 0.06;
}

function stopSpin() {
  if (!isSpinning || isStopping) return;
  isStopping = true;

  // Determine which sector to land on
  let landingSector;
  if (targetPovId != null) {
    // Max told us the POV — find its index (0-based)
    landingSector = POVS.findIndex(p => p.id === targetPovId);
    if (landingSector === -1) landingSector = Math.floor(Math.random() * NUM_SECTORS);
  } else {
    // No instruction from Max — pick random
    landingSector = Math.floor(Math.random() * NUM_SECTORS);
  }

  // The pointer sits at -π/2 (top of canvas).
  // We need the wheel rotated so that sector landingSector's center is under the pointer.
  // Sector center in wheel-local coords = landingSector * SECTOR_ANGLE + SECTOR_ANGLE / 2
  // Pointer in wheel-local coords = -π/2 - wheelAngle
  // We want: -π/2 - targetAngle ≡ sectorCenter (mod 2π)
  // So:      targetAngle = -π/2 - sectorCenter

  const sectorCenter = landingSector * SECTOR_ANGLE + SECTOR_ANGLE / 2;
  let baseAngle = -Math.PI / 2 - sectorCenter;

  // Normalize baseAngle into [0, 2π)
  baseAngle = ((baseAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

  // Advance past current wheelAngle, then add extra full rotations for drama
  const randomRotations = 3 + Math.floor(Math.random() * 5);
  const fullRotationsNeeded = Math.ceil((wheelAngle - baseAngle) / (2 * Math.PI));
  targetAngle = baseAngle + (fullRotationsNeeded + randomRotations) * (2 * Math.PI);
}

function updateWheel() {
  if (!isSpinning) return;

  if (isStopping) {
    spinSpeed = Math.max(0, spinSpeed - deceleration);
    wheelAngle += spinSpeed;

    if (spinSpeed <= 0.001) {
      wheelAngle = targetAngle;
      isSpinning = false;
      isStopping = false;

      // Stop the timer (player pressed in time, or timer already expired)
      stopTimer();

      // Determine which sector the pointer landed on
      const pointerAngle = -Math.PI / 2;
      const localAngleUnderPointer =
        ((pointerAngle - wheelAngle) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
      const sectorIndex = Math.floor(localAngleUnderPointer / SECTOR_ANGLE) % NUM_SECTORS;
      const povId = POVS[sectorIndex].id;
      console.log(`Wheel stopped on POV: ${povId}`);

      // Tell Max to start playmode with this POV
      startPlaymode(povId);

      // Move to next screen after a short delay
      const DELAY_MS = 3000;
      setTimeout(() => {
        //screenManager.next({ lastRouletteSector: povId });
      }, DELAY_MS);
    }
  } else {
    wheelAngle += spinSpeed;
    spinSpeed = Math.min(spinSpeed + 0.002, 0.12);
  }
}

function drawWheelPixels(data, offW, offH, sCX, sCY, sR, centerCircleR, wheelAngle) {
  const [color1R, color1G, color1B] = hexToRgb(COLORS.arcadeBlue);
  const [color2R, color2G, color2B] = hexToRgb(COLORS.arcadeYellow);
  const [centerR, centerG, centerB] = hexToRgb(COLORS.arcadeOrange);
  const [outerR, outerG, outerB] = hexToRgb(COLORS.arcadeDarkBlue);

  for (let py = 0; py < offH; py++) {
    for (let px = 0; px < offW; px++) {
      const dx = px - sCX;
      const dy = py - sCY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > sR) continue;

      // Outer ring
      if (dist > sR - OUTER_RING_THICKNESS) {
        putPixel(data, offW, offH, px, py, outerR, outerG, outerB, 255);

        // Stripe centered in outer ring
        if (dist > sR - OUTER_RING_STRIPE_INNER && dist <= sR - OUTER_RING_STRIPE_OUTER) {
          putPixel(data, offW, offH, px, py, color1R, color1G, color1B, 255);
        }
        continue;
      }

      // Ring around center circle
      if (dist > centerCircleR && dist <= centerCircleR + CENTER_RING_THICKNESS) {
        putPixel(data, offW, offH, px, py, outerR, outerG, outerB, 255);
        continue;
      }

      // Center fill (image can draw over this later)
      if (dist <= centerCircleR) {
        putPixel(data, offW, offH, px, py, centerR, centerG, centerB, 255);
        continue;
      }

      let angle = normalizeAngle(Math.atan2(dy, dx) - wheelAngle);
      const sectorIndex = Math.floor(angle / SECTOR_ANGLE) % NUM_SECTORS;

      // Separator lines
      const angleInSector = angle - sectorIndex * SECTOR_ANGLE;
      if (angleInSector < SEPARATOR_THICKNESS || angleInSector > SECTOR_ANGLE - SEPARATOR_THICKNESS) {
        putPixel(data, offW, offH, px, py, outerR, outerG, outerB, 255);
        continue;
      }

      if (sectorIndex % 2 === 0) {
        putPixel(data, offW, offH, px, py, color1R, color1G, color1B, 255);
      } else {
        putPixel(data, offW, offH, px, py, color2R, color2G, color2B, 255);
      }
    }
  }
}

function drawPointerPixels(data, offW, offH, sCX, sCY, sR) {
  const [fillR, fillG, fillB] = hexToRgb(COLORS.arcadeOrange);
  const [outR, outG, outB] = hexToRgb(COLORS.arcadeDarkBlue);

  const rimY = Math.floor(sCY - sR);
  const pointerBaseY = rimY - 2; // 2 px outside
  const pointerTipY = rimY + 5;  // overlap into wheel
  const pointerHalfBase = 4;

  for (let y = pointerBaseY; y <= pointerTipY; y++) {
    const t = (y - pointerBaseY) / Math.max(1, pointerTipY - pointerBaseY);
    const half = Math.round(pointerHalfBase * (1 - t));
    for (let x = sCX - half; x <= sCX + half; x++) {
      putPixel(data, offW, offH, x, y, fillR, fillG, fillB, 255);
    }
  }

  // outline
  for (let y = pointerBaseY; y <= pointerTipY; y++) {
    const t = (y - pointerBaseY) / Math.max(1, pointerTipY - pointerBaseY);
    const half = Math.round(pointerHalfBase * (1 - t));
    putPixel(data, offW, offH, sCX - half, y, outR, outG, outB, 255);
    putPixel(data, offW, offH, sCX + half, y, outR, outG, outB, 255);
  }
  for (let x = sCX - pointerHalfBase; x <= sCX + pointerHalfBase; x++) {
    putPixel(data, offW, offH, x, pointerBaseY, outR, outG, outB, 255);
  }
  putPixel(data, offW, offH, sCX, pointerTipY, outR, outG, outB, 255);
}

function drawCenterImage(ctx, innerImage, mainWheelCX, mainWheelCY, mainCenterR) {
  if (!innerImage || !innerImage.complete) return;

  const ringInset = PIXEL_SCALE;
  const imageR = Math.max(1, mainCenterR - ringInset);
  const d = imageR * 2;
  const dx = Math.round(mainWheelCX - imageR);
  const dy = Math.round(mainWheelCY - imageR);

  ctx.save();
  ctx.beginPath();
  ctx.arc(mainWheelCX, mainWheelCY, imageR, 0, TWO_PI);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(innerImage, dx-s(2), dy-s(2), d, d);
  ctx.restore();
}

function drawSectorIcons(ctx, centerX, centerY, radius, wheelAngle) {

  const iconRadius = radius * 0.72;
  const ICON_SIZE = s(40);

  for (let i = 0; i < NUM_SECTORS; i++) {
    const angle = i * SECTOR_ANGLE + SECTOR_ANGLE / 2 + wheelAngle;
    const x = centerX + Math.cos(angle) * iconRadius;
    const y = centerY + Math.sin(angle) * iconRadius;

    const pov = POVS[i];
    const icon = sectorIcons.get(pov.id);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    if (icon && icon.complete) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon, -ICON_SIZE / 2, -ICON_SIZE / 2, ICON_SIZE, ICON_SIZE);
    }

    ctx.restore();
  }
}

// --- Rendering ---

export function render(ctx, canvas) {
  // Background
  
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update timer (checks expiry)
    updateTimer();

    // Update wheel animation
    updateWheel();

    //Draw wheel
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.4;

    const margin = 30;
    const wheelBox = radius * 2 + margin * 2;
    const offW = Math.ceil(wheelBox / PIXEL_SCALE);
    const offH = Math.ceil(wheelBox / PIXEL_SCALE);

    if (!wheelOffscreen || wheelOffscreen.width !== offW || wheelOffscreen.height !== offH) {
      wheelOffscreen = document.createElement("canvas");
      wheelOffscreen.width = offW;
      wheelOffscreen.height = offH;
      wheelOffCtx = wheelOffscreen.getContext("2d");
    }

    wheelOffCtx.clearRect(0, 0, offW, offH);
    wheelOffCtx.imageSmoothingEnabled = false;

    const sR = radius / PIXEL_SCALE;
    const sCX = offW / 2;
    const sCY = offH / 2;
    const centerCircleR = sR * 0.38;

    const imageData = wheelOffCtx.createImageData(offW, offH);
    const data = imageData.data;

    drawWheelPixels(data, offW, offH, sCX, sCY, sR, centerCircleR, wheelAngle);
    drawPointerPixels(data, offW, offH, sCX, sCY, sR);

    wheelOffCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    const destW = offW * PIXEL_SCALE;
    const destH = offH * PIXEL_SCALE;
    const destX = centerX - destW / 2;
    const destY = centerY - destH / 2;
    ctx.drawImage(wheelOffscreen, 0, 0, offW, offH, destX, destY, destW, destH);

    const mainWheelCX = Math.round(destX + sCX * PIXEL_SCALE);
    const mainWheelCY = Math.round(destY + sCY * PIXEL_SCALE);
    const mainCenterR = Math.round(centerCircleR * PIXEL_SCALE);

    drawCenterImage(ctx, innerCircleImage, mainWheelCX + 1.5, mainWheelCY + 1.5, mainCenterR);
    drawSectorIcons(ctx, centerX, centerY, radius, wheelAngle);

    // Hint text
    ctx.fillStyle = "white";
    ctx.font = FONTS.h3
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Press A to stop", centerX, centerY + radius + s(20));

    // Draw countdown timer (top-right)
    drawTimer(ctx, canvas);
}

export function cleanup() {
  stopTimer();
  targetPovId = null;
}