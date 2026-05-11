// src/screens/infomodeScreen.js
import { screenManager } from "../helper/screenManager.js";
import { startTimer, stopTimer, updateTimer, drawTimer, setCountdownSoundEnabled } from "../helper/timer.js";
import { COLORS } from "../helper/colors.js";
import { Sprite } from "../helper/sprite.js";
import { drawText, drawdoubleText } from "../helper/typography.js";

const TIMER_SECONDS = 100;
let eyeSprite = null;

export function init() {
  console.log("Infomode screen initialized");

  eyeSprite = new Sprite("assets/sprites/UI/eye.png", 32, 32, 30, 8);

  // Start the countdown — auto-stops when it expires
  startTimer(TIMER_SECONDS, () => {
    screenManager.next();
  });

  setCountdownSoundEnabled(true);
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

    drawdoubleText(ctx, "Step away from the screen", centerX, centerY -10, "h1", {
      shadowColor: COLORS.arcadeYellow,
    });

    drawdoubleText(ctx, "Take a look around", centerX, centerY + 20, "h1", {
      shadowColor: COLORS.arcadeOrange,
    });

    drawdoubleText(ctx, "Come back when I call you", centerX, centerY + 50, "h1", {
      shadowColor: COLORS.arcadePurple,
    });

    // Draw countdown timer (top-right)
    drawTimer(ctx, canvas);
  }
  
  export function cleanup() {
    // Cleanup if needed
    stopTimer();
    setCountdownSoundEnabled(false);
  }