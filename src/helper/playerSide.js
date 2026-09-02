// src/helper/playerSide.js
// The cabinet has two control panels facing each other across the screen.
//
//   side 1  joystick 1, buttons A, B and C
//   side 2  joystick 2, buttons D and E
//
// The round starts on side 1: coin, roulette and the POV itself are played from
// there. When the POV ends, the screen turns 180 degrees and the rest of the
// round - slot machine, model picker, name entry and the end card - is played
// from side 2. The display stays turned until the round is reset, which puts it
// back on side 1 for the next player.
//
// Every screen after the POV was written against the side 1 controls, so rather
// than teach each of them a second control scheme, this module stands the side 2
// controls in for the side 1 ones: it says which screens are played turned
// around, translates the incoming controls, and hands the screens the button
// graphic that matches the button the player is actually looking at.

export const SIDE_1 = 1;
export const SIDE_2 = 2;

// Which side 2 button stands in for which side 1 button, per screen. A screen
// listed here is played from side 2 and turns the display; a screen missing from
// this table is played from side 1 exactly as before.
//
// Side 2 has two buttons for side 1's three, so the roles are kept consistent
// across the screens: D acts (stop, type a letter) and E confirms (continue,
// select). The end screen takes no input at all, but it is listed so that the
// display stays turned all the way through it.
const SIDE_2_LAYOUTS = Object.freeze({
  slotmachine: Object.freeze({ buttonD: "buttonA", buttonE: "buttonC" }),
  modelpicker: Object.freeze({ buttonE: "buttonC" }),
  nameScreen: Object.freeze({ buttonD: "buttonA", buttonE: "buttonB" }),
  end: Object.freeze({}),
});

// The buttons and the stick on side 1. A player who has not walked round to the
// other side of the cabinet is still pressing these, which is what earns them
// the "Turn around!" warning.
const SIDE_1_CONTROLS = new Set(["buttonA", "buttonB", "buttonC", "joystick1"]);

// Controls that belong to the cabinet rather than to one panel. They are only
// ever read by the start screen, which is a side 1 screen, but they are passed
// through untouched so a coin is never swallowed by the mapping.
const CABINET_CONTROLS = new Set(["coinInserted", "player1Pressed", "player2Pressed"]);

const BUTTON_LETTERS = Object.freeze({
  buttonA: "A",
  buttonB: "B",
  buttonC: "C",
  buttonD: "D",
  buttonE: "E",
});

// The physical screen is mounted upside down, so the whole page is normally
// drawn turned by 180 degrees. That base orientation is independent of which
// side is playing: turning for side 2 cancels it out rather than adding to it.
let installationRotated180 = true;
let currentScreenName = null;
let rotationAnimationArmed = false;

export function layoutForScreen(screenName) {
  return SIDE_2_LAYOUTS[screenName] ?? null;
}

export function sideForScreen(screenName) {
  return layoutForScreen(screenName) ? SIDE_2 : SIDE_1;
}

export function getActiveSide() {
  return sideForScreen(currentScreenName);
}

// Called by the screen manager before a screen initialises, so a screen that
// loads its button hints in init() already sees the side it is played from.
export function applyScreen(screenName) {
  currentScreenName = screenName;
  applyDisplayRotation();
}

export function toggleInstallationRotation() {
  installationRotated180 = !installationRotated180;
  applyDisplayRotation();
}

export function applyDisplayRotation() {
  if (typeof document === "undefined" || !document.body) return;
  const turnedForPlayer = getActiveSide() === SIDE_2;
  document.body.classList.toggle("rotated-180", installationRotated180 !== turnedForPlayer);

  // The first call sets the installation orientation before anything is on
  // screen, so it must not animate; every later call is a turn the players
  // should see happen.
  if (rotationAnimationArmed) return;
  rotationAnimationArmed = true;
  requestAnimationFrame(() => document.body.classList.add("rotation-animated"));
}

// Translates a button as the cabinet reports it into the action the current
// screen listens for. Returns null when the control belongs to the side that is
// not playing, so the player who has stepped away cannot drive the screen.
export function mapButtonAction(action, screenName = currentScreenName) {
  const layout = layoutForScreen(screenName);
  if (!layout) return action;
  if (CABINET_CONTROLS.has(action)) return action;
  return layout[action] ?? null;
}

// Translates a joystick as the cabinet reports it into the navigation the
// current screen listens for, which is always joystick 1's. Returns null for the
// stick on the side that is not playing.
//
// The axes are passed through as they are decoded: the player walks round to
// side 2 and plays standing there, so joystick 2's directions already match what
// they see on the turned screen.
export function mapJoystick(joystickId, x, y, screenName = currentScreenName) {
  if (!layoutForScreen(screenName)) return { joystickId, x, y };
  if (joystickId !== SIDE_2) return null;
  return { joystickId: 1, x, y };
}

// True when a control from the side that is not playing was used, which means
// the player is still standing at the panel they started on.
export function isWrongSideControl(control, screenName = currentScreenName) {
  if (!layoutForScreen(screenName)) return false;
  return SIDE_1_CONTROLS.has(control);
}

// The button a screen asks about is the side 1 one it was written against; the
// hint has to show the button the player in front of the screen can actually
// reach.
export function hintButtonFor(action, screenName = currentScreenName) {
  const layout = layoutForScreen(screenName);
  if (!layout) return action;
  const standIn = Object.keys(layout).find((button) => layout[button] === action);
  return standIn ?? action;
}

export function hintButtonImage(action, screenName = currentScreenName) {
  const letter = BUTTON_LETTERS[hintButtonFor(action, screenName)] ?? "A";
  return `assets/images/UI/button_${letter}.png`;
}
