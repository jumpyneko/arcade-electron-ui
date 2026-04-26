import { screenManager } from "../helper/screenManager.js";
import { getPovById } from "../helper/povData.js";
import { startTimer, stopTimer, updateTimer, drawTimer, getRemaining } from "../helper/timer.js";
import { drawText, wrapBitmapText } from "../helper/typography.js";
import { COLORS } from "../helper/colors.js";

let currentPov = null;
let targetText = "";
let visibleLength = 0;
let lastCharTime = 0;
const CHAR_DELAY = 40;
const TIMER_SECONDS = 120;

let buttonImage_A = null;
let buttonImage_B = null;
let buttonImage_C = null;
let buttonImage_D = null;
let buttonImage_E = null;
let joystickImage_down = null;
let joystickImage_left  = null;
let joystickImage_right = null;
let joystickImage_up = null;
const CONTROLS_Y = 224;

export function init() {
  const selectedId = screenManager.sharedData.lastRouletteSector ?? 1;
  currentPov = getPovById(Number(selectedId));
  targetText = "";
  visibleLength = 0;
  lastCharTime = 0;


  buttonImage_A = new Image();
  buttonImage_A.src = "assets/images/UI/button_A.png";
  buttonImage_B = new Image();
  buttonImage_B.src = "assets/images/UI/button_B.png";
  buttonImage_C = new Image();
  buttonImage_C.src = "assets/images/UI/button_C.png";
  buttonImage_D = new Image();
  buttonImage_D.src = "assets/images/UI/button_D.png";
  buttonImage_E = new Image();
  buttonImage_E.src = "assets/images/UI/button_E.png";
  joystickImage_left = new Image();
  joystickImage_left.src = "assets/images/UI/joystick_left.png";
  joystickImage_right = new Image();
  joystickImage_right.src = "assets/images/UI/joystick_right.png";
  joystickImage_up = new Image();
  joystickImage_up.src = "assets/images/UI/joystick_up.png";
  joystickImage_down = new Image();
  joystickImage_down.src = "assets/images/UI/joystick_down.png";

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

  const buttosReady =
  joystickImage_left?.complete &&
  joystickImage_right?.complete &&
  joystickImage_up?.complete &&
  joystickImage_down?.complete &&
  buttonImage_A?.complete &&
  buttonImage_B?.complete &&
  buttonImage_C?.complete &&
  buttonImage_D?.complete &&
  buttonImage_E?.complete;

  //hint text
  if (buttosReady) {
    ctx.drawImage(joystickImage_up, 20, CONTROLS_Y - 10, 12, 12);
    ctx.drawImage(joystickImage_left, 8, CONTROLS_Y + 2, 12, 12);
    ctx.drawImage(joystickImage_down, 20, CONTROLS_Y + 2, 12, 12);
    ctx.drawImage(joystickImage_right, 32, CONTROLS_Y + 2, 12, 12);
    ctx.drawImage(buttonImage_A, 50, CONTROLS_Y, 12, 12);
    ctx.drawImage(buttonImage_B, 70, CONTROLS_Y, 12, 12);
    ctx.drawImage(buttonImage_C, 90, CONTROLS_Y, 12, 12);
    ctx.drawImage(buttonImage_D, 110, CONTROLS_Y, 12, 12);
    ctx.drawImage(buttonImage_E, 130, CONTROLS_Y, 12, 12);
    drawText(ctx, "PLAY", 150, CONTROLS_Y + 4, "h2", { align: "left" });
  } else {
    drawText(ctx, "use arcade buttons and joystick to play", 12, canvas.height - 12, "h2", { align: "left", color: "grey" });
  }


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