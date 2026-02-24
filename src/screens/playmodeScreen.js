import { screenManager } from "../screenManager.js";
import { POVS, getPovById } from "../povData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { COLORS } from "../colors.js";
import { drawTextInBox } from "../textLayout.js";

let currentPov = null;
let targetText = "";      // full text received from Max
let visibleLength = 0;    // how many characters are currently visible
let lastCharTime = 0;     // timestamp of last character reveal
const CHAR_DELAY = 40;  
const TIMER_SECONDS = 120;

export function init() {
  const selectedId = screenManager.sharedData.lastRouletteSector ?? 1;
  currentPov = getPovById(Number(selectedId));
  targetText = "";
  console.log("Playmode screen initialized, POV:", currentPov?.name, "id:", selectedId);

  // Start the countdown — auto-stops when it expires
  startTimer(TIMER_SECONDS, () => {
    screenManager.next();
  });

}

// --- Input handlers ---

export function onData(type, data) {
  if (type === "textWrite") {
    targetText = data;
    visibleLength = 0;
    lastCharTime = performance.now();
    console.log(`Playmode received text: "${data}"`);
  } else if (type === "textClear") {
    targetText = "";
    visibleLength = 0;
    console.log("Playmode text cleared");
  }
}

// --- Rendering ---

export function render(ctx, canvas) {

  // Update timer (checks expiry)
  updateTimer();

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // POV title
  ctx.fillStyle = "white";
  ctx.font = "32px Early GameBoy";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const displayName = currentPov ? currentPov.name : "Unknown";
  ctx.fillText(`${displayName}`, 30, 30);

  // Typewriter effect: reveal one character at a time
  if (targetText && visibleLength < targetText.length) {
    const now = performance.now();
    if (now - lastCharTime >= CHAR_DELAY) {
      visibleLength++;
      lastCharTime = now;
    }
  }

  const displayText = targetText.slice(0, visibleLength);

  if (displayText) {
    ctx.fillStyle = COLORS.arcadeYellow;
    ctx.font = "36px Early Gameboy";
    drawTextInBox(
      ctx,
      displayText,
      120,                 // box x
      canvas.height / 2,   // box y
      canvas.width - 240,  // box width
      260,                 // box height
      {
        align: "center",
        valign: "top",
        lineHeight: 42,
        overflow: "ellipsis",
        padding: 0,
      }
    );
  }
  
  // Draw countdown timer (top-right)
  drawTimer(ctx, canvas);
}

export function cleanup() {
  stopTimer();
  targetText = "";
  visibleLength = 0;
}