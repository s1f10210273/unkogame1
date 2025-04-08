// js/game.js

import * as constants from "./constants.js";
import * as ui from "./ui.js"; // sfxPoop, sfxItem, bgm も含む
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
/**
 * ゲームの初期化処理を開始する
 * @param {number} timeLimit 選択されたゲームの制限時間（秒）
 */
export async function initializeGame(timeLimit) {
  console.log("[initializeGame] Starting initialization...");
  // ゲームが既に開始中、または初期化中なら何もしない
  if (
    gameState === constants.GAME_STATE.INITIALIZING ||
    gameState === constants.GAME_STATE.PLAYING ||
    gameState === constants.GAME_STATE.COUNTDOWN
  ) {
    console.warn("[initializeGame] Aborted: Already active or initializing.");
    return;
  }
  setGameState(constants.GAME_STATE.INITIALIZING);

  // 制限時間設定
  if (typeof timeLimit !== "number" || timeLimit <= 0) {
    currentGameTimeLimit = constants.TIME_LIMIT_BEGINNER; // 安全のためデフォルト値
  } else {
    currentGameTimeLimit = timeLimit;
  }
  console.log(
    `[initializeGame] Time limit set to: ${currentGameTimeLimit} seconds.`
  );

  try {
    // OpenCV ランタイム準備確認
    console.log("[initializeGame] Checking OpenCV readiness...");
    if (!cvUtils.isCvReady()) {
      throw new Error("OpenCV is not ready.");
    }
    console.log("[initializeGame] OpenCV runtime confirmed.");

    // 画像ファイルの並列ロード (エラー発生時はここで停止させる)
    console.log("[initializeGame] Loading images via Promise.all...");
    try {
      await Promise.all([
        loadPoopImage(constants.POOP_IMAGE_PATH),
        loadAppleImage(constants.APPLE_IMAGE_PATH),
        loadWaterImage(constants.WATER_IMAGE_PATH),
      ]);
      console.log("[initializeGame] Promise.all for image loading resolved.");
    } catch (error) {
      // 画像ロード失敗エラーをスロー
      throw new Error(
        `Image loading failed: ${error?.message || "Unknown reason"}`
      );
    }
    console.log("[initializeGame] All images assumed ready.");

    // 顔検出モデルロード (未ロードの場合のみ)
    console.log("[initializeGame] Checking/Loading face cascade...");
    if (!cvUtils.isCascadeReady()) {
      await cvUtils.loadFaceCascade(); // エラーはここでキャッチされるはず
    }
    console.log("[initializeGame] Face cascade ready.");

    // カメラ起動
    console.log("[initializeGame] Starting camera...");
    await camera.startCamera(); // カメラ許可エラーなどはここで throw される
    console.log("[initializeGame] Camera ready.");

    // OpenCVオブジェクト初期化 (Matなど)
    console.log("[initializeGame] Initializing OpenCV objects...");
    cvUtils.initializeCvObjects(); // VideoCaptureエラーはここで throw される
    console.log("[initializeGame] OpenCV objects initialized.");

    // ゲーム変数リセット
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

    // カウントダウン開始へ
    console.log(
      "[initializeGame] Initialization successful. Calling startCountdown..."
    );
    startCountdown();
  } catch (error) {
    // 初期化中にエラーが発生した場合
    console.error(
      "[initializeGame] CRITICAL ERROR during initialization:",
      error
    );
    setGameState(constants.GAME_STATE.ERROR);
    cleanupResources(); // 部分的に初期化されたリソースを解放
    throw error; // エラーを main.js に伝播させる
  }
}

// --- Countdown ---
/**
 * ゲーム開始前のカウントダウン処理
 */
function startCountdown() {
  console.log("[startCountdown] Function called.");
  setGameState(constants.GAME_STATE.COUNTDOWN);
  let count = constants.COUNTDOWN_SECONDS;
  console.log(`[startCountdown] Initial count: ${count}`);
  ui.showGameMessage(count); // 最初の数字表示

  // 既存のインターバルがあればクリア
  if (countdownIntervalId) {
    console.warn("[startCountdown] Clearing existing interval.");
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
        "[startCountdown] Countdown finished. Clearing interval, hiding message, calling startGameLoop."
      );
      clearInterval(countdownIntervalId); // インターバル停止
      countdownIntervalId = null;
      ui.hideGameMessage(); // "START!" メッセージを隠す
      startGameLoop(); // ゲームループを開始
    }
  }, 1000);
  console.log(`[startCountdown] Interval timer set ID: ${countdownIntervalId}`);
}

