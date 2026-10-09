import React from "react";
import { BRAND } from "@/src/theme/colors";
import { Tabs } from "expo-router";
import { Home, CalendarDays, MessageSquare, Bell, User, LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useNotifications } from "@/src/hooks/useSupabase";
import { t } from "@/src/i18n";

/** Props the tab bar passes to each icon renderer. */
type TabIconProps = { color: ColorValue; size: number; focused: boolean };

/** Props a lucide icon accepts at runtime (kept permissive to dodge the
 *  strict SvgProps typing that trips on `color`). */
type LucideIconProps = { color?: ColorValue; size?: number };

/** Wrap a lucide icon so its props line up with the tab bar's renderer. */
const tabIcon = (Icon: LucideIcon) => (props: TabIconProps) => {
  const Cmp = Icon as React.ComponentType<LucideIconProps>;
  return <Cmp color={props.color} size={props.size} />;
};

export default function TabLayout() {
  const { user } = useAuth();
  const { data: notifications } = useNotifications(user?.id);
  const unread = (notifications ?? []).filter((n: any) => !n.read).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: "rgba(20,35,28,0.55)",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: "#FBFAF6",
          borderTopColor: BRAND.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab_home"),
          tabBarIcon: tabIcon(Home),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t("tab_bookings"),
          tabBarIcon: tabIcon(CalendarDays),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t("tab_inbox"),
          tabBarIcon: tabIcon(MessageSquare),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("tab_notifications"),
          tabBarIcon: tabIcon(Bell),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tab_profile"),
          tabBarIcon: tabIcon(User),
        }}
      />
    </Tabs>
  );
}
