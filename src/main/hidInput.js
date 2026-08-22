const { EventEmitter } = require("node:events");
const { decodeGenericUsbJoystickReport } = require("./hidDecoder");
const { parseControlMessage, DIGITAL_BY_CONTROL } = require("./oscProtocol");

function deviceKey(device) {
  return [
    device.vendorId ?? "",
    device.productId ?? "",
    device.serialNumber ?? "",
    device.interface ?? "",
    device.usagePage ?? "",
    device.usage ?? "",
  ].join(":");
}

function publicDevice(device) {
  return {
    key: deviceKey(device),
    vendorId: device.vendorId,
    productId: device.productId,
    serialNumber: device.serialNumber || "",
    manufacturer: device.manufacturer || "",
    product: device.product || "Unknown HID device",
    interface: device.interface,
    usagePage: device.usagePage,
    usage: device.usage,
  };
}

function isPossibleJoystick(device) {
  const product = String(device.product || "").toLowerCase();
  const genericDesktopJoystick =
    Number(device.usagePage) === 1 && [4, 5].includes(Number(device.usage));
  return genericDesktopJoystick || product.includes("joystick") || product.includes("gamepad");
}

class HidInput extends EventEmitter {
  constructor({ selectedDeviceKey = null } = {}) {
    super();
    this.selectedDeviceKey = selectedDeviceKey;
    this.enabled = false;
    this.device = null;
    this.devices = [];
    this.previousSnapshot = null;
    this.lastReportAt = null;
    this.lastRawReport = [];
    this.error = null;
    this.decoderVerified = false;

    try {
      this.hid = require("node-hid");
    } catch (error) {
      this.hid = null;
      this.error = `Direct HID unavailable: ${error.message}`;
    }
  }

  getStatus() {
    return {
      available: Boolean(this.hid),
      enabled: this.enabled,
      connected: Boolean(this.device),
      selectedDeviceKey: this.selectedDeviceKey,
      selectedDevice:
        this.devices.find((device) => device.key === this.selectedDeviceKey) || null,
      devices: this.devices.map(({ path, ...device }) => device),
      lastReportAt: this.lastReportAt,
      lastRawReport: this.lastRawReport,
      decoderVerified: this.decoderVerified,
      error: this.error,
    };
  }

  async refreshDevices({ reconnect = true } = {}) {
    if (!this.hid) {
      this._emitStatus();
      return [];
    }

    try {
      const enumerated = await this.hid.devicesAsync();
      this.devices = enumerated
        .filter((device) => device.path && isPossibleJoystick(device))
        .map((device) => ({ ...publicDevice(device), path: device.path }));
      this.error = null;
      const selected = this.devices.find((device) => device.key === this.selectedDeviceKey);
      if (this.enabled && !this.selectedDeviceKey) {
        this.error = "Direct Input selected, but no HID device is configured";
      } else if (this.enabled && !selected) {
        this.error = "The configured HID device is not connected";
      } else if (this.enabled && reconnect && selected && !this.device) {
        await this._openDevice(selected);
      }
    } catch (error) {
      this.devices = [];
      this.error = `Could not enumerate HID devices: ${error.message}`;
    }

    this._emitStatus();
    return this.getStatus().devices;
  }

  async selectDevice(key) {
    this.selectedDeviceKey = key || null;
    this.error = null;
    if (this.enabled) await this._openSelectedDevice();
    this._emitStatus();
  }

  async start() {
    this.enabled = true;
    if (!this.hid) {
      this._emitStatus();
      return;
    }

    if (this.devices.length === 0) await this.refreshDevices({ reconnect: false });
    await this._openSelectedDevice();
  }

  async stop() {
    this.enabled = false;
    await this._closeDevice();
    this.error = null;
    this._emitStatus();
  }

  async close() {
    this.enabled = false;
    await this._closeDevice();
  }

  async _openSelectedDevice() {
    await this._closeDevice();
    this.previousSnapshot = null;

    if (!this.enabled) return;
    if (!this.selectedDeviceKey) {
      this.error = "Direct Input selected, but no HID device is configured";
      this._emitStatus();
      return;
    }

    let selected = this.devices.find((device) => device.key === this.selectedDeviceKey);
    if (!selected) {
      await this.refreshDevices({ reconnect: false });
      selected = this.devices.find((device) => device.key === this.selectedDeviceKey);
    }
    if (!selected) {
      this.error = "The configured HID device is not connected";
      this._emitStatus();
      return;
    }

    await this._openDevice(selected);
    this._emitStatus();
  }

  async _openDevice(selected) {
    try {
      this.device = await this.hid.HIDAsync.open(selected.path);
      this.device.on("data", (report) => this._handleReport(report));
      this.device.on("error", (error) => this._handleDeviceError(error));
      this.error = null;
    } catch (error) {
      this.device = null;
      this.error = `Could not open HID device: ${error.message}`;
    }
  }

  async _closeDevice() {
    const device = this.device;
    this.device = null;
    if (!device) return;
    try {
      await Promise.resolve(device.close());
    } catch (error) {
      console.warn("Could not close HID device:", error);
    }
  }

  _handleReport(report) {
    try {
      const snapshot = decodeGenericUsbJoystickReport(report);
      this.lastReportAt = Date.now();
      this.lastRawReport = snapshot.raw;
      this.error = null;
      this.emit("report", {
        timestamp: this.lastReportAt,
        raw: snapshot.raw,
        tightValues: snapshot.tightValues,
      });
      this._emitSnapshotChanges(snapshot);
      this.previousSnapshot = snapshot;
    } catch (error) {
      this.error = `HID report decoder: ${error.message}`;
      this._emitStatus();
    }
  }

  _emitSnapshotChanges(snapshot) {
    const previous = this.previousSnapshot;

    for (const [control, pressed] of Object.entries(snapshot.digital)) {
      const wasPressed = previous?.digital?.[control] ?? false;
      if (pressed === wasPressed) continue;
      const definition = DIGITAL_BY_CONTROL.get(control);
      const address = pressed ? definition.pressedAddress : definition.releasedAddress;
      this.emit("control", parseControlMessage(address, []));
    }

    if (snapshot.coinInserted && !previous?.coinInserted) {
      this.emit("control", parseControlMessage("/coinInserted", []));
    }

    for (const [control, position] of Object.entries(snapshot.joysticks)) {
      const oldPosition = previous?.joysticks?.[control] || { x: 0, y: 0 };
      if (position.x === oldPosition.x && position.y === oldPosition.y) continue;
      const joystickId = control === "joystick1" ? 1 : 2;
      this.emit(
        "control",
        parseControlMessage(`/joystick${joystickId}Input`, [position.x, position.y])
      );
    }
  }

  _handleDeviceError(error) {
    this.device = null;
    this.previousSnapshot = null;
    this.error = `HID device disconnected: ${error.message}`;
    this._emitStatus();
  }

  _emitStatus() {
    this.emit("status", this.getStatus());
  }
}

module.exports = { HidInput, deviceKey, publicDevice, isPossibleJoystick };
