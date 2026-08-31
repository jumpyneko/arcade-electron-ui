import { screenManager } from "./screenManager.js";
import { drawText } from "./typography.js";
import { getOscLog, clearOscLog } from "./debugOverlay.js";
import {
  debugSettings,
  timingSettingDefinitions,
  adjustTimingSetting,
} from "./debugSettings.js";

const PAGES = ["INPUT", "TIMERS", "OSC LOG", "NETWORK"];
const SETUP_BUTTONS = new Set(["buttonA", "buttonB", "buttonC", "player1Pressed", "player2Pressed"]);
const SETUP_HOLD_MS = 3000;

let visible = false;
let pageIndex = 0;
let inputRowIndex = 0;
let timerSettingIndex = 0;
let deviceIndex = 0;
let status = null;
let lastControlEvent = null;
let lastHidReport = null;
let operationMessage = "";
const heldSetupButtons = new Set();
let setupHoldTimer = null;

function updateStatus(nextStatus) {
  status = nextStatus;
  const devices = status?.hid?.devices || [];
  if (devices.length === 0) deviceIndex = 0;
  else {
    const selectedIndex = devices.findIndex(
      (device) => device.key === status?.hid?.selectedDeviceKey
    );
    deviceIndex = selectedIndex >= 0 ? selectedIndex : Math.min(deviceIndex, devices.length - 1);
  }
}

window.addEventListener("console-status", (event) => updateStatus(event.detail));
window.addEventListener("console-control-event", (event) => {
  lastControlEvent = event.detail;
});
window.addEventListener("console-hid-report", (event) => {
  lastHidReport = event.detail;
});

async function refreshStatus() {
  if (!window.consoleBridge) return;
  try {
    updateStatus(await window.consoleBridge.getStatus());
  } catch (error) {
    operationMessage = error.message;
  }
}

async function chooseDevice(direction) {
  if (!window.consoleBridge) return;
  const devices = status?.hid?.devices || [];
  if (devices.length === 0) {
    operationMessage = "Refresh HID devices first";
    return;
  }

  deviceIndex = (deviceIndex + direction + devices.length) % devices.length;
  operationMessage = "Selecting HID device...";
  try {
    updateStatus(await window.consoleBridge.selectHidDevice(devices[deviceIndex].key));
    operationMessage = `Selected ${devices[deviceIndex].product}`;
  } catch (error) {
    operationMessage = error.message;
  }
}

async function refreshDevices() {
  if (!window.consoleBridge) return;
  operationMessage = "Scanning HID devices...";
  try {
    updateStatus(await window.consoleBridge.refreshHidDevices());
    const count = status?.hid?.devices?.length || 0;
    operationMessage = `${count} joystick HID device${count === 1 ? "" : "s"} found`;
  } catch (error) {
    operationMessage = error.message;
  }
}

export function toggleSetupOverlay() {
  visible = !visible;
  if (visible) refreshStatus();
}

function movePage(direction) {
  pageIndex = (pageIndex + direction + PAGES.length) % PAGES.length;
}

function inputRows() {
  return ["device", "refresh"];
}

function moveSelection(direction) {
  if (PAGES[pageIndex] === "INPUT") {
    const rows = inputRows();
    inputRowIndex = (inputRowIndex + direction + rows.length) % rows.length;
  }
  if (PAGES[pageIndex] === "TIMERS") {
    timerSettingIndex = (timerSettingIndex + direction + timingSettingDefinitions.length) % timingSettingDefinitions.length;
  }
}

function changeSelection(direction) {
  if (PAGES[pageIndex] === "INPUT") {
    const row = inputRows()[inputRowIndex];
    if (row === "device") chooseDevice(direction);
  }
  if (PAGES[pageIndex] === "TIMERS") adjustTimingSetting(timerSettingIndex, direction, false);
}

function applySelection() {
  if (PAGES[pageIndex] === "INPUT") {
    const row = inputRows()[inputRowIndex];
    if (row === "refresh") refreshDevices();
  }
  if (PAGES[pageIndex] === "OSC LOG") {
    clearOscLog();
    operationMessage = "OSC log cleared";
  }
}

