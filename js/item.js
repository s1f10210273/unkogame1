// js/item.js (Apple)

import { APPLE_SIZE, APPLE_IMAGE_PATH } from "./constants.js"; // APPLE_SPEED は削除
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
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅
   * @param {number} initialSpeed - 生成時の落下速度
   */
  constructor(canvasLogicalWidth, initialSpeed) {
    // ★★★ initialSpeed 引数を追加 ★★★
    this.width = APPLE_SIZE;
    this.height = APPLE_SIZE;
    this.speed = initialSpeed; // ★★★ 引数から速度を設定 ★★★
    this.active = true;

    // X座標計算 (左右10%を除外)
    const minX = canvasLogicalWidth * 0.15;
    const maxX = canvasLogicalWidth * 0.85 - this.width;
    const spawnRange = Math.max(0, maxX - minX);
    this.x = minX + Math.random() * spawnRange;
    this.y = 0 - this.height;
  }

  update(dt) {
    if (!this.active) return;
    // ★★★ 移動距離 = 速度 x 時間 ★★★
    this.y += this.speed * dt;
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
    // console.log(`[Apple Draw @ y=${this.y.toFixed(0)}] CanDrawImg: ${canDrawImage}`);
    if (canDrawImage) {
      ui.ctx.drawImage(appleImage, this.x, this.y, this.width, this.height);
    } else {
      // console.warn("[Apple Draw] Drawing fallback circle.");
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
