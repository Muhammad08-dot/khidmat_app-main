/**
 * jest.integration.config.js
 * Jest configuration for Cloud Supabase Integration Tests (PRD §5.2).
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/services/supabase/__tests__/integration/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
  testTimeout: 30000,
};
