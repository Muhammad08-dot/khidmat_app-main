---
name: Expo & React Native Best Practices
description: Guidelines for building fast, robust, and native-feeling mobile apps using Expo Router.
---

# React Native & Expo Best Practices

When working on this project, ALWAYS follow these guidelines:

1. **Routing:** 
   - Exclusively use `expo-router` for navigation.
   - Do not use `react-navigation` directly.
   - Use absolute imports (`@/src/...`) instead of relative paths (`../../`).

2. **Performance:**
   - Use `FlashList` from `@shopify/flash-list` instead of `FlatList` for large lists.
   - Avoid inline functions in `renderItem` and avoid inline styles if they are complex.
   - Use `memo` and `useMemo` where re-renders are expensive.

3. **Styling:**
   - Use NativeWind (TailwindCSS for React Native) where applicable.
   - Build reusable components in `src/components/ui/` and compose them in feature components.
   - Fully support Dark Mode (`dark:` classes) and RTL (Urdu) layouts.

4. **Animations:**
   - Use `react-native-reanimated` and `moti` for smooth 60FPS animations.
   - Do not use the legacy `Animated` API from React Native.
