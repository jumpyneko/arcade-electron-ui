// src/screens/rouletteScreen.js
import { screenManager } from "../screenManager.js";
import { POVS } from "../povData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { startPlaymode } from "../maxOutput.js";

// State variables
let backgroundImage = null;
let wheelAngle = 0;
let targetAngle = 0;
let isSpinning = false;
let isStopping = false;
let spinSpeed = 0;
let deceleration = 0.02;
let targetPovId = null; // POV id received from Max (via nextPOV)

const TIMER_SECONDS = 20;

// 16 different colors for the sectors
const sectorColors = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
  "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
  "#F8B739", "#52BE80", "#E74C3C", "#3498DB",
  "#9B59B6", "#1ABC9C", "#F39C12", "#E67E22"
];

const NUM_SECTORS = POVS.length;
const SECTOR_ANGLE = (2 * Math.PI) / NUM_SECTORS;

export function init() {
  console.log("Roulette screen initialized");

  // Reset state
  wheelAngle = 0;
  targetAngle = 0;
  isSpinning = false;
  isStopping = false;
  spinSpeed = 0;
  targetPovId = null;

  // Load background image
  backgroundImage = new Image();
  backgroundImage.src = "assets/images/pink_bg.png";

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
  spinSpeed = 0.3;
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
        screenManager.next({ lastRouletteSector: povId });
      }, DELAY_MS);
    }
  } else {
    wheelAngle += spinSpeed;
    spinSpeed = Math.min(spinSpeed + 0.005, 0.5);
  }
}

// --- Rendering ---

export function render(ctx, canvas) {
  // Background
  if (backgroundImage && backgroundImage.complete) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backgroundImage, 0, 0, 180, 180, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }


  // Update timer (checks expiry)
  updateTimer();

  // Update wheel animation
  updateWheel();

  // Draw wheel
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(wheelAngle);

  for (let i = 0; i < NUM_SECTORS; i++) {
    const startAngle = i * SECTOR_ANGLE;
    const endAngle = (i + 1) * SECTOR_ANGLE;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = sectorColors[i];
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(startAngle + SECTOR_ANGLE / 2);
    ctx.fillStyle = "#000";
    ctx.font = "bold 32px Early GameBoy";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(POVS[i].id.toString(), radius * 0.7, 0);
    ctx.restore();
  }

  // Center circle
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.15, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Pointer
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius - 20);
  ctx.lineTo(centerX - 15, centerY - radius - 5);
  ctx.lineTo(centerX + 15, centerY - radius - 5);
  ctx.closePath();
  ctx.fillStyle = "#FFD700";
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();

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