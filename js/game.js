// js/game.js

import * as constants from "./constants.js";
import * as ui from "./ui.js";
import * as camera from "./camera.js";
import * as cvUtils from "./opencvUtils.js";
import { Poop, loadPoopImage } from "./poop.js";
import { Apple, loadAppleImage } from "./item.js";
import { Water, loadWaterImage } from "./water.js";
import { GoldApple, loadGoldAppleImage } from "./goldApple.js";
import { SoftServe, loadSoftServeImage } from "./softServe.js";

// --- Game State Variables ---
let gameState = constants.GAME_STATE.IDLE;
let currentOpacity = 1.0;
let poopInstances = [];
let appleInstances = [];
let waterInstances = [];
let goldAppleInstances = [];
let softServeInstances = [];
let nextItemTime = 0; // 次の通常アイテム生成時刻 (performance.now() ベースのms)
let gameRequestId = null; // requestAnimationFrame ID
let countdownIntervalId = null; // カウントダウンタイマー ID
let detectedFaces = null; // 検出された顔
let remainingTime = 0; // 残り時間
let gameTimerIntervalId = null; // ゲーム時間タイマー ID
let currentScore = 0; // 現在のスコア
let currentGameTimeLimit = 0; // 現在のゲームの制限時間
// 現在のアイテム最大数
let currentMaxPoops = constants.BASE_MAX_POOPS;
let currentMaxApples = constants.BASE_MAX_APPLES;
let currentMaxWaters = constants.BASE_MAX_WATERS;
let currentMaxGoldApples = constants.BASE_MAX_GOLD_APPLES;
// ソフトクリーム用カウンター
let totalSoftServeToSpawn = 0; // ゲームごとの総出現数
let softServeSpawnedCount = 0; // 現在の出現済み数
// 次に最大数が増える目標経過時間(秒)
let limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
let gameStartTime = 0; // ゲームプレイ開始のタイムスタンプ(performance.now()ベース ms)
let lastTimestamp = 0; // デルタタイム計算用 (performance.now()ベース ms)
let comboMultiplier = 1.0; // コンボ倍率

// --- Initialization ---
/**
 * ゲームの初期化処理を開始する
 * @param {number} timeLimit 選択されたゲームの制限時間（秒）
 */
