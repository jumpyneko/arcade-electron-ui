const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SETTINGS = Object.freeze({
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
      // Only known keys are carried forward, so a settings file left behind by
      // an older build - one still naming an input mode - is simply outgrown.
      this.settings = {
        ...DEFAULT_SETTINGS,
        hidDeviceKey: saved.hidDeviceKey ?? DEFAULT_SETTINGS.hidDeviceKey,
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
