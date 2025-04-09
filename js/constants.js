// js/constants.js

export const OPACITY_THRESHOLD = 0.5;
export const OPACITY_DECREMENT = 0.2;

// --- 糞 ---
export const POOP_SIZE = 50;
export const POOP_IMAGE_PATH = "images/poop.png";
export const POOP_SPEED_INITIAL = 5; // 初期速度 (低い値)
export const POOP_SPEED_FINAL = 15; // ★★★ 最終速度変更: 15 -> 12 ★★★

// --- りんご ---
export const APPLE_SIZE = 40;
export const APPLE_SCORE = 200;
export const APPLE_IMAGE_PATH = "images/apple.png";
export const APPLE_SPEED_INITIAL = 5; // 初期速度 (低い値)
export const APPLE_SPEED_FINAL = 17; // ★★★ 最終速度変更: 13 -> 10 ★★★

// --- 水 ---
export const WATER_SIZE = 60;
export const WATER_IMAGE_PATH = "images/water.png";
export const WATER_OPACITY_RECOVERY = 0.2;
export const WATER_BONUS_SCORE = 100;
export const WATER_COLLISION_INSET = 10;
export const WATER_SPEED_INITIAL = 5; // 初期速度 (低い値)
export const WATER_SPEED_FINAL = 18; // ★★★ 最終速度変更: 11 -> 9 ★★★

// --- 金りんご ---
export const GOLD_APPLE_SIZE = 45;
export const GOLD_APPLE_SCORE = 500;
export const GOLD_APPLE_IMAGE_PATH = "images/gold-apple.png";
export const GOLD_APPLE_SPEED_INITIAL = 5; // 初期速度 (低い値)
export const GOLD_APPLE_SPEED_FINAL = 15; // ★★★ 最終速度変更: 10 -> 8 ★★★

// --- ソフトクリーム ---
export const SOFT_SERVE_SIZE = 55;
export const SOFT_SERVE_SPEED = 9; // 固定速度
export const SOFT_SERVE_SCORE = 1000; // ★★★ スコア変更: 300 -> 1000 ★★★
export const SOFT_SERVE_IMAGE_PATH = "images/soft.png";
export const SOFT_SERVE_SPAWN_CHANCE = 0.1; // 通常アイテム生成タイミングでの出現確率 (10%)
// 難易度ごとの総出現数
export const SOFT_SERVE_COUNT_BEGINNER = 1;
export const SOFT_SERVE_COUNT_INTERMEDIATE = 2;
export const SOFT_SERVE_COUNT_ADVANCED = 4;

// --- アイテム最大数関連 ---
export const BASE_MAX_POOPS = 2;
export const BASE_MAX_APPLES = 4;
export const BASE_MAX_WATERS = 1;
export const BASE_MAX_GOLD_APPLES = 1;
export const LIMIT_INCREASE_INTERVAL = 10; // 10秒ごとに増加チェック
export const LIMIT_INCREASE_AMOUNT = 1;
// ★★★ 最大数上限を引き上げ ★★★
export const CAP_MAX_POOPS = 10; // 7 -> 10
export const CAP_MAX_APPLES = 16; // 12 -> 16
export const CAP_MAX_WATERS = 8; // 5 -> 8
export const CAP_MAX_GOLD_APPLES = 3; // 2 -> 3

// --- アイテム生成間隔 & 速度増加関連 ---
export const ITEM_GENERATION_INTERVAL_MIN_INITIAL = 700;
export const ITEM_GENERATION_INTERVAL_MAX_INITIAL = 2200;
export const ITEM_GENERATION_INTERVAL_MIN_FINAL = 150;
export const ITEM_GENERATION_INTERVAL_MAX_FINAL = 600;
export const INTERVAL_REDUCTION_DURATION = 200; // ★★★ 200秒かけて速度/頻度が最大に ★★★

// --- アイテム生成確率 ---
export const POOP_THRESHOLD = 0.5;
export const APPLE_THRESHOLD = 0.8;
export const WATER_THRESHOLD = 0.95;
export const GOLD_APPLE_THRESHOLD = 1; // 金りんごは2% (0.93 <= R < 0.98)

// --- ゲーム設定 ---
export const COUNTDOWN_SECONDS = 3;
export const CASCADE_FILE = "haarcascade_frontalface_alt.xml";
export const CASCADE_PATH = `opencv/${CASCADE_FILE}`;
export const TIME_LIMIT_BEGINNER = 30;
export const TIME_LIMIT_INTERMEDIATE = 60;
export const TIME_LIMIT_ADVANCED = 90;

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

// --- 難易度識別 ---
export const DIFFICULTY = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
};
