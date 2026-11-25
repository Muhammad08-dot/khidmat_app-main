# Khidmat v2 — Expo Run Compatibility & Path Decision (`M4-1`)

**Expo SDK in `package.json`:** `~57.0.34` (React Native `0.86.3`, React `19.2.3`)

## 1. Dependency Compatibility Audit

`@maplibre/maplibre-react-native` was removed per the PRD cut list (`no MapLibre`) so the app loads cleanly in **Expo Go (SDK 57)**.

| Package | Version | Expo Go Support | Notes / Reason |
| :--- | :--- | :---: | :--- |
| `expo-notifications` | `~57.0.26` | **Partial (No Remote Push)** | Android remote push notifications were removed from Expo Go in SDK 53+. Safely guarded in `src/services/push.ts` via `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`. |
| `expo-task-manager` + `expo-location` (bg) | `~57.0.24` | **Partial (No Background Task)** | Background location updates require a development/production build. Safely guarded in `src/services/backgroundLocation.ts`. |
| `expo-secure-store`, `expo-image-picker`, `expo-auth-session`, `expo-web-browser`, `expo-location` (fg) | `~57.x` | **YES** | Fully supported in Expo Go SDK 57. |

## 2. Run Path Decision

- **Selected Path: Expo Go (SDK 57)**
  - With `@maplibre/maplibre-react-native` removed, no custom native modules block Expo Go.
  - Run `npx expo start -c` (or `--tunnel` if LAN isolates clients) and scan the QR code using **Expo Go** on Android/iOS.
  - **Known Expo Go limitations:** remote push token registration and background headless location tracking are disabled/guarded in Expo Go and require `eas build -p android --profile development` (or `production`).