// --- Game Loop ---
/**
 * ゲームループを開始するための準備を行う
 */
function startGameLoop() {
  console.log("[startGameLoop] Function called.");
  setGameState(constants.GAME_STATE.PLAYING); // 状態をプレイ中に
  console.log("[startGameLoop] Game state set to PLAYING.");

  // 残り時間とスコア表示を初期化
  remainingTime = currentGameTimeLimit;
  ui.updateTimerDisplay(remainingTime);
  currentScore = 0;
  ui.updateScoreDisplay(currentScore); // スコア表示 (0)

  // 残り時間計測タイマーを開始
  console.log("[startGameLoop] Setting up game timer...");
  if (gameTimerIntervalId) {
    clearInterval(gameTimerIntervalId);
  } // 既存タイマーをクリア
  gameTimerIntervalId = setInterval(updateGameTimer, 1000);
  console.log(`[startGameLoop] Game timer set ID: ${gameTimerIntervalId}`);

  // アイテム配列と最大数、レベルアップ時間を初期化
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

  // ゲーム開始時刻を記録し、最初のアイテム生成時刻を設定
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
    nextItemTime = gameStartTime + 1000; // Fallback
  }

  // BGM再生開始
  if (ui.bgm) {
    ui.bgm.currentTime = 0; // Ensure playback starts from the beginning
    const playPromise = ui.bgm.play();
    if (playPromise !== undefined) {
      playPromise
        .then((_) => {
          console.log("[startGameLoop] BGM started playing.");
        })
        .catch((error) => {
          console.warn("[startGameLoop] BGM auto-play was prevented:", error);
          // Consider adding a UI element to let the user manually start music if needed
        });
    }
  } else {
    console.warn("[startGameLoop] BGM element not found.");
  }

  // 既存のゲームループ (requestAnimationFrame) があればキャンセル
  if (gameRequestId) {
    cancelAnimationFrame(gameRequestId);
  }
  console.log("[startGameLoop] Starting game loop (requesting first frame)...");
  // 新しいゲームループを開始
  gameLoop();
}

/**
 * メインのゲームループ (毎フレーム実行される)
 */
function gameLoop() {
  // console.log(`[gameLoop] Frame start. State: ${gameState}`); // デバッグ用

  // ゲームがプレイ中でなければループを停止
  if (gameState !== constants.GAME_STATE.PLAYING) {
    console.log(`[gameLoop] Stopping loop because state is ${gameState}`);
    cleanupResources(); // 状態が変わったらリソース解放
    return; // ループ処理を終了
  }

  const now = Date.now();
  let elapsedTimeInSeconds = 0;
  if (gameStartTime > 0) {
    elapsedTimeInSeconds = (now - gameStartTime) / 1000.0;
  } else {
    console.warn("[gameLoop] gameStartTime is not set!");
  }
  // console.log(`[gameLoop] Elapsed: ${elapsedTimeInSeconds.toFixed(1)}s`);

  // 顔検出を実行
  detectedFaces = cvUtils.detectFaces();
  // Canvasをクリア
  ui.clearCanvas();
  // 検出された顔の周りに四角を描画
  if (detectedFaces) {
    for (let i = 0; i < detectedFaces.size(); ++i) {
      ui.drawFaceRect(detectedFaces.get(i));
    }
  }

  // アイテム（糞、りんご、水）の生成・更新・描画
  updateAndDrawItems(now, elapsedTimeInSeconds);
  // 衝突判定（糞、りんご、水）
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
      `[updateGameTimer] Milestone ${limitIncreaseMilestone}s reached at ${elapsedTime.toFixed(
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
    console.log(
      `[updateGameTimer] Next milestone set to: ${limitIncreaseMilestone}s.`
    );
  }

  // 時間切れ判定
  if (remainingTime <= 0) {
    console.log("[updateGameTimer] Time is up! Finalizing.");
    gameTimerIntervalId = null; // タイマーIDクリア
    setGameState(constants.GAME_STATE.GAMEOVER); // 状態をゲームオーバーに
    stopMusic(); // BGM停止
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
        // 再生が中断された場合などのエラーは無視する (コンソールには警告を出す)
        // console.warn(`SFX play error: ${error.name} - ${error.message}`);
      });
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
  let itemGenerated = false;
  // console.log(`[ItemGen Check] now=${now}, nextItemTime=${nextItemTime}, diff=${now - nextItemTime}, P#=${poopInstances.length}(${currentMaxPoops}), A#=${appleInstances.length}(${currentMaxApples}), W#=${waterInstances.length}(${currentMaxWaters})`);

  // --- アイテム生成判定 ---
  if (now >= nextItemTime) {
    // console.log("[ItemGen Check] Time condition MET.");
    const randomValue = Math.random();
    let generatedItemType = "None";

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
    }

    // --- 次の生成時刻計算 ---
    if (itemGenerated) {
      // 経過時間に応じて生成間隔を動的に計算
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

  // --- 既存アイテムの更新と描画 ---
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

  // --- 非アクティブなアイテムを削除 ---
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active);
}

