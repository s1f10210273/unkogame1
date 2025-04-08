// js/game.js

import * as constants from "./constants.js";
import * as ui from "./ui.js";
import * as camera from "./camera.js";
import * as cvUtils from "./opencvUtils.js";
import { Poop, loadPoopImage } from "./poop.js";
import { Apple, loadAppleImage } from "./item.js";
import { Water, loadWaterImage } from "./water.js";

// --- Game State Variables ---
let gameState = constants.GAME_STATE.IDLE;
let currentOpacity = 1.0;
let poopInstances = [];
let appleInstances = [];
let waterInstances = [];
let nextItemTime = 0;
let gameRequestId = null;
let countdownIntervalId = null;
let detectedFaces = null;
let remainingTime = constants.GAME_DURATION_SECONDS;
let gameTimerIntervalId = null;
let currentScore = 0;

// --- Initialization ---
export async function initializeGame() {
  if (
    gameState !== constants.GAME_STATE.IDLE &&
    gameState !== constants.GAME_STATE.ERROR
  )
    return;
  setGameState(constants.GAME_STATE.INITIALIZING);
  ui.showLoadingMessage("ゲームデータを準備中...");
  ui.updateButtonState(gameState);
  try {
    if (!cvUtils.isCvReady()) {
      console.warn("OpenCV runtime not ready, waiting...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!cvUtils.isCvReady())
        throw new Error("OpenCV ランタイムの準備がタイムアウトしました。");
    }
    console.log("OpenCV runtime is ready.");
    ui.showLoadingMessage("画像ファイルをロード中...");
    await Promise.all([
      loadPoopImage(constants.POOP_IMAGE_PATH),
      loadAppleImage(constants.APPLE_IMAGE_PATH),
      loadWaterImage(constants.WATER_IMAGE_PATH),
    ]);
    console.log("All images are ready.");
    setGameState(constants.GAME_STATE.LOADING_CASCADE);
    ui.showLoadingMessage("顔検出モデルをロード中...");
    await cvUtils.loadFaceCascade();
    console.log("Face cascade is ready.");
    setGameState(constants.GAME_STATE.STARTING_CAMERA);
    ui.showLoadingMessage("カメラを起動しています...");
    await camera.startCamera();
    console.log("Camera is ready.");
    cvUtils.initializeCvObjects();
    console.log("OpenCV objects are ready.");
    currentScore = 0;
    ui.updateScoreDisplay(currentScore);
    poopInstances = [];
    appleInstances = [];
    waterInstances = [];
    console.log(
      "Initialization successful. Attempting to call startCountdown..."
    );
    startCountdown();
  } catch (error) {
    console.error("Initialization failed:", error);
    setGameState(constants.GAME_STATE.ERROR);
    ui.showLoadingMessage(`エラー: ${error.message}`, true);
    cleanupResources();
    ui.updateButtonState(gameState);
  }
}

// --- Countdown ---
function startCountdown() {
  console.log("startCountdown function called.");
  setGameState(constants.GAME_STATE.COUNTDOWN);
  ui.updateButtonState(gameState);
  ui.hideLoadingMessage();
  let count = constants.COUNTDOWN_SECONDS;
  ui.showGameMessage(count);
  if (countdownIntervalId) clearInterval(countdownIntervalId);
  countdownIntervalId = setInterval(() => {
    count--;
    if (count > 0) ui.showGameMessage(count);
    else if (count === 0) ui.showGameMessage("START!");
    else {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
      ui.hideGameMessage();
      startGameLoop();
    }
  }, 1000);
}

// --- Game Loop ---
function startGameLoop() {
  setGameState(constants.GAME_STATE.PLAYING);
  ui.updateButtonState(gameState);
  console.log("Game loop started!");
  remainingTime = constants.GAME_DURATION_SECONDS;
  ui.updateTimerDisplay(remainingTime);
  if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
  gameTimerIntervalId = setInterval(updateGameTimer, 1000);
  currentScore = 0;
  ui.updateScoreDisplay(currentScore);
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  nextItemTime = Date.now() + constants.ITEM_GENERATION_INTERVAL_MIN;
  if (gameRequestId) cancelAnimationFrame(gameRequestId);
  gameLoop();
}

function gameLoop() {
  // console.log(`[gameLoop] Frame start. State: ${gameState}`);
  if (gameState !== constants.GAME_STATE.PLAYING) {
    console.log(`[gameLoop] Stopping loop. State: ${gameState}`);
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    } // 念のためクリア
    if (gameTimerIntervalId) {
      clearInterval(gameTimerIntervalId);
      gameTimerIntervalId = null;
    }
    // Animation frame は gameRequestId があれば stop 時に止められるべきだが、
    // gameover 時に明示的に止めるのが安全かもしれない
    if (gameRequestId) {
      cancelAnimationFrame(gameRequestId);
      gameRequestId = null;
    }
    return; // ループ停止
  }
  detectedFaces = cvUtils.detectFaces();
  ui.clearCanvas();
  if (detectedFaces) {
    for (let i = 0; i < detectedFaces.size(); ++i) {
      ui.drawFaceRect(detectedFaces.get(i));
    }
  }
  updateAndDrawItems();
  checkCollisions();
  gameRequestId = requestAnimationFrame(gameLoop);
}

