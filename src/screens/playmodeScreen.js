import { screenManager } from "../screenManager.js";
import { POVS, getPovById } from "../povData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { startInfomode } from "../maxOutput.js";
import { startMiniatureSelectionMode } from "../maxOutput.js";


let currentPov = null;
let displayText = ""; // Text received from Max
const TIMER_SECONDS = 120;

export function init() {
  const selectedId = screenManager.sharedData.lastRouletteSector ?? 1;
  currentPov = getPovById(Number(selectedId));
  displayText = "";
  console.log("Playmode screen initialized, POV:", currentPov?.name, "id:", selectedId);

  // Start the countdown — auto-stops when it expires
  startTimer(TIMER_SECONDS, () => {

    // Check what's next in the sequence to tell Max the right thing
    const nextScreen = screenManager.getNextScreen() // need to expose this, or use a helper

    if (nextScreen === "slotmachine") {
      startMiniatureSelectionMode();
    } else {
      startInfomode();
    }
    screenManager.next();
  });

}

// --- Input handlers ---

export function onData(type, data) {
  if (type === "textWrite") {
    displayText = data;
    console.log(`Playmode received text: "${data}"`);
  } else if (type === "textClear") {
    displayText = "";
    console.log("Playmode text cleared");
  }
}

// --- Rendering ---

export function render(ctx, canvas) {

  // Update timer (checks expiry)
  updateTimer();

  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // POV title
  ctx.fillStyle = "white";
  ctx.font = "48px monospace";
  ctx.textAlign = "center";
  const displayName = currentPov ? currentPov.name : "Unknown";
  ctx.fillText(`playmode ${displayName} was started`, canvas.width / 2, canvas.height / 2 - 60);

  // Text from Max
  if (displayText) {
    ctx.fillStyle = "#F7DC6F";
    ctx.font = "36px monospace";
    ctx.textAlign = "center";
    ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 + 20);
  }
  
  // Draw countdown timer (top-right)
  drawTimer(ctx, canvas);
}

export function cleanup() {
  stopTimer();
  displayText = "";
}