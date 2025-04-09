// js/water.js

// ★★★ import 文から WATER_SPEED を削除 ★★★
import {
  WATER_SIZE,
  WATER_IMAGE_PATH,
  WATER_COLLISION_INSET,
  WATER_SPEED_INITIAL,
} from "./constants.js"; // WATER_SPEED_INITIAL はコンストラクタ引数のデフォルト値などに使うかもしれないので残しても良いが、現状は使われていない
// import { WATER_SIZE, WATER_SPEED, WATER_IMAGE_PATH, WATER_COLLISION_INSET } from "./constants.js"; // ← 修正前
import * as ui from "./ui.js"; // ui.canvas, ui.ctx を参照

// --- モジュールレベル変数: 画像の状態管理 ---
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
      console.log(`[Water] Image loaded successfully: ${imagePath}`);
      if (waterImage.naturalWidth === 0) {
        const msg = `[Water] Image loaded but naturalWidth is 0: ${imagePath}`;
        console.error(msg);
        isImageLoaded = false;
        imageLoadError = new Error(`水画像(${imagePath})は読み込めたが幅が0`);
        waterImage = null;
        reject(imageLoadError);
      } else {
        isImageLoaded = true;
        imageLoadError = null;
        resolve();
      }
    };
    waterImage.onerror = (err) => {
      const msg = `[Water] Failed to load image onerror: ${imagePath}`;
      console.error(msg, err);
      waterImage = null;
      isImageLoaded = false;
      imageLoadError = new Error(`水画像(${imagePath})ロード失敗 (onerror)`);
      reject(imageLoadError);
    };
    console.log(`[Water] Setting image src: ${imagePath}`);
    waterImage.src = imagePath;
  });
}

/**
 * 水アイテムを表すクラス (Canvas描画)
 */
export class Water {
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅
   * @param {number} initialSpeed - 生成時の落下速度
   */
  constructor(canvasLogicalWidth, initialSpeed) {
    this.width = WATER_SIZE;
    this.height = WATER_SIZE;
    this.speed = initialSpeed; // コンストラクタで受け取った速度を使用
    this.active = true;
    // X座標計算
    const minX = canvasLogicalWidth * 0.1;
    const maxX = canvasLogicalWidth * 0.9 - this.width;
    const spawnRange = Math.max(0, maxX - minX);
    this.x = minX + Math.random() * spawnRange;
    this.y = 0 - this.height; // Y座標は画面上部外から
  }

  /**
   * 位置更新と画面外判定
   */
  update() {
    if (!this.active) return;
    this.y += this.speed; // 現在の速度で落下
    // 画面外判定 (上端がCanvas高さを超えたら)
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
      waterImage &&
      waterImage.complete &&
      waterImage.naturalWidth !== 0;
    // console.log(`[Water Draw @ y=${this.y.toFixed(0)}] CanDrawImg: ${canDrawImage}`);
    if (canDrawImage) {
      try {
        ui.ctx.drawImage(waterImage, this.x, this.y, this.width, this.height);
      } catch (e) {
        console.error("[Water Draw] Error during drawImage:", e, waterImage);
        this.drawFallback();
      }
    } else {
      this.drawFallback();
    }
  }

  /** フォールバック描画 (水色の円) */
  drawFallback() {
    if (!ui.ctx) return;
    // console.warn("[Water Draw] Drawing fallback circle."); // 必要なら有効化
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

  /**
   * 衝突判定
   * @param {cv.Rect} faceRect - 顔の矩形 (論理座標)
   * @returns {boolean}
   */
  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;
    // ★★★ 定数名を直接使用 ★★★
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
    // --- ログ出力 (デバッグ用) ---
    // const visualWaterRect = { x: this.x, y: this.y, width: this.width, height: this.height };
    // console.log(`[Water checkCollision] Visual Rect : x=${visualWaterRect.x.toFixed(1)}, y=${visualWaterRect.y.toFixed(1)}, w=${visualWaterRect.width}, h=${visualWaterRect.height}`);
    // console.log(`%c[Water checkCollision] Collision Rect: x=${collisionWaterRect.x.toFixed(1)}, y=${collisionWaterRect.y.toFixed(1)}, w=${collisionWaterRect.width}, h=${collisionWaterRect.height} (Inset: ${inset})`, "color: blue");
    // console.log(`[Water checkCollision] Face Rect   : x=${faceRect.x}, y=${faceRect.y}, w=${faceRect.width}, h=${faceRect.height}`);
    // --- ログここまで ---
    const overlaps =
      collisionWaterRect.x < faceRect.x + faceRect.width &&
      collisionWaterRect.x + collisionWaterRect.width > faceRect.x &&
      collisionWaterRect.y < faceRect.y + faceRect.height &&
      collisionWaterRect.y + collisionWaterRect.height > faceRect.y;
    return overlaps;
  }

  // DOM関連メソッドは削除済み
}
