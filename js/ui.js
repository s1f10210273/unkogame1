// js/ui.js

import { GAME_STATE } from "./constants.js";

// --- DOM Elements ---
export const gameContainer = document.querySelector(".container");
export const video = document.getElementById("video");
export const canvas = document.getElementById("canvasOutput");
export const ctx = canvas
  ? canvas.getContext("2d", { willReadFrequently: true })
  : null; // Nullチェック追加
export const messageElement = document.getElementById("message");
export const timerDisplay = document.getElementById("timer");
export const scoreDisplay = document.getElementById("score");
export const startScreen = document.getElementById("startScreen");
export const startInfo = document.getElementById("startInfo");
export const startGameBtn = document.getElementById("startGameBtn");
export const resultScreen = document.getElementById("resultScreen");
export const resultTitle = document.getElementById("resultTitle");
export const finalScore = document.getElementById("finalScore");
export const playAgainButton = document.getElementById("playAgainButton");

// --- UI Update Functions ---

export function showStartInfo(message, isError = false) {
  if (startInfo) {
    console.log(`[UI] Showing start info: "${message}", isError: ${isError}`); // ログ追加
    startInfo.textContent = message;
    startInfo.style.color = isError ? "#ffdddd" : "white";
    startInfo.style.display = "block";
  } else {
    console.error("Start Info element not found");
  }
}

export function showStartButton() {
  if (startGameBtn) {
    console.log("[UI] Showing start button."); // ログ追加
    startGameBtn.disabled = false;
    startGameBtn.style.display = "inline-block";
    // ボタン表示と同時にメッセージを変更
    if (startInfo) startInfo.textContent = "準備完了！";
  } else {
    console.error("Start Game Button not found");
  }
}

export function hideStartButton() {
  if (startGameBtn) {
    console.log("[UI] Hiding start button."); // ログ追加
    startGameBtn.disabled = true;
    startGameBtn.style.display = "none";
  }
}

export function showStartScreen() {
  console.log("[UI] Showing start screen."); // ログ追加
  if (startScreen) startScreen.style.display = "flex";
  hideGameContainer();
  hideResultScreen();
  hideTimerDisplay();
  hideScoreDisplay();
}

export function hideStartScreen() {
  console.log("[UI] Hiding start screen."); // ログ追加
  if (startScreen) startScreen.style.display = "none";
}

export function showGameContainer() {
  console.log("[UI] Showing game container."); // ログ追加
  if (gameContainer) gameContainer.style.display = "block";
  // ゲームコンテナ表示時にインゲームUIを表示状態にする（値は game.js で更新）
  // if (timerDisplay) timerDisplay.style.display = 'block';
  // if (scoreDisplay) scoreDisplay.style.display = 'block';
}

export function hideGameContainer() {
  console.log("[UI] Hiding game container."); // ログ追加
  if (gameContainer) gameContainer.style.display = "none";
}

export function showGameMessage(message) {
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.display = "block";
    console.log(`[UI] Showed game message: "${message}"`); // ログ追加
  }
}

export function hideGameMessage() {
  if (messageElement) messageElement.style.display = "none";
}

export function updateTimerDisplay(time) {
  if (timerDisplay) {
    timerDisplay.textContent = `Time: ${time}`;
    timerDisplay.style.display = "block"; // 表示確認
  }
}
export function hideTimerDisplay() {
  if (timerDisplay) timerDisplay.style.display = "none";
}

export function updateScoreDisplay(score) {
  if (scoreDisplay) {
    scoreDisplay.textContent = `Score: ${score}`;
    scoreDisplay.style.display = "block"; // 表示確認
  }
}
export function hideScoreDisplay() {
  if (scoreDisplay) scoreDisplay.style.display = "none";
}

export function showResultScreen(score, title = "GAME OVER") {
  console.log(`[UI] Showing result screen. Title: ${title}, Score: ${score}`); // ログ追加
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

export function hideResultScreen() {
  if (resultScreen) {
    resultScreen.classList.remove("visible");
    resultScreen.style.display = "none";
  }
}

// ボタン状態更新関数 - 必要に応じて main.js から呼ばれる
export function updateButtonState(gameState) {
  // console.log("[UI] updateButtonState called, but start button state is mainly controlled by OpenCV readiness.");
  // 現状、この関数はあまり役割がないかもしれない
  if (gameState !== GAME_STATE.IDLE && gameState !== GAME_STATE.ERROR) {
    hideStartButton();
  }
  // IDLE/ERROR 時の有効化は handleOpenCvReady 内で行う
}

export function setVideoOpacity(opacity) {
  if (video) video.style.opacity = opacity.toFixed(1);
}
export function resetVideoOpacity() {
  if (video) video.style.opacity = "1.0";
}
export function clearCanvas() {
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}
export function drawFaceRect(rect) {
  if (ctx) {
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
}
