/**
 * HomeScreen
 *
 * Thin wrapper that renders the CalculatorHome component.
 * All calculator logic, display, and keypad live in CalculatorHome.
 */

import React from 'react';
import { CalculatorHome } from '@/components/CalculatorHome';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTheme } from '@/theme';

export function HomeScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  return (
    <ErrorBoundary title="Calculator" colorScheme={colorScheme}>
      <CalculatorHome />
    </ErrorBoundary>
  );
}
