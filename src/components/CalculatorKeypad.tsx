/**
 * CalculatorKeypad
 *
 * Extracted, memoized keypad component — prevents the 20 key buttons from
 * re-rendering while only the display (expression / result) changes.
 *
 *  CalcKey          — a single key button, wrapped in React.memo so it only
 *                     re-renders when its `label` or `onPress` callback changes.
 *  CalculatorKeypad — the 5-row button grid, also wrapped in React.memo.
 *                     Re-renders only when the parent's `onKey` or `styles`
 *                     reference changes (i.e. almost never).
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';

// ─── Button layout ────────────────────────────────────────────────────────────

export const BUTTONS: string[][] = [
  ['C', '(', ')', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
];

// ─── Style interface ──────────────────────────────────────────────────────────

/** Subset of CalculatorHome's StyleSheet entries consumed by the keypad. */
export interface KeypadStyles {
  keypad: StyleProp<ViewStyle>;
  row: StyleProp<ViewStyle>;
  key: StyleProp<ViewStyle>;
  keyOperator: StyleProp<ViewStyle>;
  keyFunction: StyleProp<ViewStyle>;
  keyParen: StyleProp<ViewStyle>;
  keyLabel: StyleProp<TextStyle>;
  keyLabelOperator: StyleProp<TextStyle>;
  keyLabelFunction: StyleProp<TextStyle>;
  keyLabelParen: StyleProp<TextStyle>;
}

// ─── CalcKey ──────────────────────────────────────────────────────────────────

interface CalcKeyProps {
  label: string;
  onPress: (label: string) => void;
  styles: KeypadStyles;
}

const CalcKey = React.memo<CalcKeyProps>(({ label, onPress, styles }) => {
  const isOperator = ['÷', '×', '−', '+', '='].includes(label);
  const isFunction = ['C', '±'].includes(label);
  const isParen = ['(', ')'].includes(label);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      testID={`key-${label}`}
      onPress={() => onPress(label)}
      style={[
        styles.key,
        isOperator && styles.keyOperator,
        isFunction && styles.keyFunction,
        isParen && styles.keyParen,
      ]}
    >
      <Text
        style={[
          styles.keyLabel,
          isOperator && styles.keyLabelOperator,
          isFunction && styles.keyLabelFunction,
          isParen && styles.keyLabelParen,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ─── CalculatorKeypad ─────────────────────────────────────────────────────────

interface CalculatorKeypadProps {
  onKey: (label: string) => void;
  styles: KeypadStyles;
}

export const CalculatorKeypad = React.memo<CalculatorKeypadProps>(({ onKey, styles }) => (
  <View style={styles.keypad}>
    {BUTTONS.map((row, rowIdx) => (
      <View key={rowIdx} style={styles.row}>
        {row.map(label => (
          <CalcKey key={label} label={label} onPress={onKey} styles={styles} />
        ))}
      </View>
    ))}
  </View>
));
