import React from "react";
import { View, Text, Pressable } from "react-native";
import { captureError } from "@/src/services/api/errorReporter";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Global React error boundary. On a caught error it logs to the agent reporter
 * and shows a friendly fallback with a retry action instead of a blank screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void captureError(error, info.componentStack ?? undefined);
  }

  private reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-surface px-8">
          <Text className="font-display text-xl font-bold text-ink">
            Something went wrong
          </Text>
          <Text className="mt-2 text-center text-sm text-ink/70">
            {this.state.message || "An unexpected error occurred."}
          </Text>
          <Text className="mt-1 text-center text-xs text-ink/50">
            The issue has been reported to the Khidmat self-healing agent.
          </Text>
          <Pressable
            onPress={this.reset}
            className="mt-6 rounded-xl bg-primary px-6 py-3"
          >
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
