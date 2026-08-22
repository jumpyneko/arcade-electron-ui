const test = require("node:test");
const assert = require("node:assert/strict");
const {
  decodeGenericUsbJoystickReport,
  extractTightValues,
  quantizeAxis,
} = require("../src/main/hidDecoder");

const MAX_SCREENSHOT_SAMPLE = [
  0, 127, 127, 129, 127, 127, 15, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

test("provisional decoder reproduces the Max screenshot mapping", () => {
  const decoded = decodeGenericUsbJoystickReport(MAX_SCREENSHOT_SAMPLE);
  assert.deepEqual(decoded.joysticks.joystick1, { x: 0, y: -1 });
  assert.deepEqual(decoded.joysticks.joystick2, { x: 0, y: 0 });
  assert.equal(decoded.digital.buttonA, false);
  assert.equal(decoded.digital.buttonB, true);
  assert.equal(decoded.digital.player1, false);
  assert.equal(decoded.digital.player2, false);
  assert.equal(decoded.coinInserted, false);
});

test("a prepended report ID does not shift the provisional tight values", () => {
  assert.deepEqual(extractTightValues([99, ...MAX_SCREENSHOT_SAMPLE]), MAX_SCREENSHOT_SAMPLE);
});

test("Max-style axis values normalize to -1, 0, and 1", () => {
  assert.equal(quantizeAxis(0), -1);
  assert.equal(quantizeAxis(126), -1);
  assert.equal(quantizeAxis(127), 0);
  assert.equal(quantizeAxis(254), 0);
  assert.equal(quantizeAxis(255), 1);
});

test("short HID reports fail visibly instead of producing bad controls", () => {
  assert.throws(() => decodeGenericUsbJoystickReport([0, 1, 2]), /Expected at least 19/);
});
