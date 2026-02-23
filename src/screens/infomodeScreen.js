// src/screens/infomodeScreen.js
import { screenManager } from "../screenManager.js";
import { startTimer, stopTimer, updateTimer, drawTimer } from "../timer.js";
import { COLORS } from "../colors.js";

const TIMER_SECONDS = 100;
let backgroundImage = null;

export function init() {
  console.log("Infomode screen initialized");

  // Load background image
  backgroundImage = new Image();
  backgroundImage.src = "assets/images/yellow_bg.png";

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

     // Draw background image
    if (backgroundImage && backgroundImage.complete) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(backgroundImage, 0, 0, 180, 180, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.textAlign = "center";
    
    ctx.fillStyle = COLORS.arcadeBlue;
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Step away from the screen", centerX, centerY - 100);

    ctx.fillStyle = "white";
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Step away from the screen", centerX - 6, centerY - 100);

    ctx.fillStyle = COLORS.arcadeBlue;
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Take a look around", centerX, centerY);

    ctx.fillStyle = "white";
    ctx.font = '48px "Early GameBoy"';
    ctx.fillText("Take a look around", centerX - 6, centerY);

    ctx.fillStyle = COLORS.arcadeBlue;
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