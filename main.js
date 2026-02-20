const { app, BrowserWindow, ipcMain } = require("electron");
const osc = require("osc");

// --- Config ---
const OSC_LISTEN_PORT = 9000;   // Electron listens here (Max sends to this)
const OSC_SEND_PORT = 9001;     // Electron sends here (Max listens on this)
const OSC_SEND_HOST = "127.0.0.1";

let win = null;
let udpPort = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    frame: false,
    kiosk: true,
    webPreferences: {
      preload: __dirname + "/preload.js"
    }
  });

  win.loadFile("src/index.html");
}

function setupOSC() {
  udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: OSC_LISTEN_PORT,
    remoteAddress: OSC_SEND_HOST,
    remotePort: OSC_SEND_PORT,
  });

  // Messages FROM Max → forward to renderer
  udpPort.on("message", (oscMsg) => {
    const address = oscMsg.address;   // e.g. "/buttonA"
    const args = oscMsg.args || [];   // e.g. [] or [5]
    console.log(`[OSC ←] ${address}`, args);

    if (win && win.webContents) {
      win.webContents.send("osc-message", address, args);
    }
  });

  udpPort.on("error", (err) => {
    console.error("OSC error:", err);
  });

  udpPort.open();
  console.log(`OSC listening on port ${OSC_LISTEN_PORT}, sending to ${OSC_SEND_HOST}:${OSC_SEND_PORT}`);
}

// Messages FROM renderer → send to Max
ipcMain.on("osc-send", (event, address, args) => {
  if (udpPort) {
    console.log(`[OSC →] ${address}`, args);
    udpPort.send({ address, args });
  }
});

app.whenReady().then(() => {
  createWindow();
  setupOSC();
});
