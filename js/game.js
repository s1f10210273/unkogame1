// js/game.js

import * as constants from './constants.js';
import * as ui from './ui.js';
import * as camera from './camera.js';
import * as cvUtils from './opencvUtils.js';
import { Poop, loadPoopImage } from './poop.js';
import { Apple, loadAppleImage } from './item.js';
import { Water, loadWaterImage } from './water.js'; // ★★★ 水(water.js)をインポート ★★★

// --- Game State Variables ---
let gameState = constants.GAME_STATE.IDLE;
let currentOpacity = 1.0;
let poopInstances = [];
let appleInstances = [];
let waterInstances = []; // ★★★ 水アイテムのインスタンス用配列 ★★★
let nextItemTime = 0;
let gameRequestId = null;
let countdownIntervalId = null;
let detectedFaces = null;
let remainingTime = constants.GAME_DURATION_SECONDS;
let gameTimerIntervalId = null;
let currentScore = 0;

// --- Initialization ---
export async function initializeGame() {
    if (gameState !== constants.GAME_STATE.IDLE && gameState !== constants.GAME_STATE.ERROR) return;
    setGameState(constants.GAME_STATE.INITIALIZING);
    ui.showLoadingMessage('ゲームデータを準備中...');
    ui.updateButtonState(gameState);
    try {
        // OpenCV ランタイム準備確認
        if (!cvUtils.isCvReady()) {
             console.warn("OpenCV runtime not ready, waiting...");
             await new Promise(resolve => setTimeout(resolve, 500));
             if (!cvUtils.isCvReady()) throw new Error("OpenCV ランタイムの準備がタイムアウトしました。");
        }
        console.log("OpenCV runtime is ready.");

        // ★★★ 画像ファイルの並列ロード (糞、りんご、水) ★★★
        ui.showLoadingMessage('画像ファイルをロード中...');
        await Promise.all([
            loadPoopImage(constants.POOP_IMAGE_PATH),
            loadAppleImage(constants.APPLE_IMAGE_PATH),
            loadWaterImage(constants.WATER_IMAGE_PATH) // 水画像もロード
        ]);
        console.log("All images are ready.");

        // 顔検出モデルロード
        setGameState(constants.GAME_STATE.LOADING_CASCADE);
        ui.showLoadingMessage('顔検出モデルをロード中...');
        await cvUtils.loadFaceCascade();
        console.log("Face cascade is ready.");

        // カメラ起動
        setGameState(constants.GAME_STATE.STARTING_CAMERA);
        ui.showLoadingMessage('カメラを起動しています...');
        await camera.startCamera();
        console.log("Camera is ready.");

        // OpenCVオブジェクト初期化
        cvUtils.initializeCvObjects();
        console.log("OpenCV objects are ready.");

        // スコア初期表示 & アイテム配列初期化
        currentScore = 0; ui.updateScoreDisplay(currentScore);
        poopInstances = []; appleInstances = []; waterInstances = []; // ★★★ 水配列も初期化 ★★★

        console.log("Initialization successful. Attempting to call startCountdown...");
        startCountdown();

    } catch (error) {
        console.error("Initialization failed:", error);
        setGameState(constants.GAME_STATE.ERROR);
        ui.showLoadingMessage(`エラー: ${error.message}`, true);
        cleanupResources(); ui.updateButtonState(gameState);
    }
}

// --- Countdown ---
function startCountdown() {
    // (変更なし)
    console.log("startCountdown function called.");
    setGameState(constants.GAME_STATE.COUNTDOWN);
    ui.updateButtonState(gameState);
    ui.hideLoadingMessage();
    let count = constants.COUNTDOWN_SECONDS;
    ui.showGameMessage(count);
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    countdownIntervalId = setInterval(() => {
        count--;
        if (count > 0) ui.showGameMessage(count);
        else if (count === 0) ui.showGameMessage('START!');
        else {
            clearInterval(countdownIntervalId); countdownIntervalId = null;
            ui.hideGameMessage(); startGameLoop();
        }
    }, 1000);
}

