const {
  makeReleaseEvent,
  isControlActive,
  isControlReleased,
} = require("./oscProtocol");

const INPUT_MODES = new Set(["max", "directHid"]);
const OVERRIDE_TIMEOUT_MS = 1000;

function defaultPhysicalState() {
  return new Map([
    ["player1", false],
    ["player2", false],
    ["buttonA", false],
    ["buttonB", false],
    ["buttonC", false],
    ["buttonD", false],
    ["buttonE", false],
    ["joystick1", { x: 0, y: 0 }],
    ["joystick2", { x: 0, y: 0 }],
  ]);
}

class ControlRouter {
  constructor({
    inputMode = "max",
    sendToRenderer,
    sendToControlRoom,
    onStatus = () => {},
    now = () => Date.now(),
    schedule = (callback, delay) => setTimeout(callback, delay),
    cancelSchedule = (timer) => clearTimeout(timer),
  }) {
    if (!INPUT_MODES.has(inputMode)) throw new Error(`Invalid input mode: ${inputMode}`);

    this.inputMode = inputMode;
    this.sendToRenderer = sendToRenderer;
    this.sendToControlRoom = sendToControlRoom;
    this.onStatus = onStatus;
    this.now = now;
    this.schedule = schedule;
    this.cancelSchedule = cancelSchedule;

    this.localPhysicalState = defaultPhysicalState();
    this.blockedUntilRelease = new Set();
    this.overrideActive = false;
    this.overrideDigitalHeld = new Set();
    this.overrideJoysticks = new Map([
      ["joystick1", { x: 0, y: 0 }],
      ["joystick2", { x: 0, y: 0 }],
    ]);
    this.overrideLastInputAt = 0;
    this.overrideTimer = null;
  }

  getStatus() {
    const overrideCanEnd = this._overrideControlsAreReleased();
    return {
      inputMode: this.inputMode,
      overrideActive: this.overrideActive,
      overrideLastInputAt: this.overrideLastInputAt || null,
      overrideCanEnd,
      overrideExpiresAt:
        this.overrideActive && overrideCanEnd
          ? this.overrideLastInputAt + OVERRIDE_TIMEOUT_MS
          : null,
      blockedLocalControls: [...this.blockedUntilRelease],
    };
  }

  setInputMode(inputMode) {
    if (!INPUT_MODES.has(inputMode)) throw new Error(`Invalid input mode: ${inputMode}`);
    if (inputMode === this.inputMode) return false;

    if (!this.overrideActive) this._releaseActiveLocalControls("modeChange");
    this.inputMode = inputMode;
    this.localPhysicalState = defaultPhysicalState();
    this.blockedUntilRelease.clear();
    this._emitStatus();
    return true;
  }

  handleLocalEvent(source, event) {
    if (!INPUT_MODES.has(source)) return false;

    if (source !== this.inputMode) {
      this._emitObserved(event, source, "inactiveSource");
      return false;
    }

    if (this._matchesLocalPhysicalState(event)) {
      this._emitObserved(event, source, "duplicateState");
      return false;
    }

    this._updateLocalPhysicalState(event);

    if (this.overrideActive) {
      if (event.kind !== "coin") {
        if (isControlActive(event)) this.blockedUntilRelease.add(event.control);
        if (isControlReleased(event)) this.blockedUntilRelease.delete(event.control);
      }
      this._emitObserved(event, source, "overrideActive");
      this._emitStatus();
      return false;
    }

    if (this.blockedUntilRelease.has(event.control)) {
      if (isControlReleased(event)) this.blockedUntilRelease.delete(event.control);
      this._emitObserved(event, source, "waitingForPhysicalRelease");
      this._emitStatus();
      return false;
    }

    this._deliver(event, source, { forwardToControlRoom: true });
    return true;
  }

