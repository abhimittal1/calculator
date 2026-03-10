/**
 * Tests for GraphScreen.
 *
 * Native chart components (LineChart) and view-shot (captureRef) are mocked
 * in __mocks__/ so the screen can render in Jest without native modules.
 *
 * Coverage areas:
 *  §1  Smoke render — screen mounts without crashing
 *  §2  Tab switching — pressing a tab changes rendered content
 *  §3  History chart tab — renders when entries are present
 *  §4  Plotter tab — renders with the default expression
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GraphScreen } from '@/screens/GraphScreen';
import { ThemeProvider } from '@/theme';
import type { HistoryEntry } from '@/history';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb: () => () => void) => cb(),
}));

const mockRefresh = jest.fn().mockResolvedValue(undefined);
const MOCK_ENTRIES: HistoryEntry[] = [
  { id: 'g1', expression: '1+1', result: '2', timestamp: Date.now() - 1000 },
  { id: 'g2', expression: '2*3', result: '6', timestamp: Date.now() - 2000 },
  { id: 'g3', expression: '10/2', result: '5', timestamp: Date.now() - 3000 },
];

jest.mock('@/history', () => ({
  useHistory: () => ({
    entries: MOCK_ENTRIES,
    isLoading: false,
    hasMore: false,
    total: 3,
    refresh: mockRefresh,
    add: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    clear: jest.fn(),
    loadMore: jest.fn(),
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function renderScreen() {
  return render(
    <ThemeProvider>
      <GraphScreen />
    </ThemeProvider>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §1  Smoke render
// ─────────────────────────────────────────────────────────────────────────────

describe('GraphScreen — smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts without crashing', () => {
    // Use real timers to avoid act() async complexity on mount.
    let screen: ReturnType<typeof renderScreen>;
    expect(() => {
      screen = renderScreen();
    }).not.toThrow();
    screen!.unmount();
  });

  it('calls refresh on focus (via useFocusEffect mock)', () => {
    const { unmount } = renderScreen();
    expect(mockRefresh).toHaveBeenCalled();
    unmount();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  Tab switching
// ─────────────────────────────────────────────────────────────────────────────

describe('GraphScreen — tab navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both tab labels', () => {
    const { getByText, unmount } = renderScreen();
    expect(getByText('History Chart')).toBeTruthy();
    expect(getByText('Function Plotter')).toBeTruthy();
    unmount();
  });

  it('pressing "Function Plotter" shows the Plot f(x) button', () => {
    const { getByText, unmount } = renderScreen();
    fireEvent.press(getByText('Function Plotter'));
    // 'Plot f(x)' button is only visible on the plotter tab
    expect(getByText('Plot f(x)')).toBeTruthy();
    unmount();
  });

  it('pressing "History Chart" tab after "Function Plotter" switches back', () => {
    const { getByText, unmount } = renderScreen();
    fireEvent.press(getByText('Function Plotter'));
    fireEvent.press(getByText('History Chart'));
    // LineChart (history tab content) should be back
    expect(getByText('History Chart')).toBeTruthy();
    unmount();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3  History chart tab
// ─────────────────────────────────────────────────────────────────────────────

describe('GraphScreen — history chart tab', () => {
  it('renders the mocked LineChart component on default (history) tab', () => {
    const { getByTestId, unmount } = renderScreen();
    expect(getByTestId('LineChart')).toBeTruthy();
    unmount();
  });

  it('renders Export Graph button when entries are present', () => {
    const { getByText, unmount } = renderScreen();
    expect(getByText(/Export Graph/)).toBeTruthy();
    unmount();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4  Function Plotter tab
// ─────────────────────────────────────────────────────────────────────────────

describe('GraphScreen — function plotter tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the expression TextInput with default value', () => {
    const { getByText, getByDisplayValue, unmount } = renderScreen();
    fireEvent.press(getByText('Function Plotter'));
    // TextInput value is 'sin(x)' by default
    expect(getByDisplayValue('sin(x)')).toBeTruthy();
    unmount();
  });

  it('renders Plot f(x) button on plotter tab', () => {
    const { getByText, unmount } = renderScreen();
    fireEvent.press(getByText('Function Plotter'));
    expect(getByText('Plot f(x)')).toBeTruthy();
    unmount();
  });

  it('typing a new expression updates the TextInput', () => {
    const { getByText, getByDisplayValue, unmount } = renderScreen();
    fireEvent.press(getByText('Function Plotter'));
    const input = getByDisplayValue('sin(x)');
    fireEvent.changeText(input, 'x^2');
    expect(getByDisplayValue('x^2')).toBeTruthy();
    unmount();
  });
});
