// src/screens/rouletteStripScreen.js
import { POVS } from "../helper/povData.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../helper/timer.js";
import { startPlaymode } from "../communication/maxOutput.js";
import { COLORS } from "../helper/colors.js";
import { drawText } from "../helper/typography.js";
import { Sprite } from "../helper/sprite.js";
import { screenManager } from "../helper/screenManager.js";
import { audioManager } from "../helper/audioManager.js";

// State
let spinProgress = 0;
let targetProgress = 0;
let isSpinning = false;
let isStopping = false;
let spinSpeed = 5;
let deceleration = 0.18;
let targetPovId = null;

let buttonImage = null;
const TIMER_SECONDS = 10;

// Grid layout
const GRID_COLS = 4;
const GRID_ROWS = 4;
const ICON_SIZE = 32;
const CELL_GAP = 4;
const CELL_SIZE = ICON_SIZE + CELL_GAP * 2;

const ICON_PITCH = 43;
const NUM_ICONS = POVS.length;

// Transition sheet — set to match your PNG (frame size + frame count)
const TRANSITION_FRAME_W = 184;
const TRANSITION_FRAME_H = 184;
const TRANSITION_FRAME_COUNT = 48;
const TRANSITION_FRAME_SPEED = 12;

/** @type {Sprite | null} */
let transitionSprite = null;

let revealIndex = 0;
let revealTick = 0;
const REVEAL_INTERVAL_FRAMES = 5;

function mod(n, m) {
  return ((n % m) + m) % m;
}

function randomIconIndex() {
  return Math.floor(Math.random() * NUM_ICONS);
}

/** Same geometry as drawGrid — center matches outer 184×184 bezel */
function gridMetrics(canvas) {
  const gridPixelW = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
  const gridPixelH = GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_GAP;
  const gridX = Math.round((canvas.width - gridPixelW) / 2);
  const gridY = Math.round((canvas.height - gridPixelH) / 2);
  return {
    gridPixelW,
    gridPixelH,
    gridX,
    gridY,
    cx: gridX + gridPixelW / 2,
    cy: gridY + gridPixelH / 2,
  };
}

export function init() {
  console.log("Roulette grid screen initialized");

  audioManager.stopLoop("rouletteSpin");
  spinProgress = 0;
  targetProgress = 0;
  isSpinning = false;
  isStopping = false;
  spinSpeed = 5;
  targetPovId = null;

  transitionSprite = null;

  revealIndex = randomIconIndex();
  revealTick = 0;

  buttonImage = new Image();
  buttonImage.src = "assets/images/UI/button_A.png";

  startTimer(TIMER_SECONDS, () => {
    stopSpin();
  });

  startSpin();
}

export function onButton(action) {
  if (action === "buttonA") {
    stopSpin();
  }
}

export function onData(type, data) {
  if (type === "nextPOV") {
    targetPovId = data;
    console.log(`Roulette grid received target POV: ${targetPovId}`);
  }
}

function startSpin() {
  if (isSpinning) return;
  isSpinning = true;
  isStopping = false;
  spinSpeed = 5;

  void audioManager.startLoop("roulette", { group: "rouletteSpin", volume: 1 });
}

function stopSpin() {
  if (!isSpinning || isStopping) return;
  isStopping = true;

  let landingIndex;
  if (targetPovId != null) {
    landingIndex = POVS.findIndex((p) => p.id === targetPovId);
    if (landingIndex === -1) {
      landingIndex = Math.floor(Math.random() * NUM_ICONS);
    }
  } else {
    landingIndex = Math.floor(Math.random() * NUM_ICONS);
  }

  const currentUnits = spinProgress / ICON_PITCH;
  const baseK = Math.ceil((currentUnits - landingIndex) / NUM_ICONS);
  const extraCycles = 3 + Math.floor(Math.random() * 5);
  const targetUnits = landingIndex + (baseK + extraCycles) * NUM_ICONS;

  targetProgress = targetUnits * ICON_PITCH;
}

function updateSpinAndReveal() {
  transitionSprite?.update();

  if (!isSpinning) return;

  if (isStopping) {
    spinSpeed = Math.max(0, spinSpeed - deceleration);
    spinProgress += spinSpeed;

    revealTick++;
    if (revealTick >= REVEAL_INTERVAL_FRAMES) {
      revealTick = 0;
      revealIndex = randomIconIndex();
    }

    if (spinSpeed <= 0.12) {
      spinProgress = targetProgress;
      isSpinning = false;
      isStopping = false;

      stopTimer();

      const settledIndex = mod(Math.round(spinProgress / ICON_PITCH), NUM_ICONS);
      const povId = POVS[settledIndex].id;

      revealIndex = settledIndex;

      audioManager.stopLoop("rouletteSpin");

      void audioManager.play("select2", {
        group: "rouletteSelect",
        restart: true,
        stopGroupBeforePlay: true,
        volume: 1,
      });

      transitionSprite = new Sprite(
        POVS[settledIndex].transition,
        TRANSITION_FRAME_W,
        TRANSITION_FRAME_H,
        TRANSITION_FRAME_COUNT,
        TRANSITION_FRAME_SPEED
      );
      transitionSprite.playOnce(0, TRANSITION_FRAME_COUNT - 1, { holdLast: true });

      console.log(`Grid stopped on POV: ${povId}`);
      startPlaymode(povId);

      const DELAY_MS = 8500;
      setTimeout(() => {
        screenManager.next({ lastRouletteSector: povId });
      }, DELAY_MS);
    }
  } else {
    spinProgress += spinSpeed;
    spinSpeed = Math.min(spinSpeed + 0.09, 8.5);

    revealTick++;
    if (revealTick >= REVEAL_INTERVAL_FRAMES) {
      revealTick = 0;
      revealIndex = randomIconIndex();
    }
  }
}

