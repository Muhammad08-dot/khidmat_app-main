import "../src/theme/global.css";
import { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { useAppFonts } from "@/src/theme/fonts";

import { ErrorBoundary } from '@/src/components/layout/ErrorBoundary';
import { installGlobalErrorHandler } from '@/src/services/api/errorReporter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

/** Redirects unauthenticated users away from protected routes. */
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/(auth)/auth');
    } else if (user && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

function RootNavigator() {
  const colorScheme = useColorScheme();

  return (
    <View style={{ flex: 1 }} className={colorScheme === "dark" ? "dark" : ""}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <RouteGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(booking)" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="providers" />
          <Stack.Screen name="provider/[id]" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </RouteGuard>
    </View>
  );
}

// Enable RTL support for Urdu
I18nManager.allowRTL(true);

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    installGlobalErrorHandler();
    setReady(true);
  }, []);

  if (!fontsLoaded || !ready) {
    return <View style={{ flex: 1, backgroundColor: "#FBFAF6" }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
