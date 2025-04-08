// js/game.js

import * as constants from "./constants.js";
import * as ui from "./ui.js"; // bgm, bgmHome, bgmFinal など含む
import * as camera from "./camera.js";
import * as cvUtils from "./opencvUtils.js";
import { Poop, loadPoopImage } from "./poop.js";
import { Apple, loadAppleImage } from "./item.js";
import { Water, loadWaterImage } from "./water.js"; // water.png を使うバージョン

// --- Game State Variables ---
let gameState = constants.GAME_STATE.IDLE;
let currentOpacity = 1.0;
let poopInstances = []; // 糞インスタンスの配列
let appleInstances = []; // りんごインスタンスの配列
let waterInstances = []; // 水インスタンスの配列
let nextItemTime = 0; // 次のアイテム生成時刻
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
// 次に最大数が増える目標経過時間(秒)
let limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
let gameStartTime = 0; // ゲームプレイ開始時刻 (ms)

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
  setGameState(constants.GAME_STATE.INITIALIZING); // 状態変更 (BGMは止まる)

  // 制限時間設定
  if (typeof timeLimit !== "number" || timeLimit <= 0) {
    currentGameTimeLimit = constants.TIME_LIMIT_BEGINNER; // 安全のためデフォルト値
  } else {
    currentGameTimeLimit = timeLimit;
  }
  console.log(`[Game] Time limit set to: ${currentGameTimeLimit} seconds.`);

  try {
    // OpenCV ランタイム準備確認
    console.log("[Game] Checking OpenCV readiness...");
    if (!cvUtils.isCvReady()) {
      throw new Error("OpenCV is not ready.");
    }
    console.log("[Game] OpenCV runtime confirmed.");

    // 画像ファイルの並列ロード (エラー発生時はここで停止させる)
    console.log("[Game] Loading item images...");
    try {
      await Promise.all([
        loadPoopImage(constants.POOP_IMAGE_PATH),
        loadAppleImage(constants.APPLE_IMAGE_PATH),
        loadWaterImage(constants.WATER_IMAGE_PATH), // water.png をロード
      ]);
      console.log(
        "[Game] Promise.all for image loading successfully resolved."
      );
    } catch (error) {
      console.error("[Game] Image loading failed:", error);
      throw new Error(
        `Image preload failed: ${error?.message || "Unknown reason"}`
      );
    }
    console.log("[Game] All images assumed loaded/ready.");

    // 顔検出モデルロード (未ロードの場合のみ)
    console.log("[Game] Checking/Loading face cascade...");
    setGameState(constants.GAME_STATE.LOADING_CASCADE); // 状態変更 (BGMは止まる)
    if (!cvUtils.isCascadeReady()) {
      await cvUtils.loadFaceCascade(); // エラーはここでキャッチされるはず
    }
    console.log("[Game] Face cascade ready.");

    // カメラ起動
    console.log("[Game] Starting camera...");
    setGameState(constants.GAME_STATE.STARTING_CAMERA); // 状態変更 (BGMは止まる)
    await camera.startCamera(); // カメラ許可エラーなどはここで throw される
    console.log("[Game] Camera ready.");

    // OpenCVオブジェクト初期化 (Matなど)
    console.log("[Game] Initializing OpenCV objects...");
    cvUtils.initializeCvObjects(); // VideoCaptureエラーはここで throw される
    console.log("[Game] OpenCV objects initialized.");

    // ゲーム変数リセット
    currentScore = 0;
    ui.updateScoreDisplay(currentScore);
    currentOpacity = 1.0;
    ui.resetVideoOpacity();
    poopInstances = [];
    appleInstances = [];
    waterInstances = []; // アイテム配列クリア
    currentMaxPoops = constants.BASE_MAX_POOPS;
    currentMaxApples = constants.BASE_MAX_APPLES;
    currentMaxWaters = constants.BASE_MAX_WATERS;
    limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
    console.log(
      `[Game] Initial Max Items set: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}.`
    );

    // カウントダウン開始へ
    console.log("[Game] Initialization successful. Calling startCountdown...");
    startCountdown();
  } catch (error) {
    // 初期化中にエラーが発生した場合
    console.error("[Game] CRITICAL ERROR during initialization:", error);
    setGameState(constants.GAME_STATE.ERROR); // 状態をエラーに (BGMは止まる)
    cleanupResources(); // 部分的に初期化されたリソースを解放
    throw error; // エラーを main.js に伝播させる
  }
}

// --- Countdown ---
/**
 * ゲーム開始前のカウントダウン処理
 */
