import { screenManager } from "../helper/screenManager.js";
import { Sprite } from "../helper/sprite.js";
import { COLORS } from "../helper/colors.js";
import { audioManager } from "../helper/audioManager.js";
import { drawText, drawdoubleText } from "../helper/typography.js";
import { FrameSequence } from "../helper/frameSequence.js";

const INTRO_FRAME_COUNT = 119;
const INTRO_FRAME_SPEED = 7;
const INTRO_FRAME_PATHS = Array.from(
  { length: INTRO_FRAME_COUNT },
  (_, i) =>
    `assets/sprites/Transitions/intro_frames/frame_${String(i + 1).padStart(3, "0")}.png`
);

const FLICKER_TOTAL_MS = 2500;
const BLINK_INTERVAL_MS = 120;
const COIN_SOUND_DELAY_MS = 1000;

let introAnim = null;
let isPlayingIntro = false;
let introFramesPreloaded = false;

let backgroundImage = null;
let coinSprite = null;

let coinIsInserted = false;
let isStarting = false;

/** @type {null | "p1" | "p2"} */
let soloPlayerChoice = null;
let soloFlickerUntil = 0;

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

function flickerColor(which, baseColor) {
  if (soloPlayerChoice !== which || performance.now() >= soloFlickerUntil) {
    return baseColor;
  }
  const flashOn = Math.floor(performance.now() / BLINK_INTERVAL_MS) % 2 === 0;
  return flashOn ? "#FFFFFF" : baseColor;
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

async function runStartFlow(generation, playerAction) {
  void audioManager.play("select2", {
    group: "select",
    restart: true,
    stopGroupBeforePlay: true,
    volume: 1,
  });

  soloPlayerChoice = playerAction === "player1Pressed" ? "p1" : "p2";
  soloFlickerUntil = performance.now() + FLICKER_TOTAL_MS;

  const remaining = soloFlickerUntil - performance.now();
  if (remaining > 0) {
    await sleep(remaining);
  }
  if (!isFlowActive(generation)) return;

  soloPlayerChoice = null;
  soloFlickerUntil = 0;

  isPlayingIntro = true;
  introAnim = new FrameSequence(INTRO_FRAME_PATHS, 320, 240, INTRO_FRAME_SPEED);

  const first = introAnim.frames[0];
  await waitForFirstIntroFrame(first);
  if (!isFlowActive(generation)) return;

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
  soloPlayerChoice = null;
  soloFlickerUntil = 0;

  backgroundImage = new Image();
  backgroundImage.src = "assets/images/blue_bg.png";

  coinSprite = new Sprite("assets/sprites/UI/coin.png", 32, 32, 20, 8);
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

  if (action === "player1Pressed" || action === "player2Pressed") {
    if (isStarting) return;
    isStarting = true;
    await runStartFlow(generation, action);
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
  } else if (animDone) {
    const inSoloFlicker =
      isStarting &&
      soloPlayerChoice &&
      performance.now() < soloFlickerUntil;

    if (inSoloFlicker) {
      if (soloPlayerChoice === "p1") {
        drawText(ctx, "1 Spieler", centerX, centerY - 25, "h1", {
          color: flickerColor("p1", COLORS.arcadeYellow),
        });
      } else {
        drawText(ctx, "2 Spieler", centerX, centerY + 5, "h1", {
          color: flickerColor("p2", COLORS.arcadeOrange),
        });
      }
    } else if (!isStarting) {
      drawdoubleText(ctx, "PRESS TO CONTINUE", centerX, centerY - 60, "h1", {
        shadowColor: COLORS.arcadeYellow,
      });

      drawText(ctx, "1 Player", centerX, centerY - 25, "h1", {
        color: COLORS.arcadeYellow,
      });
      drawText(ctx, "2 Player", centerX, centerY + 5, "h1", {
        color: COLORS.arcadeOrange,
      });
    }
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
  soloPlayerChoice = null;
  soloFlickerUntil = 0;

  coinSprite?.reset();
  coinSprite = null;

  introAnim?.reset();
  introAnim = null;
  isPlayingIntro = false;

  audioManager.stopGroup("select");
  audioManager.stopGroup("startFlow");
}