import React, { useEffect, useState } from "react";
import { BRAND } from "@/src/theme/colors";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useURL } from "expo-linking";
import { KeyRound, CheckCircle2 } from "lucide-react-native";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Icon } from "@/src/components/ui/Icon";
import { supabase } from "@/src/services/supabase/client";
import { useAuth } from "@/src/context/AuthContext";

/**
 * Landing screen for the password-reset deep link (khidmat://reset-password).
 *
 * Supabase recovery links carry `token_hash` + `type=recovery` in the URL
 * fragment. We exchange them for a session here, then let the user set a new
 * password via auth.updateUser(). If the screen is opened without a link
 * (e.g. from a notification tap) we simply prompt to redo "Forgot password".
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = useURL();
  const { updatePassword } = useAuth();

  const [recovering, setRecovering] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const fragment = url?.includes("#") ? new URLSearchParams(url.split("#")[1]) : null;
        const tokenHash = fragment?.get("token_hash");
        const type = fragment?.get("type");
        if (tokenHash && type === "recovery") {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (!verifyErr) setReady(true);
        } else {
          // No link token — proceed only if a recovery session is already active.
          const { data } = await supabase.auth.getSession();
          const isRecovery = data.session?.user?.recovery_sent_at != null;
          if (data.session && isRecovery) setReady(true);
        }
      } catch (e: any) {
        setError(e?.message || "Could not start password recovery.");
      } finally {
        setRecovering(false);
      }
    };
    void run();
    // Only attempt exchange once for the current URL.
  }, [url]);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError("Password should be at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.replace("/(auth)/auth"), 1800);
    } catch (e: any) {
      setError(e?.message || "Could not update the password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  if (recovering) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-on-surface-variant">Opening your reset link…</Text>
      </View>
    );
  }

  if (done) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Icon icon={CheckCircle2} color={BRAND.primary} size={48} />
        <Text className="mt-4 text-xl font-bold text-on-surface">Password updated!</Text>
        <Text className="mt-2 text-sm text-on-surface-variant text-center">
          Redirecting you to the login screen…
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-surface">
        <View className="flex-1 items-center justify-center px-6">
          <Icon icon={KeyRound} color={BRAND.primary} size={40} />
          <Text className="mt-4 text-lg font-bold text-on-surface">Reset link not detected</Text>
          <Text className="mt-2 text-sm text-on-surface-variant text-center">
            Open the reset link from your email on this device, or request a new one from the login screen.
          </Text>
          <Button title="Back to Login" onPress={() => router.replace("/(auth)/auth")} className="mt-6 self-center" />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
        <Icon icon={KeyRound} color={BRAND.primary} size={40} />
        <Text className="mt-4 text-2xl font-bold text-on-surface">Set a new password</Text>
        <Text className="mt-2 text-sm text-on-surface-variant">
          Choose a strong password with at least 6 characters.
        </Text>

        <View className="mt-8 gap-4">
          <Input
            label="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          <Input
            label="Confirm New Password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="••••••••"
          />
          {error && <Text className="text-sm text-error">{error}</Text>}
          <Button title="Update Password" onPress={handleSubmit} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
