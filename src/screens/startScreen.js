import { screenManager } from "../helper/screenManager.js";
import { Sprite } from "../helper/sprite.js";
import { COLORS } from "../helper/colors.js";
import { audioManager } from "../helper/audioManager.js";
import { drawText, drawdoubleText } from "../helper/typography.js";

let backgroundImage = null;
let coinSprite = null;

let coinIsInserted = false;
let isStarting = false;

export function init() {
  console.log("Start screen initialized");

  coinIsInserted = false;
  isStarting = false;

  backgroundImage = new Image();
  backgroundImage.src = "assets/images/blue_bg.png";

  coinSprite = new Sprite("assets/sprites/full_coin.png", 32, 32, 20, 8);
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
    await audioManager.playAndWait("select2", {
      group: "startFlow",
      stopGroupBeforePlay: true,
      restart: true,
      volume: 1,
    });

    isStarting = true;

   /* await audioManager.playAndWait("obertura", {
      group: "startFlow",
      stopGroupBeforePlay: true,
      restart: true,
      volume: 1,
    });*/

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
    drawdoubleText(ctx, "PRESS TO CONTINUE", centerX, centerY + -50, "h1", {
      shadowColor: COLORS.arcadeYellow,
    });

    drawText(ctx, "1 Spieler", centerX, centerY - 15, "h1", { color: COLORS.arcadeYellow });
    drawText(ctx, "2 Spieler", centerX, centerY + 15, "h1", { color: COLORS.arcadeOrange });
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
  audioManager.stopGroup("startFlow");
}