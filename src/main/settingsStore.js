const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SETTINGS = Object.freeze({
  inputMode: "max",
  hidDeviceKey: null,
});

class SettingsStore {
  constructor(directory) {
    this.filePath = path.join(directory, "console-input-settings.json");
    this.settings = { ...DEFAULT_SETTINGS };
  }

  load() {
    try {
      const saved = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...saved,
        inputMode: saved.inputMode === "directHid" ? "directHid" : "max",
      };
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Could not load input settings:", error);
    }
    return { ...this.settings };
  }

  update(patch) {
    this.settings = { ...this.settings, ...patch };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(this.settings, null, 2), "utf8");
    fs.renameSync(temporaryPath, this.filePath);
    return { ...this.settings };
  }
}

module.exports = { SettingsStore, DEFAULT_SETTINGS };
