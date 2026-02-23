// src/screens/rouletteScreen.js
import { screenManager } from "../screenManager.js";
import { POVS } from "../povData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { startPlaymode } from "../maxOutput.js";
import { COLORS } from "../colors.js";

// State variables
let wheelAngle = 0;
let targetAngle = 0;
let isSpinning = false;
let isStopping = false;
let spinSpeed = 0;
let deceleration = 0.02;
let targetPovId = null; // POV id received from Max (via nextPOV)

const TIMER_SECONDS = 20;

const PIXEL_SCALE = 4; // each drawn pixel becomes a 4×4 block on screen
let wheelOffscreen = null;
let wheelOffCtx = null;


const NUM_SECTORS = POVS.length;
const SECTOR_ANGLE = (2 * Math.PI) / NUM_SECTORS;

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

// --- Rendering ---

export function render(ctx, canvas) {
  // Background
  
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  


  // Update timer (checks expiry)
  updateTimer();

  // Update wheel animation
  updateWheel();

  // Draw wheel
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.35;

    // --- Pixel-art wheel via offscreen canvas ---
    const margin = 30; // room for pointer above wheel
    const wheelBox = radius * 2 + margin * 2;
    const offW = Math.ceil(wheelBox / PIXEL_SCALE);
    const offH = Math.ceil(wheelBox / PIXEL_SCALE);
  
    // Create / resize offscreen canvas once
    if (!wheelOffscreen || wheelOffscreen.width !== offW || wheelOffscreen.height !== offH) {
      wheelOffscreen = document.createElement("canvas");
      wheelOffscreen.width = offW;
      wheelOffscreen.height = offH;
      wheelOffCtx = wheelOffscreen.getContext("2d");
    }
  
    wheelOffCtx.clearRect(0, 0, offW, offH);
    wheelOffCtx.imageSmoothingEnabled = false;
  
    const sR = radius / PIXEL_SCALE; // small radius
    const sCX = offW / 2;
    const sCY = offH / 2;
  
    // Rotate and draw sectors
        // --- Pixel-perfect wheel via ImageData (no anti-aliasing) ---
        const imageData = wheelOffCtx.createImageData(offW, offH);
        const data = imageData.data;
    
        const [color1R, color1G, color1B] = hexToRgb(COLORS.arcadeBlue); // nonHuman
        const [color2R, color2G, color2B] = hexToRgb(COLORS.arcadeYellow); // human
        const [centerR, centerG, centerB] = hexToRgb("#FFFFFF"); // white
    
        const centerCircleR = sR * 0.15;
    
        for (let py = 0; py < offH; py++) {
          for (let px = 0; px < offW; px++) {
            const dx = px - sCX;
            const dy = py - sCY;
            const dist = Math.sqrt(dx * dx + dy * dy);
    
            if (dist > sR) continue; // outside wheel
    
            const idx = (py * offW + px) * 4;

            // Outer ring (white, 2px thick at small scale)
            if (dist > sR - 2) {
              data[idx]     = 0xFF;
              data[idx + 1] = 0xFF;
              data[idx + 2] = 0xFF;
              data[idx + 3] = 255;
              continue;
            }
    
            // Center circle
            if (dist <= centerCircleR) {
              data[idx]     = centerR;
              data[idx + 1] = centerG;
              data[idx + 2] = centerB;
              data[idx + 3] = 255;
              continue;
            }
    
            // Calculate angle in wheel-local coords (subtract wheelAngle for rotation)
            let angle = Math.atan2(dy, dx) - wheelAngle;
            // Normalize to [0, 2π)
            angle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
            const sectorIndex = Math.floor(angle / SECTOR_ANGLE) % NUM_SECTORS;

            // Separator line: check proximity to nearest sector edge
            /*const angleInSector = angle - sectorIndex * SECTOR_ANGLE;
            const LINE_THICKNESS = 0.02; // radians — tweak for thicker/thinner
            if (angleInSector < LINE_THICKNESS || angleInSector > SECTOR_ANGLE - LINE_THICKNESS) {
              data[idx]     = 0xFF;
              data[idx + 1] = 0xFF;
              data[idx + 2] = 0xFF;
              data[idx + 3] = 255;
              continue;
            }*/
    
            if (sectorIndex % 2 === 0) {
              data[idx]     = color1R;
              data[idx + 1] = color1G;
              data[idx + 2] = color1B;
            } else {
              data[idx]     = color2R;
              data[idx + 1] = color2G;
              data[idx + 2] = color2B;
            }
            data[idx + 3] = 255; // fully opaque
          }
        }
    
        wheelOffCtx.putImageData(imageData, 0, 0);
  
      // Pointer (stays at top, drawn after putImageData)
      wheelOffCtx.beginPath();
      wheelOffCtx.moveTo(sCX, sCY - sR - 5);
      wheelOffCtx.lineTo(sCX - 4, sCY - sR - 1);
      wheelOffCtx.lineTo(sCX + 4, sCY - sR - 1);
      wheelOffCtx.closePath();
      wheelOffCtx.fillStyle = COLORS.arcadeOrange;
      wheelOffCtx.fill();
  
    // --- Blit offscreen → main canvas, scaled up with nearest-neighbour ---
    ctx.imageSmoothingEnabled = false;
    const destW = offW * PIXEL_SCALE;
    const destH = offH * PIXEL_SCALE;
    const destX = centerX - destW / 2;
    const destY = centerY - destH / 2;
    ctx.drawImage(wheelOffscreen, 0, 0, offW, offH, destX, destY, destW, destH);

  // Hint text
  ctx.fillStyle = "white";
  ctx.font = "28px Early GameBoy";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Press A to stop", centerX, centerY + radius + 30);

  // Draw countdown timer (top-right)
  drawTimer(ctx, canvas);
}

export function cleanup() {
  stopTimer();
  targetPovId = null;
}