function startCountdown() {
  console.log("[Game] startCountdown called.");
  setGameState(constants.GAME_STATE.COUNTDOWN); // 状態変更 (BGMは止まる)
  let count = constants.COUNTDOWN_SECONDS;
  console.log(`[Game] Initial count: ${count}`);
  ui.showGameMessage(count); // 最初の数字表示

  if (countdownIntervalId) {
    console.warn("[Game] Clearing existing countdown interval.");
    clearInterval(countdownIntervalId);
  }

  // 1秒ごとに実行
  countdownIntervalId = setInterval(() => {
    // console.log(`[startCountdown] Interval tick. Count: ${count}`); // デバッグ用
    count--;

    if (count > 0) {
      ui.showGameMessage(count); // 残り秒数表示
    } else if (count === 0) {
      ui.showGameMessage("START!"); // START! 表示
    } else {
      // カウントが0未満になったら
      console.log(
        "[Game] Countdown finished. Clearing interval, hiding message, calling startGameLoop."
      );
      clearInterval(countdownIntervalId); // インターバル停止
      countdownIntervalId = null;
      ui.hideGameMessage(); // "START!" メッセージを隠す
      startGameLoop(); // ゲームループを開始
    }
  }, 1000);
  console.log(`[Game] Countdown timer set ID: ${countdownIntervalId}`);
}

// --- Game Loop ---
/**
 * ゲームループを開始するための準備を行う
 */
function startGameLoop() {
  console.log("[Game] startGameLoop called.");
  setGameState(constants.GAME_STATE.PLAYING); // 状態をプレイ中に (ここでゲーム中BGM開始)
  console.log("[Game] Game state set to PLAYING.");

  // 残り時間とスコア表示を初期化
  remainingTime = currentGameTimeLimit;
  ui.updateTimerDisplay(remainingTime);
  currentScore = 0;
  ui.updateScoreDisplay(currentScore); // スコア表示(0)
  currentOpacity = 1.0;
  ui.resetVideoOpacity(); // 透明度リセット

  // 残り時間計測タイマーを開始
  console.log("[Game] Setting up game timer...");
  if (gameTimerIntervalId) {
    clearInterval(gameTimerIntervalId);
  } // 既存タイマーをクリア
  gameTimerIntervalId = setInterval(updateGameTimer, 1000);
  console.log(`[Game] Game timer set ID: ${gameTimerIntervalId}`);

  // アイテム配列と最大数、レベルアップ時間を初期化
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  currentMaxPoops = constants.BASE_MAX_POOPS;
  currentMaxApples = constants.BASE_MAX_APPLES;
  currentMaxWaters = constants.BASE_MAX_WATERS;
  limitIncreaseMilestone = constants.LIMIT_INCREASE_INTERVAL;
  console.log(
    `[Game] Items cleared. Limits reset: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}. Next milestone: ${limitIncreaseMilestone}s.`
  );

  // ゲーム開始時刻を記録し、最初のアイテム生成時刻を設定
  gameStartTime = Date.now();
  console.log(`[Game] gameStartTime set to: ${gameStartTime}`);
  try {
    // 最初のインターバルは初期値を使用
    const initialInterval =
      Math.random() *
        (constants.ITEM_GENERATION_INTERVAL_MAX_INITIAL -
          constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL) +
      constants.ITEM_GENERATION_INTERVAL_MIN_INITIAL;
    nextItemTime = gameStartTime + initialInterval;
    console.log(
      `[Game] Initial nextItemTime calculated: ${nextItemTime} (interval: ${initialInterval.toFixed(
        0
      )}ms)`
    );
  } catch (e) {
    console.error("[Game] Error calculating initial nextItemTime:", e);
    nextItemTime = gameStartTime + 1000; // Fallback
  }

  // 既存のゲームループ (requestAnimationFrame) があればキャンセル
  if (gameRequestId) {
    cancelAnimationFrame(gameRequestId);
  }
  console.log("[Game] Starting game loop (requesting first frame)...");
  // 新しいゲームループを開始
  gameLoop();
}

/**
 * メインのゲームループ (毎フレーム実行される)
 */
