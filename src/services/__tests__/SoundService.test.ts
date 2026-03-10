/**
 * Tests for SoundService.
 *
 * The sound file loading is a TODO in the implementation (no library yet),
 * so these tests verify:
 *  §1  Default enabled state
 *  §2  All public methods execute without throwing when disabled
 *  §3  All public methods execute without throwing when enabled
 *  §4  The enabled flag can be toggled freely
 */

import { SoundService } from '../SoundService';

afterEach(() => {
  // Restore to the default (disabled) state after each test so tests
  // don't influence each other through the singleton.
  SoundService.enabled = false;
});

// ─────────────────────────────────────────────────────────────────────────────
// §1  Default state
// ─────────────────────────────────────────────────────────────────────────────

describe('SoundService — default state', () => {
  it('is disabled by default', () => {
    expect(SoundService.enabled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  All methods — sound disabled (fast path: early return inside play())
// ─────────────────────────────────────────────────────────────────────────────

describe('SoundService — disabled', () => {
  beforeEach(() => {
    SoundService.enabled = false;
  });

  it('buttonPress() does not throw', () => {
    expect(() => SoundService.buttonPress()).not.toThrow();
  });

  it('equalsPress() does not throw', () => {
    expect(() => SoundService.equalsPress()).not.toThrow();
  });

  it('errorSound() does not throw', () => {
    expect(() => SoundService.errorSound()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3  All methods — sound enabled (exercises play() body past the guard)
// ─────────────────────────────────────────────────────────────────────────────

describe('SoundService — enabled', () => {
  beforeEach(() => {
    SoundService.enabled = true;
  });

  it('buttonPress() does not throw', () => {
    expect(() => SoundService.buttonPress()).not.toThrow();
  });

  it('equalsPress() does not throw', () => {
    expect(() => SoundService.equalsPress()).not.toThrow();
  });

  it('errorSound() does not throw', () => {
    expect(() => SoundService.errorSound()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4  Toggle behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('SoundService — toggling', () => {
  it('can be enabled then disabled', () => {
    SoundService.enabled = true;
    expect(SoundService.enabled).toBe(true);
    SoundService.enabled = false;
    expect(SoundService.enabled).toBe(false);
  });

  it('methods still callable after each toggle', () => {
    SoundService.enabled = true;
    expect(() => SoundService.buttonPress()).not.toThrow();
    SoundService.enabled = false;
    expect(() => SoundService.equalsPress()).not.toThrow();
  });
});
