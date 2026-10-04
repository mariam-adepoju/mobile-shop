// Flat ESLint config. SDK 57 baseline: https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  // Prettier owns formatting; disable stylistic ESLint rules that fight it.
  prettierConfig,
  {
    ignores: [
      '.expo/**',
      '.git/**',
      'android/**',
      'coverage/**',
      'dist/**',
      'ios/**',
      'node_modules/**',
      'web-build/**',
    ],
  },
  {
    // AGENTS.md 11: "No console.log in src/ (use the redacting logger)".
    // src/lib/logger.ts is the single sanctioned exception; it disables the
    // rule inline with a justification.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // AGENTS.md 6: "Screens and components never call fetch."
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'All networking must go through src/lib/api (AGENTS.md 6).',
        },
      ],
    },
  },
  {
    // src/lib/api is the one module allowed to reach the network.
    files: ['src/lib/api/**/*.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  {
    // Config and tooling files may log freely.
    files: ['*.js', '*.cjs', 'scripts/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
]);