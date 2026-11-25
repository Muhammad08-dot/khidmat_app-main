# Khidmat v2 — Expo Run Compatibility & Path Decision (`M4-1`)

**Expo SDK in `package.json`:** `~57.0.34` (React Native `0.86.3`, React `19.2.3`)

## 1. Dependency Compatibility Audit

| Package | Version | Expo Go Support | Notes / Reason |
| :--- | :--- | :---: | :--- |
| `@maplibre/maplibre-react-native` | `^11.5.1` | **NO** | Custom native map module; requires an Expo Development Build (`eas build -p android --profile development`) to render native MapLibre views. |
| `expo-notifications` | `~57.0.26` | **Partial (No Remote Push)** | Android remote push notifications were removed from Expo Go in SDK 53+. Guarded in `src/services/push.ts` via `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`. |
| `expo-task-manager` + `expo-location` (bg) | `~57.0.24` | **Partial (No Background Task)** | Background location updates require foreground service permissions and native manifest configuration. Guarded in `src/services/backgroundLocation.ts`. |
| `expo-secure-store`, `expo-image-picker`, `expo-auth-session`, `expo-web-browser` | `~57.x` | **YES** | Supported in Expo Go SDK 57. |

## 2. Run Path Decision

- **Primary Path (Full Native Features): Development Build**
  - Because `@maplibre/maplibre-react-native` is present in `package.json`, full native map + background location + remote push testing requires a **Development Build**:
    ```bash
    eas build -p android --profile development
    ```
  - Install the resulting APK on the Android phone, then run `npx expo start -c` and scan the QR code from inside the Khidmat dev-client app.
- **Quick UI / Auth / Booking Smoke Path: Expo Go (SDK 57)**
  - Core JS screens, Supabase auth, bookings, chat, and KYC upload work in Expo Go SDK 57 (or `--web`), with background location and remote push safely guarded so they do not crash.