// --- Game Loop ---
function startGameLoop() {
    // (変更なし - 配列初期化は initializeGame で実施)
    setGameState(constants.GAME_STATE.PLAYING);
    ui.updateButtonState(gameState);
    console.log("Game loop started!");
    remainingTime = constants.GAME_DURATION_SECONDS;
    ui.updateTimerDisplay(remainingTime);
    if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
    gameTimerIntervalId = setInterval(updateGameTimer, 1000);
    currentScore = 0; ui.updateScoreDisplay(currentScore);
    poopInstances = []; appleInstances = []; waterInstances = []; // ゲーム開始時にもクリア
    nextItemTime = Date.now() + constants.ITEM_GENERATION_INTERVAL_MIN;
    if (gameRequestId) cancelAnimationFrame(gameRequestId);
    gameLoop();
}

function gameLoop() {
    // (変更なし)
    if (gameState !== constants.GAME_STATE.PLAYING) { /* ... ループ停止 ... */ return; }
    detectedFaces = cvUtils.detectFaces();
    ui.clearCanvas();
    if (detectedFaces) { for (let i = 0; i < detectedFaces.size(); ++i) ui.drawFaceRect(detectedFaces.get(i)); }
    updateAndDrawItems();
    checkCollisions();
    gameRequestId = requestAnimationFrame(gameLoop);
}

// ★★★ 追加: 制限時間を更新する関数 ★★★
function updateGameTimer() {
    // プレイ中以外、または既に時間が0以下の場合は何もしない
    if (gameState !== constants.GAME_STATE.PLAYING || remainingTime <= 0) {
        if (gameTimerIntervalId) {
             clearInterval(gameTimerIntervalId);
             gameTimerIntervalId = null;
        }
        return;
    }

    remainingTime--;
    ui.updateTimerDisplay(remainingTime); // 表示更新

    if (remainingTime <= 0) {
        clearInterval(gameTimerIntervalId);
        gameTimerIntervalId = null;
        console.log("Time's up!");
        setGameState(constants.GAME_STATE.GAMEOVER);
        ui.showGameMessage('TIME UP!'); // 時間切れメッセージ表示
        ui.updateButtonState(gameState);
        // ゲームループは gameState のチェックで自然に停止する
    }
}


// --- Game Logic ---

// アイテム（糞、りんご、水）の生成・更新・描画
function updateAndDrawItems() {
    const now = Date.now();
    let itemGenerated = false;

    // --- アイテム生成判定 ---
    if (now >= nextItemTime) {
        const randomValue = Math.random();
        // console.log(`[updateAndDrawItems] Rand: ${randomValue.toFixed(2)}`); // 必要ならログ有効化

        // 確率に基づいてどのアイテムを生成試行するか決定
        if (randomValue < constants.POOP_THRESHOLD) { // 糞 (Poop)
            if (poopInstances.length < constants.MAX_POOPS) {
                poopInstances.push(new Poop(ui.canvas.width)); itemGenerated = true;
                console.log(`[updateAndDrawItems] --- Poop generated (${poopInstances.length}/${constants.MAX_POOPS}) ---`);
            }
        } else if (randomValue < constants.APPLE_THRESHOLD) { // りんご (Apple)
            if (appleInstances.length < constants.MAX_APPLES) {
                appleInstances.push(new Apple(ui.canvas.width)); itemGenerated = true;
                console.log(`[updateAndDrawItems] --- Apple generated (${appleInstances.length}/${constants.MAX_APPLES}) ---`);
            }
        } else { // 水 (Water) ★★★ 追加 ★★★
            if (waterInstances.length < constants.MAX_WATERS) {
                waterInstances.push(new Water(ui.canvas.width)); itemGenerated = true;
                console.log(`[updateAndDrawItems] --- Water generated (${waterInstances.length}/${constants.MAX_WATERS}) ---`);
            }
        }

        // 次のアイテム生成時間を計算 (実際に生成された場合のみ)
        if (itemGenerated) {
            const interval = Math.random() * (constants.ITEM_GENERATION_INTERVAL_MAX - constants.ITEM_GENERATION_INTERVAL_MIN) + constants.ITEM_GENERATION_INTERVAL_MIN;
            nextItemTime = now + interval;
        } else {
             // 上限などで生成できなかった場合、少し待って再試行
             nextItemTime = now + 250; // 250ms後に再試行
        }
    }

    // --- 既存アイテムの更新と描画 ---
    // 糞
    poopInstances.forEach(poop => { if (poop.active) { poop.update(); poop.draw(); } });
    // りんご
    appleInstances.forEach(apple => { if (apple.active) { apple.update(); apple.draw(); } });
    // 水 ★★★ 追加 ★★★
    waterInstances.forEach(water => { if (water.active) { water.update(); water.draw(); } });

    // --- 非アクティブなアイテムを配列から削除 ---
    poopInstances = poopInstances.filter(poop => poop.active);
    appleInstances = appleInstances.filter(apple => apple.active);
    waterInstances = waterInstances.filter(water => water.active); // ★★★ 追加 ★★★
}

