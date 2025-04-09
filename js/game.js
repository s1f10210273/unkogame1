// js/game.js

import * as constants from "./constants.js";
import * as ui from "./ui.js";
import * as camera from "./camera.js";
import * as cvUtils from "./opencvUtils.js";
import { Poop, loadPoopImage } from "./poop.js";
import { Apple, loadAppleImage } from "./item.js";
import { Water, loadWaterImage } from "./water.js";
import { GoldApple, loadGoldAppleImage } from "./goldApple.js"; // 金りんごインポート
import { SoftServe, loadSoftServeImage } from "./softServe.js"; // ソフトクリームインポート

// --- Game State Variables ---
let gameState = constants.GAME_STATE.IDLE;
let currentOpacity = 1.0;
let poopInstances = [];
let appleInstances = [];
let waterInstances = [];
let goldAppleInstances = []; // 金りんご配列
let softServeInstances = [];
let nextItemTime = 0;
let gameRequestId = null;
let countdownIntervalId = null;
let detectedFaces = null; // 顔検出用
let remainingTime = 0;
let gameTimerIntervalId = null;
let currentScore = 0;
let currentGameTimeLimit = 0;
let currentMaxPoops = constants.BASE_MAX_POOPS;
let currentMaxApples = constants.BASE_MAX_APPLES;
let currentMaxWaters = constants.BASE_MAX_WATERS;
let currentMaxGoldApples = constants.BASE_MAX_GOLD_APPLES; // 金りんご最大数変数
let limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
let gameStartTime = 0;
// ソフトクリーム用カウンター
let totalSoftServeToSpawn = 0; // ゲームごとの総出現数
let softServeSpawnedCount = 0; // 現在の出現済み数

// --- Initialization ---
/**
 * ゲームの初期化処理を開始する
 * @param {number} timeLimit 選択されたゲームの制限時間（秒）
 */
export async function initializeGame(timeLimit) {
  console.log("[Game] Starting initialization...");
  if (
    gameState === constants.GAME_STATE.INITIALIZING ||
    gameState === constants.GAME_STATE.PLAYING ||
    gameState === constants.GAME_STATE.COUNTDOWN
  ) {
    return;
  }
  setGameState(constants.GAME_STATE.INITIALIZING); // BGM制御なし

  // 制限時間とソフトクリーム出現数を設定
  if (typeof timeLimit !== "number" || timeLimit <= 0) {
    currentGameTimeLimit = constants.TIME_LIMIT_BEGINNER;
  } else {
    currentGameTimeLimit = timeLimit;
  }
  switch (currentGameTimeLimit) {
    case constants.TIME_LIMIT_BEGINNER:
      totalSoftServeToSpawn = constants.SOFT_SERVE_COUNT_BEGINNER;
      break;
    case constants.TIME_LIMIT_INTERMEDIATE:
      totalSoftServeToSpawn = constants.SOFT_SERVE_COUNT_INTERMEDIATE;
      break;
    case constants.TIME_LIMIT_ADVANCED:
      totalSoftServeToSpawn = constants.SOFT_SERVE_COUNT_ADVANCED;
      break;
    default:
      totalSoftServeToSpawn = constants.SOFT_SERVE_COUNT_BEGINNER;
  }
  softServeSpawnedCount = 0; // カウンターリセット
  console.log(
    `[Game] Time: ${currentGameTimeLimit}s, Total Soft Serves: ${totalSoftServeToSpawn}`
  );

  try {
    if (!cvUtils.isCvReady()) {
      throw new Error("OpenCV is not ready.");
    }
    console.log("OpenCV runtime confirmed.");

    // 全アイテムの画像ロード
    console.log("Loading item images...");
    try {
      await Promise.all([
        loadPoopImage(constants.POOP_IMAGE_PATH),
        loadAppleImage(constants.APPLE_IMAGE_PATH),
        loadWaterImage(constants.WATER_IMAGE_PATH),
        loadGoldAppleImage(constants.GOLD_APPLE_IMAGE_PATH), // 金りんご
        loadSoftServeImage(constants.SOFT_SERVE_IMAGE_PATH), // ソフトクリーム
      ]);
      console.log("Promise.all for image loading resolved.");
    } catch (error) {
      throw new Error(`Image preload failed: ${error?.message || "不明"}`);
    }
    console.log("All images assumed loaded/ready.");

    setGameState(constants.GAME_STATE.LOADING_CASCADE);
    if (!cvUtils.isCascadeReady()) {
      await cvUtils.loadFaceCascade();
    }
    console.log("Face cascade ready.");
    setGameState(constants.GAME_STATE.STARTING_CAMERA);
    await camera.startCamera();
    console.log("Camera ready.");
    cvUtils.initializeCvObjects();
    console.log("OpenCV objects initialized.");

    // 全アイテム配列・最大数リセット
    currentScore = 0;
    ui.updateScoreDisplay(currentScore);
    currentOpacity = 1.0;
    ui.resetVideoOpacity();
    poopInstances = [];
    appleInstances = [];
    waterInstances = [];
    goldAppleInstances = [];
    softServeInstances = [];
    currentMaxPoops = constants.BASE_MAX_POOPS;
    currentMaxApples = constants.BASE_MAX_APPLES;
    currentMaxWaters = constants.BASE_MAX_WATERS;
    currentMaxGoldApples = constants.BASE_MAX_GOLD_APPLES;
    limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
    console.log(
      `Initial Max Items: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}, G=${currentMaxGoldApples}, SS count: ${softServeSpawnedCount}/${totalSoftServeToSpawn}`
    );

    console.log("Initialization successful. Calling startCountdown...");
    startCountdown();
  } catch (error) {
    console.error("[Game] CRITICAL ERROR during initialization:", error);
    setGameState(constants.GAME_STATE.ERROR);
    cleanupResources();
    throw error;
  }
}