function gameLoop() {
  // console.log(`[gameLoop] Frame start. State: ${gameState}`); // デバッグ用

  // ゲームがプレイ中でなければループを停止し、リソース解放
  if (gameState !== constants.GAME_STATE.PLAYING) {
    console.log(`[Game] Stopping loop because state is ${gameState}`);
    cleanupResources(); // 状態が変わったらリソース解放
    return; // ループ処理を終了
  }

  const now = Date.now();
  let elapsedTimeInSeconds = 0;
  if (gameStartTime > 0) {
    elapsedTimeInSeconds = (now - gameStartTime) / 1000.0;
  } else {
    console.warn("[Game] gameStartTime is not set!");
  }
  // console.log(`[gameLoop] Elapsed: ${elapsedTimeInSeconds.toFixed(1)}s`);

  // 顔検出を実行
  detectedFaces = cvUtils.detectFaces();
  // Canvasをクリア (顔検出枠描画用)
  ui.clearCanvas();
  // 検出された顔の周りに四角を描画
  if (detectedFaces) {
    for (let i = 0; i < detectedFaces.size(); ++i) {
      ui.drawFaceRect(detectedFaces.get(i));
    }
  }

  // アイテム（糞、りんご、水）の生成・更新・描画
  updateAndDrawItems(now, elapsedTimeInSeconds);

  // 水GIFの位置更新は不要になった

  // 衝突判定
  checkCollisions();

  // 次のフレームを要求
  gameRequestId = requestAnimationFrame(gameLoop);
}

/**
 * 制限時間を1秒ごとに更新し、アイテム最大数増加もチェックするタイマー関数
 */
function updateGameTimer() {
  // console.log(`[updateGameTimer] Tick. Remaining: ${remainingTime}, Elapsed: ${elapsedTime.toFixed(1)}s, Milestone: ${limitIncreaseMilestone}s`); // デバッグ用

  // プレイ中以外、または時間が残っていない場合はタイマーを停止して終了
  if (gameState !== constants.GAME_STATE.PLAYING || remainingTime <= 0) {
    if (gameTimerIntervalId) {
      clearInterval(gameTimerIntervalId);
      gameTimerIntervalId = null;
    }
    return;
  }

  remainingTime--; // 残り時間を減らす
  ui.updateTimerDisplay(remainingTime); // 表示更新

  // 経過時間計算
  let elapsedTime = 0;
  if (gameStartTime > 0) {
    elapsedTime = (Date.now() - gameStartTime) / 1000.0;
  } else {
    elapsedTime = currentGameTimeLimit - remainingTime;
  } // Fallback

  // アイテム最大数増加チェック
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
    console.log(
      `[Level Up!] Increased max items: P=${currentMaxPoops}, A=${currentMaxApples}, W=${currentMaxWaters}`
    );
    limitIncreaseMilestone += constants.LIMIT_INCREASE_INTERVAL; // 次の目標時間を更新
    console.log(`[Game] Next milestone set to: ${limitIncreaseMilestone}s.`);
  }

  // 時間切れ判定
  if (remainingTime <= 0) {
    console.log("[Game] Time is up! Finalizing.");
    gameTimerIntervalId = null; // タイマーIDクリア
    setGameState(constants.GAME_STATE.GAMEOVER); // 状態をゲームオーバーに (BGM停止)
    ui.showResultScreen(currentScore, "TIME UP!"); // リザルト表示
  }
}

// --- Game Logic ---

/**
 * 効果音を再生するヘルパー関数
 * @param {HTMLAudioElement} audioElement 再生するAudio要素
 */
function playSound(audioElement) {
  if (audioElement && typeof audioElement.play === "function") {
    audioElement.currentTime = 0; // 再生位置を先頭に戻す (連続再生のため)
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        /* console.warn(`SFX play error: ${error.name}`); */
      }); // エラーは無視
    }
  } else {
    console.warn("Attempted to play invalid audio element:", audioElement);
  }
}

/**
 * アイテム生成・更新・描画
 * @param {number} now 現在時刻 (ミリ秒)
 * @param {number} elapsedTimeInSeconds ゲーム開始からの経過時間 (秒)
 */
function updateAndDrawItems(now, elapsedTimeInSeconds) {
  let itemGenerated = false; // このフレームでアイテムが生成されたか
  // console.log(`[ItemGen Check] now=${now}, nextItemTime=${nextItemTime}, diff=${now - nextItemTime}, P#=${poopInstances.length}(${currentMaxPoops}), A#=${appleInstances.length}(${currentMaxApples}), W#=${waterInstances.length}(${currentMaxWaters})`);

  // --- アイテム生成判定 ---
  if (now >= nextItemTime) {
    const randomValue = Math.random();
    let generatedItemType = "None";
    // console.log(`[ItemGen Check] Time condition MET. Rand: ${randomValue.toFixed(2)}`);

    // 確率と現在の最大数に基づいて生成試行
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
    } // Waterも new するだけ

    // --- 次の生成時刻計算 ---
    if (itemGenerated) {
      const progress = Math.min(
        elapsedTimeInSeconds / constants.INTERVAL_REDUCTION_DURATION,
        1.0
      );
      if (constants.INTERVAL_REDUCTION_DURATION <= 0) {
        console.error("INTERVAL_REDUCTION_DURATION is zero!");
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
      nextItemTime = now + interval; // 計算した間隔を使用
      console.log(
        `[Game ItemGen] --- ${generatedItemType} generated! (P:${
          poopInstances.length
        }/${currentMaxPoops}, A:${
          appleInstances.length
        }/${currentMaxApples}, W:${
          waterInstances.length
        }/${currentMaxWaters}) New next: ${nextItemTime} (Interval: ${interval.toFixed(
          0
        )}ms)`
      );
    } else {
      nextItemTime = now + 150; // スキップ時は短い間隔で再試行
      // console.log(`[Game ItemGen] Generation skipped. Next check in 150ms.`);
    }
  }

  // --- 既存アイテムの更新と Canvas 描画 (水も含む) ---
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
  }); // ★★★ Waterも draw() を呼ぶ ★★★

  // --- 非アクティブなアイテムを削除 ---
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active); // Waterも filter でOK
}

