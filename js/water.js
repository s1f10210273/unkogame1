// js/water.js

import { WATER_SIZE, WATER_SPEED } from './constants.js';
import * as ui from './ui.js'; // ctx を使うため

let waterImage = null;
let isImageLoaded = false;

// 水の画像を事前にロードしておく関数
export function loadWaterImage(imagePath) {
    return new Promise((resolve, reject) => {
        if (waterImage) { // 既にロード試行済みの場合
           if (isImageLoaded) resolve();
           else reject(new Error("Water image previously failed to load."));
           return;
        }

        waterImage = new Image();
        waterImage.onload = () => {
            console.log("Water image loaded successfully.");
            isImageLoaded = true;
            resolve();
        };
        waterImage.onerror = () => {
            console.error("Failed to load water image.");
            waterImage = null; // エラー時はnullに戻す
            isImageLoaded = false;
            reject(new Error('水画像のロードに失敗しました。'));
        };
        waterImage.src = imagePath;
    });
}

// 水アイテムのクラス
export class Water {
    constructor(canvasWidth) {
        this.x = Math.random() * (canvasWidth - WATER_SIZE);
        this.y = 0 - WATER_SIZE; // 画面上端の外からスタート
        this.width = WATER_SIZE;
        this.height = WATER_SIZE;
        this.speed = WATER_SPEED;
        this.active = true; // アイテムが有効か（画面内にあるか、ヒット前か）
    }

    // 位置を更新するメソッド
    update() {
        if (!this.active) return; // 非アクティブなら何もしない
        this.y += this.speed;
        // 画面外に出たら非アクティブにする
        if (this.y > ui.canvas.height) {
            this.active = false;
        }
    }

    // Canvasに描画するメソッド
    draw() {
        if (!this.active) return; // 非アクティブなら描画しない

        if (isImageLoaded && waterImage) {
             // 画像がロード成功していれば画像を描画
            ui.ctx.drawImage(waterImage, this.x, this.y, this.width, this.height);
        } else {
            // フォールバックとして水色の円を描画
            ui.ctx.fillStyle = 'aqua';
            ui.ctx.beginPath();
            ui.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
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

        // 水アイテムの矩形
        const waterRect = { x: this.x, y: this.y, width: this.width, height: this.height };

        // AABB 衝突判定
        return (
            waterRect.x < faceRect.x + faceRect.width &&
            waterRect.x + waterRect.width > faceRect.x &&
            waterRect.y < faceRect.y + faceRect.height &&
            waterRect.y + waterRect.height > faceRect.y
        );
    }
}