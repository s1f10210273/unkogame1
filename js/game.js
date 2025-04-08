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
let remainingTime = 0;
let gameTimerIntervalId = null;
let currentScore = 0;
let currentGameTimeLimit = 0;
let currentMaxPoops = constants.BASE_MAX_POOPS;
let currentMaxApples = constants.BASE_MAX_APPLES;
let currentMaxWaters = constants.BASE_MAX_WATERS;
let limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
let gameStartTime = 0; // Unix timestamp (ms) when the game playing state starts

// --- Initialization ---
export async function initializeGame(timeLimit) {
  console.log("[initializeGame] Starting initialization...");
  if (
    gameState === constants.GAME_STATE.INITIALIZING ||
    gameState === constants.GAME_STATE.PLAYING ||
    gameState === constants.GAME_STATE.COUNTDOWN
  ) {
    console.warn("[initializeGame] Aborted: Already active or initializing.");
    return;
  }
  setGameState(constants.GAME_STATE.INITIALIZING);

  if (typeof timeLimit !== "number" || timeLimit <= 0) {
    currentGameTimeLimit = constants.TIME_LIMIT_BEGINNER;
  } else {
    currentGameTimeLimit = timeLimit;
  }
  console.log(`[initializeGame] Time limit set: ${currentGameTimeLimit}s.`);

  try {
    console.log("[initializeGame] Checking OpenCV readiness...");
    if (!cvUtils.isCvReady()) {
      throw new Error("OpenCV is not ready.");
    }
    console.log("[initializeGame] OpenCV runtime confirmed.");

    console.log("[initializeGame] Loading images via Promise.all...");
    try {
      await Promise.all([
        loadPoopImage(constants.POOP_IMAGE_PATH),
        loadAppleImage(constants.APPLE_IMAGE_PATH),
        loadWaterImage(constants.WATER_IMAGE_PATH),
      ]);
      console.log("[initializeGame] Promise.all for image loading resolved.");
    } catch (error) {
      throw new Error(
        `Image loading failed: ${error?.message || "Unknown reason"}`
      );
    }
    console.log("[initializeGame] All images assumed ready.");

    console.log("[initializeGame] Checking/Loading face cascade...");
    if (!cvUtils.isCascadeReady()) {
      await cvUtils.loadFaceCascade();
    }
    console.log("[initializeGame] Face cascade ready.");

    console.log("[initializeGame] Starting camera...");
    await camera.startCamera();
    console.log("[initializeGame] Camera ready.");

    console.log("[initializeGame] Initializing OpenCV objects...");
    cvUtils.initializeCvObjects();
    console.log("[initializeGame] OpenCV objects initialized.");

    // Reset game-specific variables
    currentScore = 0;
    ui.updateScoreDisplay(currentScore);
    poopInstances = [];
    appleInstances = [];
    waterInstances = [];
    currentMaxPoops = constants.BASE_MAX_POOPS;
    currentMaxApples = constants.BASE_MAX_APPLES;
    currentMaxWaters = constants.BASE_MAX_WATERS;
    limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
    console.log(
      `[initializeGame] Initial Max Items set: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}. Next milestone: ${limitIncreaseMilestone}s.`
    );

    console.log(
      "[initializeGame] Initialization successful. Calling startCountdown..."
    );
    startCountdown(); // Move to countdown
  } catch (error) {
    console.error(
      "[initializeGame] CRITICAL ERROR during initialization:",
      error
    );
    setGameState(constants.GAME_STATE.ERROR);
    cleanupResources();
    throw error; // Propagate error to main.js
  }
}

// --- Countdown ---
function startCountdown() {
  console.log("[startCountdown] Function called.");
  setGameState(constants.GAME_STATE.COUNTDOWN);
  let count = constants.COUNTDOWN_SECONDS;
  console.log(`[startCountdown] Initial count: ${count}`);
  ui.showGameMessage(count);

  if (countdownIntervalId) {
    console.warn("[startCountdown] Clearing existing interval.");
    clearInterval(countdownIntervalId);
  }

  countdownIntervalId = setInterval(() => {
    // console.log(`[startCountdown] Interval tick. Count: ${count}`); // 必要なら有効化
    count--;
    if (count > 0) {
      ui.showGameMessage(count);
    } else if (count === 0) {
      ui.showGameMessage("START!");
    } else {
      console.log(
        "[startCountdown] Countdown finished. Clearing interval, hiding message, calling startGameLoop."
      );
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
      ui.hideGameMessage();
      startGameLoop(); // Start the main game setup
    }
  }, 1000);
  console.log(`[startCountdown] Interval timer set ID: ${countdownIntervalId}`);
}