export async function initializeGame(timeLimit) {
  console.log("[Game] Starting initialization...");
  // ゲームが既に開始中、または初期化中なら何もしない
  if (
    gameState === constants.GAME_STATE.INITIALIZING ||
    gameState === constants.GAME_STATE.PLAYING ||
    gameState === constants.GAME_STATE.COUNTDOWN
  ) {
    console.warn("[Game] Aborted: Already active or initializing.");
    return;
  }
  setGameState(constants.GAME_STATE.INITIALIZING); // 状態変更

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
    // OpenCV ランタイム準備確認
    console.log("[Game] Checking OpenCV readiness...");
    if (!cvUtils.isCvReady()) {
      throw new Error("OpenCV is not ready.");
    }
    console.log("[Game] OpenCV runtime confirmed.");

    // 全アイテムの画像ロード
    console.log("[Game] Loading item images...");
    try {
      await Promise.all([
        loadPoopImage(constants.POOP_IMAGE_PATH),
        loadAppleImage(constants.APPLE_IMAGE_PATH),
        loadWaterImage(constants.WATER_IMAGE_PATH),
        loadGoldAppleImage(constants.GOLD_APPLE_IMAGE_PATH),
        loadSoftServeImage(constants.SOFT_SERVE_IMAGE_PATH),
      ]);
      console.log("[Game] Promise.all for image loading resolved.");
    } catch (error) {
      throw new Error(`Image preload failed: ${error?.message || "不明"}`);
    }
    console.log("[Game] All images assumed loaded/ready.");

    // 顔検出モデルロード
    console.log("[Game] Checking/Loading face cascade...");
    setGameState(constants.GAME_STATE.LOADING_CASCADE);
    if (!cvUtils.isCascadeReady()) {
      await cvUtils.loadFaceCascade();
    }
    console.log("[Game] Face cascade ready.");

    // カメラ起動
    console.log("[Game] Starting camera...");
    setGameState(constants.GAME_STATE.STARTING_CAMERA);
    await camera.startCamera();
    console.log("[Game] Camera ready.");

    // OpenCVオブジェクト初期化
    console.log("[Game] Initializing OpenCV objects...");
    cvUtils.initializeCvObjects();
    console.log("[Game] OpenCV objects initialized.");

    // ゲーム変数リセット
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

    // カウントダウン開始へ
    console.log("[Game] Initialization successful. Calling startCountdown...");
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
  console.log(`[Game] Initial count: ${count}`);
  ui.showGameMessage(count);
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
  }
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
  console.log(`[Game] Countdown timer set ID: ${countdownIntervalId}`);
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
  softServeSpawnedCount = 0; // カウンターリセット
  console.log(
    `[Game] Items/Limits reset. Soft Serve Count: ${softServeSpawnedCount}/${totalSoftServeToSpawn}`
  );
  gameStartTime = performance.now(); // ★★★ performance.now() を使用 ★★★
  console.log(`[Game] gameStartTime set to: ${gameStartTime.toFixed(0)}`);
  try {
    const initialInterval =
      Math.random() *
        (constants.ITEM_GENERATION_INTERVAL_MAX_INITIAL -
          constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL) +
      constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL;
    if (isNaN(initialInterval) || initialInterval <= 0) {
      throw new Error("Calculated initialInterval is invalid");
    }
    nextItemTime = gameStartTime + initialInterval;
    console.log(
      `%c[Game] Initial nextItemTime calculated: ${nextItemTime.toFixed(
        0
      )} (current: ${gameStartTime.toFixed(
        0
      )}, interval: ${initialInterval.toFixed(0)}ms)`,
      "color: green;"
    );
  } catch (e) {
    console.error("[Game] Error calculating initial nextItemTime:", e);
    nextItemTime = gameStartTime + 1000; // Fallback
    console.log(
      `%c[Game] Using fallback nextItemTime: ${nextItemTime.toFixed(0)}`,
      "color: orange;"
    );
  }
  lastTimestamp = 0; // デルタタイム用リセット
  if (gameRequestId) cancelAnimationFrame(gameRequestId);
  gameRequestId = requestAnimationFrame(gameLoop); // ★★★ gameLoop を初回呼び出し ★★★
  console.log("[Game] Starting game loop (requesting first frame)...");
}

/**
 * メインのゲームループ (デルタタイム実装)
 * @param {DOMHighResTimeStamp} timestamp - requestAnimationFrameから渡されるタイムスタンプ
 */
