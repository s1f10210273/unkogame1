// js/opencvUtils.js

import { FACE_CASCADE_PATH, FACE_CASCADE_FILE } from "./constants.js";
import * as ui from "./ui.js";

let cvReady = false;
let cascadeReady = false;
let faceCascade = null;
let src = null;
let gray = null;
let faces = null;
let cap = null; // VideoCaptureオブジェクト

// --- Initialization and Loading ---

/**
 * OpenCV.js ランタイムの準備完了フラグを立てる
 */
export function setCvReady() {
  if (!window.cv) {
    console.error("cv is not defined on window.");
    return false;
  }
  cv["onRuntimeInitialized"] = () => {
    cvReady = true;
    console.log("OpenCV runtime initialized.");
    // 必要であれば、ここでロード完了を game.js などに通知する
  };
  // onRuntimeInitialized が呼ばれる前に true にしない
  // cvReady = true; // ここではまだ true にしない
  return true; // 初期化リスナーの設定は成功
}

/**
 * OpenCV.js が利用可能かチェックする
 * @returns {boolean}
 */
export function isCvReady() {
  return cvReady;
}

/**
 * 顔検出モデルがロード済みかチェックする
 * @returns {boolean}
 */
export function isCascadeReady() {
  return cascadeReady;
}

/**
 * 顔検出用のカスケード分類器をロードする
 */
export async function loadFaceCascade() {
  if (!cvReady) {
    throw new Error("OpenCV is not ready yet.");
  }
  if (cascadeReady) {
    console.log("Face cascade already loaded.");
    return;
  }

  try {
    faceCascade = new cv.CascadeClassifier();
    const modelUrl = new URL(FACE_CASCADE_PATH, window.location.href).href;
    console.log(`Attempting to load cascade file from URL: ${modelUrl}`);

    await createFileFromUrl(FACE_CASCADE_FILE, modelUrl);

    if (!faceCascade.load(FACE_CASCADE_FILE)) {
      throw new Error(
        `Error loading face cascade from OpenCV FS path /${FACE_CASCADE_FILE}.`
      );
    }

    console.log("Face cascade loaded successfully.");
    cascadeReady = true;
  } catch (err) {
    console.error("Error loading face cascade:", err);
    cascadeReady = false; // 失敗したらフラグを戻す
    if (faceCascade && !faceCascade.isDeleted()) faceCascade.delete(); // 念のため解放
    faceCascade = null;
    throw new Error(
      `カスケードファイル (${FACE_CASCADE_PATH}) のロード失敗。 ${err.message}`
    );
  }
}

// --- OpenCV Object Management ---

/**
 * OpenCV 処理に必要な Mat オブジェクトと VideoCapture を初期化する
 */
export function initializeCvObjects() {
  if (!cvReady) throw new Error("OpenCV not ready for object initialization.");
  if (!ui.video.videoWidth || !ui.video.videoHeight)
    throw new Error("Video dimensions not available.");

  // 既存のオブジェクトがあれば解放
  cleanupCvResources(false); // cascadeは消さない

  src = new cv.Mat(ui.video.videoHeight, ui.video.videoWidth, cv.CV_8UC4);
  gray = new cv.Mat(ui.video.videoHeight, ui.video.videoWidth, cv.CV_8UC1);
  faces = new cv.RectVector();
  cap = new cv.VideoCapture(ui.video);
  console.log("OpenCV Mat objects and VideoCapture initialized.");
}

// --- Face Detection ---

/**
 * 現在のビデオフレームから顔を検出する
 * @returns {cv.RectVector | null} 検出された顔の矩形リスト、またはエラー時は null
 */
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
    cap.read(src); // video要素からフレームを読み込み src に格納
    if (src.empty()) {
      console.warn("Source Mat is empty.");
      return null; // 空のフレームなら何もしない
    }

    // グレースケール変換とヒストグラム平坦化
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(gray, gray); // 明暗差を強調

    // 顔検出の実行
    let scaleFactor = 1.1; // 画像スケール
    let minNeighbors = 5; // 近傍矩形の最小数
    let minSize = new cv.Size(50, 50); // 検出する顔の最小サイズ

    // faces.delete(); // 前回の結果をクリア? - RectVectorはclearメソッドがないので再利用
    // faces = new cv.RectVector(); // 毎回作り直すか？ -> detectMultiScaleが内部でクリアしてくれるはず

    faceCascade.detectMultiScale(
      gray,
      faces,
      scaleFactor,
      minNeighbors,
      0,
      minSize
    );

    return faces; // 検出結果を返す
  } catch (err) {
    console.error("Error during OpenCV face detection:", err);
    // エラー発生時はnullを返すか、例外を再スローする
    return null;
  }
}

// --- Cleanup ---

/**
 * OpenCV関連のリソース（Matオブジェクト、VideoCapture）を解放する
 * @param {boolean} clearCascade - カスケード分類器も解放するかどうか
 */
export function cleanupCvResources(clearCascade = true) {
  console.log("Cleaning up OpenCV resources...");
  if (cap) {
    // VideoCaptureの明示的な停止/解放メソッドは見当たらない
    cap = null; // JavaScript側の参照を切る
    console.log("VideoCapture reference removed.");
  }
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
    cascadeReady = false; // カスケードもクリアしたら準備完了フラグも倒す
  }
  console.log("OpenCV resource cleanup finished.");
}

// --- Utility ---

/**
 * URLからファイルをフェッチし、OpenCVのメモリファイルシステムに書き込むヘルパー関数
 * @param {string} pathInFS - OpenCV FS内でのファイル名
 * @param {string} url - ファイルのURL
 */
async function createFileFromUrl(pathInFS, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404)
        console.error(`File not found at ${url}. Check path.`);
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    const data = await response.arrayBuffer();
    const dataView = new Uint8Array(data);
    cv.FS_createDataFile("/", pathInFS, dataView, true, false, false); // ルートに作成
    console.log(`File loaded into OpenCV FS as /${pathInFS}.`);
  } catch (error) {
    console.error(`Error creating file /${pathInFS} from URL ${url}:`, error);
    throw error; // エラーを呼び出し元に伝える
  }
}
