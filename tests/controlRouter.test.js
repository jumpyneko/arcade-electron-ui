const test = require("node:test");
const assert = require("node:assert/strict");
const { ControlRouter } = require("../src/main/controlRouter");
const { parseControlMessage } = require("../src/main/oscProtocol");

function harness() {
  let clock = 1000;
  const renderer = [];
  const controlRoom = [];
  const scheduled = [];
  const router = new ControlRouter({
    sendToRenderer: (event) => renderer.push(event),
    sendToControlRoom: (message) => controlRoom.push(message),
    now: () => clock,
    schedule: (callback) => {
      const timer = { callback, cancelled: false };
      scheduled.push(timer);
      return timer;
    },
    cancelSchedule: (timer) => {
      timer.cancelled = true;
    },
  });

  return {
    router,
    renderer,
    controlRoom,
    scheduled,
    advance(milliseconds) {
      clock += milliseconds;
    },
    runLatestTimer() {
      const timer = [...scheduled].reverse().find((candidate) => !candidate.cancelled);
      assert.ok(timer, "expected an active timer");
      timer.callback();
    },
  };
}

test("CR override releases held local controls before applying its first input", () => {
  const h = harness();
  h.router.handleLocalEvent(parseControlMessage("/buttonAPressed"));
  h.router.handleControlRoomEvent(parseControlMessage("/buttonBPressed"));

  assert.deepEqual(
    h.renderer.map((event) => [event.address, event.source, event.synthetic]),
    [
      ["/buttonAPressed", "directHid", false],
      ["/buttonAUnpressed", "directHid", true],
      ["/buttonBPressed", "controlRoom", false],
    ]
  );
  assert.deepEqual(
    h.controlRoom.map((message) => message.address),
    ["/buttonAPressed", "/buttonAUnpressed"]
  );
  assert.equal(h.router.getStatus().overrideActive, true);
});

test("override waits for release and then one second of inactivity", () => {
  const h = harness();
  h.router.handleControlRoomEvent(parseControlMessage("/joystick1Input", [1, 0]));
  h.advance(5000);
  assert.equal(h.router.getStatus().overrideActive, true);
  assert.equal(h.router.getStatus().overrideCanEnd, false);

  h.router.handleControlRoomEvent(parseControlMessage("/joystick1Input", [0, 0]));
  h.advance(999);
  h.runLatestTimer();
  assert.equal(h.router.getStatus().overrideActive, true);

  h.advance(1);
  h.runLatestTimer();
  assert.equal(h.router.getStatus().overrideActive, false);
});

test("a held physical control stays suppressed until release and re-press", () => {
  const h = harness();
  h.router.handleLocalEvent(parseControlMessage("/buttonAPressed"));
  h.router.handleControlRoomEvent(parseControlMessage("/coinInserted"));
  h.advance(1000);
  h.runLatestTimer();
  assert.equal(h.router.getStatus().overrideActive, false);

  h.router.handleLocalEvent(parseControlMessage("/buttonAUnpressed"));
  assert.equal(h.renderer.at(-1).observedOnly, true);
  assert.equal(h.renderer.at(-1).reason, "waitingForPhysicalRelease");

  h.router.handleLocalEvent(parseControlMessage("/buttonAPressed"));
  assert.equal(h.renderer.at(-1).observedOnly, undefined);
  assert.equal(h.renderer.at(-1).address, "/buttonAPressed");
});

test("CR controls are never fed back to Control Room", () => {
  const h = harness();
  h.router.handleControlRoomEvent(parseControlMessage("/coinInserted"));
  assert.equal(h.controlRoom.length, 0);
  assert.equal(h.renderer[0].address, "/coinInserted");
});

test("unchanged digital and joystick states are not forwarded twice", () => {
  const h = harness();
  h.router.handleLocalEvent(parseControlMessage("/buttonBPressed"));
  h.router.handleLocalEvent(parseControlMessage("/buttonBPressed"));
  h.router.handleLocalEvent(parseControlMessage("/buttonBUnpressed"));
  h.router.handleLocalEvent(parseControlMessage("/buttonBUnpressed"));
  h.router.handleLocalEvent(parseControlMessage("/joystick1Input", [1, 0]));
  h.router.handleLocalEvent(parseControlMessage("/joystick1Input", [1, 0]));

  assert.deepEqual(
    h.controlRoom.map((message) => message.address),
    ["/buttonBPressed", "/buttonBUnpressed", "/joystick1Input"]
  );
  assert.equal(h.renderer.filter((event) => event.reason === "duplicateState").length, 3);
});
