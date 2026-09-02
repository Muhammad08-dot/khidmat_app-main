import "../src/theme/global.css";
import { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { useAppFonts } from "../src/theme/fonts";
import { hydrateMockStorage } from "../src/utils/mockStorage";
import { seedDatabase } from "../src/utils/seedData";
import { ErrorBoundary } from "../src/agent/ErrorBoundary";
import { installGlobalErrorHandler } from "../src/agent/errorReporter";

/** Redirects unauthenticated users away from protected routes. */
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onProtected =
      segments[0] !== "auth" && segments[0] !== "+not-found";
    if (!user && onProtected) {
      router.replace("/auth");
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const isAuthed = !!user;

  return (
    <View style={{ flex: 1 }} className={colorScheme === "dark" ? "dark" : ""}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <RouteGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Protected guard={isAuthed}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="matching" />
            <Stack.Screen name="providers" />
            <Stack.Screen name="provider/[id]" />
            <Stack.Screen name="booking" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="safety" />
            <Stack.Screen name="categories" />
            <Stack.Screen name="track/[id]" />
          </Stack.Protected>
          <Stack.Screen name="+not-found" />
        </Stack>
      </RouteGuard>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    installGlobalErrorHandler();
    hydrateMockStorage()
      .then(() => {
        seedDatabase();
        setReady(true);
      })
      .catch((e) => {
        console.warn("[RootLayout] mock storage hydration failed:", e);
        setReady(true);
      });
  }, []);

  if (!fontsLoaded || !ready) {
    return <View style={{ flex: 1, backgroundColor: "#FBFAF6" }} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
