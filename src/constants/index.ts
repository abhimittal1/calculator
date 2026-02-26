/**
 * App-level constants
 */

// ─── App metadata ────────────────────────────────────────────────────────────
export const APP_NAME = 'CalculatorApp';
export const APP_VERSION = '0.0.1';

// ─── API ─────────────────────────────────────────────────────────────────────
export const API_BASE_URL = 'https://api.example.com/v1';
export const API_TIMEOUT_MS = 10_000;

// ─── AsyncStorage keys ───────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@calculator/auth_token',
  COLOR_SCHEME: '@calculator/color_scheme',
  ONBOARDING_DONE: '@calculator/onboarding_done',
} as const;

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;

// ─── Animation durations (ms) ────────────────────────────────────────────────
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// ─── Z-index layers ──────────────────────────────────────────────────────────
export const Z_INDEX = {
  BASE: 0,
  CARD: 10,
  MODAL: 100,
  TOAST: 200,
} as const;