function gameLoop(timestamp) {
  if (!timestamp) timestamp = performance.now(); // フォールバック
  if (gameState !== constants.GAME_STATE.PLAYING) {
    cleanupResources();
    return;
  }

  // --- デルタタイム計算 ---
  if (lastTimestamp === 0) {
    // 最初の有効なフレーム
    console.log(`[gameLoop] First frame, timestamp: ${timestamp.toFixed(0)}`);
    lastTimestamp = timestamp;
    gameRequestId = requestAnimationFrame(gameLoop);
    return;
  }
  let dt = (timestamp - lastTimestamp) / 1000.0; // 秒単位
  lastTimestamp = timestamp;
  const maxDt = 1 / 15; // 約66ms
  if (dt <= 0) {
    dt = 1 / 60;
  } // ゼロ/負ガード
  if (dt > maxDt) {
    dt = maxDt;
  } // 上限キャップ
  // --- デルタタイム計算ここまで ---

  // 経過時間 (秒)
  const elapsedTimeInSeconds =
    gameStartTime > 0 ? (timestamp - gameStartTime) / 1000.0 : 0;

  // 顔検出 -> Canvasクリア -> 顔描画
  detectedFaces = cvUtils.detectFaces();
  ui.clearCanvas();
  if (detectedFaces) {
    for (let i = 0; i < detectedFaces.size(); ++i) {
      ui.drawFaceRect(detectedFaces.get(i));
    }
  }

  // アイテム処理に timestamp と dt を渡す
  updateAndDrawItems(timestamp, elapsedTimeInSeconds, dt);

  // 衝突判定
  checkCollisions();

  // 次のフレームを要求
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

  // 経過時間計算 (performance.now() 基準)
  const now = performance.now();
  const elapsedTime = gameStartTime > 0 ? (now - gameStartTime) / 1000.0 : 0;

  // アイテム最大数増加チェック (ソフトクリーム除く)
  if (elapsedTime >= limitIncreaseMilestone) {
    console.log(
      `[Game] Milestone ${limitIncreaseMilestone}s reached at ${elapsedTime.toFixed(
        1
      )}s.`
    );
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
    );
    console.log(
      `[Level Up!] Max items: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}, G=${currentMaxGoldApples}`
    );
    limitIncreaseMilestone += constants.LIMIT_INCREASE_INTERVAL;
    console.log(`[Game] Next milestone set to: ${limitIncreaseMilestone}s.`);
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
 * アイテム生成・更新・描画 (時刻基準を timestamp に統一)
 * @param {DOMHighResTimeStamp} timestamp - 現在のフレームのタイムスタンプ (ms)
 * @param {number} elapsedTimeInSeconds - ゲーム開始からの経過時間 (秒)
 * @param {number} dt - デルタタイム(s)
 */
function updateAndDrawItems(timestamp, elapsedTimeInSeconds, dt) {
  let itemGenerated = false;
  const canvasLogicalWidth = ui.canvas ? ui.canvas.width : 640;

  // ★★★ ログ: 生成タイミングチェック (timestamp 基準) ★★★
  console.log(
    `[ItemGen Timing Check] timestamp: ${timestamp.toFixed(
      0
    )}, nextItemTime: ${nextItemTime.toFixed(0)}, diff: ${(
      timestamp - nextItemTime
    ).toFixed(0)}`
  );

  // --- アイテム生成判定 (timestamp 基準) ---
  if (timestamp >= nextItemTime) {
    console.log(
      `%c[ItemGen] Time condition MET. (timestamp: ${timestamp.toFixed(
        0
      )} >= next: ${nextItemTime.toFixed(0)})`,
      "color: blue;"
    );
    const randomValue = Math.random();
    let generatedItemType = "None";

    // 現在の速度計算
    const progress = Math.min(
      elapsedTimeInSeconds / constants.INTERVAL_REDUCTION_DURATION,
      1.0
    );
    if (constants.INTERVAL_REDUCTION_DURATION <= 0) {
      progress = 1.0;
    }
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
    console.log(
      `[ItemGen Speeds] P:${currentPoopSpeed.toFixed(
        1
      )}, A:${currentAppleSpeed.toFixed(1)}, W:${currentWaterSpeed.toFixed(
        1
      )}, G:${currentGoldAppleSpeed.toFixed(1)}, S:${
        constants.SOFT_SERVE_SPEED
      }`
    );

    // 生成確率と現在の最大数に基づいて生成試行
    console.log(
      `[ItemGen Limits] P:${poopInstances.length}/${currentMaxPoops} A:${appleInstances.length}/${currentMaxApples} W:${waterInstances.length}/${currentMaxWaters} G:${goldAppleInstances.length}/${currentMaxGoldApples} S:${softServeInstances.length}(${softServeSpawnedCount}/${totalSoftServeToSpawn})`
    );
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

    // --- 次の生成時刻計算 (timestamp 基準) ---
    const oldNextItemTime = nextItemTime;
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
      if (isNaN(interval) || interval <= 0) {
        console.error(`Invalid interval: ${interval}.`);
        nextItemTime = timestamp + 150;
      } else {
        nextItemTime = timestamp + interval;
      } // ★★★ timestamp を使用 ★★★
      console.log(
        `[Game ItemGen] --- ${generatedItemType} generated! Counts:(P${
          poopInstances.length
        }, ...) New next: ${nextItemTime.toFixed(0)}`
      );
    } else {
      nextItemTime = timestamp + 150; // ★★★ timestamp を使用 ★★★
      console.log(
        `[Game ItemGen] Generation skipped. New next: ${nextItemTime.toFixed(
          0
        )}`
      );
    }
    console.log(
      `[ItemGen Timing Update] oldNext: ${oldNextItemTime.toFixed(
        0
      )}, newNext: ${nextItemTime.toFixed(0)}, diff: ${(
        nextItemTime - oldNextItemTime
      ).toFixed(0)}`
    );
    if (nextItemTime <= timestamp) {
      console.error(
        `[ItemGen Timing ERROR] newNext (${nextItemTime.toFixed(
          0
        )}) <= timestamp (${timestamp.toFixed(0)})!`
      );
    }
  } // end if (timestamp >= nextItemTime)

  // --- ソフトクリーム生成判定 (timestamp 基準) ---
  if (
    softServeSpawnedCount < totalSoftServeToSpawn &&
    softServeInstances.length === 0 &&
    Math.random() < constants.SOFT_SERVE_SPAWN_CHANCE
  ) {
    softServeInstances.push(
      new SoftServe(canvasLogicalWidth, constants.SOFT_SERVE_SPEED)
    );
    softServeSpawnedCount++;
    console.log(
      `[ItemGen] --- SoftServe generated! (${softServeSpawnedCount}/${totalSoftServeToSpawn}) ---`
    );
  }

  // --- 既存アイテムの更新と描画 (dt を渡す) ---
  poopInstances.forEach((p) => {
    if (p.active) {
      p.update(dt);
      p.draw();
    }
  });
  appleInstances.forEach((a) => {
    if (a.active) {
      a.update(dt);
      a.draw();
    }
  });
  waterInstances.forEach((w) => {
    if (w.active) {
      w.update(dt);
      w.draw();
    }
  });
  goldAppleInstances.forEach((g) => {
    if (g.active) {
      g.update(dt);
      g.draw();
    }
  });
  softServeInstances.forEach((s) => {
    if (s.active) {
      s.update(dt);
      s.draw();
    }
  });

  // --- 非アクティブなアイテムを削除 ---
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active);
  goldAppleInstances = goldAppleInstances.filter((g) => g.active);
  softServeInstances = softServeInstances.filter((s) => s.active);
}

