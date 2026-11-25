import React from 'react';
import { View, Text } from 'react-native';
import { captureError } from '@/src/services/api/errorReporter';
import { supabase } from '@/src/services/supabase/client';
import { Button } from '@/src/components/ui/Button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
  isConfigError?: boolean;
}

/**
 * Global React error boundary. On a caught error it logs to the agent reporter
 * and shows a friendly fallback with a retry action instead of a blank screen.
 * Gated with dedicated Configuration Error display per PRD D-04 & P3-1 handoff.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    const msg = error.message ? error.message.toLowerCase() : '';
    const isConfig =
      error.name === 'ConfigError' ||
      msg.includes('configuration error') ||
      msg.includes('supabase url');

    return {
      hasError: true,
      message: error.message,
      isConfigError: Boolean(isConfig),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void captureError(error, info.componentStack ?? undefined);
  }

  private reset = async () => {
    try {
      if (supabase?.auth?.getSession) {
        await supabase.auth.getSession();
      }
    } catch (e) {
      console.warn('[ErrorBoundary] Client reset attempt:', e);
    }
    this.setState({ hasError: false, message: undefined, isConfigError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isConfigError) {
        return (
          <View className="flex-1 items-center justify-center bg-background px-8">
            <View className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 items-center justify-center mb-4">
              <Text className="text-2xl">⚠️</Text>
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center">
              Configuration Error
            </Text>
            <Text className="mt-2 text-center text-xs text-gray-600 leading-relaxed max-w-xs">
              Please update or reinstall the app, or contact support if the problem persists.
            </Text>
            <Text className="mt-2 text-center text-[11px] text-gray-400">
              Silent mock fallback is disabled in production to protect data integrity.
            </Text>
          </View>
        );
      }

      return (
        <View className="flex-1 items-center justify-center bg-background px-8">
          <View className="w-16 h-16 rounded-full bg-red-50 border border-red-200 items-center justify-center mb-4">
            <Text className="text-2xl">💥</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900 text-center">
            Something went wrong
          </Text>
          <Text className="mt-2 text-center text-xs text-gray-600 leading-relaxed max-w-xs">
            {this.state.message || 'An unexpected error occurred.'}
          </Text>
          <Text className="mt-2 text-center text-[11px] text-gray-400">
            The issue has been automatically captured for self-healing resolution.
          </Text>
          <Button
            title="Try Again"
            onPress={this.reset}
            className="mt-6 min-w-[160px]"
          />
        </View>
      );
    }
    return this.props.children;
  }
}
