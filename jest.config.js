// Jest configuration for the step-counter ↔ rewards loop test suite.
//
// The suite targets the pure/storage logic in lib/ (stepEngine,
// pointsLedger, redemptions, stepHistory, config) — no React Native
// rendering is involved, so a plain ts-jest setup is enough. AsyncStorage
// is swapped for the library's official in-memory jest mock, and the
// Supabase module is mocked per-test-file.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib/__tests__'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        // TS 6 deprecates moduleResolution 'node' (node10) and requires an
        // explicit rootDir; both are test-tooling only, app code is unaffected.
        ignoreDeprecations: '6.0',
        rootDir: '.',
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        target: 'ES2020',
      },
    },
  },
};
