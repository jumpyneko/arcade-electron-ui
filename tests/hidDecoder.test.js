const test = require("node:test");
const assert = require("node:assert/strict");
const {
  REPORT_LENGTH,
  decodeGenericUsbJoystickReport,
  normalizeReport,
  quantizeAxis,
} = require("../src/main/hidDecoder");

// Every report below was captured at the cabinet on 2026-08-31, one control
// held at a time, on the encoder the console actually runs against. Byte 2 is
// an unconnected axis that free-runs, so its value is incidental.
const IDLE = [127, 127, 128, 127, 127, 15, 0, 192];

const CAPTURED = {
  "button A": [127, 127, 128, 127, 127, 79, 0, 192],
  "button B": [127, 127, 128, 127, 127, 143, 0, 192],
  "button C": [127, 127, 128, 127, 127, 15, 1, 192],
  "button D": [127, 127, 128, 127, 127, 31, 0, 192],
  "button E": [127, 127, 128, 127, 127, 47, 0, 192],
  "player 1": [127, 127, 128, 127, 127, 15, 128, 192],
  "player 2": [127, 127, 128, 127, 127, 15, 32, 192],
  coin: [127, 127, 128, 127, 127, 15, 16, 192],
  "joystick 1 up": [127, 127, 128, 127, 127, 15, 2, 192],
  "joystick 1 down": [127, 127, 128, 127, 127, 15, 8, 192],
  "joystick 1 left": [127, 127, 128, 127, 127, 15, 64, 192],
  "joystick 1 right": [127, 127, 128, 127, 127, 15, 4, 192],
  "joystick 2 up": [255, 127, 128, 127, 127, 15, 0, 192],
  "joystick 2 down": [0, 127, 128, 127, 127, 15, 0, 192],
  "joystick 2 left": [127, 0, 128, 127, 127, 15, 0, 192],
  "joystick 2 right": [127, 255, 128, 127, 127, 15, 0, 192],
};

// Everything the decoder reports as active, flattened so one held control can be
// compared against one expected label.
function activeControls(report) {
  const decoded = decodeGenericUsbJoystickReport(report);
  const active = Object.entries(decoded.digital)
    .filter(([, pressed]) => pressed)
    .map(([control]) => control);
  if (decoded.coinInserted) active.push("coinInserted");
  for (const [name, { x, y }] of Object.entries(decoded.joysticks)) {
    if (x !== 0 || y !== 0) active.push(`${name}(${x},${y})`);
  }
  return active;
}

test("a resting report produces no controls at all", () => {
  assert.deepEqual(activeControls(IDLE), []);
  assert.equal(decodeGenericUsbJoystickReport(IDLE).plausible, true);
});

test("the free-running axis on byte 2 never reaches a control", () => {
  for (let noise = 120; noise <= 140; noise += 1) {
    const report = [...IDLE];
    report[2] = noise;
    assert.deepEqual(activeControls(report), [], `byte 2 = ${noise} produced controls`);
  }
});

// The harness order is not alphabetical: D and E sit ahead of A on the encoder.
test("each captured control decodes to exactly that one control", () => {
  const expected = {
    "button A": ["buttonA"],
    "button B": ["buttonB"],
    "button C": ["buttonC"],
    "button D": ["buttonD"],
    "button E": ["buttonE"],
    "player 1": ["player1"],
    "player 2": ["player2"],
    coin: ["coinInserted"],
    "joystick 1 up": ["joystick1(0,1)"],
    "joystick 1 down": ["joystick1(0,-1)"],
    "joystick 1 left": ["joystick1(-1,0)"],
    "joystick 1 right": ["joystick1(1,0)"],
    "joystick 2 up": ["joystick2(0,1)"],
    "joystick 2 down": ["joystick2(0,-1)"],
    "joystick 2 left": ["joystick2(-1,0)"],
    "joystick 2 right": ["joystick2(1,0)"],
  };

  for (const [name, report] of Object.entries(CAPTURED)) {
    assert.deepEqual(activeControls(report), expected[name], `${name} decoded wrongly`);
  }
});

test("both sticks agree that up and right are positive", () => {
  const up1 = decodeGenericUsbJoystickReport(CAPTURED["joystick 1 up"]).joysticks.joystick1;
  const up2 = decodeGenericUsbJoystickReport(CAPTURED["joystick 2 up"]).joysticks.joystick2;
  assert.equal(up1.y, 1);
  assert.equal(up2.y, 1);

  const right1 = decodeGenericUsbJoystickReport(CAPTURED["joystick 1 right"]).joysticks.joystick1;
  const right2 = decodeGenericUsbJoystickReport(CAPTURED["joystick 2 right"]).joysticks.joystick2;
  assert.equal(right1.x, 1);
  assert.equal(right2.x, 1);
});

test("a centred axis is a positive zero, not -0", () => {
  const { joystick2 } = decodeGenericUsbJoystickReport(IDLE).joysticks;
  assert.equal(Object.is(joystick2.x, 0), true);
  assert.equal(Object.is(joystick2.y, 0), true);
});

test("holding both ends of a joystick 1 axis cancels out", () => {
  const upAndDown = [...IDLE];
  upAndDown[6] = 2 | 8;
  const leftAndRight = [...IDLE];
  leftAndRight[6] = 64 | 4;
  assert.deepEqual(activeControls(upAndDown), []);
  assert.deepEqual(activeControls(leftAndRight), []);
});

test("two controls at once decode independently", () => {
  const coinAndButtonA = [...IDLE];
  coinAndButtonA[5] = 79;
  coinAndButtonA[6] = 16;
  assert.deepEqual(activeControls(coinAndButtonA), ["buttonA", "coinInserted"]);
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
  const report = [...IDLE];
  report[7] |= 1;
  assert.deepEqual(activeControls(report), []);
});

test("a prepended report ID is dropped rather than shifting every control", () => {
  assert.deepEqual(normalizeReport([0, ...IDLE]), IDLE);
  assert.deepEqual(activeControls([0, ...CAPTURED["button A"]]), ["buttonA"]);
});

test("a report of the wrong length fails visibly instead of inventing controls", () => {
  assert.throws(
    () => decodeGenericUsbJoystickReport([0, 1, 2]),
    new RegExp(`Expected an ${REPORT_LENGTH}-byte joystick report, received 3`)
  );
});

test("a report from some other device is flagged as implausible", () => {
  assert.equal(decodeGenericUsbJoystickReport([0, 0, 0, 0, 0, 0, 0, 0]).plausible, false);
});
