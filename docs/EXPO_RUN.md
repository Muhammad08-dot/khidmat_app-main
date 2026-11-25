# Khidmat v2 — Expo Run Compatibility & Path Decision (`M4-1`)

**Expo SDK in `package.json`:** `~57.0.34` (React Native `0.86.3`, React `19.2.3`)

## 1. Expo Go SDK Check

- Expo Go only supports **one primary SDK version at a time**, and store-distributed Expo Go builds (Google Play / App Store) frequently lag behind newer SDK releases (such as SDK 57) or disable Android remote push (`expo-notifications` removed from Expo Go in SDK 53+) and background location (`expo-task-manager`).
- Although `@maplibre/maplibre-react-native` has been removed, **Play Store Expo Go may reject SDK 57** unless a matching SDK 57 APK is sideloaded from `https://expo.dev/go`.

## 2. Selected Path: Development Build (`eas build -p android --profile development`)

For reliable testing of SDK 57, remote push notifications, and background location on a physical Android device:

```bash
eas build -p android --profile development
```

1. Run the command above and install the generated `.apk` on your Android phone.
2. Start Metro (`npx expo start -c`, or `npx expo start --tunnel` if LAN is blocked) and scan the QR code inside the installed Khidmat development build.
3. *(Optional JS-only fallback)* If you specifically want to use Expo Go, download the matching **SDK 57** APK from `https://expo.dev/go` (background location and remote push remain disabled/guarded in Expo Go).
