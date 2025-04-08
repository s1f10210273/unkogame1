// js/item.js (Apple)

import { APPLE_SIZE, APPLE_SPEED, APPLE_IMAGE_PATH } from "./constants.js"; // 画像パスもインポート
import * as ui from "./ui.js";

let appleImage = null;
let isImageLoaded = false;
let imageLoadError = null;

/**
 * りんご画像を非同期でプリロードする関数
 * @param {string} imagePath - 画像ファイルのパス
 * @returns {Promise<void>}
 */
export function loadAppleImage(imagePath) {
  // console.log(`[Apple] Attempting to load image: ${imagePath}`);
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

/**
 * りんごアイテムを表すクラス
 */
export class Apple {
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅
   */
  constructor(canvasLogicalWidth) {
    this.width = APPLE_SIZE;
    this.height = APPLE_SIZE;
    this.speed = APPLE_SPEED;
    this.active = true;

    // X座標の計算 (左右10%を除いた中央80%の範囲)
    const minX = canvasLogicalWidth * 0.1;
    const maxX = canvasLogicalWidth * 0.9 - this.width;
    const spawnRange = Math.max(0, maxX - minX);

    this.x = minX + Math.random() * spawnRange;
    this.y = 0 - this.height;

    // console.log(`[Apple Constructor] canvasW: ${canvasLogicalWidth}, minX: ${minX.toFixed(1)}, maxX: ${maxX.toFixed(1)}, range: ${spawnRange.toFixed(1)}, finalX: ${this.x.toFixed(1)}`);
  }

  /**
   * 位置更新と画面外判定
   */
  update() {
    if (!this.active) return;
    this.y += this.speed;
    if (ui.canvas && this.y > ui.canvas.height) {
      this.active = false;
    }
  }

  /**
   * Canvasへの描画
   */
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

  /**
   * 顔矩形との衝突判定
   * @param {cv.Rect} faceRect - 顔の矩形 (論理座標)
   * @returns {boolean}
   */
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
