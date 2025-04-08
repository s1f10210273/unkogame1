// js/ui.js

import { GAME_STATE } from "./constants.js";

// --- DOM Elements ---
export const gameContainer = document.querySelector(".container");
export const video = document.getElementById("video");
export const canvas = document.getElementById("canvasOutput");
export const ctx = canvas
  ? canvas.getContext("2d", { willReadFrequently: true })
  : null;
export const messageElement = document.getElementById("message");
export const timerDisplay = document.getElementById("timer");
export const scoreDisplay = document.getElementById("score");
export const startScreen = document.getElementById("startScreen");
export const startInfo = document.getElementById("startInfo");
export const difficultySelector = document.getElementById("difficultySelector");
export const resultScreen = document.getElementById("resultScreen");
export const resultTitle = document.getElementById("resultTitle");
export const finalScore = document.getElementById("finalScore");
export const playAgainButton = document.getElementById("playAgainButton");
// export const bgm = document.getElementById('bgm'); // BGM削除済み
export const sfxPoop = document.getElementById("sfxPoop");
export const sfxItem = document.getElementById("sfxItem");
// export const itemOverlayContainer = document.getElementById('itemOverlayContainer'); // ★★★ Overlay参照削除 ★★★
export const bgmHome = document.getElementById("bgmHome"); // ホームBGM参照のみ残す (将来使う可能性)

// --- UI Update Functions ---

// スタート画面の情報表示を更新
export function showStartInfo(message, isError = false) {
  if (startInfo) {
    console.log(`[UI] Showing start info: "${message}", isError: ${isError}`);
    startInfo.textContent = message;
    startInfo.style.color = isError ? "#ffdddd" : "white";
    startInfo.style.display = "block";
  } else {
    console.error("Start Info element not found");
  }
}

// スタート画面の情報表示を隠す
export function hideStartInfo() {
  if (startInfo) {
    console.log("[UI] Hiding start info.");
    startInfo.style.display = "none";
  }
}

// スタート画面の難易度選択を表示
export function showDifficultySelector() {
  if (difficultySelector) {
    console.log("[UI] Showing difficulty selector.");
    difficultySelector.style.display = "flex"; // 表示
  } else {
    console.error("Difficulty Selector element not found");
  }
  if (startInfo) {
    startInfo.textContent = "難易度を選択してください"; // メッセージ変更
  }
}

// スタート画面の難易度選択を隠す
export function hideDifficultySelector() {
  if (difficultySelector) {
    console.log("[UI] Hiding difficulty selector.");
    difficultySelector.style.display = "none"; // 非表示
  }
}

// スタート画面全体を表示
export function showStartScreen() {
  console.log("[UI] Showing start screen.");
  if (startScreen) startScreen.style.display = "flex";
  hideGameContainer();
  hideResultScreen();
  hideTimerDisplay();
  hideScoreDisplay();
  hideDifficultySelector(); // 最初は難易度選択も隠す
}

// スタート画面全体を隠す
export function hideStartScreen() {
  console.log("[UI] Hiding start screen.");
  if (startScreen) startScreen.style.display = "none";
}

// ゲームコンテナを表示
export function showGameContainer() {
  console.log("[UI] Showing game container.");
  if (gameContainer) gameContainer.style.display = "block";
}

// ゲームコンテナを隠す
export function hideGameContainer() {
  console.log("[UI] Hiding game container.");
  if (gameContainer) gameContainer.style.display = "none";
}

// --- In-Game & Result UI Functions ---
// ゲーム中メッセージ表示
export function showGameMessage(message) {
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.display = "block";
    console.log(`[UI] Showed game message: "${message}"`);
  }
}
// ゲーム中メッセージ非表示
export function hideGameMessage() {
  if (messageElement) messageElement.style.display = "none";
}
// タイマー表示更新
export function updateTimerDisplay(time) {
  if (timerDisplay) {
    timerDisplay.textContent = `Time: ${time}`;
    timerDisplay.style.display = "block";
  }
}
// タイマー非表示
export function hideTimerDisplay() {
  if (timerDisplay) timerDisplay.style.display = "none";
}
// スコア表示更新
export function updateScoreDisplay(score) {
  if (scoreDisplay) {
    scoreDisplay.textContent = `Score: ${score}`;
    scoreDisplay.style.display = "block";
  }
}
// スコア非表示
export function hideScoreDisplay() {
  if (scoreDisplay) scoreDisplay.style.display = "none";
}
// リザルト画面表示
export function showResultScreen(score, title = "GAME OVER") {
  console.log(`[UI] Showing result screen. Title: ${title}, Score: ${score}`);
  if (finalScore) finalScore.textContent = score;
  if (resultTitle) resultTitle.textContent = title;
  if (resultScreen) {
    resultScreen.style.display = "flex";
    setTimeout(() => {
      resultScreen.classList.add("visible");
    }, 10);
  }
  hideGameMessage();
  hideTimerDisplay();
  hideScoreDisplay();
}
// リザルト画面非表示
export function hideResultScreen() {
  if (resultScreen) {
    resultScreen.classList.remove("visible");
    resultScreen.style.display = "none";
  }
}

// ボタン状態更新関数 (役割縮小)
export function updateButtonState(gameState) {
  // 難易度選択ボタンの制御は OpenCV準備完了時に main.js で行うため、ここでは何もしないことが多い
  // console.log("[UI] updateButtonState called - No action needed for difficulty buttons here.");
  if (gameState !== GAME_STATE.IDLE && gameState !== GAME_STATE.ERROR) {
    // hideDifficultySelector(); // ゲーム開始後などに隠す場合
  }
}

// --- Other UI Helpers ---
// video要素の透明度を設定
export function setVideoOpacity(opacity) {
  if (video) video.style.opacity = opacity.toFixed(1);
}
// video要素の透明度をリセット
export function resetVideoOpacity() {
  if (video) video.style.opacity = "1.0";
}
// Canvasをクリア
export function clearCanvas() {
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}
// 顔の矩形を描画
export function drawFaceRect(rect) {
  if (ctx) {
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
}
