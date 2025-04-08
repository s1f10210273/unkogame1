// js/game.js

import * as constants from "./constants.js";
import * as ui from "./ui.js"; // itemOverlayContainer, sfxPoop, sfxItem, bgm も含む
import * as camera from "./camera.js";
import * as cvUtils from "./opencvUtils.js";
import { Poop, loadPoopImage } from "./poop.js";
import { Apple, loadAppleImage } from "./item.js";
import { Water, loadWaterImage } from "./water.js"; // Water クラスをインポート

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
    console.log("[initializeGame] Preloading images...");
    try {
      // Preload all images. loadWaterImage now just preloads, doesn't need Image object later.
      await Promise.all([
        loadPoopImage(constants.POOP_IMAGE_PATH),
        loadAppleImage(constants.APPLE_IMAGE_PATH),
        loadWaterImage(constants.WATER_IMAGE_PATH), // Water GIFもプリロード
      ]);
      console.log(
        "[initializeGame] Promise.all for image preloading resolved."
      );
    } catch (error) {
      // 画像ロード失敗エラーをスロー
      throw new Error(
        `Image preload failed: ${error?.message || "Unknown reason"}`
      );
    }
    console.log("[initializeGame] All images assumed preloaded/ready.");

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
    waterInstances = []; // 全アイテム配列クリア
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
  ui.updateScoreDisplay(currentScore); // スコア表示(0)

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
    // 最初のインターバルは初期値を使用
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
    ui.bgm.currentTime = 0;
    const playPromise = ui.bgm.play();
    if (playPromise !== undefined) {
      playPromise
        .then((_) => {
          console.log("[startGameLoop] BGM started playing.");
        })
        .catch((error) => {
          console.warn("[startGameLoop] BGM auto-play was prevented:", error);
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
  // Canvasをクリア (顔検出枠描画用)
  ui.clearCanvas();
  // 検出された顔の周りに四角を描画
  if (detectedFaces) {
    for (let i = 0; i < detectedFaces.size(); ++i) {
      ui.drawFaceRect(detectedFaces.get(i));
    }
  }

  // アイテム（糞、りんご、水）の生成・更新・（Canvas描画またはDOM位置更新）
  updateAndDrawItems(now, elapsedTimeInSeconds);

  // 水GIFの位置更新
  if (ui.canvas) {
    // canvasの幅を使うため存在確認
    waterInstances.forEach((water) => {
      if (water.active && water.element) {
        // DOM要素があり、アクティブなら位置更新
        // console.log(`[gameLoop] Calling updateElementPosition for water at y=${water.y.toFixed(1)}`); // 必要なら有効化
        water.updateElementPosition(); // 引数なしで呼び出し
      } else if (water.active && !water.element) {
        console.warn(
          "[gameLoop] Active water item is missing its DOM element!"
        ); // 要素がない警告
      }
    });
  }

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
        /* console.warn(`SFX play error: ${error.name}`); */
      }); // エラーは無視
    }
  } else {
    console.warn("Attempted to play invalid audio element:", audioElement);
  }
}

