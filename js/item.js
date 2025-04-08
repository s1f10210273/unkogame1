// js/item.js (Apple)

import { APPLE_SIZE, APPLE_SPEED } from "./constants.js";
import * as ui from "./ui.js";

let appleImage = null;
let isImageLoaded = false;
let imageLoadError = null;

export function loadAppleImage(imagePath) {
  return new Promise((resolve, reject) => {
    if (appleImage) {
      if (isImageLoaded) {
        resolve();
        return;
      }
      if (imageLoadError) {
        reject(imageLoadError);
        return;
      }
    }
    isImageLoaded = false;
    imageLoadError = null;
    appleImage = new Image();
    appleImage.onload = () => {
      console.log(`[Apple] Image loaded: ${imagePath}`);
      isImageLoaded = true;
      resolve();
    };
    appleImage.onerror = (err) => {
      const msg = `[Apple] Failed to load image: ${imagePath}`;
      console.error(msg, err);
      appleImage = null;
      isImageLoaded = false;
      imageLoadError = new Error(`りんご画像(${imagePath})ロード失敗`);
      reject(imageLoadError);
    };
    appleImage.src = imagePath;
  });
}

export class Apple {
  constructor(canvasWidth) {
    this.x = Math.random() * (canvasWidth - APPLE_SIZE);
    this.y = 0 - APPLE_SIZE;
    this.width = APPLE_SIZE;
    this.height = APPLE_SIZE;
    this.speed = APPLE_SPEED;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.y += this.speed;
    // Use canvas resolution height for logical boundary check
    if (ui.canvas && this.y > ui.canvas.height) {
      this.active = false;
    }
  }

  draw() {
    if (!this.active || !ui.ctx) return;
    const canDrawImage =
      isImageLoaded &&
      appleImage &&
      appleImage.complete &&
      appleImage.naturalWidth !== 0;
    if (canDrawImage) {
      ui.ctx.drawImage(appleImage, this.x, this.y, this.width, this.height);
    } else {
      // Fallback drawing
      ui.ctx.fillStyle = "limegreen";
      ui.ctx.beginPath();
      ui.ctx.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width / 2,
        0,
        Math.PI * 2
      );
      ui.ctx.fill();
    }
  }

  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;
    const appleRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    return (
      appleRect.x < faceRect.x + faceRect.width &&
      appleRect.x + appleRect.width > faceRect.x &&
      appleRect.y < faceRect.y + faceRect.height &&
      appleRect.y + appleRect.height > faceRect.y
    );
  }
}
