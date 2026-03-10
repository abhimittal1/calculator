/**
 * Phase 1 Tests — CalculatorHome
 *
 * §1 Snapshot:    stable UI snapshot of the initial state
 * §2 Arithmetic:  basic arithmetic (3 + 5 = 8)
 * §3 Integration: 12 × (3+4) = 84 with history entry saved + auto-navigate
 * §4 Bug-fix:     consecutive evaluations with the same result both saved
 * §5 Parens:      parenthesis state machine edge cases
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CalculatorHome } from '@/components/CalculatorHome';
import { ThemeProvider } from '@/theme';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNavigate = jest.fn();
const mockSetParams = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, setParams: mockSetParams }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: () => void) => cb(),
}));

const mockHistoryAdd = jest.fn().mockResolvedValue(undefined);

jest.mock('@/history', () => ({
  useHistory: () => ({
    entries: [],
    isLoading: false,
    hasMore: false,
    total: 0,
    loadMore: jest.fn(),
    refresh: jest.fn(),
    add: mockHistoryAdd,
    remove: jest.fn(),
    update: jest.fn(),
    clear: jest.fn(),
  }),
}));

// ─── Helper ──────────────────────────────────────────────────────────────────

function renderCalculator() {
  return render(
    <ThemeProvider>
      <CalculatorHome />
    </ThemeProvider>,
  );
}

function pressKeys(getByTestId: ReturnType<typeof render>['getByTestId'], ...keys: string[]) {
  for (const key of keys) {
    fireEvent.press(getByTestId(`key-${key}`));
  }
}

// ─── §1: Snapshot ─────────────────────────────────────────────────────────────

describe('§1 Snapshot', () => {
  it('matches the initial UI snapshot', () => {
    const { toJSON } = renderCalculator();
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── §2: Basic arithmetic ────────────────────────────────────────────────────

describe('§2 Basic arithmetic', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initial display shows 0', () => {
    const { getByTestId } = renderCalculator();
    expect(getByTestId('display-result').props.children).toBe('0');
  });

  it('3 + 5 = 8', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '3', '+', '5', '=');
    expect(getByTestId('display-result').props.children).toBe('8');
  });

  it('7 × 4 = 28', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '7', '×', '4', '=');
    expect(getByTestId('display-result').props.children).toBe('28');
  });

  it('10 ÷ 4 = 2.5', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '1', '0', '÷', '4', '=');
    expect(getByTestId('display-result').props.children).toBe('2.5');
  });

  it('C clears display back to 0', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '9', 'C');
    expect(getByTestId('display-result').props.children).toBe('0');
  });

  it('±  negates the current number', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '5', '±');
    expect(getByTestId('display-result').props.children).toBe('-5');
  });
});

// ─── §3: Integration — 12 × (3+4) = 84 ──────────────────────────────────────

describe('§3 Integration — 12×(3+4)=84', () => {
  beforeEach(() => jest.clearAllMocks());

  it('evaluates 12 × (3+4) to 84', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '1', '2', '×', '(', '3', '+', '4', ')', '=');
    expect(getByTestId('display-result').props.children).toBe('84');
  });

  it('saves a history entry without navigating to History tab', async () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '1', '2', '×', '(', '3', '+', '4', ')', '=');

    // Wait one tick for the async historyAdd promise to settle
    await Promise.resolve();

    expect(mockHistoryAdd).toHaveBeenCalledTimes(1);
    const [expression, result] = mockHistoryAdd.mock.calls[0];
    // Expression should contain the humanised form
    expect(expression).toContain('12');
    expect(expression).toContain('(3+4)');
    expect(result).toBe('84');
    // Should NOT auto-navigate — user stays on calculator
    expect(mockNavigate).not.toHaveBeenCalledWith('History');
  });

  it('stays on the calculator screen after a successful evaluation', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '3', '+', '5', '=');
    expect(mockNavigate).not.toHaveBeenCalledWith('History');
  });
});

// ─── §4: Bug-fix — consecutive same-result evaluations both saved ─────────────

describe('§4 Consecutive same-result saves', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves 3+5 then 2+6 (both = 8) as two separate history entries and navigates each time', async () => {
    const { getByTestId } = renderCalculator();

    // First evaluation: 3 + 5 = 8
    pressKeys(getByTestId, '3', '+', '5', '=');
    await Promise.resolve();

    // Second evaluation: 2 + 6 = 8 (same result — should still save!)
    pressKeys(getByTestId, '2', '+', '6', '=');
    await Promise.resolve();

    expect(mockHistoryAdd).toHaveBeenCalledTimes(2);
    expect(mockHistoryAdd.mock.calls[0][1]).toBe('8');
    expect(mockHistoryAdd.mock.calls[1][1]).toBe('8');
    // Should NOT auto-navigate to History
    expect(mockNavigate).not.toHaveBeenCalledWith('History');
  });
});

// ─── §6: Reducer edge cases ───────────────────────────────────────────────────

describe('§6 Reducer edge cases', () => {
  beforeEach(() => jest.clearAllMocks());

  // Case 1 — operator after evaluation continues from result ---------------------

  it('[Case 1] pressing + after evaluation continues from the result', () => {
    const { getByTestId } = renderCalculator();
    // 3 + 5 = 8, then + 2 = 10
    pressKeys(getByTestId, '3', '+', '5', '=', '+', '2', '=');
    expect(getByTestId('display-result').props.children).toBe('10');
  });

  it('[Case 1] pressing × after 8 ÷ 2 = 4 uses 4, giving 4 × 3 = 12', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '8', '÷', '2', '=', '×', '3', '=');
    expect(getByTestId('display-result').props.children).toBe('12');
  });

  // Case 2 — operator immediately after another operator replaces it -------------

  it('[Case 2] pressing − right after + replaces the operator (5 + − 3 = 2)', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '5', '+', '−', '3', '=');
    expect(getByTestId('display-result').props.children).toBe('2');
  });

  it('[Case 2] pressing × after ÷ replaces the operator (8 ÷ × 4 = 32)', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '8', '÷', '×', '4', '=');
    expect(getByTestId('display-result').props.children).toBe('32');
  });

  // Case 3 — decimal when current already has one is ignored --------------------

  it('[Case 3] pressing . when current already has a decimal point is ignored', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '1', '.', '5', '.');
    // Second '.' must not corrupt the number
    expect(getByTestId('display-result').props.children).toBe('1.5');
  });

  it('[Case 3] 0 . 3 . 7 → display shows 0.37, not 0.3.7', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '.', '3', '.', '7');
    expect(getByTestId('display-result').props.children).toBe('0.37');
  });

  // Case 4 — pressing = with no operator does nothing ---------------------------

  it('[Case 4] pressing = with only a typed number leaves the display unchanged', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '5');
    pressKeys(getByTestId, '=');
    expect(getByTestId('display-result').props.children).toBe('5');
  });

  it('[Case 4] pressing = with no expression does not navigate to History', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '=');
    expect(mockNavigate).not.toHaveBeenCalledWith('History');
    expect(mockHistoryAdd).not.toHaveBeenCalled();
    expect(getByTestId('display-result').props.children).toBe('0');
  });

  // Case 5 — first C clears current entry, second C full resets -----------------

  it('[Case 5] first C clears the current number but preserves the lhs', () => {
    const { getByTestId } = renderCalculator();
    // Enter 5, press +, enter 3 — then press C once
    pressKeys(getByTestId, '5', '+', '3', 'C');
    // Current number should be cleared back to 0
    expect(getByTestId('display-result').props.children).toBe('0');
    // The expression accumulator (5+) is still live — pressing 2 = gives 7
    pressKeys(getByTestId, '2', '=');
    expect(getByTestId('display-result').props.children).toBe('7');
  });

  it('[Case 5] second C (when current is already 0) performs a full reset', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '5', '+', '3', 'C', 'C');
    // Expression should be fully cleared — pressing = now does nothing
    expect(getByTestId('display-result').props.children).toBe('0');
    pressKeys(getByTestId, '=');
    // Still 0; no expression to evaluate
    expect(getByTestId('display-result').props.children).toBe('0');
    expect(mockNavigate).not.toHaveBeenCalledWith('History');
  });
});

// ─── §5: Parenthesis state machine ───────────────────────────────────────────

describe('§5 Parentheses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pressing ) without a prior ( is a no-op', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '5', ')');
    // Should still show 5, not crash
    expect(getByTestId('display-result').props.children).toBe('5');
  });

  it('pressing ( when parenDepth is 0 replaces the pending 0', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '2', '+', '(', '3', ')');
    // After ( + '3' + ) the display should show )
    expect(getByTestId('display-result').props.children).toBe(')');
  });

  it('(5+3) = 8', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '(', '5', '+', '3', ')', '=');
    expect(getByTestId('display-result').props.children).toBe('8');
  });

  it('2 × (10 − 5) = 10', () => {
    const { getByTestId } = renderCalculator();
    pressKeys(getByTestId, '2', '×', '(', '1', '0', '−', '5', ')', '=');
    expect(getByTestId('display-result').props.children).toBe('10');
  });
});
