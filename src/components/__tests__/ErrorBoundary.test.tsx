/**
 * Tests for ErrorBoundary component.
 *
 * Verifies that:
 *  §1 When a child throws, the fallback UI is shown (not the child).
 *  §2 The fallback UI contains the error message.
 *  §3 Pressing "Try Again" resets the boundary and re-renders children.
 *  §4 When no error occurs, children render normally (no fallback).
 *  §5 The optional `title` prop appears in the fallback heading.
 *  §6 In DEV mode, console.error is called with the caught error.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** A child component that always throws when `shouldThrow` is true. */
function BrokenChild({ shouldThrow }: { shouldThrow?: boolean }): React.JSX.Element {
  if (shouldThrow) {
    throw new Error('Test explosion 💥');
  }
  return <Text testID="healthy-child">All good</Text>;
}

/** Suppresses the expected console.error noise from React during throw tests. */
function muteConsoleError() {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  return spy;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  // §1 — Fallback is shown when child throws ──────────────────────────────────

  it('renders the fallback UI when a child throws', () => {
    const spy = muteConsoleError();
    const { getByTestId, queryByTestId } = render(
      <ErrorBoundary>
        <BrokenChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(getByTestId('error-boundary-fallback')).toBeTruthy();
    // The broken child must NOT be in the tree
    expect(queryByTestId('healthy-child')).toBeNull();
    spy.mockRestore();
  });

  // §2 — Fallback shows the thrown error message ──────────────────────────────

  it('displays the error message in the fallback', () => {
    const spy = muteConsoleError();
    const { getByTestId } = render(
      <ErrorBoundary>
        <BrokenChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(getByTestId('error-boundary-message').props.children).toContain('Test explosion 💥');
    spy.mockRestore();
  });

  // §3 — "Try Again" resets the boundary ─────────────────────────────────────

  it('resets and re-renders children when "Try Again" is pressed', () => {
    const spy = muteConsoleError();

    const { getByTestId, queryByTestId, rerender } = render(
      <ErrorBoundary>
        <BrokenChild shouldThrow />
      </ErrorBoundary>,
    );

    // Fallback is visible after the throw
    expect(getByTestId('error-boundary-fallback')).toBeTruthy();

    // Re-render the tree with a healthy child so the boundary can recover,
    // then press "Try Again" to clear the hasError flag.
    rerender(
      <ErrorBoundary>
        <BrokenChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    fireEvent.press(getByTestId('error-boundary-retry'));

    // Child should now render successfully
    expect(getByTestId('healthy-child')).toBeTruthy();
    expect(queryByTestId('error-boundary-fallback')).toBeNull();
    spy.mockRestore();
  });

  // §4 — Children render normally when no error occurs ────────────────────────

  it('renders children normally when no error is thrown', () => {
    const { getByTestId, queryByTestId } = render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(getByTestId('healthy-child')).toBeTruthy();
    expect(queryByTestId('error-boundary-fallback')).toBeNull();
  });

  // §5 — `title` prop appears in fallback heading ─────────────────────────────

  it('includes the title in the fallback heading when provided', () => {
    const spy = muteConsoleError();
    const { getByTestId } = render(
      <ErrorBoundary title="Graph">
        <BrokenChild shouldThrow />
      </ErrorBoundary>,
    );

    const heading = getByTestId('error-boundary-heading');
    expect(heading.props.children).toContain('Graph');
    spy.mockRestore();
  });

  it('shows a generic heading when no title is provided', () => {
    const spy = muteConsoleError();
    const { getByTestId } = render(
      <ErrorBoundary>
        <BrokenChild shouldThrow />
      </ErrorBoundary>,
    );

    const heading = getByTestId('error-boundary-heading');
    expect(heading.props.children).toBe('Something went wrong');
    spy.mockRestore();
  });

  // §6 — console.error is called in __DEV__ ───────────────────────────────────

  it('calls console.error with the caught error in dev mode', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenChild shouldThrow />
      </ErrorBoundary>,
    );

    // React itself also calls console.error; at least one call should
    // reference our error message.
    const messages = spy.mock.calls.map(args =>
      args.map(a => (typeof a === 'string' ? a : String(a))).join(' '),
    );
    const hasOurError = messages.some(m => m.includes('Test explosion'));
    expect(hasOurError).toBe(true);

    spy.mockRestore();
  });
});
