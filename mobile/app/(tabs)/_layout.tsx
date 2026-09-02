import React from "react";
import { Tabs } from "expo-router";
import { Home, CalendarDays, MessageSquare, User, LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1F5D3F",
        tabBarInactiveTintColor: "rgba(20,35,28,0.55)",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: "#FBFAF6",
          borderTopColor: "#E4E2D8",
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
          title: "Home",
          tabBarIcon: tabIcon(Home),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: tabIcon(CalendarDays),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Messages",
          tabBarIcon: tabIcon(MessageSquare),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: tabIcon(User),
        }}
      />
    </Tabs>
  );
}
