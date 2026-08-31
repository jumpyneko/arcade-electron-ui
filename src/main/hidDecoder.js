// The cabinet's encoder is a DragonRise Inc. "Generic   USB  Joystick  "
// (0x0079:0x0006). It streams an 8-byte input report at roughly 100 Hz, and it
// keeps streaming while nothing is being touched, because byte 2 is an
// unconnected analog axis that free-runs a few counts either side of 128:
//
//   byte 0   joystick 2 vertical:   0 down, 127 centred, 255 up
//   byte 1   joystick 2 horizontal: 0 left, 127 centred, 255 right
//   byte 2   unconnected analog axis - free-runs, never read it
//   byte 3   unconnected analog axis
//   byte 4   unconnected analog axis
//   byte 5   low nibble  = hat switch, 15 when centred
//            high nibble = buttons 1..4
//   byte 6   buttons 5..12
//   byte 7   button 13 plus constant padding - the cabinet wires neither
//
// Which button carries which control comes from Controller V.2.0.maxpat, the
// Max patch this reader replaces. Its `p input` subpatcher asks Max's `hid`
// object for every element as one flat list - one leading value, the five axes,
// the hat, then the thirteen buttons - and slices that list into the cabinet's
// controls. Mapping those slices back onto the report gives the button numbers
// below: the cabinet uses buttons 1-12 and leaves 13 unwired.
//
// An earlier revision of this file read the flat Max list directly, expecting
// 19 values. That list is Max's own element packing, not the report, so every
// real 8-byte report was rejected before it could be decoded.

const REPORT_LENGTH = 8;

// Report byte and mask for buttons 1..13, in order.
const BUTTON_BITS = Object.freeze([
  [5, 0x10], [5, 0x20], [5, 0x40], [5, 0x80],
  [6, 0x01], [6, 0x02], [6, 0x04], [6, 0x08],
  [6, 0x10], [6, 0x20], [6, 0x40], [6, 0x80],
  [7, 0x01],
]);

// Cabinet wiring, straight off the Max patch. The button order is not the
// alphabetical one: D and E sit before A on the harness.
const DIGITAL_BUTTONS = Object.freeze({
  buttonD: 1,
  buttonE: 2,
  buttonA: 3,
  buttonB: 4,
  buttonC: 5,
  player2: 10,
  player1: 12,
});

const COIN_BUTTON = 9;

// Joystick 1 is a microswitch stick wired to four button inputs, so it arrives
// as four independent bits rather than an axis pair.
const JOYSTICK1_BUTTONS = Object.freeze({ up: 6, right: 7, down: 8, left: 11 });

// Joystick 2 rides the encoder's two analog axes, which this hardware drives to
// 0 / 127 / 255 rather than a continuous range. The wide dead band keeps a
// resting axis at zero even if a stick is slightly off centre.
//
// The cabinet wires the encoder's first axis to vertical and its second to
// horizontal, and drives both so that up and right read high - so neither axis
// needs the usual flip for HID's downward-growing Y. Confirmed by pushing the
// stick at the cabinet (2026-08-31); the Max patch had these two transposed.
const AXIS_CENTRE = 127;
const AXIS_DEADZONE = 64;

function quantizeAxis(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= AXIS_CENTRE - AXIS_DEADZONE) return -1;
  if (numeric >= AXIS_CENTRE + AXIS_DEADZONE) return 1;
  return 0;
}

function normalizeReport(report) {
  const raw = Array.from(report || []);
  if (raw.length === REPORT_LENGTH) return raw;
  // Some HID stacks hand back a leading report ID the descriptor does not use.
  if (raw.length === REPORT_LENGTH + 1) return raw.slice(1);
  throw new Error(
    `Expected an ${REPORT_LENGTH}-byte joystick report, received ${raw.length}`
  );
}

function isButtonPressed(bytes, buttonNumber) {
  const bit = BUTTON_BITS[buttonNumber - 1];
  if (!bit) return false;
  const [index, mask] = bit;
  return (Number(bytes[index]) & mask) !== 0;
}

function axisFromButtons(bytes, positiveButton, negativeButton) {
  return (
    (isButtonPressed(bytes, positiveButton) ? 1 : 0) -
    (isButtonPressed(bytes, negativeButton) ? 1 : 0)
  );
}

// A resting report from this encoder: both sticks centred, no buttons down, hat
// null. Byte 2 free-runs and byte 7's padding is constant, so neither is read.
function looksLikeCabinetEncoder(bytes) {
  return (bytes[5] & 0x0f) === 0x0f;
}

function decodeGenericUsbJoystickReport(report) {
  const bytes = normalizeReport(report);

  const digital = {};
  for (const [control, buttonNumber] of Object.entries(DIGITAL_BUTTONS)) {
    digital[control] = isButtonPressed(bytes, buttonNumber);
  }

  return {
    raw: bytes,
    digital,
    coinInserted: isButtonPressed(bytes, COIN_BUTTON),
    joysticks: {
      joystick1: {
        x: axisFromButtons(bytes, JOYSTICK1_BUTTONS.right, JOYSTICK1_BUTTONS.left),
        y: axisFromButtons(bytes, JOYSTICK1_BUTTONS.up, JOYSTICK1_BUTTONS.down),
      },
      joystick2: {
        x: quantizeAxis(bytes[1]),
        y: quantizeAxis(bytes[0]),
      },
    },
    plausible: looksLikeCabinetEncoder(bytes),
  };
}

module.exports = {
  REPORT_LENGTH,
  BUTTON_BITS,
  DIGITAL_BUTTONS,
  COIN_BUTTON,
  JOYSTICK1_BUTTONS,
  decodeGenericUsbJoystickReport,
  normalizeReport,
  isButtonPressed,
  quantizeAxis,
};
