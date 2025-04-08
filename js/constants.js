// js/constants.js

export const OPACITY_THRESHOLD = 0.5;
export const OPACITY_DECREMENT = 0.2;

// --- 糞 ---
export const POOP_SPEED = 8;
export const POOP_SIZE = 50;
export const POOP_IMAGE_PATH = "images/poop.png";

// --- りんご ---
export const APPLE_SIZE = 40;
export const APPLE_SPEED = 7;
export const APPLE_SCORE = 200;
export const APPLE_IMAGE_PATH = "images/apple.png";

// --- 水 ---
export const WATER_SIZE = 60;
export const WATER_SPEED = 6;
export const WATER_IMAGE_PATH = "images/water.png";
export const WATER_OPACITY_RECOVERY = 0.2;
export const WATER_BONUS_SCORE = 100;
export const WATER_COLLISION_INSET = 10;

// --- アイテム最大数関連 ---
export const BASE_MAX_POOPS = 2;
export const BASE_MAX_APPLES = 4;
export const BASE_MAX_WATERS = 1;
export const LIMIT_INCREASE_INTERVAL = 10;
export const LIMIT_INCREASE_AMOUNT = 1;
export const CAP_MAX_POOPS = 7;
export const CAP_MAX_APPLES = 12;
export const CAP_MAX_WATERS = 5;

// --- アイテム生成間隔関連 ---
export const ITEM_GENERATION_INTERVAL_MIN_INITIAL = 700;
export const ITEM_GENERATION_INTERVAL_MAX_INITIAL = 2200;
export const ITEM_GENERATION_INTERVAL_MIN_FINAL = 150;
export const ITEM_GENERATION_INTERVAL_MAX_FINAL = 600;
export const INTERVAL_REDUCTION_DURATION = 60;

// --- アイテム生成確率 ---
export const POOP_THRESHOLD = 0.6;
export const APPLE_THRESHOLD = 0.85;

// --- ゲーム設定 ---
export const COUNTDOWN_SECONDS = 3;

// ★★★ 変更: カスケードファイル関連の定数名を統一 ★★★
export const DETECTION_TARGET = "Face"; // 検出対象は顔
export const CASCADE_FILE = "haarcascade_frontalface_alt.xml"; // ファイル名
export const CASCADE_PATH = `opencv/${CASCADE_FILE}`; // パス (ファイル名から自動生成)

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
