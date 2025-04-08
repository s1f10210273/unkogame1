// js/game.js

import * as constants from "./constants.js";
import * as ui from "./ui.js";
import * as camera from "./camera.js";
import * as cvUtils from "./opencvUtils.js";
import { Poop, loadPoopImage } from "./poop.js";
import { Apple, loadAppleImage } from "./item.js";
import { Water, loadWaterImage } from "./water.js"; // water.js をインポート (PNG描画版)
// import * as audioManager from './audioManager.js'; // BGM削除済み
// import * as itemManager from './itemManager.js';   // ファイル分割を戻した

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
let gameStartTime = 0;

// --- Initialization ---
export async function initializeGame(timeLimit) {
  console.log("[Game] Starting initialization...");
  if (
    gameState === constants.GAME_STATE.INITIALIZING ||
    gameState === constants.GAME_STATE.PLAYING ||
    gameState === constants.GAME_STATE.COUNTDOWN
  ) {
    return;
  }
  setGameState(constants.GAME_STATE.INITIALIZING);

  if (typeof timeLimit !== "number" || timeLimit <= 0) {
    currentGameTimeLimit = constants.TIME_LIMIT_BEGINNER;
  } else {
    currentGameTimeLimit = timeLimit;
  }
  console.log(`[Game] Time limit set: ${currentGameTimeLimit}s.`);

  try {
    console.log("[Game] Checking OpenCV readiness...");
    if (!cvUtils.isCvReady()) {
      throw new Error("OpenCV is not ready.");
    }
    console.log("[Game] OpenCV runtime confirmed.");

    console.log("[Game] Loading item images...");
    try {
      await Promise.all([
        loadPoopImage(constants.POOP_IMAGE_PATH),
        loadAppleImage(constants.APPLE_IMAGE_PATH),
        loadWaterImage(constants.WATER_IMAGE_PATH), // water.png をロード
      ]);
      console.log(
        "[Game] Promise.all for image loading successfully resolved."
      ); // ★★★ 成功ログ ★★★
    } catch (error) {
      console.error("[Game] Image loading failed:", error); // ★★★ エラーログ ★★★
      throw new Error(
        `Image preload failed: ${error?.message || "Unknown reason"}`
      );
    }
    console.log("[Game] All images are assumed loaded/ready.");

    console.log("[Game] Checking/Loading face cascade...");
    // setGameState(constants.GAME_STATE.LOADING_CASCADE); // BGM制御削除
    if (!cvUtils.isCascadeReady()) {
      await cvUtils.loadFaceCascade();
    }
    console.log("[Game] Face cascade ready.");

    console.log("[Game] Starting camera...");
    // setGameState(constants.GAME_STATE.STARTING_CAMERA); // BGM制御削除
    await camera.startCamera();
    console.log("[Game] Camera ready.");

    console.log("[Game] Initializing OpenCV objects...");
    cvUtils.initializeCvObjects();
    console.log("[Game] OpenCV objects initialized.");

    currentScore = 0;
    ui.updateScoreDisplay(currentScore);
    currentOpacity = 1.0;
    ui.resetVideoOpacity();
    poopInstances = [];
    appleInstances = [];
    waterInstances = [];
    currentMaxPoops = constants.BASE_MAX_POOPS;
    currentMaxApples = constants.BASE_MAX_APPLES;
    currentMaxWaters = constants.BASE_MAX_WATERS;
    limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
    console.log(
      `[Game] Initial Max Items set: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}.`
    );

    console.log("[Game] Initialization successful. Calling startCountdown...");
    startCountdown();
  } catch (error) {
    console.error("[Game] CRITICAL ERROR during initialization:", error);
    setGameState(constants.GAME_STATE.ERROR); // BGM制御削除
    cleanupResources();
    throw error;
  }
}

