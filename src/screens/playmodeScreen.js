import { screenManager } from "../helper/screenManager.js";
import { getPovById } from "../helper/povData.js";
import { startTimer, stopTimer, updateTimer, drawTimer, getRemaining } from "../helper/timer.js";
import { drawText } from "../helper/typography.js";
import { COLORS } from "../helper/colors.js";

let currentPov = null;
let targetText = "";
let visibleLength = 0;
let lastCharTime = 0;
const CHAR_DELAY = 40;
const TIMER_SECONDS = 120;

function wrapBitmapText(text, maxCharsPerLine = 34) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length > maxCharsPerLine) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  return lines.join("\n");
}

export function init() {
  const selectedId = screenManager.sharedData.lastRouletteSector ?? 1;
  currentPov = getPovById(Number(selectedId));
  targetText = "";
  visibleLength = 0;
  lastCharTime = 0;

  console.log("Playmode screen initialized, POV:", currentPov?.name, "id:", selectedId);

  startTimer(TIMER_SECONDS, () => {
    screenManager.next();
  });
}

export function onData(type, data) {
  if (type === "textWrite") {
    targetText = String(data ?? "");
    visibleLength = 0;
    lastCharTime = performance.now();
    console.log(`Playmode received text: "${targetText}"`);
  } else if (type === "textClear") {
    targetText = "";
    visibleLength = 0;
    console.log("Playmode text cleared");
  }
}

export function render(ctx, canvas) {
  updateTimer();

  const centerX = Math.round(canvas.width / 2);
  const centerY = Math.round(canvas.height / 2);

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const displayName = currentPov ? currentPov.name : "Unknown";
  drawText(ctx, displayName, 12, 12, "h2", { align: "left", color: "white" });

  drawText(ctx, "use arcade buttons and joystick to play", 12, canvas.height - 12, "h2", { align: "left", color: "grey" });

  if (targetText && visibleLength < targetText.length) {
    const now = performance.now();
    if (now - lastCharTime >= CHAR_DELAY) {
      visibleLength++;
      lastCharTime = now;
    }
  }

  const displayText = targetText.slice(0, visibleLength);
  if (displayText) {
    const wrapped = wrapBitmapText(displayText, 24);
    drawText(ctx, wrapped, centerX, centerY - 20, "h1", { align: "center", color: COLORS.arcadeYellow});
  }

  if (getRemaining() <= 10) {
    drawTimer(ctx, canvas);
  }
}

export function cleanup() {
  stopTimer();
  targetText = "";
  visibleLength = 0;
}