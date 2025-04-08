// js/ui.js

import { GAME_STATE } from "./constants.js";

// --- DOM Elements ---
export const video = document.getElementById("video");
export const canvas = document.getElementById("canvasOutput");
export const ctx = canvas.getContext("2d", { willReadFrequently: true });
export const messageElement = document.getElementById("message");
export const loadingMessage = document.getElementById("loading-message");
export const startButton = document.getElementById("startButton");
// resetButton reference removed
export const timerDisplay = document.getElementById("timer");
export const scoreDisplay = document.getElementById("score");

// --- UI Update Functions ---
export function showLoadingMessage(message, isError = false) {
  loadingMessage.textContent = message;
  loadingMessage.style.color = isError ? "red" : "#555";
  loadingMessage.style.display = "block";
  messageElement.style.display = "none";
  timerDisplay.style.display = "none";
  scoreDisplay.style.display = "none";
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
  timerDisplay.style.display = "block";
}

export function hideTimerDisplay() {
  timerDisplay.textContent = "";
  timerDisplay.style.display = "none";
}

export function updateScoreDisplay(score) {
  scoreDisplay.textContent = `Score: ${score}`;
  scoreDisplay.style.display = "block";
}

export function hideScoreDisplay() {
  scoreDisplay.textContent = "";
  scoreDisplay.style.display = "none";
}

// Updated button state function (resetButton logic removed)
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
    case GAME_STATE.GAMEOVER: // Keep start disabled after game over
      startButton.disabled = true;
      break;
    default:
      startButton.disabled = true;
  }
}

export function setVideoOpacity(opacity) {
  video.style.opacity = opacity.toFixed(1);
}

export function resetVideoOpacity() {
  video.style.opacity = "1.0";
}

export function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawFaceRect(rect) {
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 3;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}
