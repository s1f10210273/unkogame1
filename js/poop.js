// js/poop.js

import { POOP_SIZE, POOP_SPEED } from "./constants.js";
import * as ui from "./ui.js";

let poopImage = null;
let isImageLoaded = false;
let imageLoadError = null;

export function loadPoopImage(imagePath) {
  return new Promise((resolve, reject) => {
    if (poopImage) {
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
    poopImage = new Image();
    poopImage.onload = () => {
      console.log(`[Poop] Image loaded: ${imagePath}`);
      isImageLoaded = true;
      resolve();
    };
    poopImage.onerror = (err) => {
      const msg = `[Poop] Failed to load image: ${imagePath}`;
      console.error(msg, err);
      poopImage = null;
      isImageLoaded = false;
      imageLoadError = new Error(`糞画像(${imagePath})ロード失敗`);
      reject(imageLoadError);
    };
    poopImage.src = imagePath;
  });
}

export class Poop {
  constructor(canvasWidth) {
    this.x = Math.random() * (canvasWidth - POOP_SIZE);
    this.y = 0 - POOP_SIZE;
    this.width = POOP_SIZE;
    this.height = POOP_SIZE;
    this.speed = POOP_SPEED;
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
      poopImage &&
      poopImage.complete &&
      poopImage.naturalWidth !== 0;
    if (canDrawImage) {
      ui.ctx.drawImage(poopImage, this.x, this.y, this.width, this.height);
    } else {
      // Fallback drawing
      ui.ctx.fillStyle = "saddlebrown";
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
    const poopRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    return (
      poopRect.x < faceRect.x + faceRect.width &&
      poopRect.x + poopRect.width > faceRect.x &&
      poopRect.y < faceRect.y + faceRect.height &&
      poopRect.y + poopRect.height > faceRect.y
    );
  }
}
