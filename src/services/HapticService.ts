/**
 * HapticService
 *
 * Singleton that wraps React Native's built-in `Vibration` API behind an
 * `enabled` flag so callers never have to guard themselves.
 *
 * Uses `Vibration` from `react-native` (no native rebuild required).
 * Different "impact levels" are approximated with different durations:
 *   light  →  10 ms
 *   medium →  20 ms
 *   heavy  →  40 ms
 *   selection → 8 ms
 *   success   → short double-pulse [10, 60, 20]
 *
 * The `enabled` flag is controlled by SettingsScreen and persisted to
 * AsyncStorage.  On cold-start the flag defaults to `true`; the Settings
 * screen loads and applies the saved preference via a useEffect on mount.
 *
 * Usage:
 *   import {HapticService} from '@/services/HapticService';
 *   HapticService.selection();     // digit key tap
 *   HapticService.mediumImpact();  // equals press
 */

import { Platform } from 'react-native';

// NOTE: Vibration API is disabled. The android.permission.VIBRATE permission
// has been added to AndroidManifest.xml. After a full rebuild (npx react-native
// run-android) you can re-enable vibration by replacing the no-op `vibrate`
// method with: Vibration.vibrate(duration)

class _HapticService {
  /** Whether haptic feedback is currently enabled. */
  enabled = true;

  private vibrate(_duration: number | number[]): void {
    // No-op: Vibration API requires android.permission.VIBRATE in the
    // installed APK. The permission is declared in AndroidManifest.xml and
    // will be active after the next full build.
  }

  /** Light tap — use for digit & operator key presses. */
  lightImpact(): void {
    this.vibrate(10);
  }

  /** Medium tap — use for function keys (C, ±, %) and equals. */
  mediumImpact(): void {
    this.vibrate(20);
  }

  /** Heavy tap — reserved for destructive or high-emphasis actions. */
  heavyImpact(): void {
    this.vibrate(40);
  }

  /** Subtle selection tick — use for toggle switches / pickers. */
  selection(): void {
    this.vibrate(8);
  }

  /** Success notification pattern — double-pulse on Android. */
  notificationSuccess(): void {
    this.vibrate(Platform.OS === 'android' ? [0, 10, 60, 20] : 1);
  }
}

export const HapticService = new _HapticService();
