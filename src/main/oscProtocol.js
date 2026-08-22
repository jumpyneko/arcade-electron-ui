const NETWORK = Object.freeze({
  maxHost: "127.0.0.1",
  maxInputPort: 9000,
  controlRoomHost: "192.168.10.103",
  controlRoomInputPort: 8886,
  controlRoomOutputPort: 8885,
});

const DIGITAL_DEFINITIONS = [
  ["player1", "/player1Pressed", "/player1Unpressed", "player1Pressed"],
  ["player2", "/player2Pressed", "/player2Unpressed", "player2Pressed"],
  ["buttonA", "/buttonAPressed", "/buttonAUnpressed", "buttonA"],
  ["buttonB", "/buttonBPressed", "/buttonBUnpressed", "buttonB"],
  ["buttonC", "/buttonCPressed", "/buttonCUnpressed", "buttonC"],
  ["buttonD", "/buttonDPressed", "/buttonDUnpressed", "buttonD"],
  ["buttonE", "/buttonEPressed", "/buttonEUnpressed", "buttonE"],
];

const DIGITAL_BY_ADDRESS = new Map();
const DIGITAL_BY_CONTROL = new Map();

for (const [control, pressedAddress, releasedAddress, action] of DIGITAL_DEFINITIONS) {
  const definition = { control, pressedAddress, releasedAddress, action };
  DIGITAL_BY_CONTROL.set(control, definition);
  DIGITAL_BY_ADDRESS.set(pressedAddress, { ...definition, pressed: true });
  DIGITAL_BY_ADDRESS.set(releasedAddress, { ...definition, pressed: false });
}

const JOYSTICK_BY_ADDRESS = new Map([
  ["/joystick1Input", { control: "joystick1", joystickId: 1 }],
  ["/joystick2Input", { control: "joystick2", joystickId: 2 }],
]);

const JOYSTICK_BY_CONTROL = new Map(
  [...JOYSTICK_BY_ADDRESS.entries()].map(([address, definition]) => [
    definition.control,
    { ...definition, address },
  ])
);

const COMMAND_ADDRESSES = new Set([
  "/nextPOV",
  "/textWrite",
  "/textClear",
  "/restartGame",
  "/placedModels",
]);

const UI_STATE_ADDRESSES = new Set([
  "/title",
  "/screenChanged",
  "/modelPicked",
  "/RouletteSelected",
  "/slotSelected",
  "/pickerSelected",
  "/reshuffle",
  "/modelsToChoose",
  "/time",
]);

function unwrapOscArg(arg) {
  return arg && typeof arg === "object" && Object.hasOwn(arg, "value")
    ? arg.value
    : arg;
}

function integerArg(value) {
  return { type: "i", value };
}

function parseControlMessage(address, args = []) {
  if (address === "/coinInserted") {
    return {
      kind: "coin",
      control: "coinInserted",
      action: "coinInserted",
      address,
      args: [],
    };
  }

  const digital = DIGITAL_BY_ADDRESS.get(address);
  if (digital) {
    return {
      kind: "digital",
      control: digital.control,
      action: digital.action,
      pressed: digital.pressed,
      address,
      args: [],
    };
  }

  const joystick = JOYSTICK_BY_ADDRESS.get(address);
  if (!joystick) return null;

  const x = Number(unwrapOscArg(args[0]));
  const y = Number(unwrapOscArg(args[1]));
  if (![x, y].every((value) => Number.isInteger(value) && value >= -1 && value <= 1)) {
    return null;
  }

  return {
    kind: "joystick",
    control: joystick.control,
    joystickId: joystick.joystickId,
    x,
    y,
    address,
    args: [integerArg(x), integerArg(y)],
  };
}

function makeReleaseEvent(control) {
  const digital = DIGITAL_BY_CONTROL.get(control);
  if (digital) return parseControlMessage(digital.releasedAddress, []);

  const joystick = JOYSTICK_BY_CONTROL.get(control);
  if (joystick) return parseControlMessage(joystick.address, [0, 0]);

  return null;
}

function isControlReleased(event) {
  if (event.kind === "digital") return !event.pressed;
  if (event.kind === "joystick") return event.x === 0 && event.y === 0;
  return true;
}

function isControlActive(event) {
  return !isControlReleased(event);
}

module.exports = {
  NETWORK,
  COMMAND_ADDRESSES,
  UI_STATE_ADDRESSES,
  DIGITAL_DEFINITIONS,
  DIGITAL_BY_CONTROL,
  JOYSTICK_BY_CONTROL,
  unwrapOscArg,
  parseControlMessage,
  makeReleaseEvent,
  isControlReleased,
  isControlActive,
};
