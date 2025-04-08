// js/camera.js

import * as ui from "./ui.js";

let stream = null;

/**
 * Webカメラを起動し、video要素にストリームを設定する
 * @returns {Promise<MediaStream>} 成功した場合はMediaStream
 * @throws {Error} カメラアクセス失敗や非対応ブラウザの場合
 */
export async function startCamera() {
  console.log("[Camera] Attempting to start camera...");
  if (stream) {
    console.warn("[Camera] Camera already started.");
    return stream; // Return existing stream if already running
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("[Camera] getUserMedia is not supported");
    throw new Error("カメラアクセス非対応ブラウザです。");
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    console.log("[Camera] Got user media stream.");
    if (ui.video) {
      ui.video.srcObject = stream;
      // メタデータがロードされるのを待つPromise
      await new Promise((resolve, reject) => {
        ui.video.onloadedmetadata = () => {
          console.log("[Camera] Video metadata loaded.");
          if (ui.canvas) {
            // Set canvas resolution based on video
            ui.canvas.width = ui.video.videoWidth;
            ui.canvas.height = ui.video.videoHeight;
            console.log(
              `[Camera] Canvas resolution set to: ${ui.canvas.width}x${ui.canvas.height}`
            );
          }
          resolve(stream);
        };
        ui.video.onerror = (e) => {
          console.error("[Camera] Video element error:", e);
          reject(new Error("ビデオ要素のエラー発生。"));
        };
      });
      console.log("[Camera] Camera started successfully.");
      return stream;
    } else {
      throw new Error("Video element not found.");
    }
  } catch (err) {
    console.error("[Camera] Error accessing camera:", err);
    stopCamera(); // Clean up if error occurs
    // Provide more specific error messages
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      throw new Error(
        "カメラへのアクセスが拒否されました。設定を確認してください。"
      );
    } else if (
      err.name === "NotFoundError" ||
      err.name === "DevicesNotFoundError"
    ) {
      throw new Error("利用可能なカメラが見つかりませんでした。");
    } else {
      throw new Error(`カメラアクセス失敗: ${err.message || err.name}`);
    }
  }
}

/**
 * Webカメラのストリームを停止する
 */
export function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    console.log("[Camera] Camera stream stopped.");
  }
  if (ui.video && ui.video.srcObject) {
    ui.video.srcObject = null;
  }
  stream = null;
}

/**
 * 現在のカメラストリームを取得する (主にデバッグ用)
 * @returns {MediaStream | null}
 */
export function getStream() {
  return stream;
}
