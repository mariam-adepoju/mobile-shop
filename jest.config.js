/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // RN 0.86's Jest preset points at a setup-env file omitted from its npm
  // package. Expo's Jest setup already initializes the native test runtime.
  moduleNameMapper: {
    '^react-native/setup-env$': '<rootDir>/tests/react-native-setup-env.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/mocks/**', '!src/app/**'],
};
