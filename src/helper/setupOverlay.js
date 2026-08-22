import { screenManager } from "./screenManager.js";
import { drawText } from "./typography.js";
import { getOscLog } from "./debugOverlay.js";
import {
  debugSettings,
  timingSettingDefinitions,
  adjustTimingSetting,
} from "./debugSettings.js";

const PAGES = ["INPUT", "NETWORK", "TIMERS", "OSC LOG"];
const INPUT_ROWS = ["mode", "device", "refresh"];

let visible = false;
let pageIndex = 0;
let inputRowIndex = 0;
let timerSettingIndex = 0;
let deviceIndex = 0;
let status = null;
let lastControlEvent = null;
let lastHidReport = null;
let operationMessage = "";

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

async function chooseMode(direction = 1) {
  if (!window.consoleBridge) return;
  const current = status?.router?.inputMode || "max";
  const next = current === "max" ? "directHid" : "max";
  if (direction === 0) return;
  operationMessage = "Applying input mode...";
  try {
    updateStatus(await window.consoleBridge.setInputMode(next));
    operationMessage = next === "max" ? "Max Input selected" : "Direct Input selected";
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

window.addEventListener("keydown", (event) => {
  if (!visible) return;
  const key = event.key.toLowerCase();

  if (key === "tab") {
    event.preventDefault();
    event.stopImmediatePropagation();
    pageIndex = (pageIndex + (event.shiftKey ? -1 : 1) + PAGES.length) % PAGES.length;
    return;
  }

  if (!["arrowup", "arrowdown", "arrowleft", "arrowright", "enter"].includes(key)) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (PAGES[pageIndex] === "INPUT") {
    if (key === "arrowup") inputRowIndex = (inputRowIndex - 1 + INPUT_ROWS.length) % INPUT_ROWS.length;
    if (key === "arrowdown") inputRowIndex = (inputRowIndex + 1) % INPUT_ROWS.length;
    const row = INPUT_ROWS[inputRowIndex];
    if ((key === "arrowleft" || key === "arrowright" || key === "enter") && row === "mode") {
      chooseMode(key === "arrowleft" ? -1 : 1);
    }
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

function age(timestamp) {
  if (!timestamp) return "never";
  const elapsed = Math.max(0, Date.now() - timestamp);
  if (elapsed < 1000) return `${elapsed}ms ago`;
  return `${(elapsed / 1000).toFixed(1)}s ago`;
}

function drawInputPage(ctx, x, y) {
  const mode = status?.router?.inputMode || "max";
  const hid = status?.hid;
  const devices = hid?.devices || [];
  const selected = hid?.selectedDevice;
  const rows = [
    `MODE: ${mode === "max" ? "MAX INPUT" : "DIRECT INPUT"}`,
    `HID: ${selected?.product || (hid?.selectedDeviceKey ? "(configured; refresh)" : "(none selected)")}`,
    "REFRESH HID DEVICES",
  ];

  rows.forEach((row, index) => {
    text(ctx, `${index === inputRowIndex ? ">" : " "}${clipped(row, 39)}`, x, y + index * 13,
      index === inputRowIndex ? "#FFD800" : "white");
  });

  let ty = y + 44;
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

  const override = status?.router;
  let overrideText = "OFF";
  if (override?.overrideActive) {
    overrideText = override.overrideCanEnd && override.overrideExpiresAt
      ? `${Math.max(0, override.overrideExpiresAt - Date.now())}ms`
      : "WAITING FOR RELEASE";
  }
  text(ctx, `CR OVERRIDE: ${overrideText}`, x, ty,
    override?.overrideActive ? "#FF8844" : "#00FF88");
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
    [`MAX LISTEN  ${network.maxHost || "127.0.0.1"}:${network.maxInputPort || 9000}`, network.maxListening],
    [`MAX LAST    ${age(network.lastMaxMessageAt)}`, Boolean(network.lastMaxMessageAt)],
    [`CR LISTEN   0.0.0.0:${network.controlRoomInputPort || 8886}`, network.controlRoomListening],
    [`CR LAST     ${age(network.lastControlRoomMessageAt)}`, Boolean(network.lastControlRoomMessageAt)],
    [`CR TARGET   ${network.controlRoomHost || "192.168.10.103"}:${network.controlRoomOutputPort || 8885}`, network.controlRoomReady],
    ["ISALIVE     CR ONLY", true],
    ["MAX OUTPUT  DISABLED", true],
  ];
  lines.forEach(([line, ok], index) => text(ctx, line, x, y + index * 15, ok ? "#00FF88" : "#FFAA44"));
}

function drawTimersPage(ctx, x, y) {
  timingSettingDefinitions.forEach((definition, index) => {
    const selected = index === timerSettingIndex;
    text(ctx, `${selected ? ">" : " "}${definition.label}: ${debugSettings[definition.key]}`,
      x, y + index * 14, selected ? "#FFD800" : "#CCCCCC");
  });
}

function drawOscPage(ctx, x, y) {
  const entries = [...getOscLog()].reverse();
  if (entries.length === 0) text(ctx, "No OSC traffic yet", x, y, "#888888");
  entries.forEach((entry, index) => {
    const args = entry.args.length ? ` ${entry.args.join(" ")}` : "";
    text(ctx, clipped(`${entry.dir} ${entry.address}${args}`, 44), x, y + index * 17,
      entry.dir.includes("CR→UI") ? "#66CCFF" : "#FFAA44");
  });
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

  text(ctx, "O CLOSE   TAB PAGE   ARROWS SELECT/CHANGE   ENTER APPLY", x + 8, y + h - 14, "#777777");
}
