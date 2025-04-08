// js/constants.js

export const OPACITY_THRESHOLD = 0.5;
export const OPACITY_DECREMENT = 0.2;

// --- 糞 ---
export const POOP_SPEED = 8;
export const POOP_SIZE = 50;
export const POOP_IMAGE_PATH = "images/poop.png"; // ★★★ 要確認 ★★★
export const MAX_POOPS = 2;

// --- りんご ---
export const APPLE_SIZE = 40;
export const APPLE_SPEED = 7;
export const APPLE_SCORE = 10;
export const APPLE_IMAGE_PATH = "images/apple.png"; // ★★★ 要確認 ★★★
export const MAX_APPLES = 5;

// --- 水 ---
export const WATER_SIZE = 40;
export const WATER_SPEED = 6;
export const WATER_IMAGE_PATH = "images/water.png"; // ★★★ 要確認 ★★★
export const WATER_OPACITY_RECOVERY = 0.2;
export const WATER_BONUS_SCORE = 20;
export const MAX_WATERS = 2;

// --- アイテム生成関連 ---
export const ITEM_GENERATION_INTERVAL_MIN = 600;
export const ITEM_GENERATION_INTERVAL_MAX = 2000;
export const POOP_THRESHOLD = 0.6;
export const APPLE_THRESHOLD = 0.85;

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
