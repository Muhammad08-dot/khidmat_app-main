process.env.EXPO_PUBLIC_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE || 'true';

// Mock AsyncStorage for Jest
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
