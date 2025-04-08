// js/camera.js

import * as ui from "./ui.js";

let stream = null;

/**
 * Webカメラを起動し、video要素にストリームを設定する
 * @returns {Promise<MediaStream>} 成功した場合はMediaStream、失敗した場合はnull
 */
export async function startCamera() {
  if (stream) {
    console.warn("Camera already started.");
    return stream; // 既に起動していればそのストリームを返す
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("getUserMedia is not supported");
    throw new Error("カメラアクセス非対応ブラウザです。");
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    ui.video.srcObject = stream;

    // メタデータがロードされるのを待つPromise
    await new Promise((resolve, reject) => {
      ui.video.onloadedmetadata = () => {
        console.log("Video metadata loaded");
        ui.canvas.width = ui.video.videoWidth;
        ui.canvas.height = ui.video.videoHeight;
        resolve(stream);
      };
      ui.video.onerror = (e) => {
        console.error("Video error:", e);
        reject(new Error("ビデオエラー発生。"));
      };
    });
    console.log("Camera started successfully.");
    return stream;
  } catch (err) {
    console.error("Error accessing camera:", err);
    stopCamera(); // エラー時は念のためクリーンアップ
    throw new Error(`カメラアクセス失敗: ${err.message}.`);
  }
}

/**
 * Webカメラのストリームを停止する
 */
export function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    console.log("Camera stream stopped.");
  }
  if (ui.video.srcObject) {
    ui.video.srcObject = null;
  }
  stream = null;
}

/**
 * 現在のカメラストリームを取得する
 * @returns {MediaStream | null}
 */
export function getStream() {
  return stream;
}
