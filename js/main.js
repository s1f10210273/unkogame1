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
    ui.showStartInfo("OpenCV Init Error [C1]", true);
    return;
  }
  ui.showStartInfo("Initializing OpenCV Runtime...");
  cvUtils
    .setCvReady() // Assuming setCvReady returns a Promise
    .then(() => {
      console.log("OpenCV Runtime is confirmed ready via Promise.");
      ui.showDifficultySelector();
      ui.showStartInfo("難易度を選択してください"); // 日本語に戻す
      // ui.showStartInfo('Select Difficulty'); // English version
    })
    .catch((err) => {
      console.error("OpenCV runtime initialization failed:", err);
      ui.showStartInfo(
        "OpenCV初期化に失敗しました。リロードしてください。",
        true
      ); // 日本語に戻す
      // ui.showStartInfo('OpenCV Init Failed. Please Reload.', true); // English version
      ui.hideDifficultySelector();
    });
};
window.handleOpenCvError = () => {
  console.error("handleOpenCvError called - Failed to load OpenCV.js script.");
  ui.showStartInfo(
    "OpenCVのロードに失敗しました。接続を確認しリロードしてください。",
    true
  ); // 日本語に戻す
  // ui.showStartInfo('Failed to load OpenCV. Check connection and reload.', true); // English version
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

      ui.hideDifficultySelector();
      ui.showStartInfo("ゲームを準備中..."); // 日本語に戻す
      // ui.showStartInfo('Starting Game...'); // English version

      // Initialize game (async)
      game
        .initializeGame(timeLimit)
        .then(() => {
          console.log(
            "Game initialization successful from main.js perspective."
          );
          ui.hideStartScreen();
          ui.showGameContainer();
          ui.hideStartInfo(); // Hide "Starting Game..." message
        })
        .catch((err) => {
          console.error("Error during game initialization:", err);
          ui.showStartScreen();
          ui.hideGameContainer();
          // Include specific error message
          ui.showStartInfo(
            `ゲーム開始エラー: ${err.message}。リロードしてください。`,
            true
          ); // 日本語に戻す
          // ui.showStartInfo(`Game Start Error: ${err.message}. Please Reload.`, true); // English version
          ui.hideDifficultySelector();
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
  ui.hideDifficultySelector();
  ui.showStartInfo("OpenCV.js をロード中..."); // 日本語に戻す
  // ui.showStartInfo('Loading OpenCV.js...'); // English version
  console.log("Initial UI set for start screen.");
}
initializeApp();
