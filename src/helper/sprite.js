// src/sprite.js

export class Sprite {
  constructor(src, frameWidth, frameHeight, totalFrames, frameSpeed = 8) {
    this.image = new Image();
    this.image.src = src;

    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.totalFrames = totalFrames;
    this.frameSpeed = frameSpeed;

    this.currentFrame = 0;
    this.timer = 0;

    // Playback state
    this.mode = "loop"; // "loop" | "once" | "paused"
    this.rangeStart = 0;
    this.rangeEnd = Math.max(0, totalFrames - 1);
    this.finished = false;
    this.holdLastOnFinish = true;
  }

  reset(frame = 0) {
    const clamped = this._clampFrame(frame);
    this.currentFrame = clamped;
    this.timer = 0;
    this.finished = false;
  }

  pause() {
    this.mode = "paused";
  }

  resumeLoopAll() {
    this.playLoop(0, this.totalFrames - 1);
  }

  playLoop(startFrame = 0, endFrame = this.totalFrames - 1) {
    this._setRange(startFrame, endFrame);
    this.mode = "loop";
    this.finished = false;
    this.timer = 0;
    this.currentFrame = this.rangeStart;
  }

  playOnce(startFrame = 0, endFrame = this.totalFrames - 1, options = {}) {
    const { holdLast = true } = options;

    this._setRange(startFrame, endFrame);
    this.mode = "once";
    this.finished = false;
    this.holdLastOnFinish = holdLast;
    this.timer = 0;
    this.currentFrame = this.rangeStart;
  }

  isFinished() {
    return this.finished;
  }

  update() {
    if (!this.image.complete) return;
    if (this.mode === "paused") return;
    if (this.mode === "once" && this.finished) return;

    this.timer++;
    if (this.timer < this.frameSpeed) return;
    this.timer = 0;

    if (this.mode === "loop") {
      if (this.currentFrame >= this.rangeEnd) {
        this.currentFrame = this.rangeStart;
      } else {
        this.currentFrame++;
      }
      return;
    }

    // mode === "once"
    if (this.currentFrame < this.rangeEnd) {
      this.currentFrame++;
    } else {
      this.finished = true;
      if (!this.holdLastOnFinish) {
        this.currentFrame = this.rangeStart;
      }
    }
  }

  draw(ctx, x, y, scale = 1) {
    if (!this.image.complete) return;

    const drawW = this.frameWidth * scale;
    const drawH = this.frameHeight * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.image,
      this.currentFrame * this.frameWidth,
      0,
      this.frameWidth,
      this.frameHeight,
      x - drawW / 2,
      y - drawH / 2,
      drawW,
      drawH
    );
  }

  _setRange(startFrame, endFrame) {
    const s = this._clampFrame(startFrame);
    const e = this._clampFrame(endFrame);

    this.rangeStart = Math.min(s, e);
    this.rangeEnd = Math.max(s, e);
  }

  _clampFrame(frame) {
    return Math.max(0, Math.min(this.totalFrames - 1, frame | 0));
  }
}