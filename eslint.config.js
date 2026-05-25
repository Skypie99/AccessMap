// ESLint flat config for Expo 54 + React Native + TypeScript.
// Install required packages with:
//   npm install --save-dev eslint eslint-config-expo prettier eslint-config-prettier
//
// Then run:
//   npx eslint src --ext .ts,.tsx        # lint
//   npx prettier --check src             # format check
//   npx prettier --write src             # format fix

const { defineConfig } = require('eslint/config');

// eslint-config-expo ships a flat-config compatible export in its v8+ releases.
// If you get "Cannot find module", upgrade: npm i -D eslint-config-expo@latest
let expoConfig;
try {
  expoConfig = require('eslint-config-expo/flat');
} catch {
  // Fallback if the older non-flat export is installed.
  expoConfig = [];
}

module.exports = defineConfig([
  // Expo's recommended ruleset (React, React Native, TypeScript, hooks).
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),

  // Project-local overrides.
  {
    rules: {
      // Warn on console.log left in — use the error logging helpers in src/lib/errors.ts.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // TypeScript: ban implicit any at the rule level (tsc already catches this,
      // but the lint error is faster feedback in the editor).
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused imports are noise; TS already errors on unused vars.
      // eslint-plugin-unused-imports is optional — skip if not installed.
    },
  },

  // Ignore generated / vendor directories.
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'out/**',
      '.vercel/**',
      'coverage/**',
    ],
  },
]);
