const test = require("node:test");
const assert = require("node:assert/strict");
const {
  NETWORK,
  DIGITAL_DEFINITIONS,
  UI_STATE_ADDRESSES,
  parseControlMessage,
  makeReleaseEvent,
} = require("../src/main/oscProtocol");

test("uses the connection-map ports and Control Room host", () => {
  assert.deepEqual(NETWORK, {
    controlRoomHost: "192.168.10.103",
    controlRoomInputPort: 8886,
    controlRoomOutputPort: 8885,
  });
});

test("time remaining is an allowed UI state message", () => {
  assert.equal(UI_STATE_ADDRESSES.has("/time"), true);
});

test("all digital controls use canonical Unpressed addresses", () => {
  for (const [control, pressedAddress, releasedAddress] of DIGITAL_DEFINITIONS) {
    assert.match(releasedAddress, /Unpressed$/);
    assert.equal(parseControlMessage(pressedAddress).pressed, true, control);
    assert.equal(parseControlMessage(releasedAddress).pressed, false, control);
    assert.equal(makeReleaseEvent(control).address, releasedAddress);
  }
});

test("joysticks accept only normalized integer positions", () => {
  assert.deepEqual(parseControlMessage("/joystick1Input", [-1, 1]), {
    kind: "joystick",
    control: "joystick1",
    joystickId: 1,
    x: -1,
    y: 1,
    address: "/joystick1Input",
    args: [
      { type: "i", value: -1 },
      { type: "i", value: 1 },
    ],
  });
  assert.equal(parseControlMessage("/joystick1Input", [1, 2]), null);
  assert.equal(parseControlMessage("/joystick1Input", [0.5, 0]), null);
});

test("coin is a momentary control event", () => {
  const coin = parseControlMessage("/coinInserted", []);
  assert.equal(coin.kind, "coin");
  assert.equal(coin.action, "coinInserted");
});
