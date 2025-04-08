// js/ui.js

import { GAME_STATE } from "./constants.js";

// --- DOM Elements ---
export const video = document.getElementById("video");
export const canvas = document.getElementById("canvasOutput");
export const ctx = canvas.getContext("2d", { willReadFrequently: true });
export const messageElement = document.getElementById("message");
export const loadingMessage = document.getElementById("loading-message");
export const startButton = document.getElementById("startButton");
export const timerDisplay = document.getElementById("timer");
export const scoreDisplay = document.getElementById("score");
// ★★★ 追加: リザルト画面の要素 ★★★
export const resultScreen = document.getElementById("resultScreen");
export const resultTitle = document.getElementById("resultTitle");
export const finalScore = document.getElementById("finalScore");
export const playAgainButton = document.getElementById("playAgainButton");

// --- UI Update Functions ---
export function showLoadingMessage(message, isError = false) {
  loadingMessage.textContent = message;
  loadingMessage.style.color = isError ? "red" : "#555";
  loadingMessage.style.display = "block";
  messageElement.style.display = "none";
  timerDisplay.style.display = "none";
  scoreDisplay.style.display = "none";
  hideResultScreen(); // ★★★ ローディング中はリザルト画面も隠す ★★★
}

export function hideLoadingMessage() {
  loadingMessage.style.display = "none";
}

export function showGameMessage(message) {
  messageElement.textContent = message;
  messageElement.style.display = "block";
  hideLoadingMessage();
}

export function hideGameMessage() {
  messageElement.style.display = "none";
}

export function updateTimerDisplay(time) {
  timerDisplay.textContent = `Time: ${time}`;
  timerDisplay.style.display = "block"; // ゲーム中は表示
}

export function hideTimerDisplay() {
  timerDisplay.style.display = "none"; // 非表示にする
}

export function updateScoreDisplay(score) {
  scoreDisplay.textContent = `Score: ${score}`;
  scoreDisplay.style.display = "block"; // ゲーム中は表示
}

export function hideScoreDisplay() {
  scoreDisplay.style.display = "none"; // 非表示にする
}

// ★★★ 追加: リザルト画面を表示する関数 ★★★
export function showResultScreen(score, title = "GAME OVER") {
  finalScore.textContent = score; // 最終スコアを設定
  resultTitle.textContent = title; // タイトルを設定

  // ゲーム中のUIを隠す
  hideGameMessage();
  hideTimerDisplay();
  hideScoreDisplay();

  // リザルト画面を表示（フェードインのためにクラスを追加）
  resultScreen.style.display = "flex"; // まず表示領域を確保
  // 少し遅延させてからクラスを追加してCSSトランジションを発動
  setTimeout(() => {
    resultScreen.classList.add("visible");
  }, 10); // 10ミリ秒の遅延
}

// ★★★ 追加: リザルト画面を隠す関数 ★★★
export function hideResultScreen() {
  resultScreen.classList.remove("visible"); // フェードアウト用クラス削除
  // トランジション完了後に display: none にする場合 (より丁寧)
  // setTimeout(() => {
  //     if (!resultScreen.classList.contains('visible')) { // まだ非表示指示のままなら
  //          resultScreen.style.display = 'none';
  //     }
  // }, 500); // CSSの transition 時間に合わせる (0.5s)
  // 今回は表示しっぱなしで reload するので display:none は不要
  resultScreen.style.display = "none"; // 即時非表示でも可
}

// ボタン状態更新関数
export function updateButtonState(gameState) {
  switch (gameState) {
    case GAME_STATE.IDLE:
    case GAME_STATE.ERROR:
      startButton.disabled = false;
      break;
    case GAME_STATE.INITIALIZING:
    case GAME_STATE.LOADING_CASCADE:
    case GAME_STATE.STARTING_CAMERA:
    case GAME_STATE.COUNTDOWN:
    case GAME_STATE.PLAYING:
    case GAME_STATE.GAMEOVER:
      startButton.disabled = true;
      break;
    default:
      startButton.disabled = true;
  }
}

// video要素の透明度を設定
export function setVideoOpacity(opacity) {
  video.style.opacity = opacity.toFixed(1);
}

// video要素の透明度をリセット
export function resetVideoOpacity() {
  video.style.opacity = "1.0";
}

// Canvasをクリア
export function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 顔の矩形を描画
export function drawFaceRect(rect) {
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 3;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}
