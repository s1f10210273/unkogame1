// js/water.js

import { WATER_SIZE, WATER_SPEED, WATER_IMAGE_PATH } from "./constants.js";
import * as ui from "./ui.js"; // ui.itemOverlayContainer を参照するため

// --- Module-level variables for image state ---
let waterImage = null; // Imageオブジェクト (主にプリロード確認用)
let isImageLoaded = false; // 画像が読み込み成功したか
let imageLoadError = null; // 読み込みエラー情報

/**
 * 水の画像(GIF)を事前にロードしておく関数 (Promiseを返す)
 * @param {string} imagePath 画像ファイルのパス
 * @returns {Promise<void>}
 */
export function loadWaterImage(imagePath) {
  // console.log(`[Water] Preloading GIF: ${imagePath}`); // デバッグ用
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

    waterImage = new Image();
    waterImage.onload = () => {
      console.log(`[Water] GIF preloaded successfully: ${imagePath}`);
      isImageLoaded = true;
      resolve(); // プリロード成功
    };
    waterImage.onerror = (err) => {
      const errorMessage = `[Water] Failed to preload GIF at ${imagePath}`;
      console.error(errorMessage, err);
      waterImage = null; // Imageオブジェクトは破棄
      isImageLoaded = false; // ロード失敗フラグ
      imageLoadError = new Error(`水画像(GIF:${imagePath})のプリロード失敗`);
      reject(imageLoadError); // プリロード失敗
    };
    waterImage.src = imagePath; // プリロード開始
  });
}

/**
 * 水アイテムを表すクラス
 */
export class Water {
  /**
   * @param {number} canvasWidth Canvasの幅 (初期位置計算用)
   */
  constructor(canvasWidth) {
    this.x = Math.random() * (canvasWidth - WATER_SIZE); // 初期X座標 (ランダム)
    this.y = 0 - WATER_SIZE; // 初期Y座標 (画面上部外)
    this.width = WATER_SIZE; // 幅
    this.height = WATER_SIZE; // 高さ
    this.speed = WATER_SPEED; // 落下速度
    this.active = true; // アクティブ状態フラグ
    this.element = null; // 対応するHTML <img> 要素
  }

  /**
   * アイテムの位置を更新し、画面外に出たか判定する
   */
  update() {
    if (!this.active) return; // 非アクティブなら何もしない

    this.y += this.speed; // Y座標を更新

    // 画面外判定: アイテムの下端が表示領域の下端を超えたか？
    const containerHeight = ui.itemOverlayContainer
      ? ui.itemOverlayContainer.clientHeight
      : 0;
    const itemBottomY = this.y + this.height;

    if (containerHeight > 0 && itemBottomY > containerHeight) {
      // console.log(`[Water Update] Deactivating water (bottom edge passed). bottomY: ${itemBottomY.toFixed(1)}, containerHeight: ${containerHeight}`); // デバッグ用
      this.active = false;
      this.destroyElement(); // 画面外に出たらDOM要素も削除
    }
    // else if (containerHeight <= 0) { // コンテナ高さが0の場合の警告(必要なら)
    //     console.warn("[Water Update] Container height is 0 for boundary check.");
    // }
  }

  /**
   * Canvasへの描画メソッド (Waterクラスでは使用しない)
   * poop.jsとの構造を合わせるために空で定義しておくことも可能
   */
  draw() {
    // このクラスではCanvasに描画しないため、このメソッドは空です。
    // HTML要素の生成と位置更新は別のメソッドで行います。
  }

  /**
   * このアイテムに対応するHTML <img> 要素を作成し、指定されたコンテナに追加する
   * @param {HTMLElement} containerElement <img>要素を追加する親コンテナ
   */
  createElement(containerElement) {
    if (!containerElement) {
      console.error("Item overlay container not provided for Water element.");
      return;
    }
    if (this.element) {
      // すでに要素が存在する場合は何もしない
      console.warn("[Water createElement] Element already exists.");
      return;
    }

    this.element = document.createElement("img");
    this.element.src = WATER_IMAGE_PATH; // 定数から画像パスを設定
    this.element.classList.add("water-item-gif"); // CSSクラスを適用
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;
    this.element.style.position = "absolute";
    this.element.style.left = "-9999px"; // 初期位置は画面外
    this.element.style.top = "-9999px";
    this.element.style.pointerEvents = "none"; // クリック等を透過させる

    containerElement.appendChild(this.element);
    // console.log("[Water] Created and appended <img> element."); // デバッグ用
  }

  /**
   * 保持しているHTML <img> 要素のCSSによる位置を更新する
   * @param {number} canvasWidth Canvasの幅 (左右反転座標計算用)
   */
  updateElementPosition(canvasWidth) {
    // 要素がない、非アクティブ、または幅が不正なら何もしない
    if (!this.element || !this.active || !canvasWidth) return;

    // Canvas座標系(0 ~ canvasWidth)からCSS座標系(left)へ変換 (左右反転考慮)
    const cssLeft = canvasWidth - this.x - this.width;
    // Y座標はCanvas座標系とCSS座標系で（通常）同じ
    const cssTop = this.y;

    this.element.style.left = `${cssLeft}px`;
    this.element.style.top = `${cssTop}px`;
  }

  /**
   * 保持しているHTML <img> 要素をDOMから削除する
   */
  destroyElement() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      // console.log("[Water] Removed <img> element."); // デバッグ用
    }
    this.element = null; // 参照を解除
  }

  /**
   * 指定された顔の矩形との衝突を判定する
   * @param {cv.Rect} faceRect OpenCVの顔検出結果の矩形
   * @returns {boolean} 衝突していれば true
   */
  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;
    // 判定はインスタンスの論理座標 (x, y, width, height) で行う
    const waterRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    return (
      waterRect.x < faceRect.x + faceRect.width &&
      waterRect.x + waterRect.width > faceRect.x &&
      waterRect.y < faceRect.y + faceRect.height &&
      waterRect.y + waterRect.height > faceRect.y
    );
  }
}
