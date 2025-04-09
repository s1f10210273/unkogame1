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
  constructor(canvasLogicalWidth, initialSpeed) {
    this.width = POOP_SIZE;
    this.height = POOP_SIZE;
    this.speed = initialSpeed;
    this.active = true;
    const minX = canvasLogicalWidth * 0.1;
    const maxX = canvasLogicalWidth * 0.9 - this.width;
    const spawnRange = Math.max(0, maxX - minX);
    this.x = minX + Math.random() * spawnRange;
    this.y = 0 - this.height;
  }

  /** ★★★ update メソッドに dt 引数を追加 ★★★ */
  update(dt) {
    if (!this.active) return;

    const oldY = this.y;
    const deltaY = this.speed * dt; // ★★★ 移動距離を計算 ★★★

    // ★★★ ログ追加: 更新前の値、速度、dt、移動距離 ★★★
    // console.log(`[Poop Update] Before - y: ${oldY.toFixed(1)}, speed: ${this.speed.toFixed(1)}, dt: ${dt.toFixed(4)}, deltaY: ${deltaY.toFixed(1)}`);

    this.y += deltaY; // ★★★ 座標更新 ★★★

    // 画面外判定
    if (ui.canvas && this.y > ui.canvas.height) {
      // console.log(`[Poop Update] Deactivating - y ${this.y.toFixed(1)} > canvas height ${ui.canvas.height}`); // 必要ならログ
      this.active = false;
    }
    // ★★★ ログ追加: 更新後の値 ★★★
    // console.log(`[Poop Update] After - y: ${this.y.toFixed(1)}`);
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
