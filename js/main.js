// js/main.js

import * as ui from "./ui.js";
import * as game from "./game.js";
import * as cvUtils from "./opencvUtils.js";
import { GAME_STATE } from "./constants.js";

// --- Global Event Handlers ---
// (cvUtils.js の setCvReady が Promise を返すように修正されている前提)
window.handleOpenCvReady = () => {
  console.log("handleOpenCvReady called - OpenCV script loaded.");
  if (!window.cv) {
    console.error("OpenCV object (cv) not found on window even after onload.");
    ui.showLoadingMessage("OpenCV.js の初期化に失敗しました [Code 1]。", true);
    if (
      game.getCurrentGameState() !== GAME_STATE.PLAYING &&
      game.getCurrentGameState() !== GAME_STATE.COUNTDOWN
    ) {
      game.setGameState(GAME_STATE.ERROR);
      ui.updateButtonState(game.getCurrentGameState());
    }
    return;
  }
  cvUtils
    .setCvReady() // Assuming setCvReady returns a Promise now
    .then(() => {
      console.log("OpenCV Runtime is confirmed ready.");
      if (
        game.getCurrentGameState() === GAME_STATE.IDLE ||
        game.getCurrentGameState() === GAME_STATE.ERROR
      ) {
        ui.showLoadingMessage("準備完了。スタートボタンを押してください。");
        game.setGameState(GAME_STATE.IDLE);
        ui.updateButtonState(game.getCurrentGameState());
      }
    })
    .catch((err) => {
      console.error("OpenCV runtime initialization failed:", err);
      ui.showLoadingMessage("OpenCV ランタイムの初期化に失敗しました。", true);
      if (
        game.getCurrentGameState() !== GAME_STATE.PLAYING &&
        game.getCurrentGameState() !== GAME_STATE.COUNTDOWN
      ) {
        game.setGameState(GAME_STATE.ERROR);
        ui.updateButtonState(game.getCurrentGameState());
      }
    });
};

window.handleOpenCvError = () => {
  console.error("handleOpenCvError called - Failed to load OpenCV.js script.");
  ui.showLoadingMessage(
    "OpenCV.js のロードに失敗しました。ネットワーク接続を確認してください。",
    true
  );
  if (
    game.getCurrentGameState() !== GAME_STATE.PLAYING &&
    game.getCurrentGameState() !== GAME_STATE.COUNTDOWN
  ) {
    game.setGameState(GAME_STATE.ERROR);
    ui.updateButtonState(game.getCurrentGameState());
  }
};

// --- Event Listeners ---
ui.startButton.addEventListener("click", () => {
  if (!cvUtils.isCvReady()) {
    console.warn("Start button clicked, but OpenCV runtime not ready yet.");
    ui.showLoadingMessage("まだ準備中です。少しお待ちください...", true);
    return;
  }
  console.log("Start button clicked");
  game.initializeGame().catch((err) => {
    console.error("Error during game initialization:", err);
    if (game.getCurrentGameState() !== GAME_STATE.PLAYING) {
      ui.showLoadingMessage(`ゲーム開始エラー: ${err.message}`, true);
      game.setGameState(GAME_STATE.ERROR);
      ui.updateButtonState(game.getCurrentGameState());
    }
  });
});

// Reset button event listener removed

// --- Initial Setup ---
function initializeApp() {
  console.log("Initializing application...");
  game.setGameState(GAME_STATE.IDLE);
  ui.updateButtonState(game.getCurrentGameState());
  if (typeof cv === "undefined") {
    ui.showLoadingMessage("OpenCV.js をロード中...");
    ui.startButton.disabled = true;
  } else {
    ui.showLoadingMessage("OpenCV ランタイム準備中...");
    ui.startButton.disabled = true;
  }
  ui.hideTimerDisplay();
  ui.hideScoreDisplay();
}

initializeApp();
