/**
 * Design-token colour palettes.
 *
 * Primitive colours are defined once here; semantic colour maps
 * (light / dark) in `theme/index.ts` reference only these tokens,
 * keeping raw hex values in a single source of truth.
 */

// ─── Primitive palette ───────────────────────────────────────────────────────
export const palette = {
  // Blues
  blue50: '#EBF5FF',
  blue100: '#CCE4FF',
  blue400: '#4DA6FF',
  blue500: '#007AFF',
  blue600: '#0062CC',
  blue700: '#004A99',

  // Greens
  green400: '#34C759',
  green600: '#248A3D',

  // Reds
  red400: '#FF453A',
  red600: '#C00A0A',

  // Oranges / Warnings
  orange400: '#FF9F0A',
  orange600: '#C07000',

  // Neutrals – light side
  white: '#FFFFFF',
  grey50: '#F2F2F7',
  grey100: '#E5E5EA',
  grey200: '#D1D1D6',
  grey300: '#C7C7CC',
  grey400: '#AEAEB2',
  grey500: '#8E8E93',

  // Neutrals – dark side
  grey600: '#636366',
  grey700: '#48484A',
  grey800: '#3A3A3C',
  grey900: '#2C2C2E',
  grey950: '#1C1C1E',
  black: '#000000',
} as const;

export type Palette = typeof palette;
