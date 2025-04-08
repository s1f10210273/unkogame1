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
    gameState === constants.GAME_STATE.INITIALIZING ||
    gameState === constants.GAME_STATE.PLAYING ||
    gameState === constants.GAME_STATE.COUNTDOWN
  ) {
    return;
  }
  setGameState(constants.GAME_STATE.INITIALIZING);

  try {
    if (!cvUtils.isCvReady()) {
      throw new Error("OpenCV is not ready when initializeGame is called.");
    }
    console.log("OpenCV runtime confirmed ready in initializeGame.");

    // 画像ファイルの並列ロード (エラー発生時はここで停止させる)
    console.log("Attempting to load all item images...");
    try {
      await Promise.all([
        loadPoopImage(constants.POOP_IMAGE_PATH),
        loadAppleImage(constants.APPLE_IMAGE_PATH),
        loadWaterImage(constants.WATER_IMAGE_PATH),
      ]);
      console.log("Promise.all for image loading resolved."); // ★★★ 成功ログ
    } catch (error) {
      console.error("Image loading failed in Promise.all:", error);
      // ユーザーにエラーを通知するために、エラーメッセージを含むエラーを再スロー
      throw new Error(
        `画像ファイルの読み込みに失敗しました: ${error?.message || "詳細不明"}`
      );
    }
    // ここに到達するのは全ての画像ロードPromiseが成功した場合のみ

    console.log("All images loaded successfully.");

    if (!cvUtils.isCascadeReady()) {
      console.log("Loading face cascade in initializeGame...");
      await cvUtils.loadFaceCascade();
      console.log("Face cascade ready.");
    } else {
      console.log("Face cascade already loaded.");
    }

    console.log("Starting camera in initializeGame...");
    await camera.startCamera();
    console.log("Camera ready.");

    cvUtils.initializeCvObjects();
    console.log("OpenCV objects initialized.");

    currentScore = 0;
    ui.updateScoreDisplay(currentScore);
    poopInstances = [];
    appleInstances = [];
    waterInstances = [];

    console.log("Initialization successful. Calling startCountdown...");
    startCountdown();
  } catch (error) {
    console.error("Initialization failed within initializeGame:", error);
    setGameState(constants.GAME_STATE.ERROR);
    cleanupResources();
    // エラーを main.js に伝播させる (main.js側でUI処理を行う)
    throw error;
  }
}

// --- Countdown ---
function startCountdown() {
  console.log("startCountdown function called.");
  setGameState(constants.GAME_STATE.COUNTDOWN);
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
  console.log("Game loop started!");
  remainingTime = constants.GAME_DURATION_SECONDS;
  ui.updateTimerDisplay(remainingTime);
  ui.updateScoreDisplay(currentScore);
  if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
  gameTimerIntervalId = setInterval(updateGameTimer, 1000);
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  nextItemTime = Date.now() + constants.ITEM_GENERATION_INTERVAL_MIN;
  if (gameRequestId) cancelAnimationFrame(gameRequestId);
  gameLoop();
}

function gameLoop() {
  if (gameState !== constants.GAME_STATE.PLAYING) {
    /* ... ループ停止 ... */ return;
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
  if (gameState !== constants.GAME_STATE.PLAYING || remainingTime <= 0) {
    /* ... */ return;
  }
  remainingTime--;
  ui.updateTimerDisplay(remainingTime);
  if (remainingTime <= 0) {
    console.log("[updateGameTimer] Time is up! Setting state to GAMEOVER.");
    gameTimerIntervalId = null;
    setGameState(constants.GAME_STATE.GAMEOVER);
    ui.showResultScreen(currentScore, "TIME UP!");
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
  });
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active);
}
function checkCollisions() {
  if (!detectedFaces || detectedFaces.size() === 0) return;
  for (let i = 0; i < detectedFaces.size(); ++i) {
    const faceRect = detectedFaces.get(i);
    for (const poop of poopInstances) {
      if (poop.active && poop.checkCollisionWithFace(faceRect)) {
        console.log("Hit Poop!");
        applyPenalty();
        poop.active = false;
      }
    }
    for (const apple of appleInstances) {
      if (apple.active && apple.checkCollisionWithFace(faceRect)) {
        console.log("Got Apple!");
        addScore(constants.APPLE_SCORE);
        apple.active = false;
      }
    }
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
  if (
    gameState === constants.GAME_STATE.PLAYING &&
    currentOpacity <= constants.OPACITY_THRESHOLD
  ) {
    console.log(
      "[checkGameOver] Opacity threshold reached! Setting state to GAMEOVER."
    );
    setGameState(constants.GAME_STATE.GAMEOVER);
    ui.showResultScreen(currentScore, "GAME OVER");
    console.log("Game Over due to opacity!");
  }
}

// --- State Management and Cleanup ---
function setGameState(newState) {
  console.log(`[setGameState] Changing state from ${gameState} to ${newState}`);
  gameState = newState;
  console.log(`[setGameState] State is now: ${gameState}`);
}
export function getCurrentGameState() {
  return gameState;
}
// resetGame function removed
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
