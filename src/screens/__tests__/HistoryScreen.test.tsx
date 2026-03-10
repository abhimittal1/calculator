/**
 * Tests for HistoryScreen.
 *
 * Coverage areas:
 *  §1  Loading state — shows spinner
 *  §2  Empty state — shows placeholder text
 *  §3  Populated list — shows entries, actions, and Clear All button
 *  §4  Row toggle (expand / collapse action bar)
 *  §5  Delete and Use Result actions
 *  §6  formatTimestamp helper (exercised via rendered timestamps)
 *  §7  EditModal render and close
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { ThemeProvider } from '@/theme';
import type { HistoryEntry } from '@/history';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => () => void) => {
    const cleanup = cb();
    // nothing to return in test context
    return cleanup;
  },
}));

const mockRemove = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockClear = jest.fn().mockResolvedValue(undefined);
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockLoadMore = jest.fn().mockResolvedValue(undefined);

// Mutable state for the useHistory mock so tests can override it
let mockHistoryState = {
  entries: [] as HistoryEntry[],
  isLoading: false,
  hasMore: false,
  total: 0,
};

jest.mock('@/history', () => ({
  useHistory: () => ({
    ...mockHistoryState,
    remove: mockRemove,
    update: mockUpdate,
    clear: mockClear,
    refresh: mockRefresh,
    loadMore: mockLoadMore,
    add: jest.fn(),
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: overrides.id ?? 'entry-1',
    expression: overrides.expression ?? '3 + 4',
    result: overrides.result ?? '7',
    timestamp: overrides.timestamp ?? Date.now() - 5_000, // 5 s ago → "Just now"
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <ThemeProvider>
      <HistoryScreen />
    </ThemeProvider>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §1  Loading state
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryScreen — loading state', () => {
  beforeEach(() => {
    mockHistoryState = { entries: [], isLoading: true, hasMore: false, total: 0 };
  });

  it('renders without crashing while loading', () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it('does not render the empty-state title while loading', () => {
    const { queryByText } = renderScreen();
    expect(queryByText('No history yet')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  Empty state
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryScreen — empty state', () => {
  beforeEach(() => {
    mockHistoryState = { entries: [], isLoading: false, hasMore: false, total: 0 };
  });

  it('renders the empty title', () => {
    const { getByText } = renderScreen();
    expect(getByText('No history yet')).toBeTruthy();
  });

  it('renders the empty subtitle', () => {
    const { getByText } = renderScreen();
    expect(getByText(/past calculations will appear/i)).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3  Populated list
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryScreen — populated list', () => {
  const entry1 = makeEntry({ id: 'e1', expression: '2 + 2', result: '4' });
  const entry2 = makeEntry({
    id: 'e2',
    expression: 'sqrt(9)',
    result: '3',
    timestamp: Date.now() - 120_000,
  }); // 2 min ago

  beforeEach(() => {
    mockHistoryState = {
      entries: [entry1, entry2],
      isLoading: false,
      hasMore: false,
      total: 2,
    };
    jest.clearAllMocks();
  });

  it('renders all entry expressions', () => {
    const { getByText } = renderScreen();
    expect(getByText('2 + 2')).toBeTruthy();
    expect(getByText('sqrt(9)')).toBeTruthy();
  });

  it('renders all entry results', () => {
    const { getByText } = renderScreen();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('renders Clear All button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('btn-clear-history')).toBeTruthy();
  });

  it('pressing Clear All calls clear()', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('btn-clear-history'));
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('shows "Just now" timestamp for recent entry', () => {
    const { getAllByText } = renderScreen();
    expect(getAllByText('Just now').length).toBeGreaterThanOrEqual(1);
  });

  it('shows relative "m ago" timestamp for older entry', () => {
    const { getByText } = renderScreen();
    expect(getByText('2m ago')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4  Row toggle — expand / collapse action bar
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryScreen — row expansion', () => {
  const entry = makeEntry({ id: 'e1', expression: '5 * 5', result: '25' });

  beforeEach(() => {
    mockHistoryState = { entries: [entry], isLoading: false, hasMore: false, total: 1 };
    jest.clearAllMocks();
  });

  it('action buttons are hidden before tapping the row', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('action-edit-e1')).toBeNull();
  });

  it('tapping the row reveals Edit, Use Result, Delete buttons', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByText('5 * 5'));
    expect(getByTestId('action-edit-e1')).toBeTruthy();
    expect(getByTestId('action-use-e1')).toBeTruthy();
    expect(getByTestId('action-delete-e1')).toBeTruthy();
  });

  it('tapping the row again collapses the action bar', () => {
    const { getByText, queryByTestId } = renderScreen();
    fireEvent.press(getByText('5 * 5')); // expand
    fireEvent.press(getByText('5 * 5')); // collapse
    expect(queryByTestId('action-edit-e1')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §5  Delete and Use Result actions
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryScreen — delete and use-result', () => {
  const entry = makeEntry({ id: 'eX', expression: '9^2', result: '81' });

  beforeEach(() => {
    mockHistoryState = { entries: [entry], isLoading: false, hasMore: false, total: 1 };
    jest.clearAllMocks();
  });

  it('pressing Delete calls remove() with the entry id', () => {
    const { getByText, getByTestId } = renderScreen();
    fireEvent.press(getByText('9^2')); // expand
    fireEvent.press(getByTestId('action-delete-eX'));
    expect(mockRemove).toHaveBeenCalledWith('eX');
  });

  it('pressing Use Result navigates to Home with the result', () => {
    const { getByText, getByTestId } = renderScreen();
    fireEvent.press(getByText('9^2')); // expand
    fireEvent.press(getByTestId('action-use-eX'));
    expect(mockNavigate).toHaveBeenCalledWith('Home', { loadValue: '81' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6  formatTimestamp — exercised through rendered text
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryScreen — formatTimestamp via rendered text', () => {
  it('"Just now" for timestamps < 1 minute old', () => {
    mockHistoryState = {
      entries: [makeEntry({ timestamp: Date.now() - 30_000 })],
      isLoading: false,
      hasMore: false,
      total: 1,
    };
    const { getByText } = renderScreen();
    expect(getByText('Just now')).toBeTruthy();
  });

  it('"Xm ago" for timestamps between 1–59 minutes old', () => {
    mockHistoryState = {
      entries: [makeEntry({ timestamp: Date.now() - 600_000 })], // 10 mins
      isLoading: false,
      hasMore: false,
      total: 1,
    };
    const { getByText } = renderScreen();
    expect(getByText('10m ago')).toBeTruthy();
  });

  it('"Xh ago" for timestamps between 1–23 hours old', () => {
    mockHistoryState = {
      entries: [makeEntry({ timestamp: Date.now() - 7_200_000 })], // 2 hrs
      isLoading: false,
      hasMore: false,
      total: 1,
    };
    const { getByText } = renderScreen();
    expect(getByText('2h ago')).toBeTruthy();
  });

  it('locale date string for timestamps older than 24 hours', () => {
    mockHistoryState = {
      entries: [makeEntry({ timestamp: Date.now() - 172_800_000 })], // 2 days
      isLoading: false,
      hasMore: false,
      total: 1,
    };
    const { queryByText } = renderScreen();
    // "Just now" / "Xm ago" / "Xh ago" must not appear
    expect(queryByText('Just now')).toBeNull();
    expect(queryByText(/\d+m ago/)).toBeNull();
    expect(queryByText(/\d+h ago/)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7  EditModal
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryScreen — EditModal', () => {
  const entry = makeEntry({ id: 'em1', expression: '2 + 3', result: '5' });

  beforeEach(() => {
    mockHistoryState = { entries: [entry], isLoading: false, hasMore: false, total: 1 };
    jest.clearAllMocks();
  });

  it('tapping Edit opens the EditModal with the correct expression', () => {
    const { getByText, getByTestId } = renderScreen();
    fireEvent.press(getByText('2 + 3')); // expand row
    fireEvent.press(getByTestId('action-edit-em1')); // open modal
    const input = getByTestId('edit-input');
    expect(input.props.value).toBe('2 + 3');
  });

  it('pressing Cancel in the modal closes it', () => {
    const { getByText, getByTestId, queryByTestId } = renderScreen();
    fireEvent.press(getByText('2 + 3'));
    fireEvent.press(getByTestId('action-edit-em1'));
    fireEvent.press(getByTestId('edit-cancel'));
    expect(queryByTestId('edit-input')).toBeNull();
  });

  it('pressing the backdrop closes the modal', () => {
    const { getByText, getByTestId, queryByTestId } = renderScreen();
    fireEvent.press(getByText('2 + 3'));
    fireEvent.press(getByTestId('action-edit-em1'));
    fireEvent.press(getByTestId('modal-backdrop'));
    expect(queryByTestId('edit-input')).toBeNull();
  });
});
