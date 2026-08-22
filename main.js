const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const osc = require("osc");
const { ControlRouter, INPUT_MODES } = require("./src/main/controlRouter");
const { HidInput } = require("./src/main/hidInput");
const { SettingsStore } = require("./src/main/settingsStore");
const {
  NETWORK,
  COMMAND_ADDRESSES,
  UI_STATE_ADDRESSES,
  parseControlMessage,
} = require("./src/main/oscProtocol");

let win = null;
let maxInputPort = null;
let controlRoomPort = null;
let controlRoomReady = false;
let controlRoomQueue = [];
let router = null;
let hidInput = null;
let settingsStore = null;
let lastMaxMessageAt = null;
let lastControlRoomMessageAt = null;
let maxMessageIntervalMs = null;
let controlRoomMessageIntervalMs = null;

function sendRenderer(channel, payload) {
  if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

function logOsc(direction, address, args = [], details = {}) {
  if (address === "/isAlive") return;
  const flatArgs = (Array.isArray(args) ? args : [args]).map((arg) =>
    arg && typeof arg === "object" && Object.hasOwn(arg, "value") ? arg.value : arg
  );
  console.log(`[OSC ${direction}] ${address}`, flatArgs);
  sendRenderer("console-osc-log", {
    direction,
    address,
    args: flatArgs,
    timestamp: Date.now(),
    ...details,
  });
}

function getConsoleStatus() {
  return {
    network: {
      maxHost: NETWORK.maxHost,
      maxInputPort: NETWORK.maxInputPort,
      maxListening: Boolean(maxInputPort),
      maxMessageIntervalMs,
      controlRoomInputPort: NETWORK.controlRoomInputPort,
      controlRoomListening: Boolean(controlRoomPort),
      controlRoomHost: NETWORK.controlRoomHost,
      controlRoomOutputPort: NETWORK.controlRoomOutputPort,
      controlRoomReady,
      controlRoomMessageIntervalMs,
    },
    router: router?.getStatus() || null,
    hid: hidInput?.getStatus() || null,
  };
}

function broadcastStatus() {
  sendRenderer("console-status", getConsoleStatus());
}

function sendToControlRoom(message, details = {}) {
  if (!message?.address) return;
  const outgoing = { address: message.address, args: message.args || [] };
  logOsc("UI→CR", outgoing.address, outgoing.args, details);

  if (controlRoomReady && controlRoomPort) {
    controlRoomPort.send(outgoing);
    return;
  }

  controlRoomQueue.push(outgoing);
  if (controlRoomQueue.length > 100) controlRoomQueue.shift();
}

function flushControlRoomQueue() {
  if (!controlRoomReady || !controlRoomPort) return;
  for (const message of controlRoomQueue) controlRoomPort.send(message);
  controlRoomQueue = [];
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    frame: true,
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    }
  });

  win.loadFile("src/index.html");
  win.webContents.on("did-finish-load", broadcastStatus);

  // Keep window-level shortcuts independent from the active game screen.
  win.webContents.on("before-input-event", (event, input) => {
    const key = input.key?.toLowerCase();
    if (input.type !== "keyDown" || input.isAutoRepeat) return;

    if (key === "f") {
      event.preventDefault();
      if (win.isKiosk() || win.isFullScreen()) {
        win.setKiosk(false);
        win.setFullScreen(false);
        win.setSize(960, 720);
        win.center();
      } else {
        win.setFullScreen(true);
        win.setKiosk(true);
      }
    }

    if (key === "escape") {
      event.preventDefault();
      app.quit();
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

function setupOSC() {
  maxInputPort = new osc.UDPPort({
    localAddress: NETWORK.maxHost,
    localPort: NETWORK.maxInputPort,
  });

  maxInputPort.on("message", (oscMsg) => {
    const address = oscMsg.address;
    const args = oscMsg.args || [];
    const receivedAt = Date.now();
    if (lastMaxMessageAt !== null) maxMessageIntervalMs = receivedAt - lastMaxMessageAt;
    lastMaxMessageAt = receivedAt;
    logOsc("MAX→UI", address, args);

    const event = parseControlMessage(address, args);
    if (event) router.handleLocalEvent("max", event);
    else logOsc("MAX INVALID", address, args, { rejected: true });
    broadcastStatus();
  });
  maxInputPort.on("error", (error) => {
    console.error("Max OSC input error:", error);
    broadcastStatus();
  });
  maxInputPort.on("ready", broadcastStatus);
  maxInputPort.open();

  controlRoomPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: NETWORK.controlRoomInputPort,
    remoteAddress: NETWORK.controlRoomHost,
    remotePort: NETWORK.controlRoomOutputPort,
  });

  controlRoomPort.on("message", (oscMsg) => {
    const address = oscMsg.address;
    const args = oscMsg.args || [];
    const receivedAt = Date.now();
    if (lastControlRoomMessageAt !== null) controlRoomMessageIntervalMs = receivedAt - lastControlRoomMessageAt;
    lastControlRoomMessageAt = receivedAt;
    logOsc("CR→UI", address, args);

    if (address === "/isAlive") {
      sendToControlRoom({ address: "/isAlive", args: [] }, { heartbeat: true });
      broadcastStatus();
      return;
    }

    const controlEvent = parseControlMessage(address, args);
    if (controlEvent) {
      router.handleControlRoomEvent(controlEvent);
      broadcastStatus();
      return;
    }

    if (COMMAND_ADDRESSES.has(address)) {
      router.handleControlRoomCommand(address, args);
      broadcastStatus();
      return;
    }

    logOsc("CR INVALID", address, args, { rejected: true });
    broadcastStatus();
  });
  controlRoomPort.on("ready", () => {
    controlRoomReady = true;
    flushControlRoomQueue();
    broadcastStatus();
  });
  controlRoomPort.on("error", (error) => {
    console.error("Control Room OSC error:", error);
    broadcastStatus();
  });
  controlRoomPort.open();
}

function setupInputServices() {
  const settings = settingsStore.load();
  router = new ControlRouter({
    inputMode: settings.inputMode,
    sendToRenderer: (event) => sendRenderer("console-input", event),
    sendToControlRoom,
    onStatus: broadcastStatus,
  });

  hidInput = new HidInput({ selectedDeviceKey: settings.hidDeviceKey });
  hidInput.on("control", (event) => router.handleLocalEvent("directHid", event));
  hidInput.on("report", (report) => sendRenderer("console-hid-report", report));
  hidInput.on("status", broadcastStatus);

  if (settings.inputMode === "directHid") {
    hidInput.start().catch((error) => console.error("Could not start Direct Input:", error));
  }
}

function setupIPC() {
  ipcMain.on("cr-osc-send", (event, address, args) => {
    if (!UI_STATE_ADDRESSES.has(address)) {
      console.warn(`Renderer attempted unsupported OSC output: ${address}`);
      return;
    }
    sendToControlRoom({ address, args: Array.isArray(args) ? args : [] });
  });

  ipcMain.handle("console-get-status", () => getConsoleStatus());

  ipcMain.handle("console-set-input-mode", async (event, inputMode) => {
    if (!INPUT_MODES.has(inputMode)) throw new Error(`Invalid input mode: ${inputMode}`);
    const changed = router.setInputMode(inputMode);
    if (changed) settingsStore.update({ inputMode });

    if (inputMode === "directHid") await hidInput.start();
    else await hidInput.stop();
    broadcastStatus();
    return getConsoleStatus();
  });

  ipcMain.handle("console-refresh-hid-devices", async () => {
    await hidInput.refreshDevices();
    broadcastStatus();
    return getConsoleStatus();
  });

  ipcMain.handle("console-select-hid-device", async (event, key) => {
    settingsStore.update({ hidDeviceKey: key || null });
    await hidInput.selectDevice(key || null);
    broadcastStatus();
    return getConsoleStatus();
  });
}

async function closeServices() {
  router?.close();
  await hidInput?.close();

  if (maxInputPort) {
    maxInputPort.close();
    maxInputPort = null;
  }
  if (controlRoomPort) {
    controlRoomPort.close();
    controlRoomPort = null;
  }
  controlRoomReady = false;
}

app.whenReady().then(() => {
  settingsStore = new SettingsStore(app.getPath("userData"));
  setupInputServices();
  setupIPC();
  createWindow();
  setupOSC();
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  closeServices().catch((error) => console.error("Could not close input services:", error));
});
