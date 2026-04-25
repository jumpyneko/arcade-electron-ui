import { screenManager } from "../helper/screenManager.js";
import { getModelById } from "../helper/modelData.js";
import { COLORS } from "../helper/colors.js";
import { Sprite } from "../helper/sprite.js";
import { drawTimer, isTimerRunning, setTimerExpireCallback, stopTimer, updateTimer } from "../helper/timer.js";
import { drawText } from "../helper/typography.js";
import { modelPicked } from "../communication/maxOutput.js";

const KEYBOARD_ROWS = [
  [
    { label: "A", span: 1 }, { label: "B", span: 1 }, { label: "C", span: 1 },
    { label: "D", span: 1 }, { label: "E", span: 1 }, { label: "F", span: 1 }
  ],
  [
    { label: "G", span: 1 }, { label: "H", span: 1 }, { label: "I", span: 1 },
    { label: "J", span: 1 }, { label: "K", span: 1 }, { label: "L", span: 1 }
  ],
  [
    { label: "M", span: 1 }, { label: "N", span: 1 }, { label: "O", span: 1 },
    { label: "P", span: 1 }, { label: "Q", span: 1 }, { label: "R", span: 1 }
  ],
  [
    { label: "S", span: 1 }, { label: "T", span: 1 }, { label: "U", span: 1 },
    { label: "V", span: 1 }, { label: "W", span: 1 }, { label: "X", span: 1 }
  ],
  [
    { label: "Y", span: 1 }, { label: "Z", span: 1 },
    { label: "SPACE", span: 2 }, { label: "UNDO", span: 2 }
  ],
];

const BASE_NAME_LENGTH = 12;
const MAX_NAME_LENGTH = 25;
const JOYSTICK_REPEAT_MS = 140;
const CELL_W = 24;
const CELL_H = 14;
const GRID_X = 152;
const GRID_Y = 90;
const INPUT_BOX_X = GRID_X;
const INPUT_BOX_Y = 64;
const INPUT_BOX_W = 6 * CELL_W;
const INPUT_BOX_H = 22;
const CONTROLS_Y = 224;

let currentModel = null;
let modelSprite = null;
let typedName = "";
let selectedRow = 0;
let selectedCol = 0;
let lastMoveAt = 0;

let buttonImageD = null;
let buttonImageE = null;
let joystickImageLeft = null;
let joystickImageRight = null;
let joystickImageUp = null;
let joystickImageDown = null;

function pixelRect(ctx, x, y, w, h, fill, stroke = null) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
  }
}

function currentKey() {
  return KEYBOARD_ROWS[selectedRow]?.[selectedCol]?.label ?? "A";
}

function keyCenter(row, col) {
  const target = KEYBOARD_ROWS[row]?.[col];
  if (!target) return 0;

  let offset = 0;
  for (let i = 0; i < col; i++) {
    offset += KEYBOARD_ROWS[row][i].span;
  }
  return offset + target.span / 2;
}

function moveSelection(dx, dy) {
  if (dy !== 0) {
    const previousCenter = keyCenter(selectedRow, selectedCol);
    selectedRow = (selectedRow + dy + KEYBOARD_ROWS.length) % KEYBOARD_ROWS.length;

    let bestCol = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let col = 0; col < KEYBOARD_ROWS[selectedRow].length; col++) {
      const distance = Math.abs(keyCenter(selectedRow, col) - previousCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCol = col;
      }
    }
    selectedCol = bestCol;
    return;
  }

  const rowLength = KEYBOARD_ROWS[selectedRow].length;
  selectedCol = (selectedCol + dx + rowLength) % rowLength;
}

function addCurrentCharacter() {
  const key = currentKey();

  if (key === "UNDO") {
    undoCharacter();
    return;
  }

  if (typedName.length >= MAX_NAME_LENGTH) return;

  typedName += key === "SPACE" ? " " : key;
  screenManager.sharedData.selectedModelNickname = typedName;
}

function undoCharacter() {
  if (!typedName) return;
  typedName = typedName.slice(0, -1);
  screenManager.sharedData.selectedModelNickname = typedName;
}

