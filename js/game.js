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
let comboMultiplier = 1.0; // ★★★ 追加: コンボ倍率 ★★★

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
  // (コンボ表示リセット部分変更)
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
  softServeSpawnedCount = 0;
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

  // ★★★ コンボ倍率リセット & UI非表示 ★★★
  comboMultiplier = 1.0;
  ui.hideComboDisplay(); // 確実に隠す

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
  let regularItemGenerated = false; // ★★★ 通常アイテムが生成されたかのフラグ ★★★
  const canvasLogicalWidth = ui.canvas ? ui.canvas.width : 640;

  // --- アイテム生成タイミングかチェック ---
  if (now >= nextItemTime) {
    const randomValue = Math.random();
    let generatedItemType = "None"; // 生成された通常アイテムの種類記録用

    // 現在の速度計算
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

    // --- 通常アイテム (Poop, Apple, Water, GoldApple) の生成試行 ---
    if (randomValue < constants.POOP_THRESHOLD) {
      if (poopInstances.length < currentMaxPoops) {
        poopInstances.push(new Poop(canvasLogicalWidth, currentPoopSpeed));
        regularItemGenerated = true;
        generatedItemType = "Poop";
      }
    } else if (randomValue < constants.APPLE_THRESHOLD) {
      if (appleInstances.length < currentMaxApples) {
        appleInstances.push(new Apple(canvasLogicalWidth, currentAppleSpeed));
        regularItemGenerated = true;
        generatedItemType = "Apple";
      }
    } else if (randomValue < constants.WATER_THRESHOLD) {
      if (waterInstances.length < currentMaxWaters) {
        waterInstances.push(new Water(canvasLogicalWidth, currentWaterSpeed));
        regularItemGenerated = true;
        generatedItemType = "Water";
      }
    } else if (randomValue < constants.GOLD_APPLE_THRESHOLD) {
      // 金りんごの確率範囲
      if (goldAppleInstances.length < currentMaxGoldApples) {
        goldAppleInstances.push(
          new GoldApple(canvasLogicalWidth, currentGoldAppleSpeed)
        );
        regularItemGenerated = true;
        generatedItemType = "GoldApple";
      }
    }
    // それ以外の確率では通常アイテムは生成されない

    // ★★★ ソフトクリーム生成試行 (通常アイテムのタイミングで、追加の確率判定) ★★★
    if (
      softServeSpawnedCount < totalSoftServeToSpawn &&
      softServeInstances.length === 0
    ) {
      if (Math.random() < constants.SOFT_SERVE_SPAWN_CHANCE) {
        // さらに確率判定
        console.log("[ItemGen] !!! Attempting to spawn Soft Serve !!!");
        softServeInstances.push(
          new SoftServe(canvasLogicalWidth, constants.SOFT_SERVE_SPEED)
        );
        softServeSpawnedCount++;
        console.log(
          `[ItemGen] --- SoftServe generated! (${softServeSpawnedCount}/${totalSoftServeToSpawn}) ---`
        );
        // ソフトクリーム生成は regularItemGenerated フラグに影響しない
      }
    }

    // --- 次の「通常アイテム」生成時刻計算 ---
    if (regularItemGenerated) {
      // 通常アイテムが生成された場合、次の間隔を動的に計算
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
        `[Game ItemGen] --- ${generatedItemType} generated! New next regular item time: ${nextItemTime}`
      );
    } else {
      // 通常アイテムが生成されなかった場合 (上限 or 確率漏れ)
      nextItemTime = now + 150; // 短い間隔で次の生成タイミングを待つ
      // console.log(`[Game ItemGen] Regular item generation skipped/missed. Next check in 150ms.`);
    }
  } // --- アイテム生成タイミングのチェック終了 ---

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
  });
  softServeInstances.forEach((s) => {
    if (s.active) {
      s.update();
      s.draw();
    }
  }); // ソフトクリームも

  // --- 非アクティブなアイテムを削除 (全種類) ---
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active);
  goldAppleInstances = goldAppleInstances.filter((g) => g.active);
  softServeInstances = softServeInstances.filter((s) => s.active); // ソフトクリームも
}

/** 衝突判定 (効果音呼び出しを ui.playSfx に変更) */
function checkCollisions() {
  if (!detectedFaces || detectedFaces.size() === 0) return;
  for (let i = 0; i < detectedFaces.size(); ++i) {
    const faceRect = detectedFaces.get(i);
    let hitNonPoopItemThisFace = false;

    // 糞
    for (const poop of poopInstances) {
      if (poop.active && poop.checkCollisionWithFace(faceRect)) {
        console.log("Hit Poop!");
        applyPenalty();
        ui.playSfx("poop"); // ★★★ 変更 ★★★
        poop.active = false;
      }
    }
    // りんご
    for (const apple of appleInstances) {
      if (apple.active && apple.checkCollisionWithFace(faceRect)) {
        console.log("Got Apple!");
        addScore(constants.APPLE_SCORE);
        ui.playSfx("item"); // ★★★ 変更 ★★★
        apple.active = false;
        hitNonPoopItemThisFace = true;
      }
    }
    // 水
    for (const water of waterInstances) {
      if (water.active && water.checkCollisionWithFace(faceRect)) {
        console.log("Got Water!");
        applyWaterEffect();
        ui.playSfx("item"); // ★★★ 変更 ★★★
        water.active = false;
        hitNonPoopItemThisFace = true;
      }
    }
    // 金りんご
    for (const goldApple of goldAppleInstances) {
      if (goldApple.active && goldApple.checkCollisionWithFace(faceRect)) {
        console.log("Got GOLDEN Apple!");
        addScore(constants.GOLD_APPLE_SCORE);
        ui.playSfx("item"); // ★★★ 変更 ★★★
        goldApple.active = false;
        hitNonPoopItemThisFace = true;
      }
    }
    // ソフトクリーム
    for (const softServe of softServeInstances) {
      if (softServe.active && softServe.checkCollisionWithFace(faceRect)) {
        console.log("Got Soft Serve!");
        addScore(constants.SOFT_SERVE_SCORE);
        ui.playSfx("item"); // ★★★ 変更 ★★★
        softServe.active = false;
        hitNonPoopItemThisFace = true;
      }
    }

    // コンボ増加判定
    if (hitNonPoopItemThisFace) {
      increaseCombo(faceRect);
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
  comboMultiplier += 0.1;
  comboMultiplier = parseFloat(comboMultiplier.toFixed(1)); // 小数点調整
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