/**
 * アイテム生成・更新・描画（またはDOM要素生成/更新）
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
    console.log(
      `[ItemGen Check] Time condition MET. Rand: ${randomValue.toFixed(2)}`
    ); // 時間条件クリアログ

    // 確率と現在の最大数に基づいて生成試行
    if (randomValue < constants.POOP_THRESHOLD) {
      // 糞
      console.log("[ItemGen Check] Trying Poop...");
      if (poopInstances.length < currentMaxPoops) {
        poopInstances.push(new Poop(ui.canvas.width));
        itemGenerated = true;
        generatedItemType = "Poop";
      } else {
        console.log("[ItemGen Check] Poop limit reached.");
      }
    } else if (randomValue < constants.APPLE_THRESHOLD) {
      // りんご
      console.log("[ItemGen Check] Trying Apple...");
      if (appleInstances.length < currentMaxApples) {
        appleInstances.push(new Apple(ui.canvas.width));
        itemGenerated = true;
        generatedItemType = "Apple";
      } else {
        console.log("[ItemGen Check] Apple limit reached.");
      }
    } else {
      // 水
      console.log(
        `[ItemGen Check] Trying Water... (Count: ${waterInstances.length}, Max: ${currentMaxWaters})`
      );
      if (waterInstances.length < currentMaxWaters) {
        console.log("[ItemGen Check] Water limit OK. Creating instance...");
        const newWater = new Water(ui.canvas.width); // Waterインスタンス作成
        if (ui.itemOverlayContainer) {
          console.log("[ItemGen Check] Calling createElement for Water...");
          newWater.createElement(ui.itemOverlayContainer); // DOM要素を作成・追加
        } else {
          console.error("itemOverlayContainer not found for water!");
        }
        // createElement が成功したかは water.js 側のログで確認
        waterInstances.push(newWater); // 配列に追加
        itemGenerated = true;
        generatedItemType = "Water";
      } else {
        console.log("[ItemGen Check] Water limit reached.");
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
      nextItemTime = now + interval; // 計算した間隔を使用
      console.log(
        `[ItemGen] --- ${generatedItemType} generated! (P:${
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
      console.log(`[ItemGen] Generation skipped. Next check in 150ms.`);
    }
  }

  // --- 既存アイテムの更新と Canvas 描画 (水以外) ---
  poopInstances.forEach((p) => {
    if (p.active) {
      p.update();
      p.draw();
    }
  }); // 糞は Canvas 描画
  appleInstances.forEach((a) => {
    if (a.active) {
      a.update();
      a.draw();
    }
  }); // りんごも Canvas 描画
  waterInstances.forEach((w) => {
    if (w.active) {
      w.update(); /* w.draw() は不要 */
    }
  }); // 水は update のみ (DOM位置更新は gameLoop へ)

  // --- 非アクティブなアイテムを削除 (水はDOM要素削除も含む) ---
  // 削除前にログ
  // const waterCountBefore = waterInstances.length;
  waterInstances.forEach((water) => {
    if (!water.active) {
      water.destroyElement(); // DOMからimg要素を削除
    }
  });
  poopInstances = poopInstances.filter((p) => p.active);
  appleInstances = appleInstances.filter((a) => a.active);
  waterInstances = waterInstances.filter((w) => w.active); // activeなものだけ残す
  // 削除後にログ
  // if(waterInstances.length !== waterCountBefore) console.log(`[Item Removal] Water count: ${waterCountBefore} -> ${waterInstances.length}`);
}

/**
 * 衝突判定
 */
function checkCollisions() {
  // 顔が検出されていなければ中断
  if (!detectedFaces || detectedFaces.size() === 0) return;

  // console.log(`[checkCollisions] Checking collisions against ${detectedFaces.size()} faces.`); // 必要ならログ有効化

  // 検出された顔ごとにループ
  for (let i = 0; i < detectedFaces.size(); ++i) {
    const faceRect = detectedFaces.get(i);
    // console.log(`[checkCollisions] Face ${i}: x=${faceRect.x}, y=${faceRect.y}, w=${faceRect.width}, h=${faceRect.height}`);

    // --- 糞との衝突判定 ---
    for (const poop of poopInstances) {
      if (poop.active && poop.checkCollisionWithFace(faceRect)) {
        console.log("Hit Poop!");
        applyPenalty();
        playSound(ui.sfxPoop);
        poop.active = false;
      }
    }
    // --- りんごとの衝突判定 ---
    for (const apple of appleInstances) {
      if (apple.active && apple.checkCollisionWithFace(faceRect)) {
        console.log("Got Apple!");
        addScore(constants.APPLE_SCORE);
        playSound(ui.sfxItem);
        apple.active = false;
      }
    }
    // --- 水との衝突判定 ---
    // console.log(`[checkCollisions] Checking ${waterInstances.length} water items.`);
    for (const water of waterInstances) {
      if (water.active) {
        // console.log(`[checkCollisions] Checking ACTIVE water at y=${water.y.toFixed(1)}`);
        const hit = water.checkCollisionWithFace(faceRect); // 判定メソッド呼び出し
        // console.log(`[checkCollisions] Water hit result for this face: ${hit}`);
        if (hit) {
          console.log(
            "%c[checkCollisions] ---> WATER HIT DETECTED! <---",
            "color: cyan; font-weight: bold;"
          );
          applyWaterEffect(); // 効果適用
          playSound(ui.sfxItem); // 効果音再生
          water.active = false; // アイテムを非アクティブ化
        }
      } else {
        // console.log(`[checkCollisions] Skipping INACTIVE water at y=${water.y.toFixed(1)}`);
      }
    }
  } // 顔ループの終わり
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

  // Clean up remaining water item DOM elements
  if (waterInstances && waterInstances.length > 0) {
    console.log(
      `Cleaning up ${waterInstances.length} remaining water elements.`
    );
    waterInstances.forEach((w) => w.destroyElement());
    waterInstances = []; // Clear array
  }
  // Also clear other item arrays just in case
  poopInstances = [];
  appleInstances = [];

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
