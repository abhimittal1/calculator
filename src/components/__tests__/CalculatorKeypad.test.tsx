/**
 * CalculatorKeypad Tests
 *
 * §1 Render:    all 20 keys are present with correct testIDs
 * §2 Callback:  onKey is called with the right label when a key is pressed
 * §3 Memo:      CalculatorKeypad does not re-render when onKey reference is stable
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CalculatorKeypad, BUTTONS } from '@/components/CalculatorKeypad';
import { ThemeProvider } from '@/theme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const allLabels = BUTTONS.flat();

function renderKeypad(onKey = jest.fn()) {
  // Build a minimal KeypadStyles object — just enough for rendering in tests
  const styles = {
    keypad: {},
    row: {},
    key: {},
    keyOperator: {},
    keyFunction: {},
    keyParen: {},
    keyLabel: {},
    keyLabelOperator: {},
    keyLabelFunction: {},
    keyLabelParen: {},
  };
  return {
    onKey,
    ...render(
      <ThemeProvider>
        <CalculatorKeypad onKey={onKey} styles={styles} />
      </ThemeProvider>,
    ),
  };
}

// ─── §1: Render ───────────────────────────────────────────────────────────────

describe('§1 Render', () => {
  it('renders all 20 keys', () => {
    const { getByTestId } = renderKeypad();
    expect(allLabels).toHaveLength(20);
    for (const label of allLabels) {
      expect(getByTestId(`key-${label}`)).toBeTruthy();
    }
  });

  it('renders digit keys', () => {
    const { getByTestId } = renderKeypad();
    for (const digit of '0123456789'.split('')) {
      expect(getByTestId(`key-${digit}`)).toBeTruthy();
    }
  });

  it('renders operator keys', () => {
    const { getByTestId } = renderKeypad();
    for (const op of ['÷', '×', '−', '+', '=']) {
      expect(getByTestId(`key-${op}`)).toBeTruthy();
    }
  });

  it('renders function keys C and ±', () => {
    const { getByTestId } = renderKeypad();
    expect(getByTestId('key-C')).toBeTruthy();
    expect(getByTestId('key-±')).toBeTruthy();
  });

  it('renders parenthesis keys', () => {
    const { getByTestId } = renderKeypad();
    expect(getByTestId('key-(')).toBeTruthy();
    expect(getByTestId('key-)')).toBeTruthy();
  });

  it('renders decimal key', () => {
    const { getByTestId } = renderKeypad();
    expect(getByTestId('key-.')).toBeTruthy();
  });
});

// ─── §2: Callback ─────────────────────────────────────────────────────────────

describe('§2 Callback', () => {
  it('calls onKey with the correct label when a digit key is pressed', () => {
    const onKey = jest.fn();
    const { getByTestId } = renderKeypad(onKey);
    fireEvent.press(getByTestId('key-7'));
    expect(onKey).toHaveBeenCalledWith('7');
    expect(onKey).toHaveBeenCalledTimes(1);
  });

  it('calls onKey with + when + key is pressed', () => {
    const onKey = jest.fn();
    const { getByTestId } = renderKeypad(onKey);
    fireEvent.press(getByTestId('key-+'));
    expect(onKey).toHaveBeenCalledWith('+');
  });

  it('calls onKey with = when = key is pressed', () => {
    const onKey = jest.fn();
    const { getByTestId } = renderKeypad(onKey);
    fireEvent.press(getByTestId('key-='));
    expect(onKey).toHaveBeenCalledWith('=');
  });

  it('calls onKey with C when C key is pressed', () => {
    const onKey = jest.fn();
    const { getByTestId } = renderKeypad(onKey);
    fireEvent.press(getByTestId('key-C'));
    expect(onKey).toHaveBeenCalledWith('C');
  });

  it('calls onKey with ( when ( key is pressed', () => {
    const onKey = jest.fn();
    const { getByTestId } = renderKeypad(onKey);
    fireEvent.press(getByTestId('key-('));
    expect(onKey).toHaveBeenCalledWith('(');
  });

  it('each key press passes its own label', () => {
    const onKey = jest.fn();
    const { getByTestId } = renderKeypad(onKey);
    for (const label of allLabels) {
      fireEvent.press(getByTestId(`key-${label}`));
    }
    expect(onKey).toHaveBeenCalledTimes(20);
    allLabels.forEach((label, i) => {
      expect(onKey).toHaveBeenNthCalledWith(i + 1, label);
    });
  });
});

// ─── §3: Memo ─────────────────────────────────────────────────────────────────

describe('§3 Memo', () => {
  it('does not throw when rendered multiple times with the same props', () => {
    const onKey = jest.fn();
    const styles = {
      keypad: {},
      row: {},
      key: {},
      keyOperator: {},
      keyFunction: {},
      keyParen: {},
      keyLabel: {},
      keyLabelOperator: {},
      keyLabelFunction: {},
      keyLabelParen: {},
    };
    expect(() => {
      const { rerender } = render(
        <ThemeProvider>
          <CalculatorKeypad onKey={onKey} styles={styles} />
        </ThemeProvider>,
      );
      rerender(
        <ThemeProvider>
          <CalculatorKeypad onKey={onKey} styles={styles} />
        </ThemeProvider>,
      );
    }).not.toThrow();
  });
});
