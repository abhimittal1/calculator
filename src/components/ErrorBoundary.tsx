/**
 * ErrorBoundary
 *
 * A React class component that catches JavaScript errors anywhere inside its
 * child tree and renders a friendly fallback UI instead of crashing the app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeScreen />
 *   </ErrorBoundary>
 *
 *   // With a custom title (e.g. to identify which section crashed):
 *   <ErrorBoundary title="Graph">
 *     <ChartArea />
 *   </ErrorBoundary>
 */

import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { lightTheme, darkTheme, type Theme } from '@/theme';
import { captureException, addBreadcrumb } from '@/services/SentryService';

// ─── Error reporter ───────────────────────────────────────────────────────────

function reportError(error: Error, info: { componentStack: string }): void {
  if (__DEV__) {
    console.error('[ErrorBoundary] caught error:', error);
    console.error('[ErrorBoundary] component stack:', info.componentStack);
  }
  // Send to Sentry in all environments (dev events are tagged 'development'
  // and can be filtered in the dashboard; they help during testing).
  addBreadcrumb({
    category: 'error-boundary',
    message: error.message,
    level: 'error',
    data: { componentStack: info.componentStack },
  });
  captureException(error, {
    contexts: { react: { componentStack: info.componentStack } },
  });
}

// ─── Props / State ────────────────────────────────────────────────────────────

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Optional label shown in the fallback UI's title, e.g. "Graph" →
   * "Something went wrong in Graph".
   */
  title?: string;
  /**
   * Pass `'dark'` when you know the current scheme and want the fallback to
   * honour it.  The ErrorBoundary cannot call hooks so it reads the theme
   * from the pre-built theme objects instead.
   */
  colorScheme?: 'light' | 'dark';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? '' });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const theme: Theme = this.props.colorScheme === 'dark' ? darkTheme : lightTheme;
    const s = makeStyles(theme);
    const label = this.props.title ? ` in ${this.props.title}` : '';

    return (
      <ScrollView contentContainerStyle={s.container} testID="error-boundary-fallback">
        <Text style={s.icon} testID="error-boundary-icon">
          ⚠️
        </Text>
        <Text style={s.heading} testID="error-boundary-heading">
          {`Something went wrong${label}`}
        </Text>
        <Text style={s.message} testID="error-boundary-message">
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <TouchableOpacity
          style={s.button}
          activeOpacity={0.8}
          onPress={this.handleReset}
          testID="error-boundary-retry"
        >
          <Text style={s.buttonLabel}>Try Again</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[8],
      backgroundColor: colors.background.primary,
    },
    icon: {
      fontSize: 56,
      marginBottom: spacing[4],
    },
    heading: {
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.bold,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing[3],
    },
    message: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: typography.sizes.sm * 1.6,
      marginBottom: spacing[8],
    },
    button: {
      backgroundColor: colors.primary.default,
      borderRadius: radii.lg,
      paddingHorizontal: spacing[8],
      paddingVertical: spacing[4],
    },
    buttonLabel: {
      color: colors.primary.contrast,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semiBold,
    },
  });
}