// 衝突判定（糞、りんご、水）
function checkCollisions() {
    if (!detectedFaces || detectedFaces.size() === 0) return;

    for (let i = 0; i < detectedFaces.size(); ++i) {
        const faceRect = detectedFaces.get(i);

        // 糞との衝突
        for (const poop of poopInstances) {
            if (poop.active && poop.checkCollisionWithFace(faceRect)) {
                console.log("Hit Poop!"); applyPenalty(); poop.active = false;
            }
        }
        // りんごとの衝突
        for (const apple of appleInstances) {
            if (apple.active && apple.checkCollisionWithFace(faceRect)) {
                console.log("Got Apple!"); addScore(constants.APPLE_SCORE); apple.active = false;
            }
        }
        // ★★★ 水との衝突 ★★★
        for (const water of waterInstances) {
            if (water.active && water.checkCollisionWithFace(faceRect)) {
                console.log("Got Water!");
                applyWaterEffect(); // ★★★ 水の効果を適用 ★★★
                water.active = false; // 水アイテムを非アクティブ化
            }
        }
    }
}

// スコアを加算する関数
function addScore(points) {
    if (gameState !== constants.GAME_STATE.PLAYING) return;
    currentScore += points; ui.updateScoreDisplay(currentScore);
    console.log(`Score added: +${points}, Total: ${currentScore}`);
}

// ペナルティ（透明度低下）を適用する関数
function applyPenalty() {
    if (gameState !== constants.GAME_STATE.PLAYING) return;
    currentOpacity -= constants.OPACITY_DECREMENT;
    if (currentOpacity < 0) currentOpacity = 0; // 最小値は0
    ui.setVideoOpacity(currentOpacity);
    console.log(`Penalty applied! Current opacity: ${currentOpacity.toFixed(1)}`);
    checkGameOver();
}

// ★★★ 水アイテムの効果を適用する関数 ★★★
function applyWaterEffect() {
    if (gameState !== constants.GAME_STATE.PLAYING) return;

    // Opacityが既に最大(1.0)かチェック
    if (currentOpacity >= 1.0) {
        // 最大ならボーナススコアを加算
        console.log("Opacity already max. Adding bonus score!");
        addScore(constants.WATER_BONUS_SCORE);
    } else {
        // Opacityを回復
        currentOpacity += constants.WATER_OPACITY_RECOVERY;
        if (currentOpacity > 1.0) currentOpacity = 1.0; // 上限は1.0
        ui.setVideoOpacity(currentOpacity);
        console.log(`Water recovered opacity! Current opacity: ${currentOpacity.toFixed(1)}`);
    }
}


// ゲームオーバー条件（透明度）をチェックする関数
function checkGameOver() {
    // console.log(`[checkGameOver] Checking. Opacity: ${currentOpacity.toFixed(1)}...`); // 必要ならログ有効化
    if (gameState === constants.GAME_STATE.PLAYING && currentOpacity <= constants.OPACITY_THRESHOLD) {
        console.log("[checkGameOver] Opacity threshold reached! Setting state to GAMEOVER.");
        setGameState(constants.GAME_STATE.GAMEOVER);
        ui.showGameMessage('GAME OVER');
        ui.updateButtonState(gameState);
        console.log("Game Over due to opacity!");
    }
}

// --- State Management and Cleanup ---
function setGameState(newState) {
    // (変更なし)
    console.log(`[setGameState] Changing state from ${gameState} to ${newState}`);
    gameState = newState;
    console.log(`[setGameState] State is now: ${gameState}`);
}

export function getCurrentGameState() {
    // (変更なし)
    return gameState;
}

// resetGame function removed

function cleanupResources() {
    // (変更なし)
    console.log("Cleaning up game resources...");
    camera.stopCamera();
    cvUtils.cleanupCvResources(false);
    if (gameRequestId) { cancelAnimationFrame(gameRequestId); gameRequestId = null; }
    if (countdownIntervalId) { clearInterval(countdownIntervalId); countdownIntervalId = null; }
    if (gameTimerIntervalId) { clearInterval(gameTimerIntervalId); gameTimerIntervalId = null; }
    console.log("Game resource cleanup finished.");
}