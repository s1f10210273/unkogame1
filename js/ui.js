// js/ui.js

import { GAME_STATE } from "./constants.js";

// --- DOM Elements ---
export const gameContainer = document.querySelector(".container");
export const video = document.getElementById("video");
export const canvas = document.getElementById("canvasOutput");
export const ctx = canvas
  ? canvas.getContext("2d", { willReadFrequently: true })
  : null; // Canvasコンテキスト取得
export const messageElement = document.getElementById("message"); // ゲーム中メッセージ要素
export const timerDisplay = document.getElementById("timer"); // 残り時間表示要素
export const scoreDisplay = document.getElementById("score"); // スコア表示要素
export const startScreen = document.getElementById("startScreen"); // スタート画面要素
export const startInfo = document.getElementById("startInfo"); // スタート画面情報表示要素
export const difficultySelector = document.getElementById("difficultySelector"); // 難易度選択コンテナ
export const comboDisplay = document.getElementById("comboDisplay");
export const resultScreen = document.getElementById("resultScreen"); // リザルト画面要素
export const resultTitle = document.getElementById("resultTitle"); // リザルト画面タイトル
export const finalScore = document.getElementById("finalScore"); // 最終スコア表示
export const playAgainButton = document.getElementById("playAgainButton"); // 再プレイボタン
// Audio要素参照
export const bgmHome = document.getElementById("bgmHome"); // ホームBGM
export const bgm = document.getElementById("bgm");
export const sfxPoop = document.getElementById("sfxPoop"); // 効果音（糞）
export const sfxItem = document.getElementById("sfxItem"); // 効果音（アイテム）
// export const itemOverlayContainer = document.getElementById('itemOverlayContainer'); // WaterがCanvas描画に戻ったため不要
// ★★★ 追加: ルールボタンとモーダル要素 ★★★
export const ruleButton = document.getElementById("ruleButton");
export const ruleModal = document.getElementById("ruleModal");

export const closeRuleModalButton = document.getElementById("closeRuleModal");
export const ruleImage = document.getElementById("ruleImage");
let comboDisplayTimeoutId = null;
// --- UI Update Functions ---

/** スタート画面の情報表示エリアを更新 */
export function showStartInfo(message, isError = false) {
  if (startInfo) {
    console.log(`[UI] Showing start info: "${message}", isError: ${isError}`);
    startInfo.textContent = message;
    startInfo.style.color = isError ? "#ffdddd" : "white"; // エラー時は色変更
    startInfo.style.display = "block";
  } else {
    console.error("Start Info element (#startInfo) not found");
  }
}

/** スタート画面の情報表示エリアを隠す */
export function hideStartInfo() {
  if (startInfo) {
    console.log("[UI] Hiding start info.");
    startInfo.style.display = "none";
  }
}

/** スタート画面の難易度選択を表示 */
export function showDifficultySelector() {
  if (difficultySelector) {
    console.log("[UI] Showing difficulty selector.");
    difficultySelector.style.display = "flex"; // flexで表示
  } else {
    console.error(
      "Difficulty Selector element (#difficultySelector) not found"
    );
  }
  // 難易度選択表示時にメッセージを変更
  // if (startInfo) { startInfo.textContent = '難易度を選択してください'; } // メッセージは main.js で制御
}

/** スタート画面の難易度選択を隠す */
export function hideDifficultySelector() {
  if (difficultySelector) {
    console.log("[UI] Hiding difficulty selector.");
    difficultySelector.style.display = "none";
  }
}

/** スタート画面全体を表示 */
export function showStartScreen() {
  console.log("[UI] Showing start screen.");
  if (startScreen) startScreen.style.display = "flex"; // flexで表示
  hideGameContainer(); // ゲーム画面は隠す
  hideResultScreen(); // リザルト画面も隠す
  hideTimerDisplay(); // タイマーも隠す
  hideScoreDisplay(); // スコアも隠す
  hideDifficultySelector(); // 難易度選択も最初は隠す
  hideRuleModal(); // ★★★ 初期表示でモーダルも隠す ★★★
  hideComboDisplay();
}