function updateSetupHold(event) {
  if (event.kind !== "digital" || !SETUP_BUTTONS.has(event.action) || event.source === "controlRoom") return;
  if (event.pressed) heldSetupButtons.add(event.action);
  else heldSetupButtons.delete(event.action);

  if (heldSetupButtons.size === SETUP_BUTTONS.size && !setupHoldTimer) {
    setupHoldTimer = setTimeout(() => {
      setupHoldTimer = null;
      if (heldSetupButtons.size !== SETUP_BUTTONS.size) return;
      visible = !visible;
      if (visible) refreshStatus();
    }, SETUP_HOLD_MS);
  } else if (heldSetupButtons.size !== SETUP_BUTTONS.size && setupHoldTimer) {
    clearTimeout(setupHoldTimer);
    setupHoldTimer = null;
  }
}

export function handleSetupControl(event) {
  if (event?.observedOnly) return false;
  updateSetupHold(event);
  if (!visible || event.kind === "command") return false;

  if (event.kind === "joystick") {
    if (event.joystickId === 1) {
      if (event.y > 0) moveSelection(-1);
      if (event.y < 0) moveSelection(1);
      if (event.x < 0) changeSelection(-1);
      if (event.x > 0) changeSelection(1);
    }
    return true;
  }
  if (event.kind !== "digital" || !event.pressed) return true;

  if (event.action === "player1Pressed") movePage(-1);
  if (event.action === "player2Pressed") movePage(1);
  if (event.action === "buttonA") applySelection();
  if (event.action === "buttonC") {
    visible = false;
    heldSetupButtons.clear();
  }
  return true;
}

window.addEventListener("keydown", (event) => {
  if (!visible) return;
  const key = event.key.toLowerCase();

  if (key === "tab") {
    event.preventDefault();
    event.stopImmediatePropagation();
    movePage(event.shiftKey ? -1 : 1);
    return;
  }

  if (!["arrowup", "arrowdown", "arrowleft", "arrowright", "enter"].includes(key)) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (PAGES[pageIndex] === "INPUT") {
    const rows = inputRows();
    if (key === "arrowup") inputRowIndex = (inputRowIndex - 1 + rows.length) % rows.length;
    if (key === "arrowdown") inputRowIndex = (inputRowIndex + 1) % rows.length;
    const row = rows[inputRowIndex];
    if ((key === "arrowleft" || key === "arrowright" || key === "enter") && row === "device") {
      chooseDevice(key === "arrowleft" ? -1 : 1);
    }
    if (key === "enter" && row === "refresh") refreshDevices();
    return;
  }

  if (PAGES[pageIndex] === "TIMERS") {
    if (key === "arrowup") {
      timerSettingIndex =
        (timerSettingIndex - 1 + timingSettingDefinitions.length) % timingSettingDefinitions.length;
    }
    if (key === "arrowdown") {
      timerSettingIndex = (timerSettingIndex + 1) % timingSettingDefinitions.length;
    }
    if (key === "arrowleft") adjustTimingSetting(timerSettingIndex, -1, event.shiftKey);
    if (key === "arrowright") adjustTimingSetting(timerSettingIndex, 1, event.shiftKey);
  }
}, true);

function text(ctx, value, x, y, color = "white") {
  drawText(ctx, String(value), x, y, "h2", { align: "left", color });
}

function clipped(value, length = 43) {
  const string = String(value ?? "");
  return string.length > length ? `${string.slice(0, length - 2)}..` : string;
}

