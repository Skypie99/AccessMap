# Proposal — Jest test runner + jest-expo preset

**Status:** PROPOSED — not installed yet. Adds new dev dependencies.
**Owner to approve:** Sky (skylerhalisky@gmail.com)
**Author:** Gary (safety-net pass, 2026-05-23)
**Estimated effort:** ~10 minutes to install + verify

---

## Why

AccessMap currently has **no test runner**. The only safety net is
`tsc --noEmit`, which catches type errors but not behavior bugs.

This proposal wires up **Jest with the `jest-expo` preset** — the
standard Expo recipe, what `npx create-expo-app` ships with, what Expo's
own docs reach for. Boring on purpose.

Two test files are already on disk and ready to run the moment this
proposal lands:

- `src/lib/__tests__/flags.test.ts` (~20 cases, just landed in this branch)

They're currently excluded from `tsconfig.json` so `npm run typecheck`
stays green. When the runner is installed, the install will also add
`@types/jest`, the exclude lines can come out, and the tests run.

---

## Exact steps

```bash
cd ~/AccessMap

# 1. Install runner + Expo preset + types
npm install --save-dev \
  jest@^29.7.0 \
  jest-expo@~54.0.0 \
  @types/jest@^29.5.12 \
  --legacy-peer-deps

# 2. Add scripts to package.json
#    "test": "jest",
#    "test:watch": "jest --watch",
#    "test:ci": "jest --ci --coverage"
```

Then add `jest.config.js` at the repo root:

```js
module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

And a minimal `jest.setup.js`:

```js
// Silence the AsyncStorage warning that fires in test envs.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
```

Then remove the test-file exclusions added to `tsconfig.json` in this
qa branch:

```json
// tsconfig.json — remove these lines (they were added so the tests
// could be checked in before the runner landed):
"exclude": [
  "node_modules",
  "**/__tests__/**",
  "**/*.test.ts",
  "**/*.test.tsx"
]
```

Finally:

```bash
npm test                # should print: Tests: 20 passed
npm run typecheck       # should still print no errors
```

---

## What lands with this

- 20 passing tests covering category/severity/status constants in
  `src/lib/flags.ts`
- An immediate place to add tests for:
  - `points.ts`, `preferences.ts`, `onboarding.ts` AsyncStorage helpers
    (the mock above makes these trivial)
  - `flags.ts` Supabase-backed helpers, once a small `__mocks__/supabase`
    factory is added (~30 lines)
  - The points trigger logic — currently only verified by running the
    app; could be partially mirrored in a TS expectation file

---

## Why this preset, not Vitest

- Expo's official testing guide reaches for Jest + jest-expo.
- `jest-expo` ships the right `transformIgnorePatterns` so React Native
  ESM modules parse correctly — Vitest needs custom config to do the
  same thing.
- The `@react-native-async-storage/async-storage/jest/async-storage-mock`
  shim works out of the box with Jest; the Vitest path needs more setup.

If a future task adds Vitest for the Next.js companion project (the
Prompt Library Tool), the two stay separate — they live in different
repos.

---

## Risk

Low. Adds dev dependencies only — nothing changes about how the app
ships or runs. Reversible by `git revert` and `npm uninstall`.

If `--legacy-peer-deps` raises a flag (it's already needed elsewhere for
`react-leaflet` — see CLAUDE.md "Gotcha #2"), this install follows the
same well-trodden pattern.
