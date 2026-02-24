import { screenManager } from "../screenManager.js";
import { Sprite } from "../sprite.js";
import { COLORS } from "../colors.js";
import { audioManager } from "../audioManager.js";

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
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

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
    ctx.fillStyle = COLORS.arcadeYellow;
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Insert coin to play", centerX, centerY + 50);

    ctx.fillStyle = "white";
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Insert coin to play", centerX - 6, centerY + 50);

    coinSprite.update();
    coinSprite.draw(ctx, centerX, centerY - 150, 8);

  } else {

    ctx.fillStyle = COLORS.arcadeYellow;
    ctx.font = '60px "Early GameBoy"';
    ctx.fillText("PRESS TO CONTINUE", centerX, centerY - 200);
    ctx.fillStyle = "white";
    ctx.font = '60px "Early GameBoy"';
    ctx.fillText("PRESS TO CONTINUE", centerX-5, centerY - 200);

    /*ctx.fillStyle = COLORS.arcadeYellow;;
    ctx.font = '42px "Early GameBoy"';
    ctx.fillText("1 Player", centerX, centerY - 50);
    ctx.fillStyle = COLORS.arcadeOrange;;
    ctx.fillText("2 Players", centerX, centerY + 50);*/

    ctx.fillStyle = COLORS.arcadeYellow;
    ctx.font = '42px "Early GameBoy"';
    ctx.fillText("1 Player", centerX - 5, centerY - 50);
    ctx.fillStyle = COLORS.arcadeOrange;
    ctx.fillText("2 Players", centerX - 5, centerY + 50);
  }
}

export function cleanup() {
  isStarting = false;
  coinIsInserted = false;
  audioManager.stopGroup("startFlow");
}