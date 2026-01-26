const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
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

app.whenReady().then(createWindow);