// --- Countdown ---
function startCountdown() {
  console.log("[Game] startCountdown called.");
  setGameState(constants.GAME_STATE.COUNTDOWN); // BGM制御削除
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
  setGameState(constants.GAME_STATE.PLAYING); // BGM制御削除
  console.log("[Game] Game loop started!");
  remainingTime = currentGameTimeLimit;
  ui.updateTimerDisplay(remainingTime);
  currentScore = 0;
  ui.updateScoreDisplay(currentScore); // スコアリセット表示
  currentOpacity = 1.0;
  ui.resetVideoOpacity(); // 透明度リセット
  if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
  gameTimerIntervalId = setInterval(updateGameTimer, 1000);
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  currentMaxPoops = constants.BASE_MAX_POOPS;
  currentMaxApples = constants.BASE_MAX_APPLES;
  currentMaxWaters = constants.BASE_MAX_WATERS;
  limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
  gameStartTime = Date.now();
  try {
    const initialInterval =
      Math.random() *
        (constants.ITEM_GENERATION_INTERVAL_MAX_INITIAL -
          constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL) +
      constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL;
    nextItemTime = gameStartTime + initialInterval;
  } catch (e) {
    nextItemTime = gameStartTime + 1000;
  }
  console.log(`[Game] Initial nextItemTime: ${nextItemTime}`);

  // BGM再生開始処理削除

  if (gameRequestId) cancelAnimationFrame(gameRequestId);
  console.log("[Game] Starting game loop (requesting first frame)...");
  gameLoop();
}

function gameLoop() {
  if (gameState !== constants.GAME_STATE.PLAYING) {
    cleanupResources();
    return;
  }
  const now = Date.now();
  const elapsedTimeInSeconds =
    gameStartTime > 0 ? (now - gameStartTime) / 1000.0 : 0;
  detectedFaces = cvUtils.detectFaces();
  ui.clearCanvas();
  if (detectedFaces) {
    for (let i = 0; i < detectedFaces.size(); ++i) {
      ui.drawFaceRect(detectedFaces.get(i));
    }
  }
  updateAndDrawItems(now, elapsedTimeInSeconds);
  // Water DOM位置更新削除
  checkCollisions();
  gameRequestId = requestAnimationFrame(gameLoop);
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
  let elapsedTime =
    gameStartTime > 0
      ? (Date.now() - gameStartTime) / 1000.0
      : currentGameTimeLimit - remainingTime;
  if (elapsedTime >= limitIncreaseMilestone) {
    // ItemManagerを使わず直接更新
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
  }
  if (remainingTime <= 0) {
    console.log("[Game] Time is up! Finalizing.");
    gameTimerIntervalId = null;
    setGameState(constants.GAME_STATE.GAMEOVER); // BGM制御削除
    ui.showResultScreen(currentScore, "TIME UP!");
  }
}

// --- Game Logic ---
function playSound(audioElement) {
  if (audioElement && typeof audioElement.play === "function") {
    audioElement.currentTime = 0;
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {});
    }
  } else {
    console.warn("Attempted to play invalid audio element:", audioElement);
  }
}

/** ItemManagerなし版のアイテム処理 */
function updateAndDrawItems(now, elapsedTimeInSeconds) {
  let itemGenerated = false;
  if (now >= nextItemTime) {
    const randomValue = Math.random();
    let generatedItemType = "None";
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
    if (itemGenerated) {
      const progress = Math.min(
        elapsedTimeInSeconds / constants.INTERVAL_REDUCTION_DURATION,
        1.0
      );
      if (constants.INTERVAL_REDUCTION_DURATION <= 0) {
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
        `[Game ItemGen] --- ${generatedItemType} generated! New next: ${nextItemTime}`
      );
    } else {
      nextItemTime = now + 150;
    }
  }
  // 全てのアイテムの update と draw を呼ぶ
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
  }); // Waterも draw() を呼ぶ
  // 非アクティブアイテム除去 (WaterのDOM削除は不要)
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active);
}