// --- Countdown ---
/**
 * ゲーム開始前のカウントダウン処理
 */
function startCountdown() {
  console.log("[Game] startCountdown called.");
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
/**
 * ゲームループを開始するための準備を行う
 */
function startGameLoop() {
  setGameState(constants.GAME_STATE.PLAYING);
  console.log("[Game] Game loop started!");
  remainingTime = currentGameTimeLimit;
  ui.updateTimerDisplay(remainingTime);
  currentScore = 0;
  ui.updateScoreDisplay(currentScore);
  currentOpacity = 1.0;
  ui.resetVideoOpacity();
  if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
  gameTimerIntervalId = setInterval(updateGameTimer, 1000);
  // 全アイテム配列・最大数・カウンター リセット
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  goldAppleInstances = [];
  softServeInstances = [];
  currentMaxPoops = constants.BASE_MAX_POOPS;
  currentMaxApples = constants.BASE_MAX_APPLES;
  currentMaxWaters = constants.BASE_MAX_WATERS;
  currentMaxGoldApples = constants.BASE_MAX_GOLD_APPLES;
  limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
  softServeSpawnedCount = 0; // 出現カウンターもリセット
  console.log(
    `[Game] Items/Limits reset. Soft Serve Count: ${softServeSpawnedCount}/${totalSoftServeToSpawn}`
  );
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
  if (gameRequestId) cancelAnimationFrame(gameRequestId);
  gameLoop();
}

/**
 * メインのゲームループ (毎フレーム実行される)
 */
function gameLoop() {
  if (gameState !== constants.GAME_STATE.PLAYING) {
    cleanupResources();
    return;
  }
  const now = Date.now();
  const elapsedTimeInSeconds =
    gameStartTime > 0 ? (now - gameStartTime) / 1000.0 : 0;
  detectedFaces = cvUtils.detectFaces(); // 顔検出
  ui.clearCanvas();
  if (detectedFaces) {
    for (let i = 0; i < detectedFaces.size(); ++i) {
      const faceRect = detectedFaces.get(i);
      ui.drawFaceRect(faceRect);
    }
  } // 顔矩形描画
  updateAndDrawItems(now, elapsedTimeInSeconds); // アイテム処理
  checkCollisions(); // 衝突判定
  gameRequestId = requestAnimationFrame(gameLoop);
}

/**
 * 制限時間を1秒ごとに更新し、アイテム最大数増加もチェックするタイマー関数
 */
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
  // アイテム最大数増加チェック (ソフトクリーム除く)
  if (elapsedTime >= limitIncreaseMilestone) {
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
    currentMaxGoldApples = Math.min(
      currentMaxGoldApples + constants.LIMIT_INCREASE_AMOUNT,
      constants.CAP_MAX_GOLD_APPLES
    ); // 金りんごも増加
    console.log(
      `[Level Up!] Max items: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}, G=${currentMaxGoldApples}`
    );
    limitIncreaseMilestone += constants.LIMIT_INCREASE_INTERVAL;
  }
  // 時間切れ判定
  if (remainingTime <= 0) {
    console.log("[Game] Time is up! Finalizing.");
    gameTimerIntervalId = null;
    setGameState(constants.GAME_STATE.GAMEOVER);
    ui.showResultScreen(currentScore, "TIME UP!");
  }
}