function updateGameTimer() {
  // console.log(`[updateGameTimer] Tick. Remaining time: ${remainingTime}, State: ${gameState}`);
  if (gameState !== constants.GAME_STATE.PLAYING || remainingTime <= 0) {
    if (gameTimerIntervalId) {
      clearInterval(gameTimerIntervalId);
      gameTimerIntervalId = null;
    }
    return;
  }
  remainingTime--;
  ui.updateTimerDisplay(remainingTime);
  if (remainingTime <= 0) {
    console.log("[updateGameTimer] Time is up! Setting state to GAMEOVER.");
    // タイマーはここで止めるので clearInterval は不要
    gameTimerIntervalId = null; // ID をクリア
    setGameState(constants.GAME_STATE.GAMEOVER);
    ui.updateButtonState(gameState);
    ui.showResultScreen(currentScore, "TIME UP!"); // ★★★ リザルト画面表示 ★★★
  }
}

// --- Game Logic ---
function updateAndDrawItems() {
  const now = Date.now();
  let itemGenerated = false;
  if (now >= nextItemTime) {
    const randomValue = Math.random();
    if (randomValue < constants.POOP_THRESHOLD) {
      if (poopInstances.length < constants.MAX_POOPS) {
        poopInstances.push(new Poop(ui.canvas.width));
        itemGenerated = true;
      }
    } else if (randomValue < constants.APPLE_THRESHOLD) {
      if (appleInstances.length < constants.MAX_APPLES) {
        appleInstances.push(new Apple(ui.canvas.width));
        itemGenerated = true;
      }
    } else {
      if (waterInstances.length < constants.MAX_WATERS) {
        waterInstances.push(new Water(ui.canvas.width));
        itemGenerated = true;
      }
    }
    if (itemGenerated) {
      const interval =
        Math.random() *
          (constants.ITEM_GENERATION_INTERVAL_MAX -
            constants.ITEM_GENERATION_INTERVAL_MIN) +
        constants.ITEM_GENERATION_INTERVAL_MIN;
      nextItemTime = now + interval;
    } else {
      nextItemTime = now + 250;
    }
  }
  poopInstances.forEach((p) => {
    if (p.active) {
      p.update();
      p.draw();
    }
  });
  appleInstances.forEach((a) => {
    if (a.active) {
      a.update();
      a.draw();
    }
  });
  waterInstances.forEach((w) => {
    if (w.active) {
      w.update();
      w.draw();
    }
  }); // 水も更新・描画
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active); // 水もフィルター
}

