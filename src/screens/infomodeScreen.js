// src/screens/infomodeScreen.js
import { screenManager } from "../screenManager.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { COLORS } from "../colors.js";
import { Sprite } from "../sprite.js";

const TIMER_SECONDS = 10;
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
    eyeSprite.draw(ctx, centerX, centerY - 300, 8);

    ctx.textAlign = "center";
    
    ctx.fillStyle = COLORS.arcadeYellow;
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Step away from the screen", centerX, centerY - 100);

    ctx.fillStyle = "white";
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Step away from the screen", centerX - 6, centerY - 100);

    ctx.fillStyle = COLORS.arcadeOrange;
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Take a look around", centerX, centerY);

    ctx.fillStyle = "white";
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Take a look around", centerX - 6, centerY);

    ctx.fillStyle = COLORS.arcadePurple;
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Come back when I call you", centerX, centerY + 100);

    ctx.fillStyle = "white";
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Come back when I call you", centerX - 6, centerY + 100);

    // Draw countdown timer (top-right)
    drawTimer(ctx, canvas);
  }
  
  export function cleanup() {
    // Cleanup if needed
    stopTimer();
  }