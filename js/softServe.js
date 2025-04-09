// js/softServe.js

import { SOFT_SERVE_SIZE, SOFT_SERVE_IMAGE_PATH } from "./constants.js";
import * as ui from "./ui.js";

// --- Module-level variables ---
let softServeImage = null;
let isImageLoaded = false;
let imageLoadError = null;

/**
 * ソフトクリーム画像を非同期でプリロードする関数
 * @param {string} imagePath - 画像ファイルのパス
 * @returns {Promise<void>}
 */
export function loadSoftServeImage(imagePath) {
  // console.log(`[SoftServe] Attempting to load image: ${imagePath}`);
  return new Promise((resolve, reject) => {
    if (softServeImage) {
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
    softServeImage = new Image();
    softServeImage.onload = () => {
      console.log(`[SoftServe] Image loaded successfully: ${imagePath}`);
      if (softServeImage.naturalWidth === 0) {
        const msg = `[SoftServe] Image loaded but naturalWidth is 0: ${imagePath}`;
        console.error(msg);
        isImageLoaded = false;
        imageLoadError = new Error(
          `ソフトクリーム画像(${imagePath})読込エラー(幅0)`
        );
        softServeImage = null;
        reject(imageLoadError);
      } else {
        isImageLoaded = true;
        imageLoadError = null;
        resolve();
      }
    };
    softServeImage.onerror = (err) => {
      const msg = `[SoftServe] Failed to load image onerror: ${imagePath}`;
      console.error(msg, err);
      softServeImage = null;
      isImageLoaded = false;
      imageLoadError = new Error(`ソフトクリーム画像(${imagePath})ロード失敗`);
      reject(imageLoadError);
    };
    softServeImage.src = imagePath;
  });
}

/**
 * ソフトクリームアイテムを表すクラス (Canvas描画)
 */
export class SoftServe {
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅
   * @param {number} speed - 落下速度 (固定)
   */
  constructor(canvasLogicalWidth, speed) {
    this.width = SOFT_SERVE_SIZE;
    this.height = SOFT_SERVE_SIZE; // サイズは同じと仮定
    this.speed = speed; // 固定速度を使用
    this.active = true;
    // X座標計算 (左右10%を除外)
    const minX = canvasLogicalWidth * 0.1;
    const maxX = canvasLogicalWidth * 0.9 - this.width;
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
      softServeImage &&
      softServeImage.complete &&
      softServeImage.naturalWidth !== 0;
    // console.log(`[SoftServe Draw @ y=${this.y.toFixed(0)}] CanDrawImg: ${canDrawImage}`);
    if (canDrawImage) {
      try {
        ui.ctx.drawImage(
          softServeImage,
          this.x,
          this.y,
          this.width,
          this.height
        );
      } catch (e) {
        console.error("[SoftServe Draw] Error:", e);
        this.drawFallback();
      }
    } else {
      this.drawFallback();
    }
  }

  /** フォールバック描画 (白色の円) */
  drawFallback() {
    if (!ui.ctx) return;
    // console.warn("[SoftServe Draw] Drawing fallback circle.");
    ui.ctx.fillStyle = "white"; // Fallback color
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
   * 顔矩形との衝突判定
   * @param {cv.Rect} faceRect - 顔の矩形 (論理座標)
   * @returns {boolean}
   */
  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;
    const softServeRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    return (
      softServeRect.x < faceRect.x + faceRect.width &&
      softServeRect.x + softServeRect.width > faceRect.x &&
      softServeRect.y < faceRect.y + faceRect.height &&
      softServeRect.y + softServeRect.height > faceRect.y
    );
  }
}
