# Web Errors Log (Khidmat App)
**Date:** 10/2/2026
**Environment:** Expo Web (SDK 57)

## 1. Dark Mode / CSS Interop Error (Redbox on Web)
- **Error Message**: `Uncaught Error: Cannot manually set color scheme, as dark mode is type 'media'. Please use StyleSheet.setFlag('darkMode', 'class')`
- **Source**: `react-native-css-interop` (NativeWind v4 core dependency).
- **Details**: This error triggers an Expo developer redbox overlay when the web page is first loaded. It occurs because NativeWind is trying to apply a color scheme dynamically, but the web bundler is configured for media queries instead of class-based dark mode by default.
- **Impact**: Generates a red screen overlay. Once dismissed, the app functions perfectly. Only affects Web/Browser builds.

## Verified Working (No Errors):
- **Navigation Context Error**: Resolved! The `Couldn't find a navigation context` error no longer appears. The router switches between `/` and `/auth` perfectly.
- **UI Alignment**: The Sign-in screen is now perfectly centered vertically and horizontally.
- **Form Interactivity**: Inputs (Email/Password), state toggles (Login/Signup), and mock Firebase authentications are all fully functional on Web.
