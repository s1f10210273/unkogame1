// js/constants.js

export const OPACITY_THRESHOLD = 0.5;
export const OPACITY_DECREMENT = 0.2;

// --- 糞 ---
// export const POOP_SPEED = 8; // ← 固定値削除
export const POOP_SIZE = 50;
export const POOP_IMAGE_PATH = "images/poop.png";
export const POOP_SPEED_INITIAL = 7; // ★★★ 追加: 初期速度 ★★★
export const POOP_SPEED_FINAL = 15; // ★★★ 追加: 最終速度 ★★★

// --- りんご ---
// export const APPLE_SPEED = 7; // ← 固定値削除
export const APPLE_SIZE = 40;
export const APPLE_SCORE = 200;
export const APPLE_IMAGE_PATH = "images/apple.png";
export const APPLE_SPEED_INITIAL = 6; // ★★★ 追加: 初期速度 ★★★
export const APPLE_SPEED_FINAL = 13; // ★★★ 追加: 最終速度 ★★★

// --- 水 ---
// export const WATER_SPEED = 6; // ← 固定値削除
export const WATER_SIZE = 60;
export const WATER_IMAGE_PATH = "images/water.png";
export const WATER_OPACITY_RECOVERY = 0.2;
export const WATER_BONUS_SCORE = 100;
export const WATER_COLLISION_INSET = 10;
export const WATER_SPEED_INITIAL = 5; // ★★★ 追加: 初期速度 ★★★
export const WATER_SPEED_FINAL = 11; // ★★★ 追加: 最終速度 ★★★

// --- アイテム最大数関連 ---
export const BASE_MAX_POOPS = 2;
export const BASE_MAX_APPLES = 4;
export const BASE_MAX_WATERS = 1;
export const LIMIT_INCREASE_INTERVAL = 10;
export const LIMIT_INCREASE_AMOUNT = 1;
export const CAP_MAX_POOPS = 7;
export const CAP_MAX_APPLES = 12;
export const CAP_MAX_WATERS = 5;

// --- アイテム生成間隔 & 速度増加関連 ---
export const ITEM_GENERATION_INTERVAL_MIN_INITIAL = 700;
export const ITEM_GENERATION_INTERVAL_MAX_INITIAL = 2200;
export const ITEM_GENERATION_INTERVAL_MIN_FINAL = 150;
export const ITEM_GENERATION_INTERVAL_MAX_FINAL = 600;
export const INTERVAL_REDUCTION_DURATION = 60; // ★★★ 生成間隔と速度が最終値に達するまでの時間(秒) ★★★
// export const SPEED_INCREASE_DURATION = 60; // INTERVAL_REDUCTION_DURATION を流用

// --- アイテム生成確率 ---
export const POOP_THRESHOLD = 0.6;
export const APPLE_THRESHOLD = 0.85;

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
