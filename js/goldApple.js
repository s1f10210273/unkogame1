// js/goldApple.js

import { GOLD_APPLE_SIZE, GOLD_APPLE_IMAGE_PATH } from "./constants.js"; // 必要な定数をインポート
import * as ui from "./ui.js"; // ui.canvas, ui.ctx を参照

// --- Module-level variables ---
let goldAppleImage = null;
let isImageLoaded = false;
let imageLoadError = null;

/**
 * 金りんご画像を非同期でプリロードする関数
 * @param {string} imagePath - 画像ファイルのパス
 * @returns {Promise<void>}
 */
export function loadGoldAppleImage(imagePath) {
  // console.log(`[GoldApple] Attempting to load image: ${imagePath}`);
  return new Promise((resolve, reject) => {
    if (goldAppleImage) {
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
    goldAppleImage = new Image();
    goldAppleImage.onload = () => {
      console.log(`[GoldApple] Image loaded successfully: ${imagePath}`);
      if (goldAppleImage.naturalWidth === 0) {
        const msg = `[GoldApple] Image loaded but naturalWidth is 0: ${imagePath}`;
        console.error(msg);
        isImageLoaded = false;
        imageLoadError = new Error(`金りんご画像(${imagePath})読込エラー(幅0)`);
        goldAppleImage = null;
        reject(imageLoadError);
      } else {
        isImageLoaded = true;
        imageLoadError = null;
        resolve();
      }
    };
    goldAppleImage.onerror = (err) => {
      const msg = `[GoldApple] Failed to load image onerror: ${imagePath}`;
      console.error(msg, err);
      goldAppleImage = null;
      isImageLoaded = false;
      imageLoadError = new Error(`金りんご画像(${imagePath})ロード失敗`);
      reject(imageLoadError);
    };
    goldAppleImage.src = imagePath;
  });
}

/**
 * 金りんごアイテムを表すクラス (Canvas描画)
 */
export class GoldApple {
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅
   * @param {number} initialSpeed - 生成時の落下速度
   */
  constructor(canvasLogicalWidth, initialSpeed) {
    this.width = GOLD_APPLE_SIZE;
    this.height = GOLD_APPLE_SIZE;
    this.speed = initialSpeed;
    this.active = true;
    // X座標計算 (左右10%を除外)
    const minX = canvasLogicalWidth * 0.15;
    const maxX = canvasLogicalWidth * 0.85 - this.width;
    const spawnRange = Math.max(0, maxX - minX);
    this.x = minX + Math.random() * spawnRange;
    this.y = 0 - this.height;
  }

  /**
   * 位置更新と画面外判定
   */
  update() {
    if (!this.active) return;
    this.y += this.speed;
    // 画面外判定 (上端基準)
    if (ui.canvas && this.y > ui.canvas.height) {
      this.active = false;
    }
  }

  /**
   * Canvasに画像またはフォールバックを描画
   */
  draw() {
    if (!this.active || !ui.ctx) return;
    const canDrawImage =
      isImageLoaded &&
      goldAppleImage &&
      goldAppleImage.complete &&
      goldAppleImage.naturalWidth !== 0;
    // console.log(`[GoldApple Draw @ y=${this.y.toFixed(0)}] CanDrawImg: ${canDrawImage}`);
    if (canDrawImage) {
      try {
        ui.ctx.drawImage(
          goldAppleImage,
          this.x,
          this.y,
          this.width,
          this.height
        );
      } catch (e) {
        console.error("[GoldApple Draw] Error:", e);
        this.drawFallback();
      }
    } else {
      this.drawFallback();
    }
  }

  /** フォールバック描画 (金色の円) */
  drawFallback() {
    if (!ui.ctx) return;
    // console.warn("[GoldApple Draw] Drawing fallback circle.");
    ui.ctx.fillStyle = "gold"; // Fallback color
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

  /**
   * 顔矩形との衝突判定 (Appleと同じロジックでOK)
   * @param {cv.Rect} faceRect - 顔の矩形 (論理座標)
   * @returns {boolean}
   */
  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;
    // 金りんごの矩形
    const goldAppleRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    // AABB判定
    return (
      goldAppleRect.x < faceRect.x + faceRect.width &&
      goldAppleRect.x + goldAppleRect.width > faceRect.x &&
      goldAppleRect.y < faceRect.y + faceRect.height &&
      goldAppleRect.y + goldAppleRect.height > faceRect.y
    );
  }
}
