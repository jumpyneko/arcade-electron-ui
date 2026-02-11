import { screenManager } from "../screenManager.js";

let backgroundImage = null;
let coinIsInserted = false;

export function init() {
  console.log("Start screen initialized");
  coinIsInserted = false;

  // Load background image
  backgroundImage = new Image();
  backgroundImage.src = "assets/StartScreen.png";
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
    ctx.fillStyle = "white";
    ctx.font = "28px monospace";
    ctx.fillText("Insert coin to play", centerX, centerY + 30);
  } else {
    ctx.fillStyle = "white";
    ctx.font = "28px monospace";
    ctx.fillText("1 Player", centerX, centerY);
    ctx.fillText("2 Players", centerX, centerY + 50);
  }
}

export function cleanup() {
  coinIsInserted = false;
}