/** 衝突判定 (変更なし) */
function checkCollisions() {
  if (!detectedFaces || detectedFaces.size() === 0) return;
  for (let i = 0; i < detectedFaces.size(); ++i) {
    const faceRect = detectedFaces.get(i);
    for (const poop of poopInstances) {
      if (poop.active && poop.checkCollisionWithFace(faceRect)) {
        applyPenalty();
        playSound(ui.sfxPoop);
        poop.active = false;
      }
    }
    for (const apple of appleInstances) {
      if (apple.active && apple.checkCollisionWithFace(faceRect)) {
        addScore(constants.APPLE_SCORE);
        playSound(ui.sfxItem);
        apple.active = false;
        increaseCombo(faceRect);
      }
    }
    for (const water of waterInstances) {
      if (water.active && water.checkCollisionWithFace(faceRect)) {
        applyWaterEffect();
        playSound(ui.sfxItem);
        water.active = false;
        increaseCombo(faceRect);
      }
    }
    for (const goldApple of goldAppleInstances) {
      if (goldApple.active && goldApple.checkCollisionWithFace(faceRect)) {
        addScore(constants.GOLD_APPLE_SCORE);
        playSound(ui.sfxItem);
        goldApple.active = false;
        increaseCombo(faceRect);
      }
    }
    for (const softServe of softServeInstances) {
      if (softServe.active && softServe.checkCollisionWithFace(faceRect)) {
        addScore(constants.SOFT_SERVE_SCORE);
        playSound(ui.sfxItem);
        softServe.active = false;
        increaseCombo(faceRect);
      }
    }
  }
}