/**
 * 衝突判定
 */
function checkCollisions() {
  if (!detectedFaces || detectedFaces.size() === 0) return;
  for (let i = 0; i < detectedFaces.size(); ++i) {
    const faceRect = detectedFaces.get(i);
    // 糞
    for (const poop of poopInstances) {
      if (poop.active && poop.checkCollisionWithFace(faceRect)) {
        console.log("Hit Poop!");
        applyPenalty();
        playSound(ui.sfxPoop); // Play poop SFX
        poop.active = false;
      }
    }
    // りんご
    for (const apple of appleInstances) {
      if (apple.active && apple.checkCollisionWithFace(faceRect)) {
        console.log("Got Apple!");
        addScore(constants.APPLE_SCORE);
        playSound(ui.sfxItem); // Play item SFX
        apple.active = false;
      }
    }
    // 水
    for (const water of waterInstances) {
      if (water.active && water.checkCollisionWithFace(faceRect)) {
        console.log("Got Water!");
        applyWaterEffect();
        playSound(ui.sfxItem); // Play item SFX
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
  if (gameState !== constants.GAME_STATE.PLAYING) return;
  currentScore += points;
  ui.updateScoreDisplay(currentScore);
  console.log(`Score added: +${points}, Total: ${currentScore}`);
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
  checkGameOver(); // 必ずゲームオーバーチェック
}

/**
 * 水アイテム効果適用
 */
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

/**
 * ゲームオーバーチェック (Opacity)
 */
function checkGameOver() {
  // console.log(`[checkGameOver] Checking. Opacity: ${currentOpacity.toFixed(1)}...`);
  if (
    gameState === constants.GAME_STATE.PLAYING &&
    currentOpacity <= constants.OPACITY_THRESHOLD
  ) {
    console.log("[checkGameOver] Opacity threshold reached!");
    setGameState(constants.GAME_STATE.GAMEOVER); // 状態をゲームオーバーに
    stopMusic(); // BGM停止
    ui.showResultScreen(currentScore, "GAME OVER"); // リザルト表示
    console.log("Game Over due to opacity!");
  }
}

// --- State Management and Cleanup ---

/**
 * ゲーム状態設定
 * @param {string} newState 新しい状態
 */
function setGameState(newState) {
  console.log(`[setGameState] Changing state from ${gameState} to ${newState}`);
  gameState = newState;
  console.log(`[setGameState] State is now: ${gameState}`);
}

/**
 * 現在のゲーム状態取得
 * @returns {string} 現在の状態
 */
export function getCurrentGameState() {
  return gameState;
}

/**
 * BGM停止・リセット
 */
function stopMusic() {
  if (ui.bgm) {
    ui.bgm.pause();
    ui.bgm.currentTime = 0;
    console.log("BGM stopped and reset.");
  }
}

/**
 * リソース解放
 */
function cleanupResources() {
  console.log("Cleaning up game resources...");
  stopMusic(); // Stop BGM
  camera.stopCamera(); // Stop camera
  cvUtils.cleanupCvResources(false); // Clean OpenCV objects (keep cascade)
  // Clear any remaining timers/animation frames
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
