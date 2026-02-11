import { screenManager } from "../screenManager.js";

let backgroundImage = null;
let coinInserted = false;
let keyHandler = null;

export function init() {
  console.log("Start screen initialized");
  coinInserted = false;

  // Load background image
  backgroundImage = new Image();
  backgroundImage.src = "assets/StartScreen.png";

  // Listen for key presses
  keyHandler = (e) => {
    const key = e.key.toLowerCase();

    if (!coinInserted && key === "c") {
      // Coin inserted
      coinInserted = true;
    } else if (coinInserted && (key === "1" || key === "2")) {
      // Player 1 or Player 2 pressed — both go to roulette
      screenManager.next();
    }
  };

  window.addEventListener("keydown", keyHandler);
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

  if (!coinInserted) {
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
  // Remove key listener to prevent leaks
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  coinInserted = false;
}