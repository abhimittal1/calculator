/**
 * Spacing scale — based on a 4-pt grid.
 *
 * Usage:
 *   import { spacing } from '@/theme/spacing';
 *   paddingHorizontal: spacing[4]   // → 16
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export type Spacing = typeof spacing;

// ─── Border radii ────────────────────────────────────────────────────────────
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type Radii = typeof radii;
