// src/inputManager.js
// Normalized control input from Max, Direct HID, or Control Room.

// keyboard navigation as a default
import { screenManager } from "../helper/screenManager.js";
import { applyPlacedModelIds } from "../helper/modelData.js";
import { logOsc } from "../helper/debugOverlay.js";

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

const RESTART_SEQUENCE = [
  "buttonA",
  "buttonB",
  "buttonC",
  "player1Pressed",
  "player2Pressed",
];
const RESTART_SEQUENCE_WINDOW_MS = 2000;
let restartSequenceIndex = 0;
let restartSequenceStartedAt = 0;

function completesRestartSequence(action) {
  const now = performance.now();

  if (
    restartSequenceIndex > 0 &&
    now - restartSequenceStartedAt > RESTART_SEQUENCE_WINDOW_MS
  ) {
    restartSequenceIndex = 0;
    restartSequenceStartedAt = 0;
  }

  if (action === RESTART_SEQUENCE[restartSequenceIndex]) {
    if (restartSequenceIndex === 0) restartSequenceStartedAt = now;
    restartSequenceIndex += 1;

    if (restartSequenceIndex === RESTART_SEQUENCE.length) {
      const completedInTime =
        now - restartSequenceStartedAt <= RESTART_SEQUENCE_WINDOW_MS;
      restartSequenceIndex = 0;
      restartSequenceStartedAt = 0;
      return completedInTime;
    }

    return false;
  }

  // A wrong button cancels the current attempt. A new A immediately starts
  // another attempt so the operator does not need to pause between tries.
  restartSequenceIndex = action === RESTART_SEQUENCE[0] ? 1 : 0;
  restartSequenceStartedAt = restartSequenceIndex === 1 ? now : 0;
  return false;
}

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

function unwrap(arg) {
  return arg?.value ?? arg;
}

if (window.consoleBridge) {
  window.consoleBridge.onInput((event) => {
    console.log(`[CONTROL ${event.source}] ${event.address}`, event.args || []);
    window.dispatchEvent(new CustomEvent("console-control-event", { detail: event }));
    if (event.observedOnly) return;

    if (event.kind === "command") {
      const values = (event.args || []).map(unwrap);
      if (event.address === "/nextPOV") dispatchData("nextPOV", values[0]);
      if (event.address === "/textWrite") dispatchData("textWrite", values[0]);
      if (event.address === "/textClear") dispatchData("textClear", null);
      if (event.address === "/restartGame") screenManager.restartGame();
      if (event.address === "/placedModels") placedModels(values);
      return;
    }

    if (event.kind === "coin") {
      dispatchButton("coinInserted");
      return;
    }

    if (event.kind === "digital") {
      // Releases clear router state and are forwarded to CR, but do not trigger
      // the UI's press-only screen actions.
      if (event.pressed) dispatchButton(event.action);
      return;
    }

    if (event.kind === "joystick") {
      // Neutral is delivered locally so held state clears, but it does not
      // perform navigation.
      if (event.x === 0 && event.y === 0) return;
      dispatchJoystick(event.joystickId, event.x, event.y);
    }
  });

  window.consoleBridge.onStatus((status) => {
    window.dispatchEvent(new CustomEvent("console-status", { detail: status }));
  });

  window.consoleBridge.getStatus().then((status) => {
    window.dispatchEvent(new CustomEvent("console-status", { detail: status }));
  }).catch(console.error);

  window.consoleBridge.onOscLog((entry) => {
    logOsc(entry.direction, entry.address, entry.args || []);
  });

  window.consoleBridge.onHidReport((report) => {
    window.dispatchEvent(new CustomEvent("console-hid-report", { detail: report }));
  });
}

// --- Dispatchers ---

function dispatchButton(action) {
  if (completesRestartSequence(action)) {
    screenManager.restartGame();
    return;
  }

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
export function restartGame() { screenManager.restartGame(); }
export function placedModels(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  applyPlacedModelIds(list);
  console.log(`[placedModels] → ${list.join(", ") || "(none)"}`);
}
