// js/opencvUtils.js

import { CASCADE_PATH, CASCADE_FILE } from "./constants.js"; // 正しい定数名を参照
import * as ui from "./ui.js";

let cvReady = false;
let cascadeReady = false;
let faceCascade = null; // 顔検出用
let src = null; // ソースMat
let gray = null; // グレースケールMat
let faces = null; // 検出結果格納用
let cap = null; // VideoCaptureオブジェクト

// --- Initialization and Loading ---

/**
 * OpenCV.js ランタイムの準備完了を待ち、完了したら解決する Promise を返す
 * @returns {Promise<void>}
 */
export function setCvReady() {
  // (変更なし - Promiseを返す実装)
  return new Promise((resolve, reject) => {
    if (!window.cv) {
      console.error("cv object not found on window during setCvReady.");
      return reject(new Error("OpenCV object (cv) not found on window."));
    }
    if (cvReady) {
      console.log("OpenCV runtime was already ready.");
      return resolve();
    }
    const timeout = 15000;
    const timeoutId = setTimeout(() => {
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
    cv["onRuntimeInitialized"] = () => {
      clearTimeout(timeoutId);
      if (!cvReady) {
        cvReady = true;
        console.log("OpenCV runtime initialized (via onRuntimeInitialized).");
        resolve();
      } else {
        resolve();
      }
    };
    console.log("cv.onRuntimeInitialized listener set.");
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

/** OpenCV.js が利用可能か */
export function isCvReady() {
  return cvReady;
}
/** カスケード分類器がロード済みか */
export function isCascadeReady() {
  return cascadeReady;
}

/**
 * カスケード分類器 (顔検出用) をロードする
 */
export async function loadFaceCascade() {
  if (!cvReady) throw new Error("OpenCV is not ready.");
  if (cascadeReady) {
    console.log("Face cascade already loaded.");
    return;
  }
  try {
    faceCascade = new cv.CascadeClassifier();
    const modelUrl = new URL(CASCADE_PATH, window.location.href).href; // CASCADE_PATH 使用
    console.log(`Attempting to load cascade file: ${modelUrl}`);
    await createFileFromUrl(CASCADE_FILE, modelUrl); // CASCADE_FILE 使用
    if (!faceCascade.load(CASCADE_FILE)) {
      // CASCADE_FILE 使用
      throw new Error(
        `Error loading cascade from FS path /${CASCADE_FILE}. Check file exists.`
      );
    }
    console.log("Face cascade loaded successfully:", CASCADE_FILE);
    cascadeReady = true;
  } catch (err) {
    console.error("Error loading face cascade:", err);
    cascadeReady = false;
    if (faceCascade && !faceCascade.isDeleted()) faceCascade.delete();
    faceCascade = null;
    throw new Error(
      `カスケードファイル (${CASCADE_PATH}) のロード失敗。 ${err.message}`
    );
  }
}

/** OpenCV処理用オブジェクト初期化 */
export function initializeCvObjects() {
  if (!cvReady) throw new Error("OpenCV not ready.");
  if (!ui.video || !(ui.video.videoWidth > 0) || !(ui.video.videoHeight > 0)) {
    throw new Error("Video element/dimensions not ready.");
  }
  cleanupCvResources(false); // 既存リソース解放 (カスケード除く)
  src = new cv.Mat(ui.video.videoHeight, ui.video.videoWidth, cv.CV_8UC4);
  gray = new cv.Mat(ui.video.videoHeight, ui.video.videoWidth, cv.CV_8UC1);
  faces = new cv.RectVector(); // 検出結果格納用
  try {
    cap = new cv.VideoCapture(ui.video); // video要素からキャプチャ
    console.log("OpenCV Mat objects and VideoCapture initialized.");
  } catch (err) {
    console.error("Failed to initialize VideoCapture:", err);
    cleanupCvResources(false); // エラー時は作成したMatも解放
    throw new Error("VideoCapture の初期化失敗");
  }
}

/**
 * 現在のフレームから顔を検出する
 * @returns {cv.RectVector | null} 検出された顔の矩形リスト
 */
export function detectFaces() {
  if (
    !cvReady ||
    !cascadeReady ||
    !cap ||
    !src ||
    !gray ||
    !faces ||
    !faceCascade ||
    src.isDeleted() ||
    gray.isDeleted() ||
    faces.isDeleted() ||
    faceCascade.isDeleted()
  ) {
    console.warn(
      "OpenCV objects/cascade not ready or deleted, skipping face detection."
    );
    return null;
  }
  let clahe = null; // ★★★ CLAHEオブジェクト用変数を宣言 ★★★
  try {
    cap.read(src);
    if (src.empty()) {
      console.warn("Source Mat is empty.");
      return null;
    }
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // --- ★★★ equalizeHist の代わりに CLAHE を使用 ★★★ ---
    // cv.equalizeHist(gray, gray); // ← これを削除またはコメントアウト

    // CLAHE オブジェクトを作成
    // clipLimit: コントラスト制限値 (値が大きいほどコントラストが強くなるがノイズも増える。2.0-4.0程度が一般的)
    // tileGridSize: 画像を分割するタイルのグリッドサイズ。例: 8x8
    const clipLimit = 2.0; // ★ 調整可能パラメータ (例: 2.0)
    const tileGridSize = new cv.Size(8, 8); // ★ 調整可能パラメータ (例: 8x8)
    clahe = new cv.CLAHE(clipLimit, tileGridSize);

    // グレースケール画像にCLAHEを適用 (結果は gray に上書き)
    clahe.apply(gray, gray);
    console.log("[detectFaces] Applied CLAHE instead of equalizeHist."); // ログ追加

    let scaleFactor = 1.2; // ★★★ 変更: 1.05/1.1 -> 1.2 (高速化) ★★★
    // minNeighbors: 誤検出を減らすため少し上げることを推奨。速度への影響は小さい。
    let minNeighbors = 3; // ★★★ 変更: 2/3 -> 4 (安定性向上) ★★★
    let flags = 0;
    // minSize: これより小さい顔は無視。大きくすると速くなるが、小さい顔は検出不可。
    let minSize = new cv.Size(70, 70); // ★★★ 維持 (または 60,60 や 80,80 を試す) ★★★
    let maxSize = new cv.Size(0, 0);
    // --- ここまでCLAHE処理 ---
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      const platform = navigator.userAgentData.platform.toLowerCase();
      if (platform.includes("mac")) {
        scaleFactor = 1.04;
        minNeighbors = 2;
        flags = 0;
        minSize = new cv.Size(70, 70);
        maxSize = new cv.Size(0, 0);
      }
    }

    // detectMultiScale パラメータ (顔検出用 - 前回調整済み)
    // let scaleFactor = 1.04;
    // let minNeighbors = 2;
    // let flags = 0;
    // let minSize = new cv.Size(70, 70);
    // let maxSize = new cv.Size(0, 0);

    // console.log(`[detectFaces] Params - scaleFactor: ${scaleFactor}, minNeighbors: ${minNeighbors}, minSize: ${minSize.width}x${minSize.height}`);

    // 検出実行
    faceCascade.detectMultiScale(
      gray,
      faces,
      scaleFactor,
      minNeighbors,
      flags,
      minSize,
      maxSize
    );

    return faces;
  } catch (err) {
    console.error("Error during OpenCV face detection:", err);
    return null;
  } finally {
    // ★★★ finallyブロックでCLAHEオブジェクトを解放 ★★★
    if (clahe && !clahe.isDeleted()) {
      clahe.delete();
      // console.log("CLAHE object deleted."); // 必要ならログ有効化
    }
  }
}

/**
 * OpenCV関連リソース（Mat, VideoCapture, Cascade）を解放する
 * @param {boolean} clearCascade - カスケード分類器も解放するかどうか
 */
export function cleanupCvResources(clearCascade = true) {
  console.log("Cleaning up OpenCV resources...");
  // VideoCapture の参照を切る (JS側のみ)
  if (cap) {
    cap = null;
    console.log("VideoCapture reference removed.");
  }
  // Mat オブジェクトを解放
  if (src && !src.isDeleted()) {
    src.delete();
    src = null; /* console.log("src Mat deleted."); */
  } // ログ抑制
  if (gray && !gray.isDeleted()) {
    gray.delete();
    gray = null; /* console.log("gray Mat deleted."); */
  } // ログ抑制
  if (faces && !faces.isDeleted()) {
    faces.delete();
    faces = null; /* console.log("faces RectVector deleted."); */
  } // ログ抑制

  // カスケード分類器も解放する場合
  if (clearCascade) {
    if (faceCascade && !faceCascade.isDeleted()) {
      faceCascade.delete();
      console.log("Face cascade classifier deleted.");
    }
    faceCascade = null;
    cascadeReady = false; // 準備完了フラグも倒す
  }
  console.log("OpenCV resource cleanup finished.");
}

/**
 * URLからファイルをフェッチし、OpenCVのメモリファイルシステムに書き込む
 * @param {string} pathInFS - OpenCV FS内でのファイル名
 * @param {string} url - ファイルのURL
 */
async function createFileFromUrl(pathInFS, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.error(`File not found at ${url}. Check path.`);
      }
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    const data = await response.arrayBuffer();
    const dataView = new Uint8Array(data);
    // メモリファイルシステムにファイルを作成
    cv.FS_createDataFile("/", pathInFS, dataView, true, false, false);
    console.log(`File loaded into OpenCV FS as /${pathInFS}.`);
  } catch (error) {
    console.error(`Error creating file /${pathInFS} from URL ${url}:`, error);
    throw error; // エラーを呼び出し元に伝える
  }
}
