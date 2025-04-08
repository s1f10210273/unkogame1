// js/opencvUtils.js

import { FACE_CASCADE_PATH, FACE_CASCADE_FILE } from "./constants.js";
import * as ui from "./ui.js"; // For ui.video access

let cvReady = false;
let cascadeReady = false;
let faceCascade = null;
let src = null;
let gray = null;
let faces = null;
let cap = null; // VideoCapture object

// --- Initialization and Loading ---

/**
 * OpenCV.js ランタイムの準備完了を待ち、完了したら解決する Promise を返す
 * @returns {Promise<void>}
 */
export function setCvReady() {
  return new Promise((resolve, reject) => {
    if (!window.cv) {
      console.error("cv object not found on window during setCvReady.");
      return reject(new Error("OpenCV object (cv) not found."));
    }
    if (cvReady) {
      console.log("OpenCV runtime was already ready.");
      return resolve();
    }

    const timeout = 15000; // 15 second timeout
    const timeoutId = setTimeout(() => {
      if (!isCvReady()) {
        console.error(
          `OpenCV runtime initialization timed out after ${timeout}ms.`
        );
        reject(new Error(`OpenCV runtime init timed out`));
      }
    }, timeout);

    cv["onRuntimeInitialized"] = () => {
      clearTimeout(timeoutId);
      if (!cvReady) {
        cvReady = true;
        console.log("OpenCV runtime initialized (via onRuntimeInitialized).");
        resolve();
      } else {
        resolve(); /* Already resolved */
      }
    };
    console.log("cv.onRuntimeInitialized listener set.");

    // Fallback check (less reliable)
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
  console.log("[OpenCV Utils] Loading face cascade...");
  try {
    faceCascade = new cv.CascadeClassifier();
    const modelUrl = new URL(FACE_CASCADE_PATH, window.location.href).href;
    console.log(
      `[OpenCV Utils] Attempting to load cascade from URL: ${modelUrl}`
    );
    await createFileFromUrl(FACE_CASCADE_FILE, modelUrl); // Write to FS
    console.log("[OpenCV Utils] Cascade file written to FS.");
    if (!faceCascade.load(FACE_CASCADE_FILE)) {
      // Load from FS
      throw new Error(
        `Error loading cascade from FS path /${FACE_CASCADE_FILE}.`
      );
    }
    console.log(
      "[OpenCV Utils] Face cascade loaded successfully into classifier."
    );
    cascadeReady = true;
  } catch (err) {
    console.error("[OpenCV Utils] Error loading face cascade:", err);
    cascadeReady = false;
    if (faceCascade && !faceCascade.isDeleted()) faceCascade.delete();
    faceCascade = null;
    // Rethrow a more user-friendly or specific error if needed
    throw new Error(
      `カスケードファイル(${FACE_CASCADE_PATH})読込エラー: ${err.message}`
    );
  }
}

/** OpenCV 処理に必要な Mat オブジェクトと VideoCapture を初期化 */
export function initializeCvObjects() {
  console.log("[OpenCV Utils] Initializing Mat objects and VideoCapture...");
  if (!cvReady) throw new Error("OpenCV not ready for object initialization.");
  // Ensure video element and its dimensions are ready
  if (
    !ui.video ||
    ui.video.readyState < 3 ||
    !ui.video.videoWidth ||
    !ui.video.videoHeight
  ) {
    // readyState < 3 means not enough data
    throw new Error(
      "Video element not ready or dimensions not available for OpenCV initialization."
    );
  }
  cleanupCvResources(false); // Clean up previous Mats if any (keep cascade)
  try {
    src = new cv.Mat(ui.video.videoHeight, ui.video.videoWidth, cv.CV_8UC4);
    gray = new cv.Mat(ui.video.videoHeight, ui.video.videoWidth, cv.CV_8UC1);
    faces = new cv.RectVector();
    cap = new cv.VideoCapture(ui.video); // Init VideoCapture from video element
    console.log(
      "[OpenCV Utils] Mat objects and VideoCapture initialized successfully."
    );
  } catch (err) {
    console.error(
      "[OpenCV Utils] Failed to initialize VideoCapture or Mats:",
      err
    );
    cleanupCvResources(false); // Clean up any partially created Mats
    throw new Error("OpenCV オブジェクトの初期化に失敗。");
  }
}

/** 現在のビデオフレームから顔を検出 */
export function detectFaces() {
  // Check if everything is ready and not deleted
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
    // console.warn("[OpenCV Utils] Skipping face detection: Objects not ready or deleted."); // Can be noisy
    return null;
  }
  try {
    cap.read(src); // Read frame from video element into src Mat
    if (src.empty()) {
      // console.warn("[OpenCV Utils] detectFaces: Source Mat is empty."); // Can happen briefly
      return null;
    }
    // Convert to grayscale and equalize histogram
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(gray, gray);

    // Detect faces
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

    return faces; // Return the RectVector of detected faces
  } catch (err) {
    console.error("[OpenCV Utils] Error during face detection:", err);
    // Attempt to recover or signal error state? For now, return null.
    return null;
  }
}

/** OpenCV関連リソースを解放 */
export function cleanupCvResources(clearCascade = true) {
  console.log("[OpenCV Utils] Cleaning up OpenCV resources...");
  // Release VideoCapture (by nulling reference - no explicit release method)
  if (cap) {
    cap = null;
    console.log("VideoCapture reference removed.");
  }
  // Delete Mats
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

  // Optionally delete the cascade classifier
  if (clearCascade) {
    if (faceCascade && !faceCascade.isDeleted()) {
      faceCascade.delete();
      console.log("Face cascade classifier deleted.");
    }
    faceCascade = null;
    cascadeReady = false; // Reset ready flag if cascade is cleared
  }
  console.log("[OpenCV Utils] OpenCV resource cleanup finished.");
}

/** URLからファイルをフェッチし、OpenCVのメモリFSに書き込む */
async function createFileFromUrl(pathInFS, url) {
  console.log(`[OpenCV Utils] Fetching ${url} for FS path /${pathInFS}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for ${url}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.arrayBuffer();
    console.log(`[OpenCV Utils] Fetched ${data.byteLength} bytes.`);
    const dataView = new Uint8Array(data);
    cv.FS_createDataFile("/", pathInFS, dataView, true, false, false); // Write to root '/'
    console.log(`[OpenCV Utils] File written to OpenCV FS as /${pathInFS}.`);
  } catch (error) {
    console.error(
      `[OpenCV Utils] Error creating file /${pathInFS} from URL ${url}:`,
      error
    );
    throw error; // Re-throw the error to be caught by the caller
  }
}
