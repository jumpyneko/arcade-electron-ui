const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const osc = require("osc");
const { execFile } = require("node:child_process");
const { ControlRouter } = require("./src/main/controlRouter");
const { HidInput } = require("./src/main/hidInput");
const { SettingsStore } = require("./src/main/settingsStore");
const {
  NETWORK,
  COMMAND_ADDRESSES,
  UI_STATE_ADDRESSES,
  parseControlMessage,
} = require("./src/main/oscProtocol");

// The one address the shutdown listener maps. It takes no arguments.
const SHUTDOWN_ADDRESS = "/system/shutdown";

let win = null;
let controlRoomPort = null;
let shutdownPort = null;
// Where /isAlive answers and every other reply are sent: whoever last talked
// to us, falling back to the configured host until someone has. NETWORK.
// controlRoomHost is a fixed .103, so without this the console answers a
// machine that may not be running Control Room at all - which is exactly how
// its heartbeat stayed dark while the cabinets' worked. The cabinets already
// do this; see max_led.py on either Pi.
let controlRoomReplyHost = null;
let controlRoomReady = false;
let controlRoomQueue = [];
let router = null;
let hidInput = null;
let settingsStore = null;
let lastControlRoomMessageAt = null;
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
    // Explicit target rather than the port's default remoteAddress: the reply
    // follows Control Room, but always to its own listener port, never the
    // ephemeral port a poll happened to come from.
    controlRoomPort.send(outgoing, controlRoomReplyHost || NETWORK.controlRoomHost, NETWORK.controlRoomOutputPort);
    return;
  }

  controlRoomQueue.push(outgoing);
  if (controlRoomQueue.length > 100) controlRoomQueue.shift();
}

function flushControlRoomQueue() {
  if (!controlRoomReady || !controlRoomPort) return;
  for (const message of controlRoomQueue) {
    controlRoomPort.send(message, controlRoomReplyHost || NETWORK.controlRoomHost, NETWORK.controlRoomOutputPort);
  }
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
  controlRoomPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: NETWORK.controlRoomInputPort,
    remoteAddress: NETWORK.controlRoomHost,
    remotePort: NETWORK.controlRoomOutputPort,
  });

  controlRoomPort.on("message", (oscMsg, timeTag, info) => {
    const address = oscMsg.address;
    // Remember who is polling, so replies follow Control Room rather than the
    // fixed address baked into NETWORK.
    if (info?.address) controlRoomReplyHost = info.address;
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

/**
 * Control Room's POWER OFF CONSOLE, on a listening port of its own.
 *
 * Deliberately separate from the 8886 handler in two ways. It binds its own
 * socket, so a power-off never reaches logOsc and never appears in the
 * console's on-screen OSC log; and it does not go through parseControlMessage,
 * so nothing in the ordinary command vocabulary can ever reach a shutdown.
 *
 * There is no shared code on this route, unlike the Kallax Pis: the port and
 * the address are the whole contract. That is a deliberate choice - the code
 * on the Pi route guards a machine that needs someone to walk to the cabinet,
 * while this one comes back by unplugging the kiosk cable and plugging it in
 * again.
 *
 * Nothing is answered, on success or on a wrong address alike. Control Room
 * therefore only ever learns that its packet left, which is why its button
 * confirms before sending rather than reporting afterwards.
 */
function setupShutdownListener() {
  shutdownPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: NETWORK.shutdownPort,
  });

  shutdownPort.on("message", (oscMsg) => {
    if (oscMsg.address !== SHUTDOWN_ADDRESS) return;
    if (process.platform !== "win32") {
      console.error(`Shutdown requested, but ${process.platform} is not supported.`);
      return;
    }
    // /t 0 rather than a delay: the operator has already confirmed in Control
    // Room, and a pending shutdown that someone could abort from the console
    // has no one standing at it to abort it.
    execFile("shutdown", ["/s", "/t", "0"], (error) => {
      if (error) console.error("Shutdown failed:", error);
    });
  });

  shutdownPort.on("error", (error) => console.error("Shutdown listener error:", error));
  shutdownPort.open();
}

function setupInputServices() {
  const settings = settingsStore.load();
  router = new ControlRouter({
    sendToRenderer: (event) => sendRenderer("console-input", event),
    sendToControlRoom,
    onStatus: broadcastStatus,
  });

  hidInput = new HidInput({ selectedDeviceKey: settings.hidDeviceKey });
  hidInput.on("control", (event) => router.handleLocalEvent(event));
  hidInput.on("report", (report) => sendRenderer("console-hid-report", report));
  hidInput.on("status", broadcastStatus);

  // The cabinet reads its encoder directly; there is no other local input path.
  hidInput.start().catch((error) => console.error("Could not start Direct Input:", error));
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
  setupShutdownListener();
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  closeServices().catch((error) => console.error("Could not close input services:", error));
});
