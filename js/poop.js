// js/poop.js

import { POOP_SIZE, POOP_SPEED } from "./constants.js";
import * as ui from "./ui.js"; // ctx を使うため

let poopImage = null;
let isImageLoaded = false;

// 糞の画像を事前にロードしておく関数
export function loadPoopImage(imagePath) {
  return new Promise((resolve, reject) => {
    if (poopImage) {
      // 既にロード試行済みの場合
      if (isImageLoaded) resolve();
      else reject(new Error("Poop image previously failed to load."));
      return;
    }

    poopImage = new Image();
    poopImage.onload = () => {
      console.log("Poop image loaded successfully.");
      isImageLoaded = true;
      resolve();
    };
    poopImage.onerror = () => {
      console.error("Failed to load poop image.");
      poopImage = null; // エラー時はnullに戻す
      isImageLoaded = false;
      reject(new Error("糞画像のロードに失敗しました。"));
    };
    poopImage.src = imagePath;
  });
}

export class Poop {
  constructor(canvasWidth) {
    this.x = Math.random() * (canvasWidth - POOP_SIZE);
    this.y = 0 - POOP_SIZE; // 画面上端の外からスタート
    this.width = POOP_SIZE;
    this.height = POOP_SIZE;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.y += POOP_SPEED;
    // 画面外に出たら非アクティブにする（game.js側で判定しても良い）
    if (this.y > ui.canvas.height) {
      this.active = false;
    }
  }

  draw() {
    if (!this.active) return;

    if (isImageLoaded && poopImage) {
      // 画像がロード成功していれば画像を描画
      ui.ctx.drawImage(poopImage, this.x, this.y, this.width, this.height);
    } else {
      // フォールバックとして円を描画
      ui.ctx.fillStyle = "saddlebrown";
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

    // 糞の矩形 (this.x, this.y は左上の座標)
    const poopRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };

    // AABB (Axis-Aligned Bounding Box) 衝突判定
    return (
      poopRect.x < faceRect.x + faceRect.width &&
      poopRect.x + poopRect.width > faceRect.x &&
      poopRect.y < faceRect.y + faceRect.height &&
      poopRect.y + poopRect.height > faceRect.y
    );
  }
}
