// src/inputManager.js
// input from max to js

// keyboard navigation as a default
import { screenManager } from "./screenManager.js";

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
    dispatchJoystick(joystick[0], joystick[1]);
  }
});

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

export function dispatchJoystick(x, y) {
  const screenName = screenManager.getCurrentScreen();
  const screenData = screenManager.screens.get(screenName);
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
export function joystick1Input(x, y)  { dispatchJoystick(x, y); }
export function joystick2Input(x, y)  { dispatchJoystick(x, y); }
export function nextPOV(povId)       { dispatchData("nextPOV", povId); }
export function textWrite(str)   { dispatchData("textWrite", str); }
export function textClear()      { dispatchData("textClear", null); }