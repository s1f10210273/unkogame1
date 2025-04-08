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
    console.warn("InitializeGame called while already active/initializing.");
    return;
  }
  setGameState(constants.GAME_STATE.INITIALIZING);
  // ui.showGameMessage("カメラ準備中..."); // 必要なら表示

  try {
    if (!cvUtils.isCvReady()) {
      throw new Error("OpenCV is not ready when initializeGame is called.");
    }
    console.log("OpenCV runtime confirmed ready in initializeGame.");
    // Images should be preloaded by now via main.js/handleOpenCvReady or earlier init

    if (!cvUtils.isCascadeReady()) {
      console.log("Loading face cascade in initializeGame...");
      // ui.showGameMessage("モデル読込中..."); // Optionally show specific messages
      await cvUtils.loadFaceCascade();
      console.log("Face cascade ready.");
    } else {
      console.log("Face cascade already loaded.");
    }

    console.log("Starting camera in initializeGame...");
    // ui.showGameMessage("カメラ起動中...");
    await camera.startCamera();
    console.log("Camera ready.");

    cvUtils.initializeCvObjects();
    console.log("OpenCV objects initialized.");

    currentScore = 0;
    ui.updateScoreDisplay(currentScore);
    poopInstances = [];
    appleInstances = [];
    waterInstances = [];
    // ui.hideGameMessage(); // Hide any init messages shown on game screen

    console.log("Initialization successful. Calling startCountdown...");
    startCountdown();
  } catch (error) {
    console.error("Initialization failed within initializeGame:", error);
    setGameState(constants.GAME_STATE.ERROR);
    cleanupResources(); // Clean up camera etc. on error
    throw error; // Re-throw error to be caught by main.js
  }
}

// --- Countdown ---
function startCountdown() {
  console.log("startCountdown function called.");
  setGameState(constants.GAME_STATE.COUNTDOWN);
  // ui.updateButtonState(gameState); // Button state controlled in main.js
  // ui.hideLoadingMessage();
  let count = constants.COUNTDOWN_SECONDS;
  ui.showGameMessage(count);
  console.log(`Showing initial countdown message: ${count}`);
  if (countdownIntervalId) clearInterval(countdownIntervalId);
  countdownIntervalId = setInterval(() => {
    console.log(`Countdown tick. Current count: ${count}`);
    count--;
    if (count > 0) ui.showGameMessage(count);
    else if (count === 0) ui.showGameMessage("START!");
    else {
      console.log("Countdown finished. Starting game loop.");
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
  // ui.updateButtonState(gameState);
  console.log("Game loop started!");
  remainingTime = constants.GAME_DURATION_SECONDS;
  ui.updateTimerDisplay(remainingTime);
  ui.updateScoreDisplay(currentScore); // Show initial score (should be 0)
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
  // console.log(`[gameLoop] Frame start. State: ${gameState}`);
  if (gameState !== constants.GAME_STATE.PLAYING) {
    console.log(`[gameLoop] Stopping loop. State: ${gameState}`);
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
    if (gameTimerIntervalId) {
      clearInterval(gameTimerIntervalId);
      gameTimerIntervalId = null;
    }
    if (gameRequestId) {
      cancelAnimationFrame(gameRequestId);
      gameRequestId = null;
    }
    return;
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
    gameTimerIntervalId = null;
    setGameState(constants.GAME_STATE.GAMEOVER);
    // ui.updateButtonState(gameState); // Button state handled in main.js/ui.js
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
  // console.log(`[checkGameOver] Checking. Opacity: ${currentOpacity.toFixed(1)}...`);
  if (
    gameState === constants.GAME_STATE.PLAYING &&
    currentOpacity <= constants.OPACITY_THRESHOLD
  ) {
    console.log(
      "[checkGameOver] Opacity threshold reached! Setting state to GAMEOVER."
    );
    setGameState(constants.GAME_STATE.GAMEOVER);
    // ui.updateButtonState(gameState); // Button state handled in main.js/ui.js
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
