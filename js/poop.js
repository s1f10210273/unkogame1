// js/poop.js

import { POOP_SIZE, POOP_SPEED } from "./constants.js";
import * as ui from "./ui.js";

let poopImage = null;
let isImageLoaded = false;
let imageLoadError = null;

// 糞の画像を事前にロードしておく関数
export function loadPoopImage(imagePath) {
  // console.log(`[Poop] Attempting to load image: ${imagePath}`);
  return new Promise((resolve, reject) => {
    // すでにロード試行済みの場合の処理
    if (poopImage) {
      if (isImageLoaded) {
        resolve();
        return;
      } // 成功済みなら解決
      if (imageLoadError) {
        reject(imageLoadError);
        return;
      } // 失敗済みなら失敗
    }
    // まだ試行していない、または前回の試行が不完全だった場合
    isImageLoaded = false; // 念のためリセット
    imageLoadError = null;

    poopImage = new Image();
    poopImage.onload = () => {
      console.log(`[Poop] Image loaded successfully: ${imagePath}`);
      isImageLoaded = true;
      resolve(); // 読み込み成功
    };
    poopImage.onerror = (err) => {
      const errorMessage = `[Poop] Failed to load image at ${imagePath}`;
      console.error(errorMessage, err);
      poopImage = null;
      isImageLoaded = false;
      imageLoadError = new Error(`糞画像(${imagePath})のロード失敗`);
      reject(imageLoadError); // 読み込み失敗
    };
    poopImage.src = imagePath; // 画像ソースを設定して読み込み開始
  });
}

// 糞アイテムのクラス
export class Poop {
  constructor(canvasWidth) {
    this.x = Math.random() * (canvasWidth - POOP_SIZE);
    this.y = 0 - POOP_SIZE;
    this.width = POOP_SIZE;
    this.height = POOP_SIZE;
    this.speed = POOP_SPEED;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.y += this.speed;
    if (this.y > ui.canvas.height) {
      this.active = false;
    }
  }

  draw() {
    if (!this.active || !ui.ctx) return; // ctx がなければ描画しない

    // 画像が正常に読み込み完了しているかを確認
    const canDrawImage =
      isImageLoaded &&
      poopImage &&
      poopImage.complete &&
      poopImage.naturalWidth !== 0;

    if (canDrawImage) {
      // 画像を描画
      ui.ctx.drawImage(poopImage, this.x, this.y, this.width, this.height);
    } else {
      // フォールバック描画 (画像が使えない場合)
      // if (!isImageLoaded) console.warn("[Poop Draw] Fallback: Image not loaded or ready.");
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

  checkCollisionWithFace(faceRect) {
    if (!this.active || !faceRect) return false;
    const poopRect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    return (
      poopRect.x < faceRect.x + faceRect.width &&
      poopRect.x + poopRect.width > faceRect.x &&
      poopRect.y < faceRect.y + faceRect.height &&
      poopRect.y + poopRect.height > faceRect.y
    );
  }
}
