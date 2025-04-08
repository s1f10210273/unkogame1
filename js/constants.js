// js/constants.js

export const OPACITY_THRESHOLD = 0.5;
export const OPACITY_DECREMENT = 0.2; // 糞ヒット時のOpacity低下量

// --- 糞 ---
export const POOP_SPEED = 8;
export const POOP_SIZE = 50;
export const POOP_IMAGE_PATH = "images/poop.png";
export const MAX_POOPS = 2; // 同時最大数

// --- りんご ---
export const APPLE_SIZE = 40;
export const APPLE_SPEED = 7;
export const APPLE_SCORE = 20; // 通常スコア
export const APPLE_IMAGE_PATH = "images/apple.png";
export const MAX_APPLES = 5; // 同時最大数

// ★★★ 追加: 水 ★★★
export const WATER_SIZE = 40;
export const WATER_SPEED = 6; // 少しゆっくり
export const WATER_IMAGE_PATH = "images/water.png";
export const WATER_OPACITY_RECOVERY = 0.2; // 回復量 (20%)
export const WATER_BONUS_SCORE = 10; // Opacity最大時のボーナススコア
export const MAX_WATERS = 2; // 同時最大数

// --- アイテム生成関連 ---
export const ITEM_GENERATION_INTERVAL_MIN = 600; // アイテム生成間隔の最小値 (さらに短縮)
export const ITEM_GENERATION_INTERVAL_MAX = 2000; // アイテム生成間隔の最大値 (さらに短縮)
// ★★★ 生成確率の閾値を設定 ★★★
// Math.random() の値に基づいてどのアイテムを生成試行するか決定
export const POOP_THRESHOLD = 0.6; // 0.0  <= R < 0.60  (60%で糞を試行)
export const APPLE_THRESHOLD = 0.85; // 0.60 <= R < 0.85  (25%でりんごを試行)
// 0.85 <= R < 1.0   (15%で水を試行)

// --- ゲーム設定 ---
export const COUNTDOWN_SECONDS = 3;
export const FACE_CASCADE_FILE = "haarcascade_frontalface_alt.xml";
export const FACE_CASCADE_PATH = `opencv/${FACE_CASCADE_FILE}`;
export const GAME_DURATION_SECONDS = 30;

// --- ゲーム状態 ---
export const GAME_STATE = {
  IDLE: "idle",
  INITIALIZING: "initializing",
  LOADING_CASCADE: "loading_cascade",
  STARTING_CAMERA: "starting_camera",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  GAMEOVER: "gameover",
  ERROR: "error",
};
