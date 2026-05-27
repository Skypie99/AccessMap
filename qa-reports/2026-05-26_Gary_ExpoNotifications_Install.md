# Gary QA — expo-notifications Install Report
**Date:** 2026-05-26
**Role:** Gary (QA Engineer)

---

## Summary

`expo-notifications` was successfully installed into AccessMap via `npx expo install expo-notifications -- --legacy-peer-deps`. Resolved to SDK 54-compatible version `~0.32.17`. TypeScript typecheck remains green. Push notification test counts are **unchanged** from pre-install baseline — the 11 failing tests in `pushNotifications.flow.test.ts` were pre-existing and are caused by a Jest/Node ESM limitation, not a missing package or code bug.

---

## Install Details

**Command run:**
```
npx expo install expo-notifications -- --legacy-peer-deps
```

Note: `npx expo install expo-notifications --legacy-peer-deps` (without `--`) returns a CommandError. Correct syntax passes npm flags after `--`.

**Installed version:** `expo-notifications: ~0.32.17` (SDK 54.0.0 compatible)

**package.json entry confirmed:**
```json
"expo-notifications": "~0.32.17"
```

**npm output:** 168 packages added, 1 package changed, 1087 packages audited. 13 moderate severity vulnerabilities (pre-existing, unrelated to this install).

---

## TypeScript Typecheck

```
npm run typecheck  →  tsc --noEmit
EXIT: 0 — CLEAN
```

No type errors introduced by the install.

---

## Push Tests: Before vs After

### Before Install (baseline)
```
FAIL  src/lib/__tests__/pushNotifications.flow.test.ts
PASS  src/lib/__tests__/pushNotifications.test.ts
Test Suites: 1 failed, 1 passed, 2 total
Tests:       11 failed, 10 passed, 21 total
```

### After Install
```
FAIL  src/lib/__tests__/pushNotifications.flow.test.ts
PASS  src/lib/__tests__/pushNotifications.test.ts
Test Suites: 1 failed, 1 passed, 2 total
Tests:       11 failed, 10 passed, 21 total
```

**Delta: 0 tests fixed, 0 tests broken. Count identical.**

---

## Analysis of Pre-existing Failures

All 11 failures in `pushNotifications.flow.test.ts` share:

```
TypeError: A dynamic import callback was invoked without --experimental-vm-modules
```

**Root cause:** The flow test file uses `jest.doMock()` + dynamic `await import(...)`. This pattern requires Node to run with `--experimental-vm-modules`, which is not configured in the jest-expo preset. This is a pre-existing test infrastructure gap documented in the test file header itself:

> "We use jest.doMock so each test can choose to install/uninstall it and exercise the dynamic-require fallback."

The install of expo-notifications did not fix or worsen this — the tests were designed to mock the module regardless of physical install status.

**Confirmation the real module now loads:** The `pushNotifications.test.ts` PASS suite output now shows a console.warn from expo-notifications:
```
expo-notifications: Android Push notifications ... were removed from Expo Go with SDK 53.
Use a development build instead of Expo Go.
```
This confirms the `require('expo-notifications')` path in `deletePushToken` now resolves to the real package. The warning is expected/harmless.

---

## Action Items

| Item | Severity | Owner |
|------|----------|-------|
| `pushNotifications.flow.test.ts` — 11 tests need `--experimental-vm-modules` | LOW | Rory (CI/test infra) |
| 13 moderate npm audit vulnerabilities | LOW | Routine — pre-existing |

---

## Verdict

**INSTALL: COMPLETE**
**TYPECHECK: GREEN (EXIT 0)**
**PUSH TESTS: UNCHANGED — pre-existing flow test failures are a Jest ESM config issue unrelated to this install.**
