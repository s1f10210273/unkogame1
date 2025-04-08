// js/main.js

import * as ui from "./ui.js";
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
    ui.showStartInfo("OpenCV初期化エラー[C1]", true);
    return;
  }
  ui.showStartInfo("OpenCV ランタイム準備中...");
  cvUtils
    .setCvReady()
    .then(() => {
      console.log("OpenCV Runtime is confirmed ready via Promise.");
      ui.showDifficultySelector(); // 難易度選択を表示
      // ui.showStartInfo('難易度を選択してください'); // showDifficultySelector内でメッセージ変更するなら不要
    })
    .catch((err) => {
      console.error("OpenCV runtime initialization failed:", err);
      ui.showStartInfo(
        "OpenCV初期化に失敗しました。リロードしてください。",
        true
      );
      ui.hideDifficultySelector();
    });
};
window.handleOpenCvError = () => {
  console.error("handleOpenCvError called - Failed to load OpenCV.js script.");
  ui.showStartInfo(
    "OpenCVのロードに失敗しました。接続を確認しリロードしてください。",
    true
  );
  ui.hideDifficultySelector();
};

// --- Event Listeners ---
if (ui.difficultySelector) {
  ui.difficultySelector.addEventListener("click", (event) => {
    if (event.target.classList.contains("difficulty-button")) {
      const selectedDifficulty = event.target.dataset.difficulty;
      console.log(`Difficulty selected: ${selectedDifficulty}`);
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
          console.error("Unknown difficulty:", selectedDifficulty);
          return;
      }

      // 難易度選択肢を隠し、準備中メッセージを表示
      ui.hideDifficultySelector();
      ui.showStartInfo("ゲームを準備中...");

      // ゲーム初期化処理を開始
      game
        .initializeGame(timeLimit)
        .then(() => {
          // 成功したらスタート画面を隠し、ゲーム画面表示
          console.log(
            "Game initialization successful after difficulty selection."
          );
          ui.hideStartScreen();
          ui.showGameContainer();
          ui.hideStartInfo(); // ★★★ 準備中メッセージを隠す ★★★
        })
        .catch((err) => {
          // initializeGame でエラーが発生した場合
          console.error("Error during game initialization:", err);
          // スタート画面に戻してエラー表示
          // ui.hideGameContainer(); // すでに隠れているはず
          ui.showStartScreen(); // スタート画面を再表示
          // エラーメッセージに失敗した理由(err.message)を含める
          ui.showStartInfo(
            `ゲーム開始エラー: ${err.message}。リロードしてください。`,
            true
          );
          ui.hideDifficultySelector(); // 難易度選択は隠す
        });
    }
  });
} else {
  console.error("Difficulty Selector element not found.");
}

if (ui.playAgainButton) {
  ui.playAgainButton.addEventListener("click", () => {
    location.reload();
  });
} else {
  console.error("Play Again Button not found.");
}

// --- Initial Setup ---
function initializeApp() {
  console.log("Initializing application...");
  game.setGameState(GAME_STATE.IDLE);
  ui.showStartScreen();
  ui.hideGameContainer();
  ui.hideResultScreen();
  ui.hideDifficultySelector(); // 最初は隠す
  ui.showStartInfo("OpenCV.js をロード中...");
  console.log("Initial UI set for start screen.");
}

initializeApp();
