// js/ui.js

import { GAME_STATE } from "./constants.js";

// --- DOM Elements ---
export const gameContainer = document.querySelector(".container");
export const video = document.getElementById("video");
export const canvas = document.getElementById("canvasOutput");
export const ctx = canvas
  ? canvas.getContext("2d", { willReadFrequently: true })
  : null; // Canvasコンテキスト取得
export const messageElement = document.getElementById("message"); // ゲーム中メッセージ要素
export const timerDisplay = document.getElementById("timer"); // 残り時間表示要素
export const scoreDisplay = document.getElementById("score"); // スコア表示要素
export const startScreen = document.getElementById("startScreen"); // スタート画面要素
export const startInfo = document.getElementById("startInfo"); // スタート画面情報表示要素
export const difficultySelector = document.getElementById("difficultySelector"); // 難易度選択コンテナ
// export const difficultyButtons = document.querySelectorAll('.difficulty-button'); // 個別ボタン参照 (main.jsで処理)
export const resultScreen = document.getElementById("resultScreen"); // リザルト画面要素
export const resultTitle = document.getElementById("resultTitle"); // リザルト画面タイトル
export const finalScore = document.getElementById("finalScore"); // 最終スコア表示
export const playAgainButton = document.getElementById("playAgainButton"); // 再プレイボタン
// Audio要素参照
export const bgmHome = document.getElementById("bgmHome"); // ホームBGM
export const bgm = document.getElementById("bgm"); // ゲーム中BGM
export const bgmFinal = document.getElementById("bgmFinal"); // リザルトBGM
export const sfxPoop = document.getElementById("sfxPoop"); // 効果音（糞）
export const sfxItem = document.getElementById("sfxItem"); // 効果音（アイテム）
// export const itemOverlayContainer = document.getElementById('itemOverlayContainer'); // WaterがCanvas描画に戻ったため不要

// --- UI Update Functions ---

/** スタート画面の情報表示エリアを更新 */
export function showStartInfo(message, isError = false) {
  if (startInfo) {
    console.log(`[UI] Showing start info: "${message}", isError: ${isError}`);
    startInfo.textContent = message;
    startInfo.style.color = isError ? "#ffdddd" : "white"; // エラー時は色変更
    startInfo.style.display = "block";
  } else {
    console.error("Start Info element (#startInfo) not found");
  }
}

/** スタート画面の情報表示エリアを隠す */
export function hideStartInfo() {
  if (startInfo) {
    console.log("[UI] Hiding start info.");
    startInfo.style.display = "none";
  }
}

/** スタート画面の難易度選択を表示 */
export function showDifficultySelector() {
  if (difficultySelector) {
    console.log("[UI] Showing difficulty selector.");
    difficultySelector.style.display = "flex"; // flexで表示
  } else {
    console.error(
      "Difficulty Selector element (#difficultySelector) not found"
    );
  }
  // 難易度選択表示時にメッセージを変更
  // if (startInfo) { startInfo.textContent = '難易度を選択してください'; } // メッセージは main.js で制御
}

/** スタート画面の難易度選択を隠す */
export function hideDifficultySelector() {
  if (difficultySelector) {
    console.log("[UI] Hiding difficulty selector.");
    difficultySelector.style.display = "none";
  }
}

/** スタート画面全体を表示 */
export function showStartScreen() {
  console.log("[UI] Showing start screen.");
  if (startScreen) startScreen.style.display = "flex"; // flexで表示
  hideGameContainer(); // ゲーム画面は隠す
  hideResultScreen(); // リザルト画面も隠す
  hideTimerDisplay(); // タイマーも隠す
  hideScoreDisplay(); // スコアも隠す
  hideDifficultySelector(); // 難易度選択も最初は隠す
}

/** スタート画面全体を隠す */
export function hideStartScreen() {
  console.log("[UI] Hiding start screen.");
  if (startScreen) startScreen.style.display = "none";
}

/** ゲームコンテナを表示 */
export function showGameContainer() {
  console.log("[UI] Showing game container.");
  if (gameContainer) gameContainer.style.display = "block"; // または grid など元々の display
}

/** ゲームコンテナを隠す */
export function hideGameContainer() {
  console.log("[UI] Hiding game container.");
  if (gameContainer) gameContainer.style.display = "none";
}

