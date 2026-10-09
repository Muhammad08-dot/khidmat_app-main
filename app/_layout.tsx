import "../src/theme/global.css";
import { useEffect, useState } from "react";
import { View, useColorScheme, I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { useAppFonts } from "@/src/theme/fonts";
import { initI18n } from "@/src/i18n";

import { ErrorBoundary } from '@/src/components/layout/ErrorBoundary';
import { installGlobalErrorHandler } from '@/src/services/api/errorReporter';
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

// P2: offline cache — successful queries survive app restarts / network drops.
const RQ_CACHE_KEY = "khidmat.rq_cache";

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
  const router = useRouter();

  // Tapping a "new message" push opens that booking's chat thread.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === "new_message" && data?.bookingId) {
        router.push(`/chat?bookingId=${data.bookingId}`);
      }
    });
    return () => {
      sub.remove();
    };
  }, [router]);

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
          <Stack.Screen name="safety" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="admin" />
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
    void (async () => {
      await initI18n();
      try {
        const raw = await AsyncStorage.getItem(RQ_CACHE_KEY);
        if (raw) hydrate(queryClient, JSON.parse(raw));
      } catch {
        // First launch or corrupt cache — start fresh.
      }
      setReady(true);
    })();

    // Debounced snapshot of the cache after every result landing.
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          AsyncStorage.setItem(
            RQ_CACHE_KEY,
            JSON.stringify(
              dehydrate(queryClient, {
                shouldDehydrateQuery: (query) => query.state.status === "success",
              })
            )
          ).catch(() => {});
        } catch {
          // Serialization issues must never crash the app.
        }
      }, 500);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
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
