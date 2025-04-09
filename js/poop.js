// js/poop.js

import { POOP_SIZE } from "./constants.js"; // POOP_SPEED は削除
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
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅
   * @param {number} initialSpeed - 生成時の落下速度
   */
  constructor(canvasLogicalWidth, initialSpeed) {
    // ★★★ initialSpeed 引数を追加 ★★★
    this.width = POOP_SIZE;
    this.height = POOP_SIZE;
    this.speed = initialSpeed; // ★★★ 引数から速度を設定 ★★★
    this.active = true;

    // X座標計算 (左右10%を除外)
    const minX = canvasLogicalWidth * 0.1;
    const maxX = canvasLogicalWidth * 0.9 - this.width;
    const spawnRange = Math.max(0, maxX - minX);
    this.x = minX + Math.random() * spawnRange;
    this.y = 0 - this.height;
  }

  update() {
    if (!this.active) return;
    this.y += this.speed; // ★★★ 設定された速度で落下 ★★★
    // 画面外判定 (上端基準)
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
    // console.log(`[Poop Draw @ y=${this.y.toFixed(0)}] CanDrawImg: ${canDrawImage}`);
    if (canDrawImage) {
      ui.ctx.drawImage(poopImage, this.x, this.y, this.width, this.height);
    } else {
      // console.warn("[Poop Draw] Drawing fallback circle.");
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