/** スタート画面全体を隠す */
export function hideStartScreen() {
  console.log("[UI] Hiding start screen.");
  if (startScreen) startScreen.style.display = "none";
}

/** ゲームコンテナを表示 */
export function showGameContainer() {
  console.log("[UI] Showing game container.");
  if (gameContainer) gameContainer.style.display = "block"; // または grid など元々の display
}

/** ゲームコンテナを隠す */
export function hideGameContainer() {
  console.log("[UI] Hiding game container.");
  if (gameContainer) gameContainer.style.display = "none";
}

/** ゲーム中メッセージ（カウントダウン、GAME OVERなど）を表示 */
export function showGameMessage(message) {
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.display = "block";
    console.log(`[UI] Showed game message: "${message}"`);
  } else {
    console.error("Message element (#message) not found.");
  }
}

/** ゲーム中メッセージを隠す */
export function hideGameMessage() {
  if (messageElement) messageElement.style.display = "none";
}

/** タイマー表示を更新 */
export function updateTimerDisplay(time) {
  if (timerDisplay) {
    timerDisplay.textContent = `Time: ${time}`;
    timerDisplay.style.display = "block"; // 必要なら表示
  } else {
    console.error("Timer display element (#timer) not found.");
  }
}

/** タイマー表示を隠す */
export function hideTimerDisplay() {
  if (timerDisplay) timerDisplay.style.display = "none";
}

/** スコア表示を更新 */
export function updateScoreDisplay(score) {
  if (scoreDisplay) {
    console.log(
      `[UI updateScoreDisplay] Called with score: ${score}. Updating textContent.`
    ); // スコア確認ログ
    scoreDisplay.textContent = `Score: ${score}`;
    scoreDisplay.style.display = "block"; // 必要なら表示
  } else {
    console.error("Score display element (#score) not found.");
  }
}

/** スコア表示を隠す */
export function hideScoreDisplay() {
  if (scoreDisplay) scoreDisplay.style.display = "none";
}

/** リザルト画面を表示 */
export function showResultScreen(score, title = "GAME OVER") {
  console.log(`[UI] Showing result screen. Title: ${title}, Score: ${score}`);
  if (finalScore) finalScore.textContent = score;
  if (resultTitle) resultTitle.textContent = title;
  if (resultScreen) {
    resultScreen.style.display = "flex"; // 表示タイプをflexに
    // フェードインのために少し遅延させてクラスを追加
    setTimeout(() => {
      resultScreen.classList.add("visible");
    }, 10);
  } else {
    console.error("Result screen element (#resultScreen) not found.");
  }
  // リザルト表示時に他のゲーム中UIを隠す
  hideGameMessage();
  hideTimerDisplay();
  hideScoreDisplay();
}

/** リザルト画面を隠す */
export function hideResultScreen() {
  if (resultScreen) {
    resultScreen.classList.remove("visible");
    resultScreen.style.display = "none";
  }
}

/** ボタン状態更新（現在は実質的に未使用） */
export function updateButtonState(gameState) {
  // スタート画面の難易度ボタンの有効/無効は、主に main.js の OpenCV 準備完了チェックで制御される
  // console.log("[UI] updateButtonState called - Currently not directly controlling button states.");
}

/** video要素の透明度を設定 */
export function setVideoOpacity(opacity) {
  if (video) video.style.opacity = opacity.toFixed(1);
}

/** video要素の透明度をリセット */
export function resetVideoOpacity() {
  if (video) video.style.opacity = "1.0";
}

