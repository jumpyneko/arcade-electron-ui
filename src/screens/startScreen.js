import { screenManager } from "../helper/screenManager.js";
import { Sprite } from "../helper/sprite.js";
import { COLORS } from "../helper/colors.js";
import { audioManager } from "../helper/audioManager.js";
import { drawText } from "../helper/typography.js";

let backgroundImage = null;
let coinIsInserted = false;
let coinSprite = null;
let isStarting = false;

export function init() {
  console.log("Start screen initialized");
  coinIsInserted = false;

  // Load background image
  backgroundImage = new Image();
  backgroundImage.src = "assets/images/blue_bg.png";

  // coinsprite
  coinSprite = new Sprite("assets/sprites/coin_spinning.png", 32, 32, 4, 8);
}


export async function onButton(action) {
  if (!coinIsInserted && (action === "coinInserted" || action === "buttonC")) {
    coinIsInserted = true;
    return;
  }

  if (!coinIsInserted || isStarting) return;

  if (action === "player1Pressed" || action === "player2Pressed") {
    isStarting = true;

    await audioManager.playAndWait("obertura", {
      group: "startFlow",
      stopGroupBeforePlay: true, // ensure only one intro voice/music
      restart: true,
      volume: 1,
    });

    await screenManager.next();
  }
}

export function render(ctx, canvas) {
  const centerX = Math.round(canvas.width / 2);
  const centerY = Math.round(canvas.height / 2);

  // Draw background image
  if (backgroundImage && backgroundImage.complete) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backgroundImage, 0, 0, 180, 180, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.textAlign = "center";

  if (!coinIsInserted) {

    //colourshadow
    drawText(ctx, "INSERT COIN TO PLAY", centerX + 1, centerY + 15, "h1", { color: COLORS.arcadeYellow});
    //normal text
    drawText(ctx, "INSERT COIN TO PLAY", centerX, centerY + 15, "h1");
    
    coinSprite.update();
    coinSprite.draw(ctx, centerX, centerY - 40, 2);

  } else {

    //colourshadow
    drawText(ctx, "PRESS TO CONTINUE", centerX + 1, centerY - 50, "h1", { color: COLORS.arcadeYellow});
    //normal text
    drawText(ctx, "PRESS TO CONTINUE", centerX, centerY - 50, "h1");


    //normal text
    drawText(ctx, "1 Spieler", centerX, centerY - 15, "h1", { color: COLORS.arcadeYellow});
    //normal text
    drawText(ctx, "2 Spieler", centerX, centerY + 15, "h1", { color: COLORS.arcadeOrange});
  }
}

export function cleanup() {
  isStarting = false;
  coinIsInserted = false;
  audioManager.stopGroup("startFlow");
}