// src/timer.js
// Reusable countdown timer for any screen
import { COLORS } from "./colors.js";
import { drawText } from "./typography.js";

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

export function isTimerRunning() {
  return running;
}

// Lets later screens reuse the same countdown without restarting it.
export function setTimerExpireCallback(expireCallback) {
  onExpire = expireCallback;
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
    const cb = onExpire;
    running = false;
    onExpire = null; // clear before callback
    if (cb) cb();
  }
}

// Draws the timer in the top-right corner of the canvas
export function drawTimer(ctx, canvas) {
  if (!running) return;
  const seconds = getRemaining();

  ctx.save();
  let colour = seconds <= 10 ? COLORS.arcadeRed : "white";
  drawText(ctx, seconds.toString(), canvas.width - 12, 12, "h1", {align: "right"}, { color: colour});
  ctx.restore();
}
