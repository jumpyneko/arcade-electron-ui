// src/timer.js
// Reusable countdown timer for any screen
import { COLORS } from "./colors.js";

let startTime = 0;
let duration = 0;
let running = false;
let onExpire = null;

export function startTimer(seconds, expireCallback) {
  startTime = Date.now();
  duration = seconds * 1000;
  running = true;
  onExpire = expireCallback;
}

export function stopTimer() {
  running = false;
  onExpire = null;
}

// Returns remaining seconds (floored). Returns 0 if not running.
export function getRemaining() {
  if (!running) return 0;
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, duration - elapsed);
  return Math.ceil(remaining / 1000);
}

// Call this every frame (e.g. from render). Checks if timer expired.
export function updateTimer() {
  if (!running) return;
  if (Date.now() - startTime >= duration) {
    running = false;
    if (onExpire) {
      onExpire();
      onExpire = null;
    }
  }
}

// Draws the timer in the top-right corner of the canvas
export function drawTimer(ctx, canvas) {
  if (!running) return;
  const seconds = getRemaining();

  ctx.save();
  ctx.fillStyle = seconds <= 10 ? COLORS.arcadeRed : "white";
  ctx.font = "48px Early GameBoy";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(seconds.toString(), canvas.width - 30, 30);
  ctx.restore();
}