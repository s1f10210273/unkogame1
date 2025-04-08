// js/opencvUtils.js

import { FACE_CASCADE_PATH, FACE_CASCADE_FILE } from "./constants.js";
import * as ui from "./ui.js"; // 必要に応じて

let cvReady = false;
let cascadeReady = false;
let faceCascade = null;
let src = null;
let gray = null;
let faces = null;
let cap = null;

// --- Initialization and Loading ---

/**
 * OpenCV.js ランタイムの準備完了を待ち、完了したら解決する Promise を返す
 * @returns {Promise<void>}
 */
export function setCvReady() {
  // ★★★ Promise を返すように修正 ★★★
  return new Promise((resolve, reject) => {
    // cv オブジェクトが存在しない場合はエラー
    if (!window.cv) {
      console.error("cv object not found on window during setCvReady.");
      return reject(new Error("OpenCV object (cv) not found on window."));
    }
    // 既に準備完了している場合はすぐに解決
    if (cvReady) {
      console.log("OpenCV runtime was already ready.");
      return resolve();
    }

    // タイムアウト処理 (例: 15秒)
    const timeout = 15000;
    const timeoutId = setTimeout(() => {
      // isCvReady() を使って二重チェック (既に解決済みの可能性もあるため)
      if (!isCvReady()) {
        console.error(
          `OpenCV runtime initialization timed out after ${timeout}ms.`
        );
        reject(
          new Error(
            `OpenCV runtime initialization timed out after ${timeout}ms`
          )
        );
      }
    }, timeout);

    // onRuntimeInitialized コールバックを設定
    cv["onRuntimeInitialized"] = () => {
      clearTimeout(timeoutId); // タイムアウトをクリア
      if (!cvReady) {
        // まだ準備完了フラグが立っていなければ
        cvReady = true;
        console.log("OpenCV runtime initialized (via onRuntimeInitialized).");
        resolve(); // Promise を解決 (成功)
      } else {
        console.log(
          "onRuntimeInitialized called, but cvReady was already true."
        );
        // すでに resolve されているはずなので何もしないか、念のため resolve()
        resolve();
      }
    };
    console.log("cv.onRuntimeInitialized listener set.");

    // まれにリスナー設定前に初期化が完了しているケースのフォールバック
    // (確実ではないが、ないよりはマシ)
    if (cv.runtimeInitialized && !cvReady) {
      console.warn(
        "OpenCV runtime might have initialized before listener was set."
      );
      clearTimeout(timeoutId);
      cvReady = true;
      resolve();
    }
  });
}

/** OpenCV.js が利用可能かチェック */
export function isCvReady() {
  return cvReady;
}
/** 顔検出モデルがロード済みかチェック */
export function isCascadeReady() {
  return cascadeReady;
}

/** 顔検出用のカスケード分類器をロード */
export async function loadFaceCascade() {
  if (!cvReady) throw new Error("OpenCV is not ready yet.");
  if (cascadeReady) {
    console.log("Face cascade already loaded.");
    return;
  }
  try {
    faceCascade = new cv.CascadeClassifier();
    const modelUrl = new URL(FACE_CASCADE_PATH, window.location.href).href;
    console.log(`Attempting to load cascade file from URL: ${modelUrl}`);
    await createFileFromUrl(FACE_CASCADE_FILE, modelUrl); // FSに書き込み
    if (!faceCascade.load(FACE_CASCADE_FILE)) {
      // FSからロード
      throw new Error(
        `Error loading face cascade from OpenCV FS path /${FACE_CASCADE_FILE}.`
      );
    }
    console.log("Face cascade loaded successfully.");
    cascadeReady = true;
  } catch (err) {
    console.error("Error loading face cascade:", err);
    cascadeReady = false;
    if (faceCascade && !faceCascade.isDeleted()) faceCascade.delete();
    faceCascade = null;
    throw new Error(
      `カスケードファイル (${FACE_CASCADE_PATH}) のロード失敗。 ${err.message}`
    );
  }
}

/** OpenCV 処理に必要な Mat オブジェクトと VideoCapture を初期化 */
export function initializeCvObjects() {
  if (!cvReady) throw new Error("OpenCV not ready for object initialization.");
  if (!ui.video || !ui.video.videoWidth || !ui.video.videoHeight)
    throw new Error("Video element or dimensions not available.");
  cleanupCvResources(false); // 既存リソース解放 (カスケード除く)
  src = new cv.Mat(ui.video.videoHeight, ui.video.videoWidth, cv.CV_8UC4);
  gray = new cv.Mat(ui.video.videoHeight, ui.video.videoWidth, cv.CV_8UC1);
  faces = new cv.RectVector();
  try {
    cap = new cv.VideoCapture(ui.video); // video要素からキャプチャ
    console.log("OpenCV Mat objects and VideoCapture initialized.");
  } catch (err) {
    console.error("Failed to initialize VideoCapture:", err);
    cleanupCvResources(false); // エラー時は作成したMatも消す
    throw new Error(
      "VideoCapture の初期化に失敗しました。カメラを確認してください。"
    );
  }
}

/** 現在のビデオフレームから顔を検出 */
export function detectFaces() {
  if (
    !cvReady ||
    !cascadeReady ||
    !cap ||
    !src ||
    !gray ||
    !faces ||
    src.isDeleted() ||
    gray.isDeleted() ||
    faces.isDeleted()
  ) {
    console.warn(
      "OpenCV objects not ready or deleted, skipping face detection."
    );
    return null;
  }
  try {
    cap.read(src);
    if (src.empty()) {
      console.warn("Source Mat is empty in detectFaces.");
      return null;
    }
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(gray, gray);
    let scaleFactor = 1.1;
    let minNeighbors = 5;
    let minSize = new cv.Size(50, 50);
    faceCascade.detectMultiScale(
      gray,
      faces,
      scaleFactor,
      minNeighbors,
      0,
      minSize
    );
    return faces;
  } catch (err) {
    console.error("Error during OpenCV face detection:", err);
    return null;
  }
}

/** OpenCV関連リソースを解放 */
export function cleanupCvResources(clearCascade = true) {
  console.log("Cleaning up OpenCV resources...");
  if (cap) {
    cap = null;
    console.log("VideoCapture reference removed.");
  } // JS参照を切る
  if (src && !src.isDeleted()) {
    src.delete();
    src = null;
    console.log("src Mat deleted.");
  }
  if (gray && !gray.isDeleted()) {
    gray.delete();
    gray = null;
    console.log("gray Mat deleted.");
  }
  if (faces && !faces.isDeleted()) {
    faces.delete();
    faces = null;
    console.log("faces RectVector deleted.");
  }
  if (clearCascade) {
    if (faceCascade && !faceCascade.isDeleted()) {
      faceCascade.delete();
      console.log("Face cascade classifier deleted.");
    }
    faceCascade = null;
    cascadeReady = false;
  }
  console.log("OpenCV resource cleanup finished.");
}

/** URLからファイルをフェッチし、OpenCVのメモリFSに書き込む */
async function createFileFromUrl(pathInFS, url) {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    const data = await response.arrayBuffer();
    const dataView = new Uint8Array(data);
    cv.FS_createDataFile("/", pathInFS, dataView, true, false, false);
    console.log(`File loaded into OpenCV FS as /${pathInFS}.`);
  } catch (error) {
    console.error(`Error creating file /${pathInFS} from URL ${url}:`, error);
    throw error;
  }
}
