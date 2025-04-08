// js/poop.js

import { POOP_SIZE, POOP_SPEED } from "./constants.js";
import * as ui from "./ui.js";

let poopImage = null;
let isImageLoaded = false;
let imageLoadError = null;

/**
 * 糞の画像を非同期でプリロードする関数
 * @param {string} imagePath - 画像ファイルのパス
 * @returns {Promise<void>} 読み込み完了時に解決されるPromise
 */
export function loadPoopImage(imagePath) {
  // console.log(`[Poop] Attempting to load image: ${imagePath}`);
  return new Promise((resolve, reject) => {
    // すでにロード試行済みの場合の処理
    if (poopImage) {
      if (isImageLoaded) {
        // console.log(`[Poop] Image already loaded: ${imagePath}`);
        resolve(); // 成功済み
        return;
      }
      if (imageLoadError) {
        // console.log(`[Poop] Image previously failed to load: ${imagePath}`);
        reject(imageLoadError); // 失敗済み
        return;
      }
    }
    // 状態リセット
    isImageLoaded = false;
    imageLoadError = null;

    // Imageオブジェクトでプリロード開始
    poopImage = new Image();
    poopImage.onload = () => {
      console.log(`[Poop] Image loaded successfully: ${imagePath}`);
      isImageLoaded = true; // ロード成功フラグ
      resolve(); // Promiseを解決
    };
    poopImage.onerror = (err) => {
      const msg = `[Poop] Failed to load image: ${imagePath}`;
      console.error(msg, err);
      poopImage = null; // オブジェクトを破棄
      isImageLoaded = false; // ロード失敗フラグ
      imageLoadError = new Error(`糞画像(${imagePath})ロード失敗`); // エラー情報保持
      reject(imageLoadError); // Promiseを失敗させる
    };
    poopImage.src = imagePath; // 読み込みトリガー
  });
}

/**
 * 糞アイテムを表すクラス
 */
export class Poop {
  /**
   * @param {number} canvasLogicalWidth - Canvasの論理的な幅
   */
  constructor(canvasLogicalWidth) {
    this.width = POOP_SIZE;
    this.height = POOP_SIZE;
    this.speed = POOP_SPEED;
    this.active = true;

    // X座標の計算 (左右10%を除いた中央80%の範囲)
    const minX = canvasLogicalWidth * 0.1; // 左端の境界 (10%)
    const maxX = canvasLogicalWidth * 0.9 - this.width; // 右端の境界 (90% - アイテム幅)
    const spawnRange = Math.max(0, maxX - minX); // 生成可能なX座標の範囲幅

    this.x = minX + Math.random() * spawnRange; // 最終的なX座標
    this.y = 0 - this.height; // 初期Y座標 (画面上部外)

    // console.log(`[Poop Constructor] canvasW: ${canvasLogicalWidth}, minX: ${minX.toFixed(1)}, maxX: ${maxX.toFixed(1)}, range: ${spawnRange.toFixed(1)}, finalX: ${this.x.toFixed(1)}`);
  }

  /**
   * 位置更新と画面外判定
   */
  update() {
    if (!this.active) return; // 非アクティブなら何もしない
    this.y += this.speed; // Y座標を更新

    // 画面外判定 (上端がCanvas高さを超えたら)
    if (ui.canvas && this.y > ui.canvas.height) {
      // console.log(`[Poop Update] Deactivating (top edge passed). y: ${this.y.toFixed(1)}, canvasH: ${ui.canvas.height}`);
      this.active = false;
    }
  }

  /**
   * Canvasへの描画
   */
  draw() {
    if (!this.active || !ui.ctx) return; // 描画できない場合は中断

    // 画像がロード完了しているか確認
    const canDrawImage =
      isImageLoaded &&
      poopImage &&
      poopImage.complete &&
      poopImage.naturalWidth !== 0;

    // console.log(`[Poop Draw @ y=${this.y.toFixed(0)}] CanDrawImg: ${canDrawImage}`);

    if (canDrawImage) {
      // 画像を描画
      ui.ctx.drawImage(poopImage, this.x, this.y, this.width, this.height);
    } else {
      // フォールバック描画 (茶色の円)
      console.warn("[Poop Draw] Drawing fallback circle.");
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

  /**
   * 顔矩形との衝突判定
   * @param {cv.Rect} faceRect - 顔の矩形 (論理座標)
   * @returns {boolean} 衝突していれば true
   */
  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;
    // 糞アイテムの矩形
    const poopRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    // AABB判定
    return (
      poopRect.x < faceRect.x + faceRect.width &&
      poopRect.x + poopRect.width > faceRect.x &&
      poopRect.y < faceRect.y + faceRect.height &&
      poopRect.y + poopRect.height > faceRect.y
    );
  }
}
