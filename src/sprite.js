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
    }
  
    reset() {
      this.currentFrame = 0;
      this.timer = 0;
    }
  
    update() {
      this.timer++;
      if (this.timer >= this.frameSpeed) {
        this.timer = 0;
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
      }
    }
  
    draw(ctx, x, y, scale = 1) {
      if (!this.image.complete) return;
  
      const drawW = this.frameWidth * scale;
      const drawH = this.frameHeight * scale;
  
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.image,
        this.currentFrame * this.frameWidth, 0,
        this.frameWidth, this.frameHeight,
        x - drawW / 2, y - drawH / 2,
        drawW, drawH
      );
    }
  }