function interval(value) {
  if (!Number.isFinite(value)) return "waiting";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function drawInputPage(ctx, x, y) {
  const hid = status?.hid;
  const devices = hid?.devices || [];
  const selected = hid?.selectedDevice;
  const rows = [
    `HID: ${selected?.product || (hid?.selectedDeviceKey ? "(configured; refresh)" : "(none selected)")}`,
    "REFRESH HID DEVICES",
  ];

  rows.forEach((row, index) => {
    text(ctx, `${index === inputRowIndex ? ">" : " "}${clipped(row, 39)}`, x, y + index * 13,
      index === inputRowIndex ? "#FFD800" : "white");
  });

  let ty = y + rows.length * 13 + 8;
  text(ctx, `HID AVAILABLE: ${hid?.available ? "YES" : "NO"}`, x, ty,
    hid?.available ? "#00FF88" : "#FF6666");
  ty += 12;
  text(ctx, `HID CONNECTED: ${hid?.connected ? "YES" : "NO"}`, x, ty,
    hid?.connected ? "#00FF88" : "#FFAA44");
  ty += 12;
  text(ctx, `DEVICES FOUND: ${devices.length}`, x, ty);
  ty += 12;
  text(ctx, `DECODER: ${hid?.decoderVerified ? "VERIFIED" : "UNVERIFIED"}`, x, ty,
    hid?.decoderVerified ? "#00FF88" : "#FFAA44");
  ty += 12;

  if (lastControlEvent) {
    const args = lastControlEvent.kind === "joystick"
      ? ` ${lastControlEvent.x},${lastControlEvent.y}`
      : "";
    text(ctx, clipped(`LAST: ${lastControlEvent.source} ${lastControlEvent.address}${args}`, 45), x, ty, "#66CCFF");
    ty += 12;
  }
  if (lastHidReport?.raw) {
    text(ctx, clipped(`RAW: ${lastHidReport.raw.join(" ")}`, 45), x, ty, "#AAAAAA");
    ty += 12;
  }
  if (hid?.error) text(ctx, clipped(hid.error, 45), x, ty, "#FF6666");
  else if (operationMessage) text(ctx, clipped(operationMessage, 45), x, ty, "#AAAAAA");
}

function drawNetworkPage(ctx, x, y) {
  const network = status?.network || {};
  const lines = [
    [`CR LISTEN   0.0.0.0:${network.controlRoomInputPort || 8886}`, network.controlRoomListening],
    [`CR GAP      ${interval(network.controlRoomMessageIntervalMs)}`, Number.isFinite(network.controlRoomMessageIntervalMs)],
    [`CR TARGET   ${network.controlRoomHost || "192.168.10.103"}:${network.controlRoomOutputPort || 8885}`, network.controlRoomReady],
  ];
  lines.forEach(([line, ok], index) => text(ctx, line, x, y + index * 15, ok ? "#00FF88" : "#FFAA44"));
}

function drawTimersPage(ctx, x, y) {
  timingSettingDefinitions.forEach((definition, index) => {
    const selected = index === timerSettingIndex;
    text(ctx, `${selected ? ">" : " "}${definition.label}: ${debugSettings[definition.key]} s.`,
      x, y + index * 14, selected ? "#FFD800" : "#CCCCCC");
  });
}

function drawOscPage(ctx, x, y) {
  const entries = [...getOscLog()].filter((entry) => entry.address !== "/isAlive").reverse().slice(0, 8);
  if (entries.length === 0) text(ctx, "No OSC traffic yet", x, y, "#888888");
  entries.forEach((entry, index) => {
    const args = entry.args.length ? ` ${entry.args.join(" ")}` : "";
    text(ctx, clipped(`${entry.dir} ${entry.address}${args}`, 44), x, y + index * 17,
      entry.dir.includes("CR→UI") ? "#66CCFF" : "#FFAA44");
  });
  text(ctx, "> A: CLEAR LOG", x, y + 154, "#FFD800");
}

export function renderSetupOverlay(ctx, canvas) {
  if (!visible) return;

  const w = 310;
  const h = 220;
  const x = Math.round((canvas.width - w) / 2);
  const y = Math.round((canvas.height - h) / 2);

  ctx.fillStyle = "rgba(0, 0, 0, 0.94)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  text(ctx, `SETUP / ${PAGES[pageIndex]}  (${pageIndex + 1}/${PAGES.length})`, x + 8, y + 8, "#FFD800");
  text(ctx, `SCREEN: ${screenManager.getCurrentScreen()}`, x + 190, y + 8, "#888888");
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 25.5);
  ctx.lineTo(x + w - 8, y + 25.5);
  ctx.stroke();

  const contentX = x + 8;
  const contentY = y + 34;
  if (PAGES[pageIndex] === "INPUT") drawInputPage(ctx, contentX, contentY);
  if (PAGES[pageIndex] === "NETWORK") drawNetworkPage(ctx, contentX, contentY);
  if (PAGES[pageIndex] === "TIMERS") drawTimersPage(ctx, contentX, contentY);
  if (PAGES[pageIndex] === "OSC LOG") drawOscPage(ctx, contentX, contentY);

  text(ctx, "1/2 PAGE  JOYSTICK 1 SELECT/CHANGE", x + 8, y + h - 25, "#777777");
  text(ctx, "A ACTION/CLEAR  C EXIT", x + 8, y + h - 13, "#777777");
}