// --- Game Loop ---
function startGameLoop() {
  console.log("[startGameLoop] Function called.");
  setGameState(constants.GAME_STATE.PLAYING);
  console.log("[startGameLoop] Game state set to PLAYING.");

  remainingTime = currentGameTimeLimit;
  ui.updateTimerDisplay(remainingTime);
  currentScore = 0;
  ui.updateScoreDisplay(currentScore); // Reset score display

  console.log("[startGameLoop] Setting up game timer...");
  if (gameTimerIntervalId) {
    clearInterval(gameTimerIntervalId);
  }
  gameTimerIntervalId = setInterval(updateGameTimer, 1000);
  console.log(`[startGameLoop] Game timer set ID: ${gameTimerIntervalId}`);

  // Reset items and limits
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  currentMaxPoops = constants.BASE_MAX_POOPS;
  currentMaxApples = constants.BASE_MAX_APPLES;
  currentMaxWaters = constants.BASE_MAX_WATERS;
  limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
  console.log(
    `[startGameLoop] Items cleared. Limits reset: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}. Next milestone: ${limitIncreaseMilestone}s.`
  );

  // Set game start time and initial item generation time
  gameStartTime = Date.now();
  console.log(`[startGameLoop] gameStartTime set to: ${gameStartTime}`);
  try {
    const initialInterval =
      Math.random() *
        (constants.ITEM_GENERATION_INTERVAL_MAX_INITIAL -
          constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL) +
      constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL;
    nextItemTime = gameStartTime + initialInterval;
    console.log(
      `[startGameLoop] Initial nextItemTime calculated: ${nextItemTime} (interval: ${initialInterval.toFixed(
        0
      )}ms)`
    );
  } catch (e) {
    console.error("[startGameLoop] Error calculating initial nextItemTime:", e);
    // Handle error? Maybe set a default nextItemTime?
    nextItemTime = gameStartTime + 1000; // Fallback
  }

  if (gameRequestId) {
    cancelAnimationFrame(gameRequestId);
  }
  console.log("[startGameLoop] Requesting first game loop frame...");
  gameLoop(); // Start the actual game animation loop
}