/** スコア加算 (コンボ倍率適用) */
function addScore(basePoints) {
  console.log(
    `[addScore] Base: ${basePoints}, Multiplier: x${comboMultiplier.toFixed(1)}`
  );
  if (gameState !== constants.GAME_STATE.PLAYING) {
    return;
  }
  const actualScoreToAdd = Math.round(basePoints * comboMultiplier); // 倍率適用
  currentScore += actualScoreToAdd;
  console.log(
    `[addScore] Score updated to: ${currentScore} (+${actualScoreToAdd}). Calling UI update.`
  );
  ui.updateScoreDisplay(currentScore);
}

/** ペナルティ適用 (コンボリセット) */
function applyPenalty() {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  currentOpacity -= constants.OPACITY_DECREMENT;
  if (currentOpacity < 0) currentOpacity = 0;
  ui.setVideoOpacity(currentOpacity);
  console.log(`Penalty! Opacity: ${currentOpacity.toFixed(1)}`);

  // コンボリセット
  if (comboMultiplier > 1.0) {
    console.log(
      `%c[Combo] Reset! Was x${comboMultiplier.toFixed(1)}`,
      "color: red;"
    );
    comboMultiplier = 1.0;
    ui.updateComboDisplay(comboMultiplier); // UI更新(非表示になる)
  }
  checkGameOver();
}
/**
 * 水アイテム効果適用
 */
function applyWaterEffect() {
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  if (currentOpacity >= 1.0) {
    console.log("Opacity max. Bonus score!");
    addScore(constants.WATER_BONUS_SCORE); // ボーナススコア (内部で倍率適用)
  } else {
    currentOpacity += constants.WATER_OPACITY_RECOVERY;
    if (currentOpacity > 1.0) currentOpacity = 1.0;
    ui.setVideoOpacity(currentOpacity);
    console.log(
      `Water recovered opacity! Opacity: ${currentOpacity.toFixed(1)}`
    );
  }
  // 水取得でもコンボは増加するので、increaseComboはcheckCollisionsで呼ぶ
}

