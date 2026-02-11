// src/inputManager.js
import { screenManager } from "./screenManager.js";

// --- Keyboard → button mapping (for testing without arcade hardware) ---
const KEY_MAP = {
  "c": "coinInserted",
  "1": "player1Pressed",
  "2": "player2Pressed",
  "x": "buttonX",
  "a": "buttonA",
};

// Single global keyboard listener
window.addEventListener("keydown", (e) => {
  const action = KEY_MAP[e.key.toLowerCase()];
  if (action) {
    dispatchButton(action);
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
export function joystickInput(x, y)  { dispatchJoystick(x, y); }
export function nextPOV(povId)       { dispatchData("nextPOV", povId); }