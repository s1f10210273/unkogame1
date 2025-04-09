// js/constants.js

export const OPACITY_THRESHOLD = 0.5;
export const OPACITY_DECREMENT = 0.2;

// --- 糞 ---
export const POOP_SIZE = 50;
export const POOP_IMAGE_PATH = "images/poop.png";
export const POOP_SPEED_INITIAL = 7;
export const POOP_SPEED_FINAL = 15;

// --- りんご ---
export const APPLE_SIZE = 40;
export const APPLE_SCORE = 200;
export const APPLE_IMAGE_PATH = "images/apple.png";
export const APPLE_SPEED_INITIAL = 6;
export const APPLE_SPEED_FINAL = 13;

// --- 水 ---
export const WATER_SIZE = 60;
export const WATER_IMAGE_PATH = "images/water.png";
export const WATER_OPACITY_RECOVERY = 0.2;
export const WATER_BONUS_SCORE = 100;
export const WATER_COLLISION_INSET = 10;
export const WATER_SPEED_INITIAL = 5;
export const WATER_SPEED_FINAL = 11;

// --- 金りんご (復活) ---
export const GOLD_APPLE_SIZE = 45;
export const GOLD_APPLE_SCORE = 500;
export const GOLD_APPLE_IMAGE_PATH = "images/gold-apple.png";
export const GOLD_APPLE_SPEED_INITIAL = 5;
export const GOLD_APPLE_SPEED_FINAL = 10;

// ★★★ 追加: ソフトクリーム ★★★
export const SOFT_SERVE_SIZE = 55;
export const SOFT_SERVE_SPEED = 4; // 固定速度
export const SOFT_SERVE_SCORE = 1000;
export const SOFT_SERVE_IMAGE_PATH = "images/soft.png";
export const SOFT_SERVE_SPAWN_CHANCE = 0.1; // ★★★ 通常アイテム生成タイミングでの出現確率 (10%) ★★★
// 難易度ごとの総出現数
export const SOFT_SERVE_COUNT_BEGINNER = 1;
export const SOFT_SERVE_COUNT_INTERMEDIATE = 2;
export const SOFT_SERVE_COUNT_ADVANCED = 4;

// --- アイテム最大数関連 ---
export const BASE_MAX_POOPS = 2;
export const BASE_MAX_APPLES = 4;
export const BASE_MAX_WATERS = 1;
export const BASE_MAX_GOLD_APPLES = 1; // ★★★ 金りんご初期最大数 ★★★
// ソフトクリームは同時出現数1固定なのでここには含めない
export const LIMIT_INCREASE_INTERVAL = 10;
export const LIMIT_INCREASE_AMOUNT = 1;
export const CAP_MAX_POOPS = 7;
export const CAP_MAX_APPLES = 12;
export const CAP_MAX_WATERS = 5;
export const CAP_MAX_GOLD_APPLES = 2; // ★★★ 金りんご最大数上限 ★★★

// --- アイテム生成間隔 & 速度増加関連 ---
export const ITEM_GENERATION_INTERVAL_MIN_INITIAL = 700;
export const ITEM_GENERATION_INTERVAL_MAX_INITIAL = 2200;
export const ITEM_GENERATION_INTERVAL_MIN_FINAL = 150;
export const ITEM_GENERATION_INTERVAL_MAX_FINAL = 600;
export const INTERVAL_REDUCTION_DURATION = 60;

// --- アイテム生成確率 (糞、りんご、水、金りんご - 合計 < 1.0) ★★★ 変更 ★★★ ---
// ソフトクリームはこの確率とは別に抽選する
export const POOP_THRESHOLD = 0.58; // 58% 糞
export const APPLE_THRESHOLD = 0.78; // 20% りんご (0.58 <= R < 0.78)
export const WATER_THRESHOLD = 0.93; // 15% 水   (0.78 <= R < 0.93)
export const GOLD_APPLE_THRESHOLD = 0.98; // 5% 金りんご (0.93 <= R < 0.98)
// 残り 2% は通常アイテム何も出ない

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