  handleControlRoomEvent(event) {
    if (!this.overrideActive) this._beginOverride();

    this.overrideLastInputAt = this.now();
    this._updateOverrideState(event);
    this._deliver(event, "controlRoom", { forwardToControlRoom: false });
    this._scheduleOverrideEnd();
    this._emitStatus();
  }

  handleControlRoomCommand(address, args) {
    this.sendToRenderer({
      kind: "command",
      source: "controlRoom",
      address,
      args,
      timestamp: this.now(),
    });
  }

  close() {
    if (this.overrideTimer) this.cancelSchedule(this.overrideTimer);
    this.overrideTimer = null;
  }

  _beginOverride() {
    this.overrideActive = true;
    this._releaseActiveLocalControls("overrideCleanup");
  }

  _releaseActiveLocalControls(reason) {
    for (const [control, value] of this.localPhysicalState.entries()) {
      const active =
        typeof value === "boolean"
          ? value
          : value.x !== 0 || value.y !== 0;
      if (!active) continue;

      const release = makeReleaseEvent(control);
      if (!release) continue;
      this.blockedUntilRelease.add(control);
      this._deliver(release, this.inputMode, {
        forwardToControlRoom: true,
        synthetic: true,
        reason,
      });
    }
  }

  _updateLocalPhysicalState(event) {
    if (event.kind === "digital") {
      this.localPhysicalState.set(event.control, event.pressed);
    } else if (event.kind === "joystick") {
      this.localPhysicalState.set(event.control, { x: event.x, y: event.y });
    }
  }

  _matchesLocalPhysicalState(event) {
    if (event.kind === "digital") return this.localPhysicalState.get(event.control) === event.pressed;
    if (event.kind === "joystick") {
      const current = this.localPhysicalState.get(event.control);
      return current?.x === event.x && current?.y === event.y;
    }
    return false;
  }

  _updateOverrideState(event) {
    if (event.kind === "digital") {
      if (event.pressed) this.overrideDigitalHeld.add(event.control);
      else this.overrideDigitalHeld.delete(event.control);
    } else if (event.kind === "joystick") {
      this.overrideJoysticks.set(event.control, { x: event.x, y: event.y });
    }
  }

  _overrideControlsAreReleased() {
    if (this.overrideDigitalHeld.size > 0) return false;
    return [...this.overrideJoysticks.values()].every(({ x, y }) => x === 0 && y === 0);
  }

  _scheduleOverrideEnd() {
    if (this.overrideTimer) this.cancelSchedule(this.overrideTimer);
    this.overrideTimer = null;
    if (!this._overrideControlsAreReleased()) return;

    this.overrideTimer = this.schedule(() => {
      this.overrideTimer = null;
      const elapsed = this.now() - this.overrideLastInputAt;
      if (!this.overrideActive || !this._overrideControlsAreReleased()) return;
      if (elapsed < OVERRIDE_TIMEOUT_MS) {
        this._scheduleOverrideEnd();
        return;
      }

      this.overrideActive = false;
      this.overrideDigitalHeld.clear();
      this.overrideJoysticks.set("joystick1", { x: 0, y: 0 });
      this.overrideJoysticks.set("joystick2", { x: 0, y: 0 });
      this._emitStatus();
    }, OVERRIDE_TIMEOUT_MS);
  }

  _deliver(event, source, options = {}) {
    const timestamp = this.now();
    const payload = {
      ...event,
      source,
      timestamp,
      synthetic: Boolean(options.synthetic),
      reason: options.reason || null,
    };
    this.sendToRenderer(payload);

    if (options.forwardToControlRoom) {
      this.sendToControlRoom({ address: event.address, args: event.args || [] });
    }
  }

  _emitObserved(event, source, reason) {
    this.sendToRenderer({
      ...event,
      source,
      timestamp: this.now(),
      observedOnly: true,
      reason,
    });
  }

  _emitStatus() {
    this.onStatus(this.getStatus());
  }
}

module.exports = { ControlRouter, INPUT_MODES, OVERRIDE_TIMEOUT_MS };