function checkCollisions() {
  if (!detectedFaces || detectedFaces.size() === 0) return;
  for (let i = 0; i < detectedFaces.size(); ++i) {
    const faceRect = detectedFaces.get(i);
    // 糞
    for (const poop of poopInstances) {
      if (poop.active && poop.checkCollisionWithFace(faceRect)) {
        console.log("Hit Poop!");
        applyPenalty();
        poop.active = false;
      }
    }
    // りんご
    for (const apple of appleInstances) {
      if (apple.active && apple.checkCollisionWithFace(faceRect)) {
        console.log("Got Apple!");
        addScore(constants.APPLE_SCORE);
        apple.active = false;
      }
    }
    // 水
    for (const water of waterInstances) {
      if (water.active && water.checkCollisionWithFace(faceRect)) {
        console.log("Got Water!");
        applyWaterEffect();
        water.active = false;
      }
    }
  }
}

function addScore(points) {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  currentScore += points;
  ui.updateScoreDisplay(currentScore);
  console.log(`Score added: +${points}, Total: ${currentScore}`);
}

function applyPenalty() {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  currentOpacity -= constants.OPACITY_DECREMENT;
  if (currentOpacity < 0) currentOpacity = 0;
  ui.setVideoOpacity(currentOpacity);
  console.log(`Penalty applied! Current opacity: ${currentOpacity.toFixed(1)}`);
  checkGameOver();
}

function applyWaterEffect() {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  if (currentOpacity >= 1.0) {
    console.log("Opacity already max. Adding bonus score!");
    addScore(constants.WATER_BONUS_SCORE);
  } else {
    currentOpacity += constants.WATER_OPACITY_RECOVERY;
    if (currentOpacity > 1.0) currentOpacity = 1.0;
    ui.setVideoOpacity(currentOpacity);
    console.log(
      `Water recovered opacity! Current opacity: ${currentOpacity.toFixed(1)}`
    );
  }
}

function checkGameOver() {
  // console.log(`[checkGameOver] Checking. Opacity: ${currentOpacity.toFixed(1)}...`);
  if (
    gameState === constants.GAME_STATE.PLAYING &&
    currentOpacity <= constants.OPACITY_THRESHOLD
  ) {
    console.log(
      "[checkGameOver] Opacity threshold reached! Setting state to GAMEOVER."
    );
    setGameState(constants.GAME_STATE.GAMEOVER);
    ui.updateButtonState(gameState);
    ui.showResultScreen(currentScore, "GAME OVER"); // ★★★ リザルト画面表示 ★★★
    console.log("Game Over due to opacity!");
  }
}

// --- State Management and Cleanup ---
function setGameState(newState) {
  console.log(`[setGameState] Changing state from ${gameState} to ${newState}`);
  gameState = newState;
  console.log(`[setGameState] State is now: ${gameState}`);

  // ★★★ ゲームオーバーになったらリソース解放を予約 ★★★
  // (即時ではなく、リザルト表示などが終わってから or Play Again時)
  // 今回は Play Again でリロードするので、明示的な cleanup は不要かも
  // if (newState === constants.GAME_STATE.GAMEOVER) {
  //     // cleanupResources(); // ここで呼ぶと画面が消える可能性
  // }
}

export function getCurrentGameState() {
  return gameState;
}

// resetGame function removed

// リソース解放関数（エラー時やページ離脱前に呼ばれることを想定）
function cleanupResources() {
  console.log("Cleaning up game resources...");
  camera.stopCamera();
  cvUtils.cleanupCvResources(false);
  if (gameRequestId) {
    cancelAnimationFrame(gameRequestId);
    gameRequestId = null;
  }
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  if (gameTimerIntervalId) {
    clearInterval(gameTimerIntervalId);
    gameTimerIntervalId = null;
  }
  console.log("Game resource cleanup finished.");
}