// --- Game Logic ---

/**
 * 効果音を再生するヘルパー関数
 * @param {HTMLAudioElement} audioElement 再生するAudio要素
 */
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

/**
 * アイテム生成・更新・描画 (金りんご含む)
 * @param {number} now 現在時刻 (ミリ秒)
 * @param {number} elapsedTimeInSeconds ゲーム開始からの経過時間 (秒)
 */
function updateAndDrawItems(now, elapsedTimeInSeconds) {
  let itemGenerated = false; // 通常アイテムが生成されたか
  const canvasLogicalWidth = ui.canvas ? ui.canvas.width : 640;

  // --- 通常アイテム生成判定 (Poop, Apple, Water, GoldApple) ---
  if (now >= nextItemTime) {
    const randomValue = Math.random();
    let generatedItemType = "None";
    const progress = Math.min(
      elapsedTimeInSeconds / constants.INTERVAL_REDUCTION_DURATION,
      1.0
    );
    const currentPoopSpeed =
      constants.POOP_SPEED_INITIAL +
      (constants.POOP_SPEED_FINAL - constants.POOP_SPEED_INITIAL) * progress;
    const currentAppleSpeed =
      constants.APPLE_SPEED_INITIAL +
      (constants.APPLE_SPEED_FINAL - constants.APPLE_SPEED_INITIAL) * progress;
    const currentWaterSpeed =
      constants.WATER_SPEED_INITIAL +
      (constants.WATER_SPEED_FINAL - constants.WATER_SPEED_INITIAL) * progress;
    const currentGoldAppleSpeed =
      constants.GOLD_APPLE_SPEED_INITIAL +
      (constants.GOLD_APPLE_SPEED_FINAL - constants.GOLD_APPLE_SPEED_INITIAL) *
        progress;

    if (randomValue < constants.POOP_THRESHOLD) {
      if (poopInstances.length < currentMaxPoops) {
        poopInstances.push(new Poop(canvasLogicalWidth, currentPoopSpeed));
        itemGenerated = true;
        generatedItemType = "Poop";
      }
    } else if (randomValue < constants.APPLE_THRESHOLD) {
      if (appleInstances.length < currentMaxApples) {
        appleInstances.push(new Apple(canvasLogicalWidth, currentAppleSpeed));
        itemGenerated = true;
        generatedItemType = "Apple";
      }
    } else if (randomValue < constants.WATER_THRESHOLD) {
      if (waterInstances.length < currentMaxWaters) {
        waterInstances.push(new Water(canvasLogicalWidth, currentWaterSpeed));
        itemGenerated = true;
        generatedItemType = "Water";
      }
    } else if (randomValue < constants.GOLD_APPLE_THRESHOLD) {
      if (goldAppleInstances.length < currentMaxGoldApples) {
        goldAppleInstances.push(
          new GoldApple(canvasLogicalWidth, currentGoldAppleSpeed)
        );
        itemGenerated = true;
        generatedItemType = "GoldApple";
      }
    }
    // それ以外(確率の残り)は何もしない

    // --- 次の「通常アイテム」生成時刻計算 ---
    if (itemGenerated) {
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
        `[Game ItemGen] --- ${generatedItemType} generated! Counts:(P${poopInstances.length}, A${appleInstances.length}, W${waterInstances.length}, G${goldAppleInstances.length}, S${softServeInstances.length}) Next regular: ${nextItemTime}`
      );
    } else {
      nextItemTime = now + 150; // スキップ時は短い間隔で再試行
    }
  }

  // --- ★★★ ソフトクリーム生成判定 (通常アイテム生成とは別の確率判定) ★★★ ---
  if (
    softServeSpawnedCount < totalSoftServeToSpawn &&
    softServeInstances.length === 0 &&
    Math.random() < constants.SOFT_SERVE_SPAWN_CHANCE
  ) {
    console.log("[ItemGen] !!! Attempting to spawn Soft Serve !!!");
    softServeInstances.push(
      new SoftServe(canvasLogicalWidth, constants.SOFT_SERVE_SPEED)
    ); // 固定速度を使用
    softServeSpawnedCount++;
    console.log(
      `[ItemGen] --- SoftServe generated! (${softServeSpawnedCount}/${totalSoftServeToSpawn}) ---`
    );
    // ソフトクリーム生成は nextItemTime に影響しない
  }

  // --- 既存アイテムの更新と描画 (全種類) ---
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
  goldAppleInstances.forEach((g) => {
    if (g.active) {
      g.update();
      g.draw();
    }
  }); // 金りんご
  softServeInstances.forEach((s) => {
    if (s.active) {
      s.update();
      s.draw();
    }
  }); // ソフトクリーム

  // --- 非アクティブなアイテムを削除 (全種類) ---
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active);
  goldAppleInstances = goldAppleInstances.filter((g) => g.active); // 金りんご
  softServeInstances = softServeInstances.filter((s) => s.active); // ソフトクリーム
}

