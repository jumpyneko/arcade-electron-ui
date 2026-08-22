const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  const listener = (event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("consoleBridge", {
  sendToControlRoom: (address, args = []) => {
    ipcRenderer.send("cr-osc-send", address, args);
  },
  getStatus: () => ipcRenderer.invoke("console-get-status"),
  setInputMode: (mode) => ipcRenderer.invoke("console-set-input-mode", mode),
  refreshHidDevices: () => ipcRenderer.invoke("console-refresh-hid-devices"),
  selectHidDevice: (key) => ipcRenderer.invoke("console-select-hid-device", key),
  onInput: (callback) => subscribe("console-input", callback),
  onStatus: (callback) => subscribe("console-status", callback),
  onOscLog: (callback) => subscribe("console-osc-log", callback),
  onHidReport: (callback) => subscribe("console-hid-report", callback),
});
