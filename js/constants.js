// js/constants.js

export const OPACITY_THRESHOLD = 0.5;
export const OPACITY_DECREMENT = 0.2;

// --- 速度関連 (単位: ピクセル/秒) ★★★ デルタタイム用 ★★★ ---
const BASE_SPEED_FACTOR = 250; // 基準速度 (ピクセル/秒) - この値を調整

// --- 糞 ---
export const POOP_SIZE = 50;
export const POOP_IMAGE_PATH = "images/poop.png";
export const POOP_SPEED_INITIAL = BASE_SPEED_FACTOR * 0.9; // 例: 225 ピクセル/秒
export const POOP_SPEED_FINAL = BASE_SPEED_FACTOR * 2.0; // 例: 500 ピクセル/秒

// --- りんご ---
export const APPLE_SIZE = 40;
export const APPLE_SCORE = 200;
export const APPLE_IMAGE_PATH = "images/apple.png";
export const APPLE_SPEED_INITIAL = BASE_SPEED_FACTOR * 0.8; // 例: 200
export const APPLE_SPEED_FINAL = BASE_SPEED_FACTOR * 1.8; // 例: 450

// --- 水 ---
export const WATER_SIZE = 60;
export const WATER_IMAGE_PATH = "images/water.png";
export const WATER_OPACITY_RECOVERY = 0.2;
export const WATER_BONUS_SCORE = 100;
export const WATER_COLLISION_INSET = 10;
export const WATER_SPEED_INITIAL = BASE_SPEED_FACTOR * 0.7; // 例: 175
export const WATER_SPEED_FINAL = BASE_SPEED_FACTOR * 1.6; // 例: 400

// --- 金りんご ---
export const GOLD_APPLE_SIZE = 45;
export const GOLD_APPLE_SCORE = 500;
export const GOLD_APPLE_IMAGE_PATH = "images/gold-apple.png";
export const GOLD_APPLE_SPEED_INITIAL = BASE_SPEED_FACTOR * 0.7; // 例: 175
export const GOLD_APPLE_SPEED_FINAL = BASE_SPEED_FACTOR * 1.5; // 例: 375

// --- ソフトクリーム ---
export const SOFT_SERVE_SIZE = 55;
export const SOFT_SERVE_SPEED = BASE_SPEED_FACTOR * 0.6; // ★★★ 固定速度 (例: 150 ピクセル/秒) ★★★
export const SOFT_SERVE_SCORE = 1000;
export const SOFT_SERVE_IMAGE_PATH = "images/soft.png";
export const SOFT_SERVE_SPAWN_CHANCE = 0.15; // 通常アイテム生成タイミングでの出現確率 (15%)
// 難易度ごとの総出現数
export const SOFT_SERVE_COUNT_BEGINNER = 1;
export const SOFT_SERVE_COUNT_INTERMEDIATE = 2;
export const SOFT_SERVE_COUNT_ADVANCED = 4;

// --- アイテム最大数関連 ---
export const BASE_MAX_POOPS = 2;
export const BASE_MAX_APPLES = 5;
export const BASE_MAX_WATERS = 2;
export const BASE_MAX_GOLD_APPLES = 1;
export const LIMIT_INCREASE_INTERVAL = 10;
export const LIMIT_INCREASE_AMOUNT = 2;
export const CAP_MAX_POOPS = 12;
export const CAP_MAX_APPLES = 20;
export const CAP_MAX_WATERS = 10;
export const CAP_MAX_GOLD_APPLES = 3;

// --- アイテム生成間隔 & 速度増加関連 ---
export const ITEM_GENERATION_INTERVAL_MIN_INITIAL = 600;
export const ITEM_GENERATION_INTERVAL_MAX_INITIAL = 1800;
export const ITEM_GENERATION_INTERVAL_MIN_FINAL = 100;
export const ITEM_GENERATION_INTERVAL_MAX_FINAL = 400;
export const INTERVAL_REDUCTION_DURATION = 60; // 生成間隔と速度が最終値に達するまでの時間(秒)

// --- アイテム生成確率 (糞、りんご、水、金りんご) ---
export const POOP_THRESHOLD = 0.55;
export const APPLE_THRESHOLD = 0.78;
export const WATER_THRESHOLD = 0.93;
export const GOLD_APPLE_THRESHOLD = 1.0; // 金りんご 7% (0.93 <= R < 1.00)

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
