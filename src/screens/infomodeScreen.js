// src/screens/infomodeScreen.js
import { screenManager } from "../screenManager.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { COLORS } from "../colors.js";
import { Sprite } from "../sprite.js";
import { drawText } from "../typography.js";

const TIMER_SECONDS = 100;
let eyeSprite = null;

export function init() {
  console.log("Infomode screen initialized");

  eyeSprite = new Sprite("assets/sprites/eye.png", 32, 32, 30, 8);

  // Start the countdown — auto-stops when it expires
  startTimer(TIMER_SECONDS, () => {
    screenManager.next();
  });
}
  
  export function render(ctx, canvas) {

    // Update timer (checks expiry)
    updateTimer();

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    eyeSprite.update();
    eyeSprite.draw(ctx, centerX, centerY -60, 2);

    ctx.textAlign = "center";

    //colourshadow
    drawText(ctx, "Step away from the screen", centerX + 1, centerY - 10, "h1", { color: COLORS.arcadeYellow});
    //normal text
    drawText(ctx, "Step away from the screen", centerX, centerY - 10, "h1");

    //colourshadow
    drawText(ctx, "Take a look around", centerX + 1, centerY + 20, "h1", { color: COLORS.arcadeOrange});
    //normal text
    drawText(ctx, "Take a look around", centerX, centerY + 20, "h1");

    //colourshadow
    drawText(ctx, "Come back when I call you", centerX + 1, centerY + 50, "h1", { color: COLORS.arcadePurple});
    //normal text
    drawText(ctx, "Come back when I call you", centerX, centerY + 50, "h1");

    // Draw countdown timer (top-right)
    drawTimer(ctx, canvas);
  }
  
  export function cleanup() {
    // Cleanup if needed
    stopTimer();
  }