function continueToEndScreen() {
  const finalName = typedName.trim() || currentModel.name;
  stopTimer();
  currentModel.nickname = finalName;
  screenManager.sharedData.selectedModelNickname = finalName;
  modelPicked(currentModel.id, finalName);
  screenManager.next({ selectedModelNickname: finalName });
}

function drawNameBox(ctx) {
  pixelRect(ctx, INPUT_BOX_X - 4, INPUT_BOX_Y - 4, INPUT_BOX_W + 8, INPUT_BOX_H + 8, COLORS.arcadeDarkBlue, "#D7D3FF");
  pixelRect(ctx, INPUT_BOX_X - 2, INPUT_BOX_Y - 2, INPUT_BOX_W + 4, INPUT_BOX_H + 4, "#3F39B7");
  pixelRect(ctx, INPUT_BOX_X, INPUT_BOX_Y, INPUT_BOX_W, INPUT_BOX_H, "#111111");
  pixelRect(ctx, INPUT_BOX_X + 2, INPUT_BOX_Y + 2, INPUT_BOX_W - 4, INPUT_BOX_H - 4, "#3F39B7");

  const visibleSlots = Math.max(BASE_NAME_LENGTH, Math.min(MAX_NAME_LENGTH, typedName.length));
  const slotAreaX = INPUT_BOX_X + 16;
  const slotAreaW = INPUT_BOX_W - 32;
  const slotY = INPUT_BOX_Y + 7;
  const slotGap = visibleSlots <= BASE_NAME_LENGTH ? 2 : 1;
  const slotW = Math.max(4, Math.floor((slotAreaW - slotGap * (visibleSlots - 1)) / visibleSlots));
  const slotsWidth = visibleSlots * slotW + (visibleSlots - 1) * slotGap;
  const slotStartX = slotAreaX + Math.floor((slotAreaW - slotsWidth) / 2);

  for (let i = 0; i < visibleSlots; i++) {
    const slotX = slotStartX + i * (slotW + slotGap);
    pixelRect(ctx, slotX, slotY + 8, slotW, 2, i < typedName.length ? COLORS.arcadeYellow : "#D7D3FF");

    if (i < typedName.length) {
      drawText(ctx, typedName[i], slotX + Math.floor(slotW / 2), slotY, "h2", {
        align: "center",
        color: COLORS.arcadeYellow,
      });
    }
  }
}

function drawKeyboard(ctx) {
  const boardW = 6 * CELL_W;
  const boardH = KEYBOARD_ROWS.length * CELL_H;

  pixelRect(ctx, GRID_X - 4, GRID_Y - 4, boardW + 8, boardH + 8, COLORS.arcadeDarkBlue, "#D7D3FF");
  pixelRect(ctx, GRID_X - 2, GRID_Y - 2, boardW + 4, boardH + 4, "#3F39B7");

  for (let row = 0; row < KEYBOARD_ROWS.length; row++) {
    let cellOffset = 0;

    for (let col = 0; col < KEYBOARD_ROWS[row].length; col++) {
      const key = KEYBOARD_ROWS[row][col];
      const label = key.label;
      const width = key.span * CELL_W;
      const x = GRID_X + cellOffset * CELL_W;
      const y = GRID_Y + row * CELL_H;
      const isSelected = row === selectedRow && col === selectedCol;
      const isActionKey = label === "SPACE" || label === "UNDO";

      pixelRect(
        ctx,
        x,
        y,
        width,
        CELL_H,
        isSelected ? COLORS.arcadeYellow : isActionKey ? COLORS.arcadePurple : "#514ACF",
        "#111111"
      );

      if (label === "SPACE") {
        const underscoreW = Math.max(10, width - 14);
        const underscoreX = x + Math.floor((width - underscoreW) / 2);
        const underscoreY = y + 9;
        pixelRect(ctx, underscoreX, underscoreY, underscoreW, 2, isSelected ? COLORS.arcadeDarkBlue : "white");
      } else {
        const keyLabel = label;
        drawText(ctx, keyLabel, x + Math.floor(width / 2), y + 4, "h2", {
          align: "center",
          color: isSelected ? COLORS.arcadeDarkBlue : "white",
        });
      }

      cellOffset += key.span;
    }
  }
}

function drawModelPanel(ctx) {
  const leftCenterX = 12;
  const imgY = 36;

  if (modelSprite) {
    modelSprite.update();
    modelSprite.draw(ctx, leftCenterX + 48, imgY + 48, 2);
  }
}

function drawControls(ctx) {
  const joystickReady =
    joystickImageLeft?.complete &&
    joystickImageRight?.complete &&
    joystickImageUp?.complete &&
    joystickImageDown?.complete;

  if (joystickReady) {
    ctx.drawImage(joystickImageUp, 20, CONTROLS_Y - 10, 12, 12);
    ctx.drawImage(joystickImageLeft, 8, CONTROLS_Y + 2, 12, 12);
    ctx.drawImage(joystickImageDown, 20, CONTROLS_Y + 2, 12, 12);
    ctx.drawImage(joystickImageRight, 32, CONTROLS_Y + 2, 12, 12);
    drawText(ctx, "MOVE", 50, CONTROLS_Y + 6, "h2", { align: "left" });
  } else {
    drawText(ctx, "JOYSTICK MOVE", 8, CONTROLS_Y + 6, "h2", { align: "left" });
  }

  if (buttonImageD?.complete) {
    ctx.drawImage(buttonImageD, 124, CONTROLS_Y + 2, 12, 12);
    drawText(ctx, "SELECT", 144, CONTROLS_Y + 6, "h2", { align: "left" });
  } else {
    drawText(ctx, "D SELECT", 124, CONTROLS_Y + 6, "h2", { align: "left" });
  }

  if (buttonImageE?.complete) {
    ctx.drawImage(buttonImageE, 220, CONTROLS_Y + 2, 12, 12);
    drawText(ctx, "CONTINUE", 240, CONTROLS_Y + 6, "h2", { align: "left" });
  } else {
    drawText(ctx, "E CONTINUE", 220, CONTROLS_Y + 6, "h2", { align: "left" });
  }
}

export function init() {
  const selectedId = screenManager.sharedData.chosenModelId ?? 1;
  currentModel = getModelById(Number(selectedId));
  modelSprite = new Sprite(currentModel.image, 48, 48, 2, 16);
  typedName = "";
  selectedRow = 0;
  selectedCol = 0;
  lastMoveAt = 0;
  screenManager.sharedData.selectedModelNickname = "";

  if (isTimerRunning()) {
    setTimerExpireCallback(() => {
      continueToEndScreen();
    });
  }

  buttonImageD = new Image();
  buttonImageD.src = "assets/images/UI/button_D.png";
  buttonImageE = new Image();
  buttonImageE.src = "assets/images/UI/button_E.png";
  joystickImageLeft = new Image();
  joystickImageLeft.src = "assets/images/UI/joystick_left.png";
  joystickImageRight = new Image();
  joystickImageRight.src = "assets/images/UI/joystick_right.png";
  joystickImageUp = new Image();
  joystickImageUp.src = "assets/images/UI/joystick_up.png";
  joystickImageDown = new Image();
  joystickImageDown.src = "assets/images/UI/joystick_down.png";
}

export function onButton(action) {
  if (action === "buttonD") {
    addCurrentCharacter();
  } else if (action === "buttonE") {
    continueToEndScreen();
  }
}

export function onJoystick2(x, y) {
  const now = performance.now();
  if (now - lastMoveAt < JOYSTICK_REPEAT_MS) return;

  if (x > 0.5) {
    moveSelection(1, 0);
  } else if (x < -0.5) {
    moveSelection(-1, 0);
  } else if (y > 0.5) {
    moveSelection(0, -1);
  } else if (y < -0.5) {
    moveSelection(0, 1);
  } else {
    return;
  }

  lastMoveAt = now;
}

export function render(ctx, canvas) {
  updateTimer();

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  drawModelPanel(ctx);

  drawText(ctx, "Name your Miniature!", INPUT_BOX_X, 36, "h2", {
    align: "left",
    color: "white",
    scale: 1.5,
  });

  drawNameBox(ctx);
  drawKeyboard(ctx);
  drawControls(ctx);
  drawTimer(ctx, canvas);
}

export function onData(type) {
  if (type === "restartGame") {
    screenManager.restartGame();
  }
}

export function cleanup() {
  if (modelSprite) modelSprite.reset();
}
