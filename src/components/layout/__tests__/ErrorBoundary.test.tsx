import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';

const ProblemChild = ({ shouldThrow, isConfig }: { shouldThrow: boolean; isConfig?: boolean }) => {
  if (shouldThrow) {
    if (isConfig) {
      const err = new Error('Supabase URL configuration error');
      err.name = 'ConfigError';
      throw err;
    }
    throw new Error('General runtime failure');
  }
  return <Text>Healthy Child Component</Text>;
};

describe('ErrorBoundary (P2-7 & P3-1 Handoff)', () => {
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  test('renders children normally when no error occurs', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <ProblemChild shouldThrow={false} />
        </ErrorBoundary>
      );
    });
    expect(tree.toJSON()).toBeTruthy();
    expect(tree.root.findByType(Text).props.children).toBe('Healthy Child Component');
  });

  test('renders Configuration Error with update/reinstall message and NO Retry button when ConfigError is caught', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <ProblemChild shouldThrow={true} isConfig={true} />
        </ErrorBoundary>
      );
    });
    const root = tree.root;
    const headline = root.findAllByProps({ children: 'Configuration Error' });
    expect(headline.length).toBeGreaterThan(0);
    const updateMsg = root.findAllByProps({
      children: 'Please update or reinstall the app, or contact support if the problem persists.',
    });
    expect(updateMsg.length).toBeGreaterThan(0);
    const retryButtons = root.findAllByProps({ accessibilityRole: 'button' });
    expect(retryButtons).toHaveLength(0);
  });

  test('renders Retry button for non-config runtime/network errors', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <ProblemChild shouldThrow={true} isConfig={false} />
        </ErrorBoundary>
      );
    });
    const root = tree.root;
    const retryButtons = root.findAllByProps({ accessibilityRole: 'button' });
    expect(retryButtons.length).toBeGreaterThan(0);
  });
});
