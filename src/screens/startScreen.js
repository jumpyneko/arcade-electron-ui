import { screenManager } from "../screenManager.js";
import { Sprite } from "../sprite.js";

let backgroundImage = null;
let coinIsInserted = false;
let coinSprite = null;

export function init() {
  console.log("Start screen initialized");
  coinIsInserted = false;

  // Load background image
  backgroundImage = new Image();
  backgroundImage.src = "assets/images/blue_bg.png";

  // coinsprite
  coinSprite = new Sprite("assets/sprites/coin_spinning.png", 32, 32, 4, 8);
}

export function onButton(action) {
  if (!coinIsInserted && action === "coinInserted") {
    coinIsInserted = true;
  } else if (coinIsInserted && (action === "player1Pressed" || action === "player2Pressed")) {
    screenManager.next();
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
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.textAlign = "center";

  if (!coinIsInserted) {
    ctx.fillStyle = "orange"
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Insert coin to play", centerX, centerY + 50);

    ctx.fillStyle = "white";
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Insert coin to play", centerX - 5, centerY + 50);

    coinSprite.update();
    coinSprite.draw(ctx, centerX, centerY - 150, 8);

  } else {

    ctx.fillStyle = "orange";
    ctx.font = '60px "Early GameBoy"';
    ctx.fillText("PRESS TO CONTINUE", centerX, centerY - 200);

    ctx.fillStyle = "black";
    ctx.font = '42px "Early GameBoy"';
    ctx.fillText("1 Player", centerX, centerY - 50);
    ctx.fillStyle = "black";
    ctx.fillText("2 Players", centerX, centerY + 50);

    ctx.fillStyle = "white";
    ctx.font = '42px "Early GameBoy"';
    ctx.fillText("1 Player", centerX - 5, centerY - 50);
    ctx.fillText("2 Players", centerX - 5, centerY + 50);
  }
}

export function cleanup() {
  coinIsInserted = false;
}