/**
 * Tests for SettingsScreen.
 *
 * Coverage areas:
 *  §1  Renders all section headers and labels
 *  §2  Clear All History shows Alert dialog
 *  §3  Alert "Clear" button calls clearHistory
 *  §4  Version / Framework info rows are present
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ThemeProvider } from '@/theme';

// ── Mock navigation & safe-area ────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb: () => void) => cb(),
}));

// ── Mock history hook so we don't need storage setup ──────────────────────

const mockClear = jest.fn().mockResolvedValue(undefined);
jest.mock('@/history', () => ({
  useHistory: () => ({
    entries: [],
    isLoading: false,
    hasMore: false,
    total: 0,
    clear: mockClear,
    add: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    loadMore: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function renderScreen() {
  return render(
    <ThemeProvider>
      <SettingsScreen />
    </ThemeProvider>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §1  Section headers and labels
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsScreen — rendering', () => {
  it('renders the Appearance section header', () => {
    const { getByText } = renderScreen();
    expect(getByText('Appearance')).toBeTruthy();
  });

  it('renders the Calculator section header', () => {
    const { getByText } = renderScreen();
    expect(getByText('Calculator')).toBeTruthy();
  });

  it('renders the History section header', () => {
    const { getByText } = renderScreen();
    expect(getByText('History')).toBeTruthy();
  });

  it('renders the About section header', () => {
    const { getByText } = renderScreen();
    expect(getByText('About')).toBeTruthy();
  });

  it('renders Dark Mode row label', () => {
    const { getByText } = renderScreen();
    expect(getByText('Dark Mode')).toBeTruthy();
  });

  it('renders Vibration row label', () => {
    const { getByText } = renderScreen();
    expect(getByText('Vibration')).toBeTruthy();
  });

  it('renders Sound row label', () => {
    const { getByText } = renderScreen();
    expect(getByText('Sound')).toBeTruthy();
  });

  it('renders Save History row label', () => {
    const { getByText } = renderScreen();
    expect(getByText('Save History')).toBeTruthy();
  });

  it('renders Clear All History button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Clear All History')).toBeTruthy();
  });

  it('renders Version row', () => {
    const { getByText } = renderScreen();
    expect(getByText('Version')).toBeTruthy();
    expect(getByText('0.0.1')).toBeTruthy();
  });

  it('renders Framework row', () => {
    const { getByText } = renderScreen();
    expect(getByText('Framework')).toBeTruthy();
    expect(getByText('React Native 0.73')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  Clear All History alert
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsScreen — Clear All History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pressing Clear All History calls Alert.alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Clear All History'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Clear All History',
      expect.any(String),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('Alert is called with a destructive "Clear" button', () => {
    let capturedButtons: any[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      capturedButtons = buttons ?? [];
    });
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Clear All History'));
    const clearBtn = capturedButtons.find((b: any) => b.text === 'Clear');
    expect(clearBtn).toBeDefined();
    expect(clearBtn.style).toBe('destructive');
    jest.restoreAllMocks();
  });

  it('pressing the "Clear" confirmation button in the Alert calls clearHistory', async () => {
    let onPressClear: (() => void) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const clearBtn = (buttons ?? []).find((b: any) => b.text === 'Clear');
      onPressClear = clearBtn?.onPress;
    });
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Clear All History'));
    if (onPressClear) onPressClear();
    expect(mockClear).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });
});
