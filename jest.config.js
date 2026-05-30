// Jest config — uses the official jest-expo preset (what Expo's own template
// reaches for). The preset handles transform, transformIgnorePatterns, and
// the moduleNameMapper for vector icons.
//
// Adding a new test? Drop a `*.test.ts` or `*.test.tsx` next to the file under
// test (or in `__tests__/`) and run `npm test`.
//
// See qa-reports/proposal-jest-setup-2026-05-23.md for the why behind each line.
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  // /.claude/ holds orchestrator worktrees that mirror the repo with their
  // own (sometimes stale) node_modules. Without this ignore, `npx jest`
  // tries to traverse those mirrors and crashes the worker with
  // "Invariant Violation: requireNativeModule" on a stale Platform.ios path.
  // See LEARNINGS.md → "Jest must ignore .claude/worktrees/".
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/.claude/'],
  moduleNameMapper: {
    // Path alias from tsconfig.json — `@/foo` → `src/foo`. The preset's own
    // moduleNameMapper (for vector icons) is preserved via Jest config merging.
    '^@/(.*)$': '<rootDir>/src/$1',
    // expo-image-manipulator is used by flags.ts (stripExifNative). Any test
    // that imports flags.ts transitively needs this stub.
    '^expo-image-manipulator$': '<rootDir>/__mocks__/expo-image-manipulator.js',
  },
  // Give Jest 3 s to wait for any remaining async handles after tests finish
  // before printing the "open handles" warning.  The root cause (Supabase
  // createClient firing _initialize() in tests that import flags.ts indirectly)
  // is fixed by mocking '../supabase' in those suites, but this guards against
  // any future module that spins up async work at import time.
  openHandlesTimeout: 3000,
  // Phase 2 Track A: enforce 80% coverage on every CI run.
  // Scope: pure business-logic in src/lib/ only — integration-layer adapters,
  // device-native modules, screens, and navigation are excluded below.
  // To check locally: npm run test:ci
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/screens/**',
    // All components (modals, drawers, banners) require a native runtime.
    '!src/components/**',
    // Hooks require device APIs (notifications, location, color scheme).
    '!src/hooks/**',
    // Platform-specific map wrappers need a real device.
    '!src/components/PlatformMap*.tsx',
    '!src/navigation/**',
    '!src/theme/**',
    '!src/types/**',
    '!src/lib/supabase.ts',
    '!src/lib/sentry.ts',
    '!src/lib/analytics.ts',
    '!src/lib/pushNotifications.ts',
    '!src/lib/realtimePrefs.ts',
    '!src/lib/auth.tsx',
    '!src/lib/flagsStore.tsx',
    // Phase 3 coverage sprint: webShare, statusHistory, watchedFlags, points
    // now meet the 80% threshold — exclusions removed 2026-05-29.
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