/** ゲーム中メッセージ（カウントダウン、GAME OVERなど）を表示 */
export function showGameMessage(message) {
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.display = "block";
    console.log(`[UI] Showed game message: "${message}"`);
  } else {
    console.error("Message element (#message) not found.");
  }
}

/** ゲーム中メッセージを隠す */
export function hideGameMessage() {
  if (messageElement) messageElement.style.display = "none";
}

/** タイマー表示を更新 */
export function updateTimerDisplay(time) {
  if (timerDisplay) {
    timerDisplay.textContent = `Time: ${time}`;
    timerDisplay.style.display = "block"; // 必要なら表示
  } else {
    console.error("Timer display element (#timer) not found.");
  }
}

/** タイマー表示を隠す */
export function hideTimerDisplay() {
  if (timerDisplay) timerDisplay.style.display = "none";
}

/** スコア表示を更新 */
export function updateScoreDisplay(score) {
  if (scoreDisplay) {
    console.log(
      `[UI updateScoreDisplay] Called with score: ${score}. Updating textContent.`
    ); // スコア確認ログ
    scoreDisplay.textContent = `Score: ${score}`;
    scoreDisplay.style.display = "block"; // 必要なら表示
  } else {
    console.error("Score display element (#score) not found.");
  }
}

/** スコア表示を隠す */
export function hideScoreDisplay() {
  if (scoreDisplay) scoreDisplay.style.display = "none";
}

/** リザルト画面を表示 */
export function showResultScreen(score, title = "GAME OVER") {
  console.log(`[UI] Showing result screen. Title: ${title}, Score: ${score}`);
  if (finalScore) finalScore.textContent = score;
  if (resultTitle) resultTitle.textContent = title;
  if (resultScreen) {
    resultScreen.style.display = "flex"; // 表示タイプをflexに
    // フェードインのために少し遅延させてクラスを追加
    setTimeout(() => {
      resultScreen.classList.add("visible");
    }, 10);
  } else {
    console.error("Result screen element (#resultScreen) not found.");
  }
  // リザルト表示時に他のゲーム中UIを隠す
  hideGameMessage();
  hideTimerDisplay();
  hideScoreDisplay();
}

/** リザルト画面を隠す */
export function hideResultScreen() {
  if (resultScreen) {
    resultScreen.classList.remove("visible");
    resultScreen.style.display = "none";
  }
}

/** ボタン状態更新（現在は実質的に未使用） */
export function updateButtonState(gameState) {
  // スタート画面の難易度ボタンの有効/無効は、主に main.js の OpenCV 準備完了チェックで制御される
  // console.log("[UI] updateButtonState called - Currently not directly controlling button states.");
}

/** video要素の透明度を設定 */
export function setVideoOpacity(opacity) {
  if (video) video.style.opacity = opacity.toFixed(1);
}

/** video要素の透明度をリセット */
export function resetVideoOpacity() {
  if (video) video.style.opacity = "1.0";
}

/** Canvasをクリア */
export function clearCanvas() {
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/**
 * 顔の矩形を角カッコスタイルで描画する
 * @param {cv.Rect} rect - OpenCVの顔検出結果の矩形
 */
export function drawFaceRect(rect) {
  if (!ctx || !rect) return; // Context または Rect がなければ何もしない

  const x = rect.x;
  const y = rect.y;
  const width = rect.width;
  const height = rect.height;

  // スタイルの設定
  const bracketLength = Math.min(width, height) * 0.2; // 角カッコの辺の長さ
  const lineWidth = 4; // 線の太さ
  const strokeStyle = "cyan"; // 線の色

  // 描画処理
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  // 左上角
  ctx.moveTo(x, y + bracketLength);
  ctx.lineTo(x, y);
  ctx.lineTo(x + bracketLength, y);

  // 右上角
  ctx.moveTo(x + width - bracketLength, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + bracketLength);

  // 左下角
  ctx.moveTo(x, y + height - bracketLength);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + bracketLength, y + height);

  // 右下角
  ctx.moveTo(x + width - bracketLength, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - bracketLength);

  // 線を描画
  ctx.stroke();
}