/** ★★★ 追加: コンボ倍率を増加させる関数 ★★★ */
function increaseCombo(faceRect) {
  console.log(
    `[increaseCombo] Called. Current multiplier: x${comboMultiplier.toFixed(1)}`
  );
  comboMultiplier += 0.02;
  comboMultiplier = parseFloat(comboMultiplier.toFixed(2));
  console.log(
    `%c[Combo] Increased! Multiplier now x${comboMultiplier.toFixed(1)}`,
    "color: orange;"
  );

  // --- 表示座標の計算 ---
  let displayX = 0;
  let displayY = 0;
  if (faceRect && ui.gameContainer && ui.canvas) {
    const containerWidth = ui.gameContainer.clientWidth;
    const containerHeight = ui.gameContainer.clientHeight; // ほぼ使わないが表示域確認用
    const canvasLogicalWidth = ui.canvas.width;
    const canvasLogicalHeight = ui.canvas.height;

    if (
      containerWidth > 0 &&
      canvasLogicalWidth > 0 &&
      containerHeight > 0 &&
      canvasLogicalHeight > 0
    ) {
      // 顔の中心の論理座標
      const faceCenterX = faceRect.x + faceRect.width / 2;
      const faceCenterY = faceRect.y + faceRect.height / 2;

      // スケーリングファクター
      const scaleX = containerWidth / canvasLogicalWidth;
      const scaleY = containerHeight / canvasLogicalHeight;

      // CSS座標に変換 (左右反転考慮)
      displayX = containerWidth - faceCenterX * scaleX;
      displayY = faceCenterY * scaleY;

      // 画面端にはみ出さないように微調整 (任意)
      const comboElemWidthApprox = 60; // コンボ表示要素のだいたいの幅
      const comboElemHeightApprox = 30; // コンボ表示要素のだいたいの高さ
      displayX = Math.max(
        comboElemWidthApprox / 2 + 10,
        Math.min(containerWidth - comboElemWidthApprox / 2 - 10, displayX)
      );
      displayY = Math.max(
        comboElemHeightApprox / 2 + 10,
        Math.min(containerHeight - comboElemHeightApprox / 2 - 10, displayY)
      );

      console.log(
        `[increaseCombo] Calculated display position: CSS X=${displayX.toFixed(
          0
        )}, CSS Y=${displayY.toFixed(0)}`
      );
    } else {
      console.warn(
        "[increaseCombo] Could not calculate display position due to invalid dimensions."
      );
      // 中央などにフォールバック表示する？ or 表示しない？ -> 表示しない
      ui.updateComboDisplay(comboMultiplier); // 位置指定なしで呼ぶ (隠れる or 固定位置)
      return; // 座標計算失敗時はここで終了
    }
  } else {
    console.warn(
      "[increaseCombo] faceRect or container/canvas missing for position calculation."
    );
    ui.updateComboDisplay(comboMultiplier); // 位置指定なしで呼ぶ (隠れる or 固定位置)
    return; // 座標計算失敗時はここで終了
  }

  // ★★★ 計算した座標を渡してUI表示更新（一時表示） ★★★
  ui.updateComboDisplay(comboMultiplier, displayX, displayY);
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

/** BGM停止・リセット (ヘルパー関数) */
function stopBGM(bgmElement, bgmName = "BGM") {
  if (
    bgmElement &&
    typeof bgmElement.pause === "function" &&
    !bgmElement.paused
  ) {
    bgmElement.pause();
    bgmElement.currentTime = 0;
    console.log(`[Audio] ${bgmName} stopped and reset.`);
  } else if (bgmElement && bgmElement.paused) {
    bgmElement.currentTime = 0; // 停止中でも頭出し
  }
}

/** BGM再生開始 (ヘルパー関数) */
function playBGM(bgmElement, bgmName = "BGM") {
  if (
    bgmElement &&
    typeof bgmElement.play === "function" &&
    bgmElement.paused
  ) {
    // 停止中なら再生
    bgmElement.currentTime = 0; // 頭出し
    const playPromise = bgmElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then((_) => {
          console.log(`[Audio] ${bgmName} started playing.`);
        })
        .catch((error) => {
          console.warn(`[Audio] ${bgmName} auto-play prevented:`, error);
        });
    }
  } else if (!bgmElement) {
    console.warn(`[Audio] ${bgmName} element not found or invalid.`);
  }
}

/**
 * ★★★ 修正: ゲームの状態を設定し、BGMを制御（シンプル版） ★★★
 * @param {string} newState 新しいゲーム状態
 */
function setGameState(newState) {
  const oldState = gameState;
  if (oldState === newState) return;

  console.log(`[Game] Changing state from ${oldState} to ${newState}`);
  gameState = newState;
  console.log(`[Game] State is now: ${gameState}`);

  // --- BGM Control Logic ---
  if (newState === constants.GAME_STATE.PLAYING) {
    // プレイ開始時: ホームBGM停止、ゲームBGM開始
    stopBGM(ui.bgmHome, "Home BGM");
    // stopBGM(ui.bgmFinal, "Final BGM"); // bgmFinal削除
    playBGM(ui.bgm, "Gameplay BGM");
  } else {
    // プレイ中以外: ゲームBGM停止、ホームBGM開始
    stopBGM(ui.bgm, "Gameplay BGM");
    // stopBGM(ui.bgmFinal, "Final BGM"); // bgmFinal削除
    playBGM(ui.bgmHome, "Home BGM");
  }
  // --- End of BGM Control ---
}

/** リソース解放 */
function cleanupResources() {
  console.log("Cleaning up game resources...");
  // ★★★ bgmFinal 停止処理を削除 ★★★
  stopBGM(ui.bgm, "Gameplay BGM");
  stopBGM(ui.bgmHome, "Home BGM");
  // 他のリソース解放処理
  camera.stopCamera();
  cvUtils.cleanupCvResources(false);
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  goldAppleInstances = [];
  softServeInstances = [];
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
