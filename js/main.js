// js/main.js

import * as ui from "./ui.js";
import * as game from "./game.js";
import * as cvUtils from "./opencvUtils.js";
import { GAME_STATE } from "./constants.js";

// --- Global Event Handlers ---
window.handleOpenCvReady = () => {
  console.log("handleOpenCvReady called - OpenCV script loaded.");
  if (!window.cv) {
    /* ... エラー処理 ... */ return;
  }
  // Assuming setCvReady is modified to return a Promise
  cvUtils
    .setCvReady()
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
      /* ... エラー処理 ... */
    });
};
window.handleOpenCvError = () => {
  /* ... エラー処理 ... */
};

// --- Event Listeners ---
ui.startButton.addEventListener("click", () => {
  if (!cvUtils.isCvReady()) {
    /* ... 準備中メッセージ ... */ return;
  }
  console.log("Start button clicked");
  game.initializeGame().catch((err) => {
    /* ... 開始エラー処理 ... */
  });
});

// ★★★ 追加: 「もう一度プレイ」ボタンのイベントリスナー ★★★
ui.playAgainButton.addEventListener("click", () => {
  console.log("Play Again button clicked. Reloading page...");
  // ページをリロードしてゲームを最初からにする
  location.reload();
});

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
  // 初期状態ではインゲームUIとリザルト画面を隠す
  ui.hideTimerDisplay();
  ui.hideScoreDisplay();
  ui.hideResultScreen(); // ★★★ 初期状態でリザルト画面も隠す ★★★
}

initializeApp();
