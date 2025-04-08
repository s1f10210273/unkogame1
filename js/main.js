// js/main.js

import * as ui from "./ui.js";
import * as game from "./game.js";
import * as cvUtils from "./opencvUtils.js";
import { GAME_STATE } from "./constants.js";

// --- Global Event Handlers ---
window.handleOpenCvReady = () => {
  console.log("handleOpenCvReady called - OpenCV script loaded.");
  if (!window.cv) {
    console.error("OpenCV object (cv) not found on window even after onload.");
    ui.showStartInfo("OpenCV初期化エラー[C1]", true);
    return;
  }
  // OpenCV ランタイムの準備を待つ (Promise)
  ui.showStartInfo("OpenCV ランタイム準備中..."); // 準備中メッセージ更新
  cvUtils
    .setCvReady()
    .then(() => {
      console.log("OpenCV Runtime is confirmed ready via Promise.");
      // ランタイム準備完了、スタートボタン表示
      ui.showStartButton();
    })
    .catch((err) => {
      console.error("OpenCV runtime initialization failed:", err);
      ui.showStartInfo(
        "OpenCV初期化に失敗しました。リロードしてください。",
        true
      );
      ui.hideStartButton();
    });
};

window.handleOpenCvError = () => {
  console.error("handleOpenCvError called - Failed to load OpenCV.js script.");
  ui.showStartInfo(
    "OpenCVのロードに失敗しました。接続を確認しリロードしてください。",
    true
  );
  ui.hideStartButton();
};

// --- Event Listeners ---

// ゲーム開始ボタンのクリックイベント
if (ui.startGameBtn) {
  // ボタン要素の存在を確認してからリスナーを設定
  ui.startGameBtn.addEventListener("click", () => {
    console.log("Start Game button clicked");
    // ボタンを無効化し、メッセージを変更
    ui.hideStartButton();
    ui.showStartInfo("ゲームを準備中...");

    // 非同期でゲーム初期化を開始
    game
      .initializeGame()
      .then(() => {
        // 成功した場合 (カウントダウンが開始される)
        console.log("Game initialization successful from main.js perspective.");
        // 画面遷移は initializeGame の最後 or startCountdown で行われる
        // ここではスタート画面を確実に隠す
        ui.hideStartScreen();
        ui.showGameContainer(); // ゲームコンテナを表示
      })
      .catch((err) => {
        // initializeGame でエラーが発生した場合
        console.error("Error during game initialization:", err);
        // スタート画面に戻してエラー表示
        ui.showStartScreen(); // スタート画面を再表示
        ui.hideGameContainer(); // ゲーム画面は隠す
        ui.showStartInfo(
          `ゲーム開始エラー: ${err.message} リロードしてください。`,
          true
        );
        // ボタンは隠れたまま
      });
  });
} else {
  console.error(
    "Start Game Button (#startGameBtn) not found in the DOM during initialization."
  );
}

// 「もう一度プレイ」ボタンのクリックイベント
if (ui.playAgainButton) {
  // ボタン要素の存在を確認
  ui.playAgainButton.addEventListener("click", () => {
    console.log("Play Again button clicked. Reloading page...");
    location.reload();
  });
} else {
  console.error(
    "Play Again Button (#playAgainButton) not found in the DOM during initialization."
  );
}

// --- Initial Setup ---
function initializeApp() {
  console.log("Initializing application...");
  game.setGameState(GAME_STATE.IDLE); // 初期状態

  // 初期UI表示
  ui.showStartScreen();
  ui.hideGameContainer();
  ui.hideResultScreen();
  ui.hideStartButton(); // ボタンはOpenCV準備完了後に表示
  ui.showStartInfo("OpenCV.js をロード中..."); // 初期メッセージ

  console.log("Initial UI set for start screen.");
}

initializeApp();
