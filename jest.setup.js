/* eslint-env jest, node */
process.env.EXPO_PUBLIC_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE || 'true';

// Mock AsyncStorage for Jest
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock lucide-react-native for Jest tests
jest.mock('lucide-react-native', () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        const MockIcon = () => null;
        MockIcon.displayName = `LucideIcon(${String(prop)})`;
        return MockIcon;
      },
    }
  );
});

// Mock expo-notifications for Jest (SDK 58 handleSubscription.remove compatibility)
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[mock]' })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

// Mock react-native-safe-area-context for Jest component render tests
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));
