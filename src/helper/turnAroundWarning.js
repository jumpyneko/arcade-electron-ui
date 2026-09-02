// src/helper/turnAroundWarning.js
// Once the POV is over the screen turns to the other side of the cabinet, and
// the player is meant to walk round with it. Whoever stays put and keeps
// pressing their old buttons gets told to move: the message is drawn upside down
// with respect to the turned screen, so it reads from the side they are still
// standing on.

import { drawText } from "./typography.js";
import { COLORS } from "./colors.js";
import { getActiveSide, SIDE_2 } from "./playerSide.js";

const MESSAGE = "Turn around!";
const WARNING_MS = 2500;
const BLINK_MS = 300;
const BAND_HEIGHT = 32;

let visibleUntil = 0;

export function showTurnAroundWarning() {
  visibleUntil = performance.now() + WARNING_MS;
}

export function renderTurnAroundWarning(ctx, canvas) {
  if (getActiveSide() !== SIDE_2) return;

  const now = performance.now();
  if (now >= visibleUntil) return;
  if (Math.floor((visibleUntil - now) / BLINK_MS) % 2 === 1) return;

  const centerX = Math.round(canvas.width / 2);
  const centerY = Math.round(canvas.height / 2);
  const bandTop = centerY - BAND_HEIGHT / 2;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, bandTop, canvas.width, BAND_HEIGHT);
  ctx.fillStyle = COLORS.arcadeYellow;
  ctx.fillRect(0, bandTop, canvas.width, 1);
  ctx.fillRect(0, bandTop + BAND_HEIGHT - 1, canvas.width, 1);

  // Turned back the other way round, so it faces the player who has not moved.
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(Math.PI);
  drawText(ctx, MESSAGE, 0, -6, "h1", { align: "center", color: COLORS.arcadeYellow });
  ctx.restore();
}
