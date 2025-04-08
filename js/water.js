// js/water.js

// ★★★ constants から個別にインポートしていることを確認 ★★★
import {
  WATER_SIZE,
  WATER_SPEED,
  WATER_IMAGE_PATH,
  WATER_COLLISION_INSET,
} from "./constants.js";
import * as ui from "./ui.js"; // ui.itemOverlayContainer, ui.canvas を参照するため

// --- Module-level variables for image state ---
let waterImage = null; // Imageオブジェクト（主にプリロード確認用）
let isImageLoaded = false; // 画像が読み込み成功したか
let imageLoadError = null; // 読み込みエラー情報

/**
 * 水の画像(GIF)を事前にロードしておく関数 (Promiseを返す)
 * @param {string} imagePath 画像ファイルのパス
 * @returns {Promise<void>} 読み込み完了時に解決されるPromise
 */
export function loadWaterImage(imagePath) {
  // console.log(`[Water] Preloading GIF: ${imagePath}`); // デバッグ用ログ
  return new Promise((resolve, reject) => {
    // すでにロード試行済みの場合の処理
    if (waterImage) {
      if (isImageLoaded) {
        resolve();
        return;
      } // 成功済みなら解決
      if (imageLoadError) {
        reject(imageLoadError);
        return;
      } // 失敗済みなら失敗
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
   * @param {number} canvasLogicalWidth Canvasの論理的な幅 (初期位置計算用)
   */
  constructor(canvasLogicalWidth) {
    this.x = Math.random() * (canvasLogicalWidth - WATER_SIZE); // 論理X座標
    this.y = 0 - WATER_SIZE; // 論理Y座標
    this.width = WATER_SIZE; // 幅 (ピクセル)
    this.height = WATER_SIZE; // 高さ (ピクセル)
    this.speed = WATER_SPEED; // 落下速度
    this.active = true; // アクティブ状態
    this.element = null; // 対応するHTML <img> 要素
  }

  /**
   * アイテムの位置を更新し、画面外判定を行う
   */
  update() {
    if (!this.active) return; // 非アクティブなら何もしない

    this.y += this.speed; // Y座標を更新 (下に移動)

    // 画面外判定: アイテムの下端が表示領域(オーバーレイコンテナ)の下端を超えたか？
    const containerHeight = ui.itemOverlayContainer
      ? ui.itemOverlayContainer.clientHeight
      : 0;
    const itemBottomY = this.y + this.height;

    // デバッグログ (必要に応じてコメント解除)
    // console.log(`[Water Update] y: ${this.y.toFixed(1)}, height: ${this.height}, bottomY: ${itemBottomY.toFixed(1)}, containerHeight: ${containerHeight}`);

    // 判定実行 (コンテナの高さが有効な場合のみ)
    if (containerHeight > 0 && itemBottomY > containerHeight) {
      console.log(
        `%c[Water Update] Deactivating water (bottom edge passed). bottomY: ${itemBottomY.toFixed(
          1
        )}, containerHeight: ${containerHeight}`,
        "color: orange; font-weight: bold;"
      );
      this.active = false; // アイテムを非アクティブにする
      this.destroyElement(); // 対応するDOM要素を削除する
    }
    // else if (containerHeight <= 0) { // コンテナ高さが0の場合の警告(必要なら)
    //     console.warn("[Water Update] Container height is 0 for boundary check.");
    // }
  }

  /**
   * Canvasへの描画メソッド (Waterクラスでは使用しない)
   */
  draw() {
    // このクラスはHTML要素で表示するため、Canvasには描画しない
  }

  /**
   * このアイテムに対応するHTML <img> 要素を作成し、指定されたコンテナに追加する
   * @param {HTMLElement} containerElement <img>要素を追加する親コンテナ
   */
  createElement(containerElement) {
    console.log("[Water createElement] Attempting to create element...");
    if (!containerElement) {
      console.error(
        "[Water createElement] FAILED: Item overlay container not provided."
      );
      this.active = false;
      return;
    }
    if (this.element) {
      console.warn("[Water createElement] SKIPPED: Element already exists.");
      return;
    }
    try {
      const imgElement = document.createElement("img");
      console.log("[Water createElement] Created img tag:", imgElement);
      imgElement.src = WATER_IMAGE_PATH;
      imgElement.classList.add("water-item-gif");
      imgElement.style.width = `${this.width}px`;
      imgElement.style.height = `${this.height}px`;
      imgElement.style.position = "absolute";
      imgElement.style.left = "-9999px";
      imgElement.style.top = "-9999px";
      imgElement.style.pointerEvents = "none";
      console.log("[Water createElement] Assigning element to this.element...");
      this.element = imgElement;
      console.log("[Water createElement] this.element assigned:", this.element);
      console.log(
        "[Water createElement] Appending element to container:",
        containerElement
      );
      containerElement.appendChild(this.element);
      console.log("[Water createElement] SUCCESS: Element should be appended.");
      if (!this.element || !this.element.parentNode) {
        throw new Error(
          "Element not properly assigned or appended after operations."
        );
      }
    } catch (error) {
      console.error(
        "[Water createElement] FAILED during element creation/append:",
        error
      );
      this.element = null;
      this.active = false;
    }
  }

  /**
   * 保持しているHTML <img> 要素のCSS位置を更新する
   */
  updateElementPosition() {
    if (
      !this.element ||
      !this.active ||
      !ui.itemOverlayContainer ||
      !ui.canvas
    ) {
      return;
    }
    const containerWidth = ui.itemOverlayContainer.clientWidth;
    const canvasLogicalWidth = ui.canvas.width;
    if (containerWidth <= 0 || canvasLogicalWidth <= 0) {
      return;
    }
    const scaledX = this.x * (containerWidth / canvasLogicalWidth);
    const cssLeft = containerWidth - scaledX - this.width;
    const cssTop = this.y;
    // console.log(`[Water updateElementPosition] Setting style - top: ${cssTop.toFixed(1)}px, left: ${cssLeft.toFixed(1)}px`);
    try {
      this.element.style.left = `${cssLeft}px`;
      this.element.style.top = `${cssTop}px`;
    } catch (e) {
      console.error("[Water updateElementPosition] Error setting style:", e);
      this.active = false;
      this.destroyElement();
    }
  }

  /**
   * 保持しているHTML <img> 要素をDOMから削除する
   */
  destroyElement() {
    if (this.element && this.element.parentNode) {
      console.log(
        "[Water destroyElement] Removing <img> element:",
        this.element
      );
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null; // 参照解除
  }

  /**
   * 顔矩形との衝突判定 (論理座標で行う)
   * @param {cv.Rect} faceRect - 顔の矩形 (論理座標)
   * @returns {boolean}
   */
  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;

    // --- 当たり判定用の矩形を計算 ---
    // ★★★ 修正: constants. ではなく、直接インポートした変数名を使う ★★★
    const inset = WATER_COLLISION_INSET; // 直接アクセス
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
    const visualWaterRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    console.log(
      `[Water checkCollision] Visual Rect : x=${visualWaterRect.x.toFixed(
        1
      )}, y=${visualWaterRect.y.toFixed(1)}, w=${visualWaterRect.width}, h=${
        visualWaterRect.height
      }`
    );
    console.log(
      `%c[Water checkCollision] Collision Rect: x=${collisionWaterRect.x.toFixed(
        1
      )}, y=${collisionWaterRect.y.toFixed(1)}, w=${
        collisionWaterRect.width
      }, h=${collisionWaterRect.height} (Inset: ${inset})`,
      "color: blue"
    );
    console.log(
      `[Water checkCollision] Face Rect   : x=${faceRect.x}, y=${faceRect.y}, w=${faceRect.width}, h=${faceRect.height}`
    );
    // --- ログここまで ---

    // 縮小された当たり判定用矩形 (collisionWaterRect) と顔の矩形 (faceRect) で判定
    const overlaps =
      collisionWaterRect.x < faceRect.x + faceRect.width &&
      collisionWaterRect.x + collisionWaterRect.width > faceRect.x &&
      collisionWaterRect.y < faceRect.y + faceRect.height &&
      collisionWaterRect.y + collisionWaterRect.height > faceRect.y;
    // console.log(`[Water checkCollision] Overlap result: ${overlaps}`);

    return overlaps; // 判定結果を返す
  }
}
