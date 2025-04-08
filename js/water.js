// js/water.js

import {
  WATER_SIZE,
  WATER_SPEED,
  WATER_IMAGE_PATH,
  WATER_COLLISION_INSET,
} from "./constants.js";
import * as ui from "./ui.js"; // ui.canvas, ui.ctx を参照

// --- モジュールレベル変数 ---
let waterImage = null;
let isImageLoaded = false;
let imageLoadError = null;

/**
 * 水画像(PNG)を非同期でプリロードする関数
 * @param {string} imagePath - 画像ファイルのパス
 * @returns {Promise<void>}
 */
export function loadWaterImage(imagePath) {
  // console.log(`[Water] Attempting to load image: ${imagePath}`);
  return new Promise((resolve, reject) => {
    if (waterImage) {
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
    waterImage = new Image();
    waterImage.onload = () => {
      console.log(`[Water] Image loaded successfully: ${imagePath}`); // PNGになった
      isImageLoaded = true;
      resolve();
    };
    waterImage.onerror = (err) => {
      const msg = `[Water] Failed to load image: ${imagePath}`;
      console.error(msg, err);
      waterImage = null;
      isImageLoaded = false;
      imageLoadError = new Error(`水画像(${imagePath})ロード失敗`);
      reject(imageLoadError);
    };
    waterImage.src = imagePath;
  });
}

/**
 * 水アイテムを表すクラス (Canvas描画)
 */
export class Water {
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅
   */
  constructor(canvasLogicalWidth) {
    this.x = Math.random() * (canvasLogicalWidth - WATER_SIZE);
    this.y = 0 - WATER_SIZE;
    this.width = WATER_SIZE;
    this.height = WATER_SIZE;
    this.speed = WATER_SPEED;
    this.active = true;
    // this.element = null; // DOM要素は使わないので削除
  }

  /**
   * 位置更新と画面外判定
   */
  update() {
    if (!this.active) return;
    this.y += this.speed;
    // 画面外判定 (上端がCanvas高さを超えたら) - poop.js と同じロジック
    if (ui.canvas && this.y > ui.canvas.height) {
      // console.log(`[Water Update] Deactivating (top edge passed). y: ${this.y.toFixed(1)}, canvasH: ${ui.canvas.height}`); // デバッグ用
      this.active = false;
      // destroyElement() はないので不要
    }
  }

  /**
   * ★★★ Canvasに画像またはフォールバックを描画 ★★★
   */
  draw() {
    if (!this.active || !ui.ctx) return; // アクティブかつContextがある場合のみ

    const canDrawImage =
      isImageLoaded &&
      waterImage &&
      waterImage.complete &&
      waterImage.naturalWidth !== 0;

    if (canDrawImage) {
      // 画像を描画
      ui.ctx.drawImage(waterImage, this.x, this.y, this.width, this.height);
    } else {
      // フォールバック描画 (水色の円)
      // if (!isImageLoaded) console.warn("[Water Draw] Fallback: Image not loaded or ready.");
      ui.ctx.fillStyle = "aqua";
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
   * 衝突判定 (変更なし)
   * @param {cv.Rect} faceRect - 顔の矩形 (論理座標)
   * @returns {boolean}
   */
  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;
    const inset = WATER_COLLISION_INSET;
    const collisionX = this.x + inset;
    const collisionY = this.y + inset;
    const collisionWidth = Math.max(0, this.width - 2 * inset);
    const collisionHeight = Math.max(0, this.height - 2 * inset);
    const collisionWaterRect = {
      x: collisionX,
      y: collisionY,
      width: collisionWidth,
      height: collisionHeight,
    };
    // ... (ログは維持) ...
    return (
      collisionWaterRect.x < faceRect.x + faceRect.width &&
      collisionWaterRect.x + collisionWaterRect.width > faceRect.x &&
      collisionWaterRect.y < faceRect.y + faceRect.height &&
      collisionWaterRect.y + collisionWaterRect.height > faceRect.y
    );
  }
}
