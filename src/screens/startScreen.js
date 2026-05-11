import { screenManager } from "../helper/screenManager.js";
import { Sprite } from "../helper/sprite.js";
import { COLORS } from "../helper/colors.js";
import { audioManager } from "../helper/audioManager.js";
import { drawText, drawdoubleText } from "../helper/typography.js";

let backgroundImage = null;
let coinSprite = null;

let coinIsInserted = false;
let isStarting = false;

const FLICKER_TOTAL_MS = 2500;
const BLINK_INTERVAL_MS = 120;

/** @type {null | "p1" | "p2"} */
let soloPlayerChoice = null;
let soloFlickerUntil = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function flickerColor(which, baseColor) {
  if (soloPlayerChoice !== which || performance.now() >= soloFlickerUntil) {
    return baseColor;
  }
  const flashOn = Math.floor(performance.now() / BLINK_INTERVAL_MS) % 2 === 0;
  return flashOn ? "#FFFFFF" : baseColor;
}

export function init() {
  console.log("Start screen initialized");

  coinIsInserted = false;
  isStarting = false;

  soloPlayerChoice = null;
  soloFlickerUntil = 0;

  backgroundImage = new Image();
  backgroundImage.src = "assets/images/blue_bg.png";

  coinSprite = new Sprite("assets/sprites/UI/coin.png", 32, 32, 20, 8);
  // idle: nur frames 0-3 loopen
  coinSprite.playLoop(0, 3);
}

export async function onButton(action) {
  // coin insert triggers full animation once + sound
  if (!coinIsInserted && (action === "coinInserted" || action === "buttonC")) {
    coinIsInserted = true;

    coinSprite.playOnce(0, 19, { holdLast: true });

    void audioManager.playAndWait("coinIn", {
      group: "startFlow",
      restart: true,
      volume: 1,
    });

    return;
  }

  // only continue after coin inserted + animation finished
  if (!coinIsInserted || isStarting) return;
  if (!coinSprite?.isFinished()) return;

  if (action === "player1Pressed" || action === "player2Pressed") {
    void audioManager.play("select2", {
      group: "select",
      restart: true,
      stopGroupBeforePlay: true,
      volume: 1,
    });

    isStarting = true;

    soloPlayerChoice = action === "player1Pressed" ? "p1" : "p2";
    soloFlickerUntil = performance.now() + FLICKER_TOTAL_MS;

    const remaining = soloFlickerUntil - performance.now();
    if (remaining > 0) {
      await sleep(remaining);
    }

    soloPlayerChoice = null;
    soloFlickerUntil = 0;

    await audioManager.playAndWait("obertura", {
      group: "startFlow",
      stopGroupBeforePlay: true,
      restart: true,
      volume: 1,
    });

    await screenManager.next();
  }
}

export function render(ctx, canvas) {
  const centerX = Math.round(canvas.width / 2);
  const centerY = Math.round(canvas.height / 2);

  // background
  if (backgroundImage && backgroundImage.complete) {
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

      drawText(ctx, "1 Spieler", centerX, centerY - 25, "h1", {
        color: COLORS.arcadeYellow,
      });
      drawText(ctx, "2 Spieler", centerX, centerY + 5, "h1", {
        color: COLORS.arcadeOrange,
      });
    }
    // isStarting && !inSoloFlicker → only background (e.g. while obertura plays)
  }
  

  // sprite always updates + draws (so the once animation actually runs)
  if (!animDone) {
  coinSprite?.update();
  coinSprite?.draw(ctx, centerX, centerY - 40, 2);
  }
}

export function cleanup() {
  isStarting = false;
  coinIsInserted = false;

  coinSprite?.reset();
  audioManager.stopGroup("select");

  soloPlayerChoice = null;
  soloFlickerUntil = 0;
  audioManager.stopGroup("select");
  audioManager.stopGroup("startFlow");
}