/** 衝突判定 (金りんご含む) */
function checkCollisions() {
  if (!detectedFaces || detectedFaces.size() === 0) return;
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
        addScore(constants.APPLE_SCORE);
        playSound(ui.sfxItem);
        apple.active = false;
      }
    }
    // 水
    for (const water of waterInstances) {
      if (water.active && water.checkCollisionWithFace(faceRect)) {
        console.log("Got Water!");
        applyWaterEffect();
        playSound(ui.sfxItem);
        water.active = false;
      }
    }
    // 金りんご
    for (const goldApple of goldAppleInstances) {
      if (goldApple.active && goldApple.checkCollisionWithFace(faceRect)) {
        console.log("Got GOLDEN Apple!");
        addScore(constants.GOLD_APPLE_SCORE);
        playSound(ui.sfxItem);
        goldApple.active = false;
      }
    }
    // ★★★ ソフトクリーム ★★★
    for (const softServe of softServeInstances) {
      if (softServe.active && softServe.checkCollisionWithFace(faceRect)) {
        console.log("Got Soft Serve!");
        addScore(constants.SOFT_SERVE_SCORE); // スコア加算
        playSound(ui.sfxItem); // アイテム取得音
        softServe.active = false; // 非アクティブ化
      }
    }
  }
}

/** スコア加算 */
function addScore(points) {
  console.log(
    `[addScore] Called with points: ${points}. Current score before add: ${currentScore}`
  );
  if (gameState !== constants.GAME_STATE.PLAYING) {
    console.log("[addScore] Aborted: Not in PLAYING state.");
    return;
  }
  currentScore += points;
  console.log(
    `[addScore] Score updated to: ${currentScore}. Calling ui.updateScoreDisplay...`
  );
  ui.updateScoreDisplay(currentScore);
}

/** ペナルティ適用 */
function applyPenalty() {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  currentOpacity -= constants.OPACITY_DECREMENT;
  if (currentOpacity < 0) currentOpacity = 0;
  ui.setVideoOpacity(currentOpacity);
  console.log(`Penalty applied! Current opacity: ${currentOpacity.toFixed(1)}`);
  checkGameOver();
}

/** 水アイテム効果適用 */
function applyWaterEffect() {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  if (currentOpacity >= 1.0) {
    console.log("Opacity max. Bonus score!");
    console.log("[Water Effect] Opacity is max. Calling addScore for bonus...");
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

/** ゲームオーバーチェック (Opacity) */
function checkGameOver() {
  if (
    gameState === constants.GAME_STATE.PLAYING &&
    currentOpacity <= constants.OPACITY_THRESHOLD
  ) {
    console.log("[Game] Opacity threshold reached! Game Over.");
    setGameState(constants.GAME_STATE.GAMEOVER); // BGM制御なし
    ui.showResultScreen(currentScore, "GAME OVER");
  }
}

// --- State Management and Cleanup ---
/** ゲームの状態を設定（BGM制御なし）*/
function setGameState(newState) {
  const oldState = gameState;
  if (oldState === newState) return;
  console.log(`[Game] Changing state from ${oldState} to ${newState}`);
  gameState = newState;
  console.log(`[Game] State is now: ${gameState}`);
  // BGM制御ロジックは削除済み
}
/** 現在のゲーム状態取得 */
export function getCurrentGameState() {
  return gameState;
}

/** リソース解放 */
function cleanupResources() {
  console.log("Cleaning up game resources...");
  // BGM停止処理削除済み
  camera.stopCamera();
  cvUtils.cleanupCvResources(false);
  // 全アイテム配列をクリア
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  goldAppleInstances = [];
  softServeInstances = []; // ★★★ ソフトクリームも追加 ★★★
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
