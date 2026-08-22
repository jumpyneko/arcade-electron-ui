const EXPECTED_TIGHT_VALUE_COUNT = 19;

function signDifference(a, b) {
  return Math.sign(Number(a) - Number(b));
}

function quantizeAxis(value) {
  const numeric = Number(value);
  if (numeric >= 255) return 1;
  if (numeric >= 127) return 0;
  return -1;
}

function asBoolean(value) {
  return Number(value) > 0;
}

function extractTightValues(report) {
  const raw = Array.from(report || []);
  if (raw.length < EXPECTED_TIGHT_VALUE_COUNT) {
    throw new Error(
      `Expected at least ${EXPECTED_TIGHT_VALUE_COUNT} HID values, received ${raw.length}`
    );
  }

  // Max's p pack_tight_values produces 19 ordered usage values. node-hid may
  // prepend a report ID, so use the final 19 bytes until hardware capture lets
  // us replace this provisional adapter with the exact report descriptor.
  return raw.slice(-EXPECTED_TIGHT_VALUE_COUNT);
}

function decodeGenericUsbJoystickReport(report) {
  const values = extractTightValues(report);

  return {
    raw: Array.from(report || []),
    tightValues: values,
    joysticks: {
      joystick1: {
        x: signDifference(values[1], values[5]),
        y: signDifference(values[0], values[2]),
      },
      joystick2: {
        x: quantizeAxis(values[1]),
        y: quantizeAxis(values[2]),
      },
    },
    digital: {
      buttonA: asBoolean(values[7]),
      buttonB: asBoolean(values[8]),
      buttonC: asBoolean(values[9]),
      buttonD: asBoolean(values[10]),
      buttonE: asBoolean(values[11]),
      player2: asBoolean(values[17]),
      player1: asBoolean(values[18]),
    },
    coinInserted: asBoolean(values[15]),
  };
}

module.exports = {
  EXPECTED_TIGHT_VALUE_COUNT,
  decodeGenericUsbJoystickReport,
  extractTightValues,
  quantizeAxis,
};
