/**
 * Tests for settingsStore (Zustand + persist).
 *
 * The persist middleware writes to AsyncStorage which is already mocked via
 * __mocks__/@react-native-async-storage/async-storage.js.
 *
 * We use setState() to set a known baseline before each test so test order
 * doesn't affect outcomes.
 *
 * Coverage areas:
 *  §1  Initial (default) state
 *  §2  toggleDark()
 *  §3  toggleHaptic() — also updates HapticService.enabled
 *  §4  toggleSound()  — also updates SoundService.enabled
 *  §5  toggleSaveHistory()
 */

import { useSettingsStore } from '@/store';
import { HapticService } from '@/services/HapticService';
import { SoundService } from '@/services/SoundService';

/** Convenience: current state snapshot. */
const state = () => useSettingsStore.getState();

const DEFAULTS = {
  isDark: false,
  hapticEnabled: true,
  soundEnabled: true,
  saveHistory: true,
};

beforeEach(() => {
  useSettingsStore.setState(DEFAULTS);
  // Keep service singletons in sync with the reset defaults
  HapticService.enabled = true;
  SoundService.enabled = true;
});

// ─────────────────────────────────────────────────────────────────────────────
// §1  Initial state
// ─────────────────────────────────────────────────────────────────────────────

describe('settingsStore — defaults', () => {
  it('isDark = false', () => expect(state().isDark).toBe(false));
  it('hapticEnabled = true', () => expect(state().hapticEnabled).toBe(true));
  it('soundEnabled = true', () => expect(state().soundEnabled).toBe(true));
  it('saveHistory = true', () => expect(state().saveHistory).toBe(true));
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  toggleDark
// ─────────────────────────────────────────────────────────────────────────────

describe('settingsStore — toggleDark()', () => {
  it('flips isDark from false → true', () => {
    state().toggleDark();
    expect(state().isDark).toBe(true);
  });

  it('flips isDark back true → false', () => {
    state().toggleDark();
    state().toggleDark();
    expect(state().isDark).toBe(false);
  });

  it('does not affect other settings', () => {
    state().toggleDark();
    expect(state().hapticEnabled).toBe(true);
    expect(state().soundEnabled).toBe(true);
    expect(state().saveHistory).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3  toggleHaptic
// ─────────────────────────────────────────────────────────────────────────────

describe('settingsStore — toggleHaptic()', () => {
  it('flips hapticEnabled from true → false', () => {
    state().toggleHaptic();
    expect(state().hapticEnabled).toBe(false);
  });

  it('also disables HapticService.enabled', () => {
    state().toggleHaptic();
    expect(HapticService.enabled).toBe(false);
  });

  it('flips back false → true and re-enables HapticService', () => {
    state().toggleHaptic(); // → false
    state().toggleHaptic(); // → true
    expect(state().hapticEnabled).toBe(true);
    expect(HapticService.enabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4  toggleSound
// ─────────────────────────────────────────────────────────────────────────────

describe('settingsStore — toggleSound()', () => {
  it('flips soundEnabled from true → false', () => {
    state().toggleSound();
    expect(state().soundEnabled).toBe(false);
  });

  it('also disables SoundService.enabled', () => {
    state().toggleSound();
    expect(SoundService.enabled).toBe(false);
  });

  it('flips back false → true and re-enables SoundService', () => {
    state().toggleSound(); // → false
    state().toggleSound(); // → true
    expect(state().soundEnabled).toBe(true);
    expect(SoundService.enabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §5  toggleSaveHistory
// ─────────────────────────────────────────────────────────────────────────────

describe('settingsStore — toggleSaveHistory()', () => {
  it('flips saveHistory from true → false', () => {
    state().toggleSaveHistory();
    expect(state().saveHistory).toBe(false);
  });

  it('flips saveHistory back false → true', () => {
    state().toggleSaveHistory();
    state().toggleSaveHistory();
    expect(state().saveHistory).toBe(true);
  });

  it('does not affect other settings', () => {
    state().toggleSaveHistory();
    expect(state().isDark).toBe(false);
    expect(state().hapticEnabled).toBe(true);
    expect(state().soundEnabled).toBe(true);
  });
});
