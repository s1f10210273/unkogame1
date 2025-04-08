// js/item.js

import { APPLE_SIZE, APPLE_SPEED } from "./constants.js";
import * as ui from "./ui.js"; // ctx を使うため

let appleImage = null;
let isImageLoaded = false;

// りんごの画像を事前にロードしておく関数
export function loadAppleImage(imagePath) {
  return new Promise((resolve, reject) => {
    if (appleImage) {
      // 既にロード試行済みの場合
      if (isImageLoaded) resolve();
      else reject(new Error("Apple image previously failed to load."));
      return;
    }
    appleImage = new Image();
    appleImage.onload = () => {
      console.log("Apple image loaded successfully.");
      isImageLoaded = true;
      resolve();
    };
    appleImage.onerror = () => {
      console.error("Failed to load apple image.");
      appleImage = null; // エラー時はnullに戻す
      isImageLoaded = false;
      reject(new Error("りんご画像のロードに失敗しました。"));
    };
    appleImage.src = imagePath;
  });
}

export class Apple {
  constructor(canvasWidth) {
    this.x = Math.random() * (canvasWidth - APPLE_SIZE);
    this.y = 0 - APPLE_SIZE; // 画面上端の外からスタート
    this.width = APPLE_SIZE;
    this.height = APPLE_SIZE;
    this.speed = APPLE_SPEED; // 速度を設定
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.y += this.speed;
    // 画面外に出たら非アクティブにする
    if (this.y > ui.canvas.height) {
      this.active = false;
    }
  }

  draw() {
    if (!this.active) return;

    if (isImageLoaded && appleImage) {
      // 画像がロード成功していれば画像を描画
      ui.ctx.drawImage(appleImage, this.x, this.y, this.width, this.height);
    } else {
      // フォールバックとして緑色の円を描画
      ui.ctx.fillStyle = "limegreen";
      ui.ctx.beginPath();
      // 中心座標で描画
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
   * 指定された顔の矩形との衝突を判定する
   * @param {cv.Rect} faceRect - OpenCVの顔検出結果の矩形
   * @returns {boolean} 衝突していれば true
   */
  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;

    // りんごの矩形 (this.x, this.y は左上の座標)
    const appleRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };

    // AABB (Axis-Aligned Bounding Box) 衝突判定
    return (
      appleRect.x < faceRect.x + faceRect.width &&
      appleRect.x + appleRect.width > faceRect.x &&
      appleRect.y < faceRect.y + faceRect.height &&
      appleRect.y + appleRect.height > faceRect.y
    );
  }
}