/** Canvasをクリア */
export function clearCanvas() {
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// ★★★ 追加: コンボ表示更新関数 ★★★
export function updateComboDisplay(multiplier, x, y) {
  if (comboDisplay) {
    // 既存の非表示タイマーがあればキャンセル
    if (comboDisplayTimeoutId) {
      clearTimeout(comboDisplayTimeoutId);
      comboDisplayTimeoutId = null;
    }

    if (multiplier > 1.0 && x !== undefined && y !== undefined) {
      // 倍率 > 1.0 かつ座標が指定されている場合
      comboDisplay.textContent = `x${multiplier.toFixed(1)}`;

      // ★★★ 位置を設定 ★★★
      comboDisplay.style.left = `${x.toFixed(0)}px`;
      comboDisplay.style.top = `${y.toFixed(0)}px`;

      comboDisplay.style.display = "block"; // 表示
      comboDisplay.style.opacity = "1"; // 不透明に（フェードアウト用）
      console.log(
        `[UI] Combo display updated: ${
          comboDisplay.textContent
        } at (${x.toFixed(0)}, ${y.toFixed(0)})`
      );

      // 一定時間後にフェードアウト開始 -> 非表示
      const HIDE_DELAY = 600; // 表示時間 (ミリ秒)
      const FADE_DURATION = 200; // フェードアウト時間 (ミリ秒)

      comboDisplayTimeoutId = setTimeout(() => {
        // console.log(`[UI] Fading out combo display after ${HIDE_DELAY}ms.`);
        comboDisplay.style.opacity = "0"; // フェードアウト開始
        // フェードアウト完了後に非表示にする
        setTimeout(() => {
          hideComboDisplay();
        }, FADE_DURATION);
        comboDisplayTimeoutId = null;
      }, HIDE_DELAY);
    } else {
      // 倍率が1.0以下、または座標が指定されなかった場合は隠す
      hideComboDisplay();
    }
  } else {
    console.error("Combo display element not found.");
  }
}

/** コンボ表示を非表示にする関数 */
export function hideComboDisplay() {
  if (comboDisplay) {
    comboDisplay.style.display = "none";
    comboDisplay.style.opacity = "1"; // 次回表示のためにOpacityを戻す
    // タイマーIDのクリアは updateComboDisplay で行う
  }
}

/**
 * 顔の矩形を角カッコスタイルで描画する
 * @param {cv.Rect} rect - OpenCVの顔検出結果の矩形
 */
export function drawFaceRect(rect) {
  if (!ctx || !rect) return; // Context または Rect がなければ何もしない

  const x = rect.x;
  const y = rect.y;
  const width = rect.width;
  const height = rect.height;

  // スタイルの設定
  const bracketLength = Math.min(width, height) * 0.2; // 角カッコの辺の長さ
  const lineWidth = 4; // 線の太さ
  const strokeStyle = "cyan"; // 線の色

  // 描画処理
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  // 左上角
  ctx.moveTo(x, y + bracketLength);
  ctx.lineTo(x, y);
  ctx.lineTo(x + bracketLength, y);

  // 右上角
  ctx.moveTo(x + width - bracketLength, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + bracketLength);

  // 左下角
  ctx.moveTo(x, y + height - bracketLength);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + bracketLength, y + height);

  // 右下角
  ctx.moveTo(x + width - bracketLength, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - bracketLength);

  // 線を描画
  ctx.stroke();
}
// ★★★ 関数名は closeRuleModal のまま ★★★
export function openRuleModal() {
  if (ruleModal) {
    console.log("[UI] Opening rule modal.");
    ruleModal.style.display = "flex";
    setTimeout(() => {
      ruleModal.classList.add("visible");
    }, 10);
  } else {
    console.error("Rule modal element not found.");
  }
}

// ★★★ 関数名は closeRuleModal のまま ★★★
export function closeRuleModal() {
  if (ruleModal) {
    console.log("[UI] Closing rule modal.");
    ruleModal.classList.remove("visible");
    setTimeout(() => {
      if (!ruleModal.classList.contains("visible")) {
        ruleModal.style.display = "none";
      }
    }, 300); // CSS transition time
  }
}

export function playSfx(type) {
  let audioElement = null;
  switch (type) {
    case "poop":
      audioElement = sfxPoop;
      break;
    case "item":
      audioElement = sfxItem;
      break;
    default:
      console.warn(`[UI playSfx] Unknown SFX type: ${type}`);
      return;
  }

  if (audioElement && typeof audioElement.play === "function") {
    audioElement.currentTime = 0; // 再生位置を先頭に戻す
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // 再生が中断された場合などのエラーはコンソールにも（デバッグ中は）出す
        console.warn(
          `SFX play error (${type}): ${error.name} - ${error.message}`
        );
      });
    }
  } else {
    console.warn(
      `[UI playSfx] Audio element not found or invalid for type: ${type}`,
      audioElement
    );
  }
}