/** ItemManagerなし版の衝突判定 */
function checkCollisions() {
  if (!detectedFaces || detectedFaces.size() === 0) return;
  // 直接配列をループ
  for (let i = 0; i < detectedFaces.size(); ++i) {
    const faceRect = detectedFaces.get(i);
    // 糞
    for (const poop of poopInstances) {
      if (poop.active && poop.checkCollisionWithFace(faceRect)) {
        console.log("Hit Poop!");
        applyPenalty();
        playSound(ui.sfxPoop);
        poop.active = false;
      }
    }
    // りんご
    for (const apple of appleInstances) {
      if (apple.active && apple.checkCollisionWithFace(faceRect)) {
        console.log("Got Apple!");
        console.log("[Collision] Apple hit detected. Calling addScore..."); // ★★★ 追加 ★★★
        addScore(constants.APPLE_SCORE);
        playSound(ui.sfxItem);
        apple.active = false;
      }
    }
    // 水
    for (const water of waterInstances) {
      if (water.active && water.checkCollisionWithFace(faceRect)) {
        console.log("Got Water!");
        applyWaterEffect(); // この中で addScore が呼ばれる可能性
        playSound(ui.sfxItem);
        water.active = false;
      }
    }
  }
}

/**
 * スコア加算
 * @param {number} points 加算点数
 */
function addScore(points) {
  console.log(
    `[addScore] Called with points: ${points}. Current score before add: ${currentScore}`
  ); // ★★★ 追加 ★★★
  if (gameState !== constants.GAME_STATE.PLAYING) {
    console.log("[addScore] Aborted: Not in PLAYING state.");
    return;
  }
  currentScore += points;
  console.log(
    `[addScore] Score updated to: ${currentScore}. Calling ui.updateScoreDisplay...`
  ); // ★★★ 追加 ★★★
  ui.updateScoreDisplay(currentScore); // UI更新呼び出し
}

/**
 * ペナルティ適用
 */
function applyPenalty() {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  currentOpacity -= constants.OPACITY_DECREMENT;
  if (currentOpacity < 0) currentOpacity = 0;
  ui.setVideoOpacity(currentOpacity);
  console.log(`Penalty applied! Current opacity: ${currentOpacity.toFixed(1)}`);
  checkGameOver();
}

/**
 * 水アイテム効果適用
 */
function applyWaterEffect() {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  if (currentOpacity >= 1.0) {
    console.log("Opacity max. Bonus score!");
    console.log("[Water Effect] Opacity is max. Calling addScore for bonus..."); // ★★★ 追加 ★★★
    addScore(constants.WATER_BONUS_SCORE); // ボーナススコア
  } else {
    currentOpacity += constants.WATER_OPACITY_RECOVERY;
    if (currentOpacity > 1.0) currentOpacity = 1.0;
    ui.setVideoOpacity(currentOpacity);
    console.log(
      `Water recovered opacity! Current opacity: ${currentOpacity.toFixed(1)}`
    );
  }
}

/**
 * ゲームオーバーチェック (Opacity)
 */
function checkGameOver() {
  if (
    gameState === constants.GAME_STATE.PLAYING &&
    currentOpacity <= constants.OPACITY_THRESHOLD
  ) {
    console.log("[Game] Opacity threshold reached! Game Over.");
    setGameState(constants.GAME_STATE.GAMEOVER); // BGM制御削除
    ui.showResultScreen(currentScore, "GAME OVER");
  }
}

// --- State Management and Cleanup ---
/** BGM制御を削除した setGameState */
function setGameState(newState) {
  const oldState = gameState;
  if (oldState === newState) return;
  console.log(`[Game] Changing state from ${oldState} to ${newState}`);
  gameState = newState;
  console.log(`[Game] State is now: ${gameState}`);
  // BGM制御ロジック削除
}
export function getCurrentGameState() {
  return gameState;
}

// BGMヘルパー関数削除

/** リソース解放 */
function cleanupResources() {
  console.log("Cleaning up game resources...");
  // BGM停止処理削除
  camera.stopCamera();
  cvUtils.cleanupCvResources(false);
  // Water DOM要素削除処理削除
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
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
