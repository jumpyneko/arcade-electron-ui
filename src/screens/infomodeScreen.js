// src/screens/infomodeScreen.js
import { screenManager } from "../helper/screenManager.js";
import {
  startTimer,
  stopTimer,
  updateTimer,
  drawTimer,
  setCountdownSoundEnabled,
  getRemaining,
} from "../helper/timer.js";
import { COLORS } from "../helper/colors.js";
import { Sprite } from "../helper/sprite.js";
import { drawdoubleText } from "../helper/typography.js";
import { audioManager } from "../helper/audioManager.js";

const TIMER_SECONDS = 100;

let eyeSprite = null;

let isOutroPlaying = false;
let outroStarted = false;
let outroSoundFinished = false;
let outroNavigated = false;

const OUTRO_DELAY_MS = 1000;

let outroDelayScheduled = false;

let warningPhaseStarted = false;

function tryNavigateOutro() {
  if (outroNavigated) return;
  if (outroDelayScheduled) return;
  if (!eyeSprite?.isFinished()) return;
  if (!outroSoundFinished) return;

  outroDelayScheduled = true;

  setTimeout(() => {
    if (outroNavigated) return;
    outroNavigated = true;
    screenManager.next();
  }, OUTRO_DELAY_MS);
}

export function init() {
  console.log("Infomode screen initialized");

  isOutroPlaying = false;
  outroStarted = false;
  outroSoundFinished = false;
  outroNavigated = false;
  warningPhaseStarted = false;
  outroDelayScheduled = false;

  eyeSprite = new Sprite("assets/sprites/UI/eye.png", 32, 32, 30, 8);
  eyeSprite.playLoop(0, 29);

  startTimer(TIMER_SECONDS, () => {
    isOutroPlaying = true;
  });

  setCountdownSoundEnabled(true);
}

export function render(ctx, canvas) {
  updateTimer();

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- Outro: eye frames 12–15 + timeUp sound, then next screen ---
  if (isOutroPlaying) {
    if (!outroStarted) {
      outroStarted = true;
      eyeSprite.playOnce(12, 15, { holdLast: true });

      void audioManager
        .playAndWait("timeUp", {
          group: "timeUp",
          restart: true,
          volume: 1,
        })
        .then(() => {
          outroSoundFinished = true;
          tryNavigateOutro();
        });
    }

    eyeSprite.update();
    eyeSprite.draw(ctx, centerX, centerY, 6);
    tryNavigateOutro();
    return;
  }

  // --- Normal countdown phases ---
  const remaining = getRemaining();

  if (remaining <= 10 && remaining > 0 && !warningPhaseStarted) {
    warningPhaseStarted = true;
    //eyeSprite.playOnce(5, 5, { holdLast: true });
  }

  eyeSprite.update();
  ctx.textAlign = "center";

  if (remaining > 10) {
    drawTimer(ctx, canvas);
    eyeSprite.draw(ctx, centerX, centerY - 60, 2);

    drawdoubleText(ctx, "Step away from the screen", centerX, centerY - 10, "h1", {
      shadowColor: COLORS.arcadeYellow,
    });

    drawdoubleText(ctx, "Take a look around", centerX, centerY + 20, "h1", {
      shadowColor: COLORS.arcadeOrange,
    });

    drawdoubleText(ctx, "Come back when I call you", centerX, centerY + 50, "h1", {
      shadowColor: COLORS.arcadePurple,
    });
    return;
  }

  if (remaining > 0) {
    drawTimer(ctx, canvas);

    if (remaining > 8) {
      eyeSprite.draw(ctx, centerX, centerY - 48, 2);
    } else if (remaining > 6) {
      eyeSprite.draw(ctx, centerX, centerY - 36, 3);
    } else if (remaining > 4) {
      eyeSprite.draw(ctx, centerX, centerY - 24, 4);
    } else if (remaining > 2) {
      eyeSprite.draw(ctx, centerX, centerY - 12, 5);
    } else {
      eyeSprite.draw(ctx, centerX, centerY, 6);
    }

    drawdoubleText(ctx, "COME BACK", centerX, centerY + 80, "h1", {
      shadowColor: COLORS.arcadePurple,
    });
  }
}

export function cleanup() {
  stopTimer();
  setCountdownSoundEnabled(false);
  audioManager.stopGroup("timeUp");
  eyeSprite?.reset();
  eyeSprite = null;

  isOutroPlaying = false;
  outroStarted = false;
  outroSoundFinished = false;
  outroNavigated = false;
  warningPhaseStarted = false;
}