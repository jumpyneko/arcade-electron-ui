const test = require("node:test");
const assert = require("node:assert/strict");
const {
  REPORT_LENGTH,
  decodeGenericUsbJoystickReport,
  normalizeReport,
  quantizeAxis,
} = require("../src/main/hidDecoder");

// Captured from the cabinet encoder (DragonRise 0x0079:0x0006) with nothing
// touched. Byte 2 is an unconnected axis that free-runs, so its value here is
// just one of the many the device sends while idle.
const IDLE_REPORT = [127, 127, 132, 127, 127, 15, 0, 192];

// Buttons 1..4 live in the high nibble of byte 5, 5..12 in byte 6, 13 in byte 7.
function withButtons(...buttonNumbers) {
  const report = [...IDLE_REPORT];
  for (const button of buttonNumbers) {
    if (button <= 4) report[5] |= 1 << (button + 3);
    else if (button <= 12) report[6] |= 1 << (button - 5);
    else report[7] |= 1;
  }
  return report;
}

function withAxes(x, y) {
  const report = [...IDLE_REPORT];
  report[0] = x;
  report[1] = y;
  return report;
}

test("a resting report produces no controls at all", () => {
  const decoded = decodeGenericUsbJoystickReport(IDLE_REPORT);
  assert.deepEqual(decoded.joysticks.joystick1, { x: 0, y: 0 });
  assert.deepEqual(decoded.joysticks.joystick2, { x: 0, y: 0 });
  assert.equal(Object.values(decoded.digital).some(Boolean), false);
  assert.equal(decoded.coinInserted, false);
  assert.equal(decoded.plausible, true);
});

test("the idle axis jitter on byte 2 never reaches a control", () => {
  for (let noise = 120; noise <= 140; noise += 1) {
    const report = [...IDLE_REPORT];
    report[2] = noise;
    const decoded = decodeGenericUsbJoystickReport(report);
    assert.deepEqual(decoded.joysticks.joystick2, { x: 0, y: 0 });
    assert.equal(Object.values(decoded.digital).some(Boolean), false);
  }
});

// Wiring taken from Controller V.2.0.maxpat: the harness order is D, E, A, B, C
// for the action buttons, not the alphabetical one.
test("action buttons follow the harness order from the Max patch", () => {
  const cases = [
    [1, "buttonD"],
    [2, "buttonE"],
    [3, "buttonA"],
    [4, "buttonB"],
    [5, "buttonC"],
    [10, "player2"],
    [12, "player1"],
  ];

  for (const [button, control] of cases) {
    const decoded = decodeGenericUsbJoystickReport(withButtons(button));
    assert.equal(decoded.digital[control], true, `button ${button} should be ${control}`);
    const others = Object.entries(decoded.digital).filter(([name]) => name !== control);
    assert.equal(others.every(([, pressed]) => !pressed), true, `button ${button} set extra controls`);
    assert.equal(decoded.coinInserted, false);
  }
});

test("the coin button is reported separately from the digital controls", () => {
  const decoded = decodeGenericUsbJoystickReport(withButtons(9));
  assert.equal(decoded.coinInserted, true);
  assert.equal(Object.values(decoded.digital).some(Boolean), false);
});

test("joystick 1 comes off four button inputs, up and right positive", () => {
  assert.deepEqual(decodeGenericUsbJoystickReport(withButtons(6)).joysticks.joystick1, { x: 0, y: 1 });
  assert.deepEqual(decodeGenericUsbJoystickReport(withButtons(8)).joysticks.joystick1, { x: 0, y: -1 });
  assert.deepEqual(decodeGenericUsbJoystickReport(withButtons(7)).joysticks.joystick1, { x: 1, y: 0 });
  assert.deepEqual(decodeGenericUsbJoystickReport(withButtons(11)).joysticks.joystick1, { x: -1, y: 0 });
  assert.deepEqual(decodeGenericUsbJoystickReport(withButtons(6, 7)).joysticks.joystick1, { x: 1, y: 1 });
});

test("holding both ends of a joystick 1 axis cancels out", () => {
  assert.deepEqual(decodeGenericUsbJoystickReport(withButtons(6, 8)).joysticks.joystick1, { x: 0, y: 0 });
  assert.deepEqual(decodeGenericUsbJoystickReport(withButtons(7, 11)).joysticks.joystick1, { x: 0, y: 0 });
});

test("joystick 2 reads the analog axes with HID Y flipped to up-positive", () => {
  assert.deepEqual(decodeGenericUsbJoystickReport(withAxes(255, 127)).joysticks.joystick2, { x: 1, y: 0 });
  assert.deepEqual(decodeGenericUsbJoystickReport(withAxes(0, 127)).joysticks.joystick2, { x: -1, y: 0 });
  assert.deepEqual(decodeGenericUsbJoystickReport(withAxes(127, 0)).joysticks.joystick2, { x: 0, y: 1 });
  assert.deepEqual(decodeGenericUsbJoystickReport(withAxes(127, 255)).joysticks.joystick2, { x: 0, y: -1 });
});

test("axis quantization keeps a wide dead band around centre", () => {
  assert.equal(quantizeAxis(0), -1);
  assert.equal(quantizeAxis(63), -1);
  assert.equal(quantizeAxis(64), 0);
  assert.equal(quantizeAxis(127), 0);
  assert.equal(quantizeAxis(190), 0);
  assert.equal(quantizeAxis(191), 1);
  assert.equal(quantizeAxis(255), 1);
});

test("button 13 is not wired to anything on the cabinet", () => {
  const decoded = decodeGenericUsbJoystickReport(withButtons(13));
  assert.equal(Object.values(decoded.digital).some(Boolean), false);
  assert.equal(decoded.coinInserted, false);
  assert.deepEqual(decoded.joysticks.joystick1, { x: 0, y: 0 });
});

test("a prepended report ID is dropped rather than shifting every control", () => {
  assert.deepEqual(normalizeReport([0, ...IDLE_REPORT]), IDLE_REPORT);
  const decoded = decodeGenericUsbJoystickReport([0, ...withButtons(3)]);
  assert.equal(decoded.digital.buttonA, true);
});

test("a report of the wrong length fails visibly instead of inventing controls", () => {
  assert.throws(
    () => decodeGenericUsbJoystickReport([0, 1, 2]),
    new RegExp(`Expected an ${REPORT_LENGTH}-byte joystick report, received 3`)
  );
});

test("a report from some other device is flagged as implausible", () => {
  const notTheEncoder = [0, 0, 0, 0, 0, 0, 0, 0];
  assert.equal(decodeGenericUsbJoystickReport(notTheEncoder).plausible, false);
});
