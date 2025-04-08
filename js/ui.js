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
export const bgm = document.getElementById("bgm"); // ★★★ 追加: Audio要素への参照 ★★★
export const sfxPoop = document.getElementById("sfxPoop");
export const sfxItem = document.getElementById("sfxItem");
export const itemOverlayContainer = document.getElementById(
  "itemOverlayContainer"
); // ★★★ 追加 ★★★

// --- UI Update Functions ---
export function showStartInfo(message, isError = false) {
  if (startInfo) {
    console.log(`[UI] Show start info: "${message}", Err:${isError}`);
    startInfo.textContent = message;
    startInfo.style.color = isError ? "#ffdddd" : "white";
    startInfo.style.display = "block";
  } else {
    console.error("Start Info element not found");
  }
}
export function hideStartInfo() {
  if (startInfo) {
    console.log("[UI] Hide start info.");
    startInfo.style.display = "none";
  }
}
export function showDifficultySelector() {
  if (difficultySelector) {
    console.log("[UI] Show difficulty selector.");
    difficultySelector.style.display = "flex";
  } else {
    console.error("Difficulty Selector element not found");
  }
  if (startInfo) {
    startInfo.textContent = "難易度を選択してください";
  }
}
export function hideDifficultySelector() {
  if (difficultySelector) {
    console.log("[UI] Hide difficulty selector.");
    difficultySelector.style.display = "none";
  }
}
export function showStartScreen() {
  console.log("[UI] Show start screen.");
  if (startScreen) startScreen.style.display = "flex";
  hideGameContainer();
  hideResultScreen();
  hideTimerDisplay();
  hideScoreDisplay();
  hideDifficultySelector();
}
export function hideStartScreen() {
  console.log("[UI] Hide start screen.");
  if (startScreen) startScreen.style.display = "none";
}
export function showGameContainer() {
  console.log("[UI] Show game container.");
  if (gameContainer) gameContainer.style.display = "block";
}
export function hideGameContainer() {
  console.log("[UI] Hide game container.");
  if (gameContainer) gameContainer.style.display = "none";
}
export function showGameMessage(message) {
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.display = "block";
    console.log(`[UI] Showed game message: "${message}"`);
  }
}
export function hideGameMessage() {
  if (messageElement) messageElement.style.display = "none";
}
export function updateTimerDisplay(time) {
  if (timerDisplay) {
    timerDisplay.textContent = `Time: ${time}`;
    timerDisplay.style.display = "block";
  }
}
export function hideTimerDisplay() {
  if (timerDisplay) timerDisplay.style.display = "none";
}
export function updateScoreDisplay(score) {
  if (scoreDisplay) {
    scoreDisplay.textContent = `Score: ${score}`;
    scoreDisplay.style.display = "block";
  }
}
export function hideScoreDisplay() {
  if (scoreDisplay) scoreDisplay.style.display = "none";
}
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
export function hideResultScreen() {
  if (resultScreen) {
    resultScreen.classList.remove("visible");
    resultScreen.style.display = "none";
  }
}
export function updateButtonState(gameState) {
  /* No longer controls buttons directly */
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
