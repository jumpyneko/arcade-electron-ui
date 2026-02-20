const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("oscBridge", {
  // Renderer → Main → Max
  send: (address, args) => {
    ipcRenderer.send("osc-send", address, args);
  },
  // Max → Main → Renderer
  onMessage: (callback) => {
    ipcRenderer.on("osc-message", (event, address, args) => {
      callback(address, args);
    });
  }
});