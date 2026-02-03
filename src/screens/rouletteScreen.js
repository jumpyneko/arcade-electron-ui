// src/screens/rouletteScreen.js
import { screenManager } from "../screenManager.js";
import { POVS } from "../povData.js";

// State variables
let wheelAngle = 0; // Current rotation angle in radians
let targetAngle = 0; // Target angle to stop at
let isSpinning = false;
let isStopping = false;
let spinSpeed = 0;
let deceleration = 0.02;

// Key to stop wheel (for testing; later arcade button will call stopSpin())
const STOP_KEY = "x";
let stopKeyHandler = null;

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
  
  // Listen for stop key (for testing; later arcade button will trigger stopSpin())
  stopKeyHandler = (e) => {
    if (e.key.toLowerCase() === STOP_KEY) {
      stopSpin();
    }
  };

  window.addEventListener("keydown", stopKeyHandler);

  // Wheel already spinning when entering screen
  startSpin();
}

function startSpin() {
  if (isSpinning) return;
  
  isSpinning = true;
  isStopping = false;
  spinSpeed = 0.3; // Initial spin speed (radians per frame)
}

function stopSpin() {
  if (!isSpinning || isStopping) return;
  
  isStopping = true;
  
  // Calculate which sector we'll stop on
  // Add some random full rotations for visual effect
  const randomRotations = 3 + Math.random() * 5; // 3-8 full rotations
  const randomSector = Math.floor(Math.random() * NUM_SECTORS);
  targetAngle = wheelAngle + (randomRotations * 2 * Math.PI) + (randomSector * SECTOR_ANGLE);
}

function updateWheel() {
  if (isSpinning) {
    if (isStopping) {
      // Gradually slow down
      spinSpeed = Math.max(0, spinSpeed - deceleration);
      wheelAngle += spinSpeed;
      
      // Check if we've reached the target (with some tolerance)
      if (spinSpeed <= 0.001) {
        // Snap to final position
        wheelAngle = targetAngle;
        isSpinning = false;
        isStopping = false;
        
        // Calculate which sector the pointer (top) points to
        // Pointer is at top = -π/2. In wheel local coords, that is -π/2 - wheelAngle
        const pointerAngle = -Math.PI / 2;
        const localAngleUnderPointer =
          ((pointerAngle - wheelAngle) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
        const sectorIndex = Math.floor(localAngleUnderPointer / SECTOR_ANGLE) % NUM_SECTORS;
        const sectorNumber = sectorIndex + 1; // 1–16
        console.log(`Wheel stopped on sector: ${sectorNumber}`);

        const DELAY_MS = 3000; // Short delay before opening playmode
        setTimeout(() => {
          screenManager.next({ lastRouletteSector: sectorNumber });
        }, DELAY_MS);
      }
    } else {
      // Accelerate while spinning
      wheelAngle += spinSpeed;
      spinSpeed = Math.min(spinSpeed + 0.005, 0.5); // Cap max speed
    }
  }
}

export function render(ctx, canvas) {
  // Background
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Update wheel animation
  updateWheel();
  
  // Draw wheel
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;
  
  // Save context
  ctx.save();
  
  // Move to center and rotate
  ctx.translate(centerX, centerY);
  ctx.rotate(wheelAngle);
  
  // Draw each sector
  for (let i = 0; i < NUM_SECTORS; i++) {
    const startAngle = i * SECTOR_ANGLE;
    const endAngle = (i + 1) * SECTOR_ANGLE;
    
    // Draw sector
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = sectorColors[i];
    ctx.fill();
    
    // Draw sector border
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw number in sector
    ctx.save();
    ctx.rotate(startAngle + SECTOR_ANGLE / 2);
    ctx.fillStyle = "#000";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(POVS[i].id.toString(), radius * 0.7, 0);
    ctx.restore();
  }
  
  // Draw center circle
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.15, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Draw pointer/indicator at top
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

  // Text under wheel: "Press S to stop"
  ctx.fillStyle = "white";
  ctx.font = "28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`Press ${STOP_KEY.toUpperCase()} to stop`, centerX, centerY + radius + 30);
}

export function cleanup() {
  if (stopKeyHandler) {
    window.removeEventListener("keydown", stopKeyHandler);
    stopKeyHandler = null;
  }
}