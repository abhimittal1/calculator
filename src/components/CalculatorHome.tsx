/**
 * CalculatorHome
 *
 * Self-contained calculator UI:
 *   - Top bar with a "History" button that navigates to the History tab
 *   - Display area showing the running expression and the current number
 *   - Full-screen keypad wired to the calc-engine `evaluate` function
 *
 * Parentheses are supported via the ( and ) buttons. When parenDepth > 0 the
 * reducer accumulates sub-expressions inside lhs rather than folding-and-
 * evaluating, so the engine receives the full algebraic string on '='.
 */

import React, { useCallback, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme, type Theme } from '@/theme';
import { evaluate } from '@/engine/calc-engine';
import { useHistory } from '@/history';
import { HapticService } from '@/services/HapticService';
import type { TabParamList } from '@/navigation/types';
import { CalculatorKeypad } from '@/components/CalculatorKeypad';
import { parseDeepLinkExpr } from '@/utils/deepLinkParser';

// ─── Navigation typing ────────────────────────────────────────────────────────

type HomeNavProp = BottomTabNavigationProp<TabParamList, 'Home'>;
type HomeRoute = RouteProp<TabParamList, 'Home'>;

// ─── Calculator state machine ─────────────────────────────────────────────────

type Operator = '+' | '-' | '*' | '/';

interface CalcState {
  /** Left-hand accumulator in engine syntax, e.g. "12+". May be empty. */
  lhs: string;
  /** The number/token the user is currently entering. */
  current: string;
  /** Number of unclosed open parentheses. */
  parenDepth: number;
  /** Whether "=" was the last action (subsequent digit starts fresh). */
  evaluated: boolean;
  /** Set to true when the result is an error. */
  error: boolean;
}

type CalcAction =
  | { type: 'DIGIT'; digit: string }
  | { type: 'OPERATOR'; op: Operator }
  | { type: 'DECIMAL' }
  | { type: 'CLEAR' }
  | { type: 'NEGATE' }
  | { type: 'PERCENT' }
  | { type: 'EQUALS' }
  | {
      type: 'PAREN';
      char: '(' | ')';
    } /** Load an external value (e.g. from History ‘Use Result’) into the display. */
  | { type: 'LOAD_VALUE'; value: string };