function fillPixelRoundedRect(ctx, x, y, w, h, r = 2) {
  const xx = Math.round(x);
  const yy = Math.round(y);

  ctx.fillRect(xx + r, yy, w - 2 * r, h);
  ctx.fillRect(xx, yy + r, r, h - 2 * r);
  ctx.fillRect(xx + w - r, yy + r, r, h - 2 * r);
}

function drawIconCell(ctx, x, y, iconIndex, row, col, isFocused = false) {
  const xx = Math.round(x);
  const yy = Math.round(y);

  const isCheckerA = (row + col) % 2 === 0;
  const cellColor = isCheckerA ? COLORS.arcadeBlue : COLORS.arcadeYellow;

  const borderColor = isFocused ? COLORS.arcadeOrange : COLORS.arcadeDarkBlue;
  const BORDER_THICKNESS = 2;

  ctx.fillStyle = borderColor;
  fillPixelRoundedRect(ctx, xx, yy, CELL_SIZE, CELL_SIZE, 2);

  ctx.fillStyle = cellColor;
  fillPixelRoundedRect(
    ctx,
    xx + BORDER_THICKNESS,
    yy + BORDER_THICKNESS,
    CELL_SIZE - BORDER_THICKNESS * 2,
    CELL_SIZE - BORDER_THICKNESS * 2,
    1
  );

  const pov = POVS[iconIndex];
  const iconSprite = new Sprite(pov.icon, 32, 32, 1, 8);
  iconSprite.draw(ctx, xx + Math.floor(CELL_SIZE / 2), yy + Math.floor(CELL_SIZE / 2), 1);
}

function drawGrid(ctx, canvas) {
  const { gridPixelW, gridPixelH, gridX, gridY } = gridMetrics(canvas);

  ctx.fillStyle = COLORS.arcadeDarkBlue;
  fillPixelRoundedRect(ctx, gridX - 6, gridY - 6, gridPixelW + 12, gridPixelH + 12);

  ctx.fillStyle = COLORS.arcadeBlue;
  fillPixelRoundedRect(ctx, gridX - 4, gridY - 4, gridPixelW + 8, gridPixelH + 8);

  ctx.fillStyle = COLORS.arcadeDarkBlue;
  fillPixelRoundedRect(ctx, gridX - 2, gridY - 2, gridPixelW + 4, gridPixelH + 4);

  for (let i = 0; i < NUM_ICONS; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    if (row >= GRID_ROWS) break;

    const cellX = gridX + col * (CELL_SIZE + CELL_GAP);
    const cellY = gridY + row * (CELL_SIZE + CELL_GAP);

    const isFocused = i === revealIndex;
    drawIconCell(ctx, cellX, cellY, i, row, col, isFocused);

    if (!isFocused) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      fillPixelRoundedRect(ctx, cellX, cellY, CELL_SIZE, CELL_SIZE, 2);
    }
  }
}

function drawTransitionOverlay(ctx, canvas) {
  if (!transitionSprite?.image?.complete) return;

  const { cx, cy } = gridMetrics(canvas);
  transitionSprite.draw(ctx, cx, cy, 1);
}

export function render(ctx, canvas) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updateTimer();
  updateSpinAndReveal();

  ctx.imageSmoothingEnabled = false;
  drawGrid(ctx, canvas);

  drawTransitionOverlay(ctx, canvas);

  const centerX = Math.round(canvas.width / 2);

  if (!transitionSprite?.image?.complete) {
    if (buttonImage && buttonImage.complete) {
      ctx.drawImage(buttonImage, centerX - 20, 224, 12, 12);
      drawText(ctx, "STOP", centerX, 228, "h2", { align: "left" });
    } else {
      drawText(ctx, "PRESS A TO STOPSELECT", centerX, 228, "h2", { align: "center" });
    }
  } else {
    const povName = POVS[revealIndex].name;
    const visible =
      Math.floor(performance.now() / 160) % 2 === 0;
    if (visible) {
      drawText(ctx, povName, centerX, 220, "h1", {
        align: "center",
        color: COLORS.arcadeYellow,
      });
    }
  }

  drawTimer(ctx, canvas);
}

export function cleanup() {
  stopTimer();
  audioManager.stopLoop("rouletteSpin");
  targetPovId = null;
  transitionSprite = null;
}