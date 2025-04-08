// js/water.js

// 定数とUIモジュールをインポート
import {
  WATER_SIZE,
  WATER_SPEED,
  WATER_IMAGE_PATH,
  WATER_COLLISION_INSET,
} from "./constants.js";
import * as ui from "./ui.js"; // ui.canvas, ui.ctx を参照

// --- モジュールレベル変数: 画像の状態管理 ---
let waterImage = null; // 画像オブジェクト（プリロード用）
let isImageLoaded = false; // 画像がロード完了したか
let imageLoadError = null; // ロード時のエラー情報

/**
 * 水画像(PNG)を非同期でプリロードする関数
 * @param {string} imagePath - 画像ファイルのパス
 * @returns {Promise<void>} 読み込み完了時に解決されるPromise
 */
export function loadWaterImage(imagePath) {
  // console.log(`[Water] Attempting to load image: ${imagePath}`); // デバッグ用ログ
  return new Promise((resolve, reject) => {
    // すでにロード試行済みの場合の処理
    if (waterImage) {
      if (isImageLoaded) {
        resolve();
        return;
      } // 成功済み
      if (imageLoadError) {
        reject(imageLoadError);
        return;
      } // 失敗済み
    }
    // 未試行、または不完全だった場合
    isImageLoaded = false;
    imageLoadError = null;

    // Imageオブジェクトでプリロード開始
    waterImage = new Image();
    waterImage.onload = () => {
      console.log(`[Water] Image loaded successfully: ${imagePath}`); // PNGになった
      isImageLoaded = true; // ロード成功フラグ
      resolve(); // Promiseを解決
    };
    waterImage.onerror = (err) => {
      const msg = `[Water] Failed to load image: ${imagePath}`;
      console.error(msg, err);
      waterImage = null; // オブジェクトを破棄
      isImageLoaded = false; // ロード失敗フラグ
      imageLoadError = new Error(`水画像(${imagePath})ロード失敗`); // エラー情報保持
      reject(imageLoadError); // Promiseを失敗させる
    };
    waterImage.src = imagePath; // 読み込みトリガー
  });
}

/**
 * 水アイテムを表すクラス (Canvas描画)
 */
export class Water {
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅 (初期位置計算用)
   */
  constructor(canvasLogicalWidth) {
    this.width = WATER_SIZE;
    this.height = WATER_SIZE;
    this.speed = WATER_SPEED;
    this.active = true;
    // this.element = null; // DOM要素は使わない

    // ★★★ X座標の計算を修正 (左右10%を除外) ★★★
    const minX = canvasLogicalWidth * 0.1;
    const maxX = canvasLogicalWidth * 0.9 - this.width;
    const spawnRange = Math.max(0, maxX - minX);

    this.x = minX + Math.random() * spawnRange;
    this.y = 0 - this.height;

    // console.log(`[Water Constructor] canvasW: ${canvasLogicalWidth}, minX: ${minX.toFixed(1)}, maxX: ${maxX.toFixed(1)}, range: ${spawnRange.toFixed(1)}, finalX: ${this.x.toFixed(1)}`);
  }

  /**
   * 位置更新と画面外判定
   */
  update() {
    if (!this.active) return;
    this.y += this.speed;
    // 画面外判定 (上端がCanvas高さを超えたら) - poop.js と同じロジック
    if (ui.canvas && this.y > ui.canvas.height) {
      // console.log(`[Water Update] Deactivating (top edge passed). y: ${this.y.toFixed(1)}, canvasH: ${ui.canvas.height}`);
      this.active = false;
      // destroyElement() は不要
    }
  }

  /**
   * Canvasに画像またはフォールバックを描画
   */
  draw() {
    if (!this.active || !ui.ctx) return; // 描画できない場合は中断

    // 画像がロード完了しているか確認
    const canDrawImage =
      isImageLoaded &&
      waterImage &&
      waterImage.complete &&
      waterImage.naturalWidth !== 0;

    // console.log(`[Water Draw @ y=${this.y.toFixed(0)}] CanDrawImg: ${canDrawImage}`); // 必要ならログ有効化

    if (canDrawImage) {
      // 画像を描画
      ui.ctx.drawImage(waterImage, this.x, this.y, this.width, this.height);
    } else {
      // フォールバック描画 (水色の円)
      // console.warn("[Water Draw] Drawing fallback circle."); // 必要なら警告ログ
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
   * 顔矩形との衝突判定 (縮小判定ロジックは維持)
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
    // ログは維持 (デバッグ用にコメントアウト解除可能)
    // const visualWaterRect = { x: this.x, y: this.y, width: this.width, height: this.height };
    // console.log(`[Water checkCollision] Visual Rect : x=${visualWaterRect.x.toFixed(1)}, ...`);
    // console.log(`%c[Water checkCollision] Collision Rect: x=${collisionWaterRect.x.toFixed(1)}, ...`, "color: blue");
    // console.log(`[Water checkCollision] Face Rect   : x=${faceRect.x}, ...`);
    return (
      collisionWaterRect.x < faceRect.x + faceRect.width &&
      collisionWaterRect.x + collisionWaterRect.width > faceRect.x &&
      collisionWaterRect.y < faceRect.y + faceRect.height &&
      collisionWaterRect.y + collisionWaterRect.height > faceRect.y
    );
  }

  // DOM関連メソッドは削除済み
  // createElement(containerElement) { /* ...削除... */ }
  // updateElementPosition() { /* ...削除... */ }
  // destroyElement() { /* ...削除... */ }
}
