// js/main.js

import * as ui from "./ui.js"; // bgmHome もインポートされるが、再生制御は game.js へ
import * as game from "./game.js";
import * as cvUtils from "./opencvUtils.js";
import {
  GAME_STATE,
  DIFFICULTY,
  TIME_LIMIT_BEGINNER,
  TIME_LIMIT_INTERMEDIATE,
  TIME_LIMIT_ADVANCED,
} from "./constants.js";

// --- Global Event Handlers ---
window.handleOpenCvReady = () => {
  console.log("handleOpenCvReady called - OpenCV script loaded.");
  if (!window.cv) {
    ui.showStartInfo("OpenCV Init Error [C1]", true);
    return;
  }
  ui.showStartInfo("Initializing OpenCV Runtime...");
  cvUtils
    .setCvReady() // Assuming setCvReady returns a Promise
    .then(() => {
      console.log("OpenCV Runtime is confirmed ready via Promise.");
      // ★★★ 初回BGM再生処理を削除 ★★★

      ui.showDifficultySelector();
      ui.showStartInfo("難易度を選択してください");
    })
    .catch((err) => {
      console.error("OpenCV runtime initialization failed:", err);
      ui.showStartInfo(
        "OpenCV初期化に失敗しました。リロードしてください。",
        true
      );
      ui.hideDifficultySelector();
      game.setGameState(constants.GAME_STATE.ERROR); // エラー状態を設定
    });
};

window.handleOpenCvError = () => {
  console.error("handleOpenCvError called - Failed to load OpenCV.js script.");
  ui.showStartInfo(
    "OpenCVのロードに失敗しました。接続を確認しリロードしてください。",
    true
  );
  ui.hideDifficultySelector();
  game.setGameState(constants.GAME_STATE.ERROR); // エラー状態を設定
};

// --- Event Listeners ---
if (ui.difficultySelector) {
  ui.difficultySelector.addEventListener("click", (event) => {
    if (event.target.classList.contains("difficulty-button")) {
      const selectedDifficulty = event.target.dataset.difficulty;
      let timeLimit = 0;
      switch (selectedDifficulty) {
        case DIFFICULTY.BEGINNER:
          timeLimit = TIME_LIMIT_BEGINNER;
          break;
        case DIFFICULTY.INTERMEDIATE:
          timeLimit = TIME_LIMIT_INTERMEDIATE;
          break;
        case DIFFICULTY.ADVANCED:
          timeLimit = TIME_LIMIT_ADVANCED;
          break;
        default:
          console.error("Unknown difficulty selected:", selectedDifficulty);
          return;
      }
      console.log(
        `Difficulty selected: ${selectedDifficulty}, Time: ${timeLimit}s`
      );

      // BGM停止処理は不要 (game.js の setGameState が担当)

      ui.hideDifficultySelector();
      ui.showStartInfo("ゲームを準備中...");

      // ゲーム初期化開始 (async) - setGameState(INITIALIZING) が呼ばれる
      game
        .initializeGame(timeLimit)
        .then(() => {
          // 成功時 (最終的に game.js 内で setGameState(PLAYING) が呼ばれる)
          console.log(
            "Game initialization successful call finished in main.js."
          );
          ui.hideStartScreen();
          ui.showGameContainer();
          // ui.hideStartInfo(); // 画面遷移するので不要
        })
        .catch((err) => {
          // initializeGame でエラーが発生した場合 (setGameState(ERROR) が呼ばれる)
          console.error("Error received from game.initializeGame:", err);
          ui.showStartScreen(); // エラー時はスタート画面に戻す
          ui.hideGameContainer();
          ui.showStartInfo(
            `ゲーム開始エラー: ${err.message}。リロードしてください。`,
            true
          );
          // ui.hideDifficultySelector(); // 隠れたまま
        });
    }
  });
} else {
  console.error("Difficulty Selector element not found.");
}

if (ui.playAgainButton) {
  ui.playAgainButton.addEventListener("click", () => {
    console.log("Play Again button clicked. Reloading page...");
    // BGM停止はリロードで自動的に行われるので不要
    location.reload();
  });
} else {
  console.error("Play Again Button not found.");
}

// ★★★ 追加: ルールボタン ★★★
if (ui.ruleButton) {
  ui.ruleButton.addEventListener("click", () => {
    console.log("Rule button clicked.");
    ui.openRuleModal(); // モーダルを開く
  });
} else {
  console.error("Rule Button not found.");
}
// ★★★ 変更: モーダル閉じるボタンのリスナー ★★★
// イベントリスナーを設定する対象を ui.closeRuleModalButton に変更
if (ui.closeRuleModalButton) {
  // 定数名変更
  ui.closeRuleModalButton.addEventListener("click", () => {
    // 定数名変更
    console.log("Close rule modal button clicked.");
    ui.closeRuleModal(); // モーダルを閉じる関数呼び出しは変更なし
  });
} else {
  console.error("Close Rule Modal Button not found.");
}

// モーダル背景クリックで閉じる
if (ui.ruleModal) {
  ui.ruleModal.addEventListener("click", (event) => {
    if (event.target === ui.ruleModal) {
      console.log("Rule modal overlay clicked.");
      ui.closeRuleModal(); // モーダルを閉じる関数呼び出し
    }
  });
} else {
  console.error("Rule Modal element not found.");
}

// --- Initial Setup ---
function initializeApp() {
  console.log("Initializing application...");
  game.setGameState(constants.GAME_STATE.IDLE); // ★★★ 初期状態設定 (BGMはこの時点では流れない) ★★★
  ui.showStartScreen();
  ui.hideGameContainer();
  ui.hideResultScreen();
  ui.hideDifficultySelector();
  ui.showStartInfo("OpenCV.js をロード中...");
  console.log("Initial UI set for start screen.");

  // ★★★ ページ読み込み時の全BGM停止 (念のため) ★★★
  if (ui.bgmHome && !ui.bgmHome.paused) {
    ui.bgmHome.pause();
    ui.bgmHome.currentTime = 0;
  }
  if (ui.bgm && !ui.bgm.paused) {
    ui.bgm.pause();
    ui.bgm.currentTime = 0;
  }
}

initializeApp();