const INITIAL: CalcState = { lhs: '', current: '0', parenDepth: 0, evaluated: false, error: false };

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  const { lhs, current, parenDepth, evaluated } = state;

  switch (action.type) {
    // ── Digit ──────────────────────────────────────────────────────────────
    case 'DIGIT': {
      // A ')' in current means we just closed a paren — treat a new digit like a fresh start
      if (evaluated || state.error || current === ')') {
        return { ...INITIAL, current: action.digit === '0' ? '0' : action.digit };
      }
      if (parenDepth > 0) {
        if (current === '0' || current === '') return { ...state, current: action.digit };
        return { ...state, current: current + action.digit };
      }
      if (current === '0' && action.digit !== '.') {
        return { ...state, current: action.digit };
      }
      return { ...state, current: current + action.digit };
    }

    // ── Decimal point ───────────────────────────────────────────────────────
    case 'DECIMAL': {
      if (evaluated || state.error || current === ')') {
        return { ...INITIAL, current: '0.' };
      }
      if (parenDepth > 0) {
        if (current === '' || current === '0') return { ...state, current: '0.' };
        if (current.includes('.')) return state;
        return { ...state, current: current + '.' };
      }
      if (current.includes('.')) return state;
      return { ...state, current: current + '.' };
    }

    // ── Operator ────────────────────────────────────────────────────────────
    case 'OPERATOR': {
      if (state.error) return state;
      // Case 2: replace the previous operator when the user hasn't typed a new
      // operand yet (current is still the default '0' and lhs ends with an op).
      if (
        parenDepth === 0 &&
        !evaluated &&
        current === '0' &&
        lhs.length > 0 &&
        /[+\-*/]$/.test(lhs)
      ) {
        return { ...state, lhs: lhs.slice(0, -1) + action.op };
      }
      if (parenDepth > 0) {
        // Inside parens: don't evaluate — extend the accumulating lhs
        const tok = current === '' ? '0' : current;
        return { ...state, lhs: lhs + tok + action.op, current: '', evaluated: false };
      }
      // When current === ')' the full expression already lives in lhs (e.g. "12*(3+4)")
      const expr = current === ')' ? lhs : lhs + current;
      let accumulated = current === ')' ? '' : current;
      if (lhs || current === ')') {
        try {
          accumulated = evaluate(expr, { precision: 12 }).toSignificantDigits(12).toFixed();
        } catch {
          return { ...INITIAL, error: true };
        }
      }
      return {
        lhs: accumulated + action.op,
        current: '0',
        parenDepth: 0,
        evaluated: false,
        error: false,
      };
    }

    // ── Equals ──────────────────────────────────────────────────────────────
    case 'EQUALS': {
      if (state.error) return INITIAL;
      // Case 4: no complete expression (no operator entered) — do nothing.
      if (!lhs) {
        return state;
      }
      // When current === ')' the complete expression is already in lhs
      const expr = parenDepth > 0 ? lhs + (current || '0') : current === ')' ? lhs : lhs + current;
      try {
        const result = evaluate(expr, { precision: 12 });
        const formatted = result.isInteger()
          ? result.toFixed(0)
          : result.toSignificantDigits(10).toFixed();
        return { lhs: '', current: formatted, parenDepth: 0, evaluated: true, error: false };
      } catch {
        return { ...INITIAL, current: '0', error: true };
      }
    }

    // ── Parentheses ─────────────────────────────────────────────────────────
    case 'PAREN': {
      if (action.char === '(') {
        if (state.error) return state;
        if (evaluated) {
          return { lhs: '(', current: '', parenDepth: 1, evaluated: false, error: false };
        }
        if (current === '0') {
          return {
            ...state,
            lhs: lhs + '(',
            current: '',
            parenDepth: parenDepth + 1,
            evaluated: false,
          };
        }
        return state;
      } else {
        if (parenDepth === 0) return state;
        const tok = current === '' ? '0' : current;
        return { ...state, lhs: lhs + tok + ')', current: ')', parenDepth: parenDepth - 1 };
      }
    }

    // ── Clear ───────────────────────────────────────────────────────────────
    // Case 5: first C clears the current entry; second C resets everything.
    case 'CLEAR': {
      // Error state, post-evaluation, or closing-paren cursor — always full reset.
      if (state.error || evaluated || current === ')') {
        return INITIAL;
      }
      // First C: clear only the current entry, preserving the lhs accumulator.
      if (current !== '0') {
        return { ...state, current: '0', evaluated: false };
      }
      // Second C (current is already '0'): full reset.
      return INITIAL;
    }

    // ── Negate ──────────────────────────────────────────────────────────────
    case 'NEGATE': {
      if (state.error) return INITIAL;
      if (current === '0' || current === '' || current === ')') return state;
      const negated = current.startsWith('-') ? current.slice(1) : '-' + current;
      return { ...state, current: negated, evaluated: false };
    }

    // ── Percent ─────────────────────────────────────────────────────────────
    case 'PERCENT': {
      if (state.error) return INITIAL;
      if (current === '' || current === ')') return state;
      try {
        const pct = evaluate(current + '/100', { precision: 12 });
        return { ...state, current: pct.toSignificantDigits(10).toFixed(), evaluated: false };
      } catch {
        return state;
      }
    }

    // ── Load external value ─────────────────────────────────────────────────
    case 'LOAD_VALUE':
      return { ...INITIAL, current: action.value, evaluated: true };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LABEL_TO_OP: Record<string, Operator> = {
  '÷': '/',
  '×': '*',
  '−': '-',
  '+': '+',
};

/** Prettify an engine-syntax expression string for display. */
function buildDisplayExpr(lhs: string): string {
  if (!lhs) return '';
  return lhs
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/-(?![0-9])/g, '−');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalculatorHome(): React.JSX.Element {
  const { theme, colorScheme } = useTheme();
  // Memoize StyleSheet so a new object isn't allocated on every key-press render.
  const s = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<HomeNavProp>();
  const route = useRoute<HomeRoute>();
  const [state, dispatch] = useReducer(calcReducer, INITIAL);
  const { add: historyAdd } = useHistory();

  // Load a value passed via navigation params:
  //   – loadValue: from HistoryScreen ‘Use Result’ (internal navigation)
  //   – expr:      from the deep link calculatorapp://calculate?expr=…
  //                Validated by deepLinkParser before use.
  useFocusEffect(
    useCallback(() => {
      const loadValue = route.params?.loadValue;
      if (loadValue) {
        dispatch({ type: 'LOAD_VALUE', value: loadValue });
        // Clear the param so it doesn’t re-apply on the next focus
        navigation.setParams({ loadValue: undefined });
        return;
      }
      const rawExpr = route.params?.expr;
      if (rawExpr) {
        const parsed = parseDeepLinkExpr(rawExpr);
        if (parsed.ok) {
          dispatch({ type: 'LOAD_VALUE', value: parsed.expr });
        }
        // Always clear the param, whether valid or not, so it isn’t re-applied
        navigation.setParams({ expr: undefined });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.loadValue, route.params?.expr]),
  );

  // Keep a stable ref to the current state so event handlers stay stable
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  const openHistory = useCallback(() => {
    navigation.navigate('History');
  }, [navigation]);

  const handleKey = useCallback(
    (label: string) => {
      if ('0123456789'.includes(label)) {
        HapticService.lightImpact();
        dispatch({ type: 'DIGIT', digit: label });
      } else if (label === '.') {
        dispatch({ type: 'DECIMAL' });
      } else if (label in LABEL_TO_OP) {
        dispatch({ type: 'OPERATOR', op: LABEL_TO_OP[label] });
      } else if (label === '(') {
        dispatch({ type: 'PAREN', char: '(' });
      } else if (label === ')') {
        dispatch({ type: 'PAREN', char: ')' });
      } else if (label === '=') {
        // Save to history BEFORE dispatching so we capture the pre-evaluation
        // expression. This avoids the useEffect dep-array bug where two
        // consecutive evaluations with the same result (e.g. 3+5=8, 2+6=8)
        // would silently skip the second save.
        const snap = stateRef.current;
        if (snap.lhs && !snap.error) {
          // When current === ')' the expression is complete in lhs; don't append again
          const tok =
            snap.parenDepth > 0 ? snap.current || '0' : snap.current === ')' ? '' : snap.current;
          const fullExpr = snap.lhs + tok;
          try {
            const result = evaluate(fullExpr, { precision: 12 });
            const formatted = result.isInteger()
              ? result.toFixed(0)
              : result.toSignificantDigits(10).toFixed();
            const displayExpr = (
              buildDisplayExpr(snap.lhs) +
              ' ' +
              (snap.current !== ')' ? snap.current : '')
            ).trim();
            historyAdd(displayExpr, formatted).catch(() => {});
            HapticService.mediumImpact();
          } catch {
            // Invalid expression — don't save; reducer will show Error
          }
        }
        dispatch({ type: 'EQUALS' });
      } else if (label === 'C') {
        dispatch({ type: 'CLEAR' });
      } else if (label === '±') {
        dispatch({ type: 'NEGATE' });
      }
    },
    [historyAdd],
  );

  const exprText = useMemo(() => buildDisplayExpr(state.lhs), [state]);

  const displayNumber = useMemo(
    () => (state.error ? 'Error' : state.current === ')' ? ')' : state.current || '0'),
    [state],
  );

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <Text style={s.appTitle}>Calculator</Text>
        <TouchableOpacity
          style={s.historyButton}
          activeOpacity={0.7}
          onPress={openHistory}
          testID="btn-history"
        >
          <Text style={s.historyIcon}>🕐</Text>
          <Text style={s.historyLabel}>History</Text>
        </TouchableOpacity>
      </View>

      {/* ── Display ─────────────────────────────────────────────────── */}
      <View style={s.display}>
        <Text style={s.expression} numberOfLines={1} adjustsFontSizeToFit>
          {exprText || ' '}
        </Text>
        <Text style={s.result} numberOfLines={1} adjustsFontSizeToFit testID="display-result">
          {displayNumber}
        </Text>
      </View>

      {/* ── Keypad ──────────────────────────────────────────────────── */}
      <CalculatorKeypad onKey={handleKey} styles={s} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },

    // Top bar
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[3],
    },
    appTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.text.primary,
    },
    historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radii.lg,
      backgroundColor: colors.surface.raised,
    },
    historyIcon: {
      fontSize: 16,
    },
    historyLabel: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      color: colors.text.secondary,
    },

    // Display
    display: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingHorizontal: spacing[6],
      paddingBottom: spacing[4],
    },
    expression: {
      fontSize: typography.sizes.lg,
      color: colors.text.secondary,
      marginBottom: spacing[1],
    },
    result: {
      fontSize: 64,
      fontWeight: typography.weights.regular,
      color: colors.text.primary,
    },

    // Keypad
    keypad: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[4],
      gap: spacing[3],
    },
    row: {
      flexDirection: 'row',
      gap: spacing[3],
    },
    key: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radii.full,
      backgroundColor: colors.surface.raised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyOperator: {
      backgroundColor: colors.primary.default,
    },
    keyFunction: {
      backgroundColor: colors.text.secondary,
    },
    keyParen: {
      backgroundColor: colors.surface.raised,
      borderWidth: 1.5,
      borderColor: colors.primary.default,
    },
    keyLabel: {
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.regular,
      color: colors.text.primary,
    },
    keyLabelOperator: {
      color: colors.primary.contrast,
    },
    keyLabelFunction: {
      color: colors.background.primary,
    },
    keyLabelParen: {
      color: colors.primary.default,
    },
  });
}
