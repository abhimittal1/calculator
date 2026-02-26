/**
 * Theme index — light & dark semantic colour maps plus the ThemeProvider /
 * useTheme hook that the rest of the app consumes.
 *
 * Usage:
 *   const { theme, colorScheme, toggleTheme } = useTheme();
 *   backgroundColor: theme.colors.background.primary
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {useColorScheme} from 'react-native';
import {palette} from './colors';
import {radii, spacing} from './spacing';
import {typography} from './typography';

// ─── Semantic colour maps ─────────────────────────────────────────────────────

const lightColors = {
  // Backgrounds
  background: {
    primary: palette.white,
    secondary: palette.grey50,
    tertiary: palette.grey100,
    inverse: palette.grey950,
  },
  // Surfaces (cards, sheets, etc.)
  surface: {
    default: palette.white,
    raised: palette.white,
    overlay: palette.white,
  },
  // Text
  text: {
    primary: palette.grey950,
    secondary: palette.grey500,
    tertiary: palette.grey400,
    inverse: palette.white,
    link: palette.blue500,
    disabled: palette.grey300,
  },
  // Borders & dividers
  border: {
    default: palette.grey200,
    strong: palette.grey300,
    focus: palette.blue500,
  },
  // Brand / interactive
  primary: {
    default: palette.blue500,
    hover: palette.blue600,
    pressed: palette.blue700,
    subtle: palette.blue50,
    contrast: palette.white,
  },
  // Semantic states
  success: {default: palette.green400, subtle: '#EAFAF1', contrast: palette.white},
  warning: {default: palette.orange400, subtle: '#FFF8E1', contrast: palette.white},
  error: {default: palette.red400, subtle: '#FFEEEE', contrast: palette.white},
} as const;

const darkColors: typeof lightColors = {
  background: {
    primary: palette.black,
    secondary: palette.grey950,
    tertiary: palette.grey900,
    inverse: palette.grey50,
  },
  surface: {
    default: palette.grey900,
    raised: palette.grey800,
    overlay: palette.grey700,
  },
  text: {
    primary: palette.white,
    secondary: palette.grey400,
    tertiary: palette.grey500,
    inverse: palette.grey950,
    link: palette.blue400,
    disabled: palette.grey700,
  },
  border: {
    default: palette.grey800,
    strong: palette.grey700,
    focus: palette.blue400,
  },
  primary: {
    default: palette.blue400,
    hover: palette.blue500,
    pressed: palette.blue600,
    subtle: '#0A1A2E',
    contrast: palette.white,
  },
  success: {default: palette.green400, subtle: '#0D2B14', contrast: palette.white},
  warning: {default: palette.orange400, subtle: '#2B1D00', contrast: palette.white},
  error: {default: palette.red400, subtle: '#2B0A0A', contrast: palette.white},
} as const;

// ─── Shadow presets (platform-aware at call site) ─────────────────────────────

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: palette.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Theme shape ──────────────────────────────────────────────────────────────

export const lightTheme = {
  colors: lightColors,
  spacing,
  radii,
  typography,
  shadows,
} as const;

export const darkTheme = {
  colors: darkColors,
  spacing,
  radii,
  typography,
  shadows,
} as const;

export type Theme = typeof lightTheme;
export type ColorScheme = 'light' | 'dark';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  colorScheme: ColorScheme;
  /** Toggle between light and dark, overriding the system setting. */
  toggleTheme: () => void;
  /** Reset to follow the device system setting. */
  resetToSystemTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Optional override — used in tests / Storybook. */
  initialScheme?: ColorScheme;
}

export function ThemeProvider({
  children,
  initialScheme,
}: ThemeProviderProps): React.JSX.Element {
  const systemScheme = (useColorScheme() ?? 'light') as ColorScheme;
  const [override, setOverride] = useState<ColorScheme | null>(
    initialScheme ?? null,
  );

  const colorScheme: ColorScheme = override ?? systemScheme;
  const theme: Theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const toggleTheme = useCallback(() => {
    setOverride(prev => {
      const current = prev ?? systemScheme;
      return current === 'light' ? 'dark' : 'light';
    });
  }, [systemScheme]);

  const resetToSystemTheme = useCallback(() => {
    setOverride(null);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({theme, colorScheme, toggleTheme, resetToSystemTheme}),
    [theme, colorScheme, toggleTheme, resetToSystemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
