// src/helper/frameSequence.js

export class FrameSequence {
    constructor(framePaths, frameWidth, frameHeight, frameSpeed = 2) {
      this.frameWidth = frameWidth;
      this.frameHeight = frameHeight;
      this.frameSpeed = frameSpeed;
      this.totalFrames = framePaths.length;
  
      this.frames = framePaths.map((src) => {
        const img = new Image();
        img.src = src;
        return img;
      });
  
      this.currentFrame = 0;
      this.timer = 0;
      this.mode = "paused";
      this.rangeStart = 0;
      this.rangeEnd = Math.max(0, this.totalFrames - 1);
      this.finished = false;
      this.holdLastOnFinish = true;
    }
  
    playOnce(startFrame = 0, endFrame = this.totalFrames - 1, options = {}) {
      const { holdLast = true } = options;
  
      this.rangeStart = Math.max(0, Math.min(startFrame, this.totalFrames - 1));
      this.rangeEnd = Math.max(0, Math.min(endFrame, this.totalFrames - 1));
      if (this.rangeStart > this.rangeEnd) {
        [this.rangeStart, this.rangeEnd] = [this.rangeEnd, this.rangeStart];
      }
  
      this.mode = "once";
      this.finished = false;
      this.holdLastOnFinish = holdLast;
      this.currentFrame = this.rangeStart;
      this.timer = 0;
    }
  
    update() {
      if (this.mode !== "once" || this.finished) return;
  
      this.timer++;
      if (this.timer < this.frameSpeed) return;
      this.timer = 0;
  
      if (this.currentFrame < this.rangeEnd) {
        this.currentFrame++;
      } else {
        this.finished = true;
        if (!this.holdLastOnFinish) {
          this.currentFrame = this.rangeStart;
        }
      }
    }
  
    isFinished() {
      return this.finished;
    }
  
    isReady() {
      return this.frames.every((img) => img.complete);
    }
  
    drawFullscreen(ctx, canvas) {
      const img = this.frames[this.currentFrame];
      if (!img?.complete) return;
  
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  
    reset() {
      this.currentFrame = 0;
      this.timer = 0;
      this.finished = false;
      this.mode = "paused";
    }
  }