function gameLoop() {
  if (gameState !== constants.GAME_STATE.PLAYING) {
    console.log(`[gameLoop] Stopping loop because state is ${gameState}`);
    // Ensure all timers/loops are stopped if state changes unexpectedly
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

  const now = Date.now();
  // ★★★ elapsedTimeInSeconds の計算とチェック ★★★
  let elapsedTimeInSeconds = 0;
  if (gameStartTime > 0) {
    elapsedTimeInSeconds = (now - gameStartTime) / 1000.0;
  } else {
    console.warn(
      "[gameLoop] gameStartTime is not set, elapsedTime defaulting to 0."
    );
  }
  // console.log(`[gameLoop] Frame update. Elapsed: ${elapsedTimeInSeconds.toFixed(1)}s`); // 必要なら有効化

  detectedFaces = cvUtils.detectFaces();
  ui.clearCanvas();
  if (detectedFaces) {
    for (let i = 0; i < detectedFaces.size(); ++i) {
      ui.drawFaceRect(detectedFaces.get(i));
    }
  }

  updateAndDrawItems(now, elapsedTimeInSeconds); // ★★★ 経過時間を渡す ★★★
  checkCollisions();

  gameRequestId = requestAnimationFrame(gameLoop); // 次のフレームへ
}

function updateGameTimer() {
  if (gameState !== constants.GAME_STATE.PLAYING || remainingTime <= 0) {
    if (gameTimerIntervalId) {
      clearInterval(gameTimerIntervalId);
      gameTimerIntervalId = null;
    }
    return;
  }
  remainingTime--;
  ui.updateTimerDisplay(remainingTime);

  // 経過時間計算
  let elapsedTime = 0;
  if (gameStartTime > 0) {
    elapsedTime = (Date.now() - gameStartTime) / 1000.0;
  } else {
    // Fallback using remaining time (less accurate if timer starts late)
    elapsedTime = currentGameTimeLimit - remainingTime;
    // console.warn("[updateGameTimer] gameStartTime not set, using alternative elapsedTime calculation.");
  }
  // console.log(`[updateGameTimer] Tick. Remaining: ${remainingTime}, Elapsed: ${elapsedTime.toFixed(1)}s, Milestone: ${limitIncreaseMilestone}s`); // 必要なら有効化

  // アイテム最大数増加チェック
  if (elapsedTime >= limitIncreaseMilestone) {
    console.log(
      `[updateGameTimer] Milestone ${limitIncreaseMilestone}s reached at ${elapsedTime.toFixed(
        1
      )}s.`
    ); // ★★★ 追加 ★★★
    currentMaxPoops = Math.min(
      currentMaxPoops + constants.LIMIT_INCREASE_AMOUNT,
      constants.CAP_MAX_POOPS
    );
    currentMaxApples = Math.min(
      currentMaxApples + constants.LIMIT_INCREASE_AMOUNT,
      constants.CAP_MAX_APPLES
    );
    currentMaxWaters = Math.min(
      currentMaxWaters + constants.LIMIT_INCREASE_AMOUNT,
      constants.CAP_MAX_WATERS
    );
    console.log(
      `[Level Up!] Increased max items: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}`
    );
    limitIncreaseMilestone += constants.LIMIT_INCREASE_INTERVAL;
    console.log(
      `[updateGameTimer] Next milestone set to: ${limitIncreaseMilestone}s.`
    ); // ★★★ 追加 ★★★
  }

  // 時間切れ判定
  if (remainingTime <= 0) {
    console.log("[updateGameTimer] Time is up! Finalizing.");
    // タイマーはこの関数の先頭チェックで止まるのでIDクリアのみ
    gameTimerIntervalId = null;
    setGameState(constants.GAME_STATE.GAMEOVER);
    ui.showResultScreen(currentScore, "TIME UP!");
  }
}

// --- Game Logic ---
function updateAndDrawItems(now, elapsedTimeInSeconds) {
  let itemGenerated = false;
  // console.log(`[ItemGen Check] now=${now}, nextItemTime=${nextItemTime}, diff=${now - nextItemTime}, P#=${poopInstances.length}(${currentMaxPoops}), A#=${appleInstances.length}(${currentMaxApples}), W#=${waterInstances.length}(${currentMaxWaters})`); // 必要なら有効化

  if (now >= nextItemTime) {
    // console.log("[ItemGen Check] Time condition MET."); // 必要なら有効化
    const randomValue = Math.random();
    let generatedItemType = "None";

    // 確率と現在の最大数で生成試行
    if (randomValue < constants.POOP_THRESHOLD) {
      if (poopInstances.length < currentMaxPoops) {
        poopInstances.push(new Poop(ui.canvas.width));
        itemGenerated = true;
        generatedItemType = "Poop";
      }
    } else if (randomValue < constants.APPLE_THRESHOLD) {
      if (appleInstances.length < currentMaxApples) {
        appleInstances.push(new Apple(ui.canvas.width));
        itemGenerated = true;
        generatedItemType = "Apple";
      }
    } else {
      if (waterInstances.length < currentMaxWaters) {
        waterInstances.push(new Water(ui.canvas.width));
        itemGenerated = true;
        generatedItemType = "Water";
      }
    }

    // 次の生成時刻計算
    if (itemGenerated) {
      // ★★★ 動的インターバル計算のログ追加 ★★★
      const progress = Math.min(
        elapsedTimeInSeconds / constants.INTERVAL_REDUCTION_DURATION,
        1.0
      );
      if (constants.INTERVAL_REDUCTION_DURATION <= 0) {
        // ゼロ除算防止
        console.error("INTERVAL_REDUCTION_DURATION is zero or negative!");
        progress = 1.0;
      }
      const currentMinInterval =
        constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL +
        (constants.ITEM_GENERATION_INTERVAL_MIN_FINAL -
          constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL) *
          progress;
      const currentMaxInterval =
        constants.ITEM_GENERATION_INTERVAL_MAX_INITIAL +
        (constants.ITEM_GENERATION_INTERVAL_MAX_FINAL -
          constants.ITEM_GENERATION_INTERVAL_MAX_INITIAL) *
          progress;
      const interval =
        Math.random() * (currentMaxInterval - currentMinInterval) +
        currentMinInterval;
      nextItemTime = now + interval;
      console.log(
        `[ItemGen] --- ${generatedItemType} generated! (Progress: ${progress.toFixed(
          2
        )}, Interval: ${interval.toFixed(0)}ms) New next: ${nextItemTime}`
      );
    } else {
      nextItemTime = now + 150; // スキップ時は短い間隔で再試行
      // console.log(`[ItemGen] Generation skipped. Next check in 150ms.`);
    }
  }

  // 更新と描画
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
  // 非アクティブ削除
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
    console.log("Opacity max. Bonus score!");
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
    console.log("[checkGameOver] Opacity threshold reached!");
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
