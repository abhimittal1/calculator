/**
 * SoundService
 *
 * Singleton that provides a consistent API for UI sound effects.
 * All methods are guarded by a static `enabled` flag so callers
 * never need conditional logic around sound playback.
 *
 * Current state: the architecture is in place and the enabled flag
 * is wired to SettingsScreen — sound file loading is left as TODO
 * until a sound library (e.g. react-native-sound or expo-av) is
 * added to the project.
 *
 * Usage (future):
 *   import {SoundService} from '@/services/SoundService';
 *   SoundService.buttonPress();   // every key tap
 *   SoundService.equalsPress();   // = pressed
 *   SoundService.errorSound();    // invalid expression
 */

class _SoundService {
  /** Whether sound effects are currently enabled. */
  enabled = false; // off by default until sounds are loaded

  // ── Private helpers ──────────────────────────────────────────

  private play(soundName: string): void {
    if (!this.enabled) return;
    // TODO: integrate a sound library (e.g. react-native-sound or expo-av)
    // and load/cache sound files here.
    // Example with react-native-sound:
    //   const s = new Sound(`${soundName}.mp3`, Sound.MAIN_BUNDLE);
    //   s.play();
    void soundName; // suppress unused-var lint until implemented
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Short click — played on every digit and operator key press. */
  buttonPress(): void {
    // TODO: short, crisp click sound
    this.play('button_press');
  }

  /** Slightly heavier click — played when the = key is pressed. */
  equalsPress(): void {
    // TODO: confirmation chime
    this.play('equals_press');
  }

  /** Error tone — played when the expression cannot be evaluated. */
  errorSound(): void {
    // TODO: short negative beep
    this.play('error');
  }
}

export const SoundService = new _SoundService();
