/**
 * Tests for HapticService.
 *
 * The internal vibrate() method is a deliberate no-op (Vibration permission
 * requires a full device build). These tests verify that:
 *  §1  The enabled flag defaults to true
 *  §2  All public impact methods execute without throwing
 *  §3  notificationSuccess() handles both the Android array and iOS scalar paths
 */

import { Platform } from 'react-native';
import { HapticService } from '../HapticService';

afterEach(() => {
  // Reset to default so tests stay isolated
  HapticService.enabled = true;
});

// ─────────────────────────────────────────────────────────────────────────────
// §1  Default state
// ─────────────────────────────────────────────────────────────────────────────

describe('HapticService — default state', () => {
  it('is enabled by default', () => {
    expect(HapticService.enabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  All public impact methods
// ─────────────────────────────────────────────────────────────────────────────

describe.each(['lightImpact', 'mediumImpact', 'heavyImpact', 'selection'] as const)(
  '%s()',
  method => {
    it('does not throw when enabled=true', () => {
      HapticService.enabled = true;
      expect(() => (HapticService[method] as () => void)()).not.toThrow();
    });

    it('does not throw when enabled=false', () => {
      HapticService.enabled = false;
      expect(() => (HapticService[method] as () => void)()).not.toThrow();
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// §3  notificationSuccess() — platform branches
// ─────────────────────────────────────────────────────────────────────────────

describe('HapticService — notificationSuccess()', () => {
  it('does not throw on the default platform (ios)', () => {
    // The test environment exposes Platform.OS = 'ios' via react-native preset.
    expect(() => HapticService.notificationSuccess()).not.toThrow();
  });

  it('does not throw when Platform.OS is android', () => {
    const original = Platform.OS;
    // @ts-ignore — patching read-only for test purposes
    Platform.OS = 'android';
    try {
      expect(() => HapticService.notificationSuccess()).not.toThrow();
    } finally {
      // @ts-ignore
      Platform.OS = original;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4  Enabled flag toggling
// ─────────────────────────────────────────────────────────────────────────────

describe('HapticService — toggling enabled flag', () => {
  it('can be disabled then re-enabled', () => {
    HapticService.enabled = false;
    expect(HapticService.enabled).toBe(false);
    HapticService.enabled = true;
    expect(HapticService.enabled).toBe(true);
  });
});