/**
 * 衝突判定
 */
function checkCollisions() {
  // 顔が検出されていなければ中断
  if (!detectedFaces || detectedFaces.size() === 0) return;

  // 検出された顔ごとにループ
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
  }
}

/**
 * スコア加算
 * @param {number} points 加算点数
 */
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
    console.log("[Water Effect] Opacity is max. Calling addScore for bonus...");
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
  // console.log(`[checkGameOver] Checking. Opacity: ${currentOpacity.toFixed(1)}...`);
  if (
    gameState === constants.GAME_STATE.PLAYING &&
    currentOpacity <= constants.OPACITY_THRESHOLD
  ) {
    console.log("[Game] Opacity threshold reached! Game Over.");
    setGameState(constants.GAME_STATE.GAMEOVER); // 状態変更 (BGM停止)
    ui.showResultScreen(currentScore, "GAME OVER");
  }
}

// --- State Management and Cleanup ---

/** BGM停止・リセット (ヘルパー関数) */
function stopBGM(bgmElement, bgmName = "BGM") {
  if (
    bgmElement &&
    typeof bgmElement.pause === "function" &&
    !bgmElement.paused
  ) {
    bgmElement.pause();
    bgmElement.currentTime = 0;
    console.log(`[Audio] ${bgmName} stopped.`);
  } else if (bgmElement && bgmElement.paused) {
    bgmElement.currentTime = 0;
  }
}

/** BGM再生開始 (ヘルパー関数) */
function playBGM(bgmElement, bgmName = "BGM") {
  if (
    bgmElement &&
    typeof bgmElement.play === "function" &&
    bgmElement.paused
  ) {
    bgmElement.currentTime = 0;
    const playPromise = bgmElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then((_) => {
          console.log(`[Audio] ${bgmName} started.`);
        })
        .catch((error) => {
          console.warn(`[Audio] ${bgmName} play prevented:`, error);
        });
    }
  } else if (!bgmElement) {
    console.warn(`[Audio] ${bgmName} element not found.`);
  }
}

/**
 * ゲームの状態を設定し、PLAYING状態でのみゲーム中BGMを制御
 * @param {string} newState 新しいゲーム状態
 */
function setGameState(newState) {
  const oldState = gameState;
  if (oldState === newState) return;
  console.log(`[Game] Changing state from ${oldState} to ${newState}`);
  gameState = newState;
  console.log(`[Game] State is now: ${gameState}`);

  // BGM制御: PLAYINGならゲームBGM、それ以外は全て停止
  if (newState === constants.GAME_STATE.PLAYING) {
    stopBGM(ui.bgmHome, "Home"); // 他を止める
    stopBGM(ui.bgmFinal, "Final");
    playBGM(ui.bgm, "Gameplay"); // ゲームBGM再生
  } else {
    stopBGM(ui.bgmHome, "Home");
    stopBGM(ui.bgm, "Gameplay");
    stopBGM(ui.bgmFinal, "Final");
  }
}

/** 現在のゲーム状態取得 */
export function getCurrentGameState() {
  return gameState;
}

/** リソース解放 */
function cleanupResources() {
  console.log("Cleaning up game resources...");
  // 全BGM停止
  stopBGM(ui.bgm, "Gameplay");
  stopBGM(ui.bgmHome, "Home");
  stopBGM(ui.bgmFinal, "Final");
  // カメラ停止・OpenCVリソース解放
  camera.stopCamera();
  cvUtils.cleanupCvResources(false);
  // Water DOM要素削除 (water.jsがCanvas描画に戻ったので不要)
  // if(waterInstances && waterInstances.length > 0) { waterInstances.forEach(w => w.destroyElement()); }
  // アイテム配列クリア
  poopInstances = [];
  appleInstances = [];
  waterInstances = [];
  // タイマー/アニメーションフレーム停止
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
