import { screenManager } from "../helper/screenManager.js";
import { Sprite } from "../helper/sprite.js";
import { COLORS } from "../helper/colors.js";
import { audioManager } from "../helper/audioManager.js";
import { drawdoubleText } from "../helper/typography.js";
import { FrameSequence } from "../helper/frameSequence.js";
import { titleDisplayed } from "../communication/controlRoomOutput.js";

const INTRO_FRAME_COUNT = 119;
const INTRO_FRAME_SPEED = 7;
const INTRO_FRAME_PATHS = Array.from(
  { length: INTRO_FRAME_COUNT },
  (_, i) =>
    `assets/sprites/Transitions/intro_frames/frame_${String(i + 1).padStart(3, "0")}.png`
);

const COIN_SOUND_DELAY_MS = 1000;

// The coin is in and the round is one press away. The player is standing at
// side 1, so any button they can actually reach starts it; D and E belong to
// the panel across the cabinet and are ignored here, as on every other side 1
// screen. Which button it is carries no meaning - the cabinet asked "1 or 2
// players?" until 2026-09-21, and nothing downstream ever read the answer.
const START_BUTTONS = new Set([
  "buttonA",
  "buttonB",
  "buttonC",
  "player1Pressed",
  "player2Pressed",
]);

let introAnim = null;
let isPlayingIntro = false;
let introFramesPreloaded = false;

let backgroundImage = null;
let coinSprite = null;

let coinIsInserted = false;
let isStarting = false;

let flowGeneration = 0;
let coinSoundTimeout = null;

function preloadIntroFrames() {
  if (introFramesPreloaded) return;
  introFramesPreloaded = true;
  INTRO_FRAME_PATHS.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFlowActive(generation) {
  return generation === flowGeneration;
}

function clearCoinSoundTimeout() {
  if (coinSoundTimeout !== null) {
    clearTimeout(coinSoundTimeout);
    coinSoundTimeout = null;
  }
}

function scheduleCoinSound(generation) {
  clearCoinSoundTimeout();
  coinSoundTimeout = setTimeout(() => {
    coinSoundTimeout = null;
    if (!isFlowActive(generation)) return;
    void audioManager.playAndWait("coinIn", {
      group: "startFlow",
      restart: true,
      volume: 1,
    });
  }, COIN_SOUND_DELAY_MS);
}

async function waitForFirstIntroFrame(frame) {
  if (frame.complete) return;
  await new Promise((resolve) => {
    frame.onload = resolve;
    frame.onerror = resolve;
  });
}

async function runStartFlow(generation) {
  void audioManager.play("select2", {
    group: "select",
    restart: true,
    stopGroupBeforePlay: true,
    volume: 1,
  });

  isPlayingIntro = true;
  introAnim = new FrameSequence(INTRO_FRAME_PATHS, 320, 240, INTRO_FRAME_SPEED);

  const first = introAnim.frames[0];
  await waitForFirstIntroFrame(first);
  if (!isFlowActive(generation)) return;

  titleDisplayed();
  introAnim.playOnce(0, INTRO_FRAME_COUNT - 1, { holdLast: true });

  const audioDone = audioManager.playAndWait("obertura", {
    group: "startFlow",
    stopGroupBeforePlay: true,
    restart: true,
    volume: 1,
  });

  while (introAnim && !introAnim.isFinished()) {
    await sleep(16);
    if (!isFlowActive(generation)) return;
  }

  await audioDone;
  if (!isFlowActive(generation)) return;

  await screenManager.next();
}

export function init() {
  console.log("Start screen initialized");

  flowGeneration++;
  clearCoinSoundTimeout();

  coinIsInserted = false;
  isStarting = false;

  backgroundImage = new Image();
  backgroundImage.src = "assets/images/blue_bg.png";

  coinSprite = new Sprite("assets/sprites/UI/willy_coin.png", 32, 32, 20, 8);
  coinSprite.playLoop(0, 3);

  introAnim = null;
  isPlayingIntro = false;
  preloadIntroFrames();

  const warmup = new Image();
  warmup.src = INTRO_FRAME_PATHS[0];
}

export async function onButton(action) {
  const generation = flowGeneration;

  if (!coinIsInserted && (action === "coinInserted" || action === "buttonC")) {
    coinIsInserted = true;
    coinSprite.playOnce(0, 19, { holdLast: true });
    scheduleCoinSound(generation);
    return;
  }

  if (!coinIsInserted || isStarting) return;
  if (!coinSprite?.isFinished()) return;

  if (START_BUTTONS.has(action)) {
    isStarting = true;
    await runStartFlow(generation);
  }
}

export function render(ctx, canvas) {
  const centerX = Math.round(canvas.width / 2);
  const centerY = Math.round(canvas.height / 2);

  if (isPlayingIntro && introAnim) {
    introAnim.update();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    introAnim.drawFullscreen(ctx, canvas);
    return;
  }

  if (backgroundImage?.complete) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backgroundImage, 0, 0, 180, 180, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.textAlign = "center";

  const animDone = !!coinSprite?.isFinished();

  if (!coinIsInserted) {
    drawdoubleText(ctx, "INSERT COIN TO PLAY", centerX, centerY + 15, "h1", {
      shadowColor: COLORS.arcadeYellow,
    });
  } else if (animDone && !isStarting) {
    // Two lines: the one-line form is 284px wide at h1 on a 320px canvas.
    drawdoubleText(ctx, "PRESS ANY BUTTON\nTO START", centerX, centerY - 25, "h1", {
      shadowColor: COLORS.arcadeYellow,
    });
  }

  if (!animDone) {
    coinSprite?.update();
    coinSprite?.draw(ctx, centerX, centerY - 40, 2);
  }
}

export function cleanup() {
  flowGeneration++;
  clearCoinSoundTimeout();

  isStarting = false;
  coinIsInserted = false;

  coinSprite?.reset();
  coinSprite = null;

  introAnim?.reset();
  introAnim = null;
  isPlayingIntro = false;

  audioManager.stopGroup("select");
  audioManager.stopGroup("startFlow");
}
