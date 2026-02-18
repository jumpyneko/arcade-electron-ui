// src/screens/infomodeScreen.js
import { screenManager } from "../screenManager.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";

const TIMER_SECONDS = 100;

export function init() {
  console.log("Infomode screen initialized");
  // Start the countdown — auto-stops when it expires
  startTimer(TIMER_SECONDS, () => {
          screenManager.next();
  });
  }
  
  export function render(ctx, canvas) {

    // Update timer (checks expiry)
    updateTimer();

    ctx.fillStyle = "#2d1b4e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    ctx.font = "48px monospace";
    ctx.textAlign = "center";
    ctx.fillText("INFOMODE SCREEN", canvas.width / 2, canvas.height / 2);

    // Draw countdown timer (top-right)
    drawTimer(ctx, canvas);
  }
  
  export function cleanup() {
    // Cleanup if needed
    stopTimer();
  }