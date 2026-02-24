// src/inputManager.js
// input from max to js

// keyboard navigation as a default
import { screenManager } from "./screenManager.js";
import { changeIsPlaced } from "./modelData.js";
import { modelPlacedChanged } from "./maxOutput.js";

// --- Keyboard → button mapping (for testing without arcade hardware) ---
const KEY_MAP = {
  "x": "coinInserted",
  "1": "player1Pressed",
  "2": "player2Pressed",
  "a": "buttonA",
  "b": "buttonB",
  "c": "buttonC",
  "d": "buttonD",
  "e": "buttonE",
};

// Joystick 1 fallback via arrow keys
const JOYSTICK_MAP = {
  "arrowup":    [0, 1],
  "arrowdown":  [0, -1],
  "arrowleft":  [-1, 0],
  "arrowright": [1, 0],
};

// Single global keyboard listener
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  const action = KEY_MAP[key];
  if (action) {
    dispatchButton(action);
  }
  const joystick = JOYSTICK_MAP[key];
  if (joystick) {
    dispatchJoystick(1, joystick[0], joystick[1]);
  }
});

// --- OSC messages from Max (via preload bridge) ---
if (window.oscBridge) {
  window.oscBridge.onMessage((address, args) => {
    console.log(`[OSC ←] ${address}`, args);

    // Buttons
    if (address === "/coinInserted")    dispatchButton("coinInserted");
    if (address === "/player1Pressed")  dispatchButton("player1Pressed");
    if (address === "/player2Pressed")  dispatchButton("player2Pressed");
    if (address === "/buttonAPressed")         dispatchButton("buttonA");
    if (address === "/buttonBPressed")         dispatchButton("buttonB");
    if (address === "/buttonCPressed")         dispatchButton("buttonC");
    if (address === "/buttonDPressed")         dispatchButton("buttonD");
    if (address === "/buttonEPressed")         dispatchButton("buttonE");

    // Joysticks
    if (address === "/joystick1Input") {
      const raw_x = args[0]?.value ?? args[0] ?? 1;
      const raw_y = args[1]?.value ?? args[1] ?? 1;
      dispatchJoystick(1, raw_x - 1, raw_y - 1);
    }
    if (address === "/joystick2Input") {
      const raw_x = args[0]?.value ?? args[0] ?? 1;
      const raw_y = args[1]?.value ?? args[1] ?? 1;
      dispatchJoystick(2, raw_x - 1, raw_y - 1);
    }

    // Data messages
    if (address === "/nextPOV")    dispatchData("nextPOV", args[0]?.value ?? args[0]);
    if (address === "/textWrite")  dispatchData("textWrite", args[0]?.value ?? args[0]);
    if (address === "/textClear")  dispatchData("textClear", null);
    if (address === "/changeIsPlaced") {
      const modelId = args[0]?.value ?? args[0];
      changeIsPlacedFromMax(modelId);
    } 
    if (address === "/restartGame") {
      screenManager.restartGame();  // or screenManager.goTo("start")
    }
  });
}

// --- Dispatchers ---

function dispatchButton(action) {
  const screenName = screenManager.getCurrentScreen();
  const screenData = screenManager.screens.get(screenName);
  if (screenData?.onButton) {
    screenData.onButton(action);
  }
}

function dispatchData(type, data) {
  const screenName = screenManager.getCurrentScreen();
  const screenData = screenManager.screens.get(screenName);
  if (screenData?.onData) {
    screenData.onData(type, data);
  }
}

function changeIsPlacedFromMax(id) {
  const model = changeIsPlaced(id);
  console.log(`[Max] changeIsPlaced id=${id} → isPlaced=${model?.isPlaced}`);
  if (model) {
    modelPlacedChanged(model.id, model.isPlaced);
  }
}

function dispatchJoystick(joystickId, x, y) {
  const screenName = screenManager.getCurrentScreen();
  const screenData = screenManager.screens.get(screenName);

  // New specific handlers
  if (joystickId === 1 && screenData?.onJoystick1) {
    screenData.onJoystick1(x, y);
    return;
  }
  if (joystickId === 2 && screenData?.onJoystick2) {
    screenData.onJoystick2(x, y);
    return;
  }

  // Backward compatibility (old single joystick handler)
  if (screenData?.onJoystick) {
    screenData.onJoystick(x, y);
  }
}

// --- Public API for Max (or any external source) to call ---
// When Max is connected, it will call these functions directly.

export function coinInserted()    { dispatchButton("coinInserted"); }
export function player1Pressed()  { dispatchButton("player1Pressed"); }
export function player2Pressed()  { dispatchButton("player2Pressed"); }
export function buttonAPressed()     { dispatchButton("buttonA"); }
export function buttonBPressed()     { dispatchButton("buttonB"); }
export function buttonCPressed()     { dispatchButton("buttonC"); }
export function buttonDPressed()     { dispatchButton("buttonD"); }
export function buttonEPressed()     { dispatchButton("buttonE"); }
export function joystick1Input(x, y) { dispatchJoystick(1, x, y); }
export function joystick2Input(x, y) { dispatchJoystick(2, x, y); }
export function nextPOV(povId)       { dispatchData("nextPOV", povId); }
export function textWrite(str)   { dispatchData("textWrite", str); }
export function textClear()      { dispatchData("textClear", null); }
export function setIsPlaced(id) { changeIsPlacedFromMax(id); }
export function restartGame() { screenManager.restartGame(); }
