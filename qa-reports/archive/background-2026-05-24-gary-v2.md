---
mode: background
model_tier: opus-4-7
project: AccessMap
role: Gary (QA Engineer)
cycle_id: gary-bg-2026-05-24-v2
branch: main (AUDIT-ONLY — Const. 12.5 privacy-sensitive default)
audit_only: true
supersedes: none (addendum to background-2026-05-24-gary.md)
---

# Gary — BACKGROUND audit addendum (2026-05-24, v2)

**Scope:** Second scheduled Gary cycle today. The morning cycle
(`background-2026-05-24-gary.md`) found the brief was outdated — Jest is
landed, 578 tests green, only lint+CI remain as standing proposals. This
addendum **does not restate** that. It adds three things the morning cycle
didn't have:

1. **Per-file coverage numbers** (granular, not a TL;DR table).
2. **Three new test files that need no new deps** — exact content drafted
   below so a foreground cycle can copy-paste with zero re-derivation.
3. **One concrete gap inside an already-tested file** (`watchedFlags`)
   with the missing cases listed line-by-line.

Halt sentinel: absent. Tests: green. Typecheck: green. No commits this
cycle (Const. 12.5).

---

## 1. Coverage baseline (new data, not in morning report)

```
Statements   : 79.82% ( 906/1135 )
Branches     : 80.48% ( 528/656 )
Functions    : 78.09% ( 189/242 )
Lines        : 81.06% ( 792/977 )
```

Per-file breakdown — only files **under 95% lines or 0%** are shown
(everything else is acceptable for now):

| File | Lines | Why uncovered | Addressable without new deps? |
| --- | --- | --- | --- |
| `accessibility.ts` | **0%** | React hook over `AccessibilityInfo` | No — needs `@testing-library/react-native` |
| `auth.tsx` | **0%** | React Context provider | No — same |
| `flagsStore.tsx` | **0%** | React Context provider | No — same |
| `location.ts` | **0%** | React hook over `expo-location` | No — same |
| `supabase.ts` | n/a (ignored) | Thin client builder; testing it = re-testing `@supabase/supabase-js` | Skip |
| `users.ts` | **0%** | One Supabase wrapper, no tests yet | **YES** — see §2.a |
| `flags.ts` | **37%** (lines 19-175) | All Supabase wrappers untested | **YES** — see §2.b (already proposed in morning report) |
| `points.ts` | **71%** (lines 41-48) | `fetchCurrentPoints` (Supabase) | **YES** — see §2.c |
| `feedback.ts` | **60%** (lines 105-130) | `sendFeedback`, `openFeedbackComposer` (Linking + Alert) | **YES** — see §2.d |
| `watchedFlags.ts` | **70%** (lines 61-65, 116-122, 129-141) | Error paths + `setWatched` no-op + `clearWatched` | **YES** — see §3 |
| `feedbackStore.ts` | 92% | Single error-rethrow on line 67 | Low value, skip |
| `dataExport.ts` | 100% lines, 90% branches | Two unreached branches (lines 85, 157) | Low value, skip |
| `filterPresets.ts` | 94% | Lines 259-263, 291 (rare edge in seed) | Low value, skip |

**Top three highest-leverage, lowest-risk wins for next foreground cycle:**

- `flags.ts` → ~+8 points of statement coverage (177 uncovered lines).
- `feedback.ts` → +2-3 points but covers a user-facing path (mail composer fallback).
- `users.ts` → marginal % but the file goes from 0→100% with ~6 tiny cases.

---

## 2. Drafted test files (copy-paste-ready, no new deps)

These follow the patterns already proven in the suite:
- `feedbackStore.test.ts` lines 32-50 for the chainable Supabase builder mock.
- `points.test.ts` lines 23-50 for the AsyncStorage mock + supabase stub.
- `feedback.ts` has `buildMailtoUrl` already fully covered, so `react-native` mock just needs `Linking` + `Alert` + `Platform`.

### 2.a `src/lib/__tests__/users.test.ts`

Smallest, cleanest add. Single function, four cases.

```ts
/**
 * Tests for src/lib/users.ts — updateUserProfile.
 *
 * Locks in the contract: ONLY the columns listed in UserProfilePatch
 * (display_name today) get passed through to the .update() call.
 * Anything else the caller spreads in is silently ignored. The schema
 * is the source of truth for editable fields, not the wire format.
 */

const updateMock = jest.fn();
const eqMock = jest.fn();
const selectMock = jest.fn();
const singleMock = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: updateMock.mockReturnValue({
        eq: eqMock.mockReturnValue({
          select: selectMock.mockReturnValue({
            single: singleMock,
          }),
        }),
      }),
    })),
  },
}));

import { updateUserProfile } from '../users';

beforeEach(() => {
  updateMock.mockClear();
  eqMock.mockClear();
  selectMock.mockClear();
  singleMock.mockClear();
});

describe('updateUserProfile', () => {
  it('passes only the patch fields to .update() and filters by id', async () => {
    singleMock.mockResolvedValueOnce({
      data: { id: 'u1', display_name: 'Sky', points: 42 },
      error: null,
    });

    const row = await updateUserProfile('u1', { display_name: 'Sky' });

    expect(updateMock).toHaveBeenCalledWith({ display_name: 'Sky' });
    expect(eqMock).toHaveBeenCalledWith('id', 'u1');
    expect(row.display_name).toBe('Sky');
  });

  it('accepts null display_name (clearing the field)', async () => {
    singleMock.mockResolvedValueOnce({
      data: { id: 'u1', display_name: null, points: 0 },
      error: null,
    });

    await updateUserProfile('u1', { display_name: null });
    expect(updateMock).toHaveBeenCalledWith({ display_name: null });
  });

  it('rejects with the supabase error when one is returned', async () => {
    const err = new Error('permission denied');
    singleMock.mockResolvedValueOnce({ data: null, error: err });

    await expect(updateUserProfile('u1', { display_name: 'x' })).rejects.toBe(
      err,
    );
  });

  it('passes an empty patch through (no-op update is the schema is consulted)', async () => {
    singleMock.mockResolvedValueOnce({
      data: { id: 'u1', display_name: 'Sky', points: 42 },
      error: null,
    });
    await updateUserProfile('u1', {});
    expect(updateMock).toHaveBeenCalledWith({});
  });
});
```

**Expected outcome:** users.ts 0% → 100%.

### 2.b `src/lib/__tests__/flagsSupabase.test.ts`

Already drafted in the morning report (§4). Not re-drafted here —
20-25 cases against listFlags, listFlagsByUser, createFlag,
updateFlagStatus, deleteFlag, fetchFlagById, fetchFlagsByIds,
listRecentFlags, uploadFlagPhoto. See morning report for the
intended-behavior list.

### 2.c Extend `points.test.ts` with `fetchCurrentPoints`

`fetchCurrentPoints` is the only Supabase-touching function in
`points.ts`. Lines 41-48 are uncovered. The existing
`points.test.ts` already stubs `supabase` (line 50: `jest.mock('../supabase', () => ({ supabase: {} }))`)
— that stub needs to become a chainable mock identical to §2.a.

```ts
// Replace the existing supabase stub at points.test.ts:50 with:
const maybeSingleMock = jest.fn();
const eqPointsMock = jest.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectPointsMock = jest.fn(() => ({ eq: eqPointsMock }));
const fromPointsMock = jest.fn(() => ({ select: selectPointsMock }));
jest.mock('../supabase', () => ({
  supabase: { from: fromPointsMock },
}));

// Then add this describe block at the bottom of points.test.ts:
describe('fetchCurrentPoints', () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    eqPointsMock.mockClear();
    selectPointsMock.mockClear();
    fromPointsMock.mockClear();
  });

  it('returns the numeric points value when the row exists', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { points: 42 },
      error: null,
    });
    const { fetchCurrentPoints } = await import('../points');
    expect(await fetchCurrentPoints('u1')).toBe(42);
    expect(fromPointsMock).toHaveBeenCalledWith('users');
    expect(selectPointsMock).toHaveBeenCalledWith('points');
    expect(eqPointsMock).toHaveBeenCalledWith('id', 'u1');
  });

  it('returns null when supabase returns an error (no toast vs wrong toast)', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: new Error('rls'),
    });
    const { fetchCurrentPoints } = await import('../points');
    expect(await fetchCurrentPoints('u1')).toBeNull();
  });

  it('returns null when no row is found (new user pre-trigger)', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    const { fetchCurrentPoints } = await import('../points');
    expect(await fetchCurrentPoints('u1')).toBeNull();
  });

  it('returns null when points is not a number (corrupt row)', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { points: 'not-a-number' },
      error: null,
    });
    const { fetchCurrentPoints } = await import('../points');
    expect(await fetchCurrentPoints('u1')).toBeNull();
  });
});
```

**Note:** the dynamic `import('../points')` is needed because `points.ts`
is imported at the top of the existing file under a different mock.
Alternatively, move the `jest.mock` to the top and remove the static
import — pick one pattern in the foreground cycle, both work.

**Expected outcome:** points.ts 71% → 100%.

### 2.d `src/lib/__tests__/feedbackSend.test.ts`

The pure `buildMailtoUrl` is already covered by `feedback.test.ts`.
This file adds the two side-effect-bearing functions: `sendFeedback`
(touches `Linking.canOpenURL` + `Linking.openURL`) and
`openFeedbackComposer` (touches `Alert.alert`).

```ts
/**
 * Tests for the side-effect-bearing helpers in src/lib/feedback.ts:
 *   - sendFeedback: result-discriminator under each Platform / Linking outcome.
 *   - openFeedbackComposer: Alert fallback when sendFeedback returns non-'opened'.
 *
 * Mocks react-native's Linking + Alert + Platform at the module level so the
 * mailto path is exercised without the OS. Note that web SKIPS the
 * canOpenURL precheck (Safari falsely reports false) — this file locks that in.
 */

const canOpenURLMock = jest.fn();
const openURLMock = jest.fn();
const alertMock = jest.fn();

jest.mock('react-native', () => ({
  Linking: { canOpenURL: canOpenURLMock, openURL: openURLMock },
  Alert: { alert: alertMock },
  Platform: { OS: 'ios' as 'ios' | 'android' | 'web' },
}));

import { Platform } from 'react-native';
import { sendFeedback, openFeedbackComposer } from '../feedback';

beforeEach(() => {
  canOpenURLMock.mockReset();
  openURLMock.mockReset();
  alertMock.mockReset();
  (Platform as { OS: string }).OS = 'ios';
});

describe('sendFeedback (native happy path)', () => {
  it("returns { status: 'opened' } when Linking can and does open the URL", async () => {
    canOpenURLMock.mockResolvedValueOnce(true);
    openURLMock.mockResolvedValueOnce(undefined);

    const result = await sendFeedback({ body: 'hello' });

    expect(result).toEqual({ status: 'opened' });
    expect(canOpenURLMock).toHaveBeenCalled();
    expect(openURLMock).toHaveBeenCalled();
  });

  it("returns 'unavailable' (with the URL) when canOpenURL is false", async () => {
    canOpenURLMock.mockResolvedValueOnce(false);
    const result = await sendFeedback({ body: 'hi' });
    expect(result.status).toBe('unavailable');
    if (result.status === 'unavailable') {
      expect(result.url).toMatch(/^mailto:/);
    }
    expect(openURLMock).not.toHaveBeenCalled();
  });

  it("returns 'error' (with message) when openURL throws", async () => {
    canOpenURLMock.mockResolvedValueOnce(true);
    openURLMock.mockRejectedValueOnce(new Error('user cancelled'));
    const result = await sendFeedback({ body: 'hi' });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toMatch(/cancelled/);
    }
  });
});

describe('sendFeedback on web', () => {
  it('skips canOpenURL on web (Safari falsely reports false)', async () => {
    (Platform as { OS: string }).OS = 'web';
    openURLMock.mockResolvedValueOnce(undefined);

    const result = await sendFeedback({ body: 'hello' });

    expect(canOpenURLMock).not.toHaveBeenCalled();
    expect(openURLMock).toHaveBeenCalled();
    expect(result).toEqual({ status: 'opened' });
  });
});

describe('openFeedbackComposer', () => {
  it('does NOT show an Alert when sendFeedback opens cleanly', async () => {
    canOpenURLMock.mockResolvedValueOnce(true);
    openURLMock.mockResolvedValueOnce(undefined);

    await openFeedbackComposer();

    expect(alertMock).not.toHaveBeenCalled();
  });

  it('falls back to Alert with the email when sendFeedback is unavailable', async () => {
    canOpenURLMock.mockResolvedValueOnce(false);

    await openFeedbackComposer();

    expect(alertMock).toHaveBeenCalled();
    const [, message] = alertMock.mock.calls[0];
    expect(message).toContain('skylerhalisky@gmail.com');
  });
});
```

**Expected outcome:** feedback.ts 60% → ~100%.

---

## 3. Inside-file gap: `watchedFlags.test.ts`

`watchedFlags.ts` is at 70% lines. The existing test file covers the
happy paths and the MAX_WATCHED cap. The missing branches are all
**error paths and no-op paths** — exactly the kind of behavior that
silently breaks under a regression. Specific lines:

| Lines | What's there | Test to add |
| --- | --- | --- |
| 61-65 | `loadWatched` catch block (AsyncStorage throws) | Mock `getItem` to throw → assert `loadWatched` returns `[]` |
| 116-122 | `setWatched` "unchanged → no write" short-circuit | Call setWatched with the current list → assert `setItem` was NOT called |
| 129-141 | `persist` catch + `clearWatched` | Two cases: (a) `setItem` rejects → no throw; (b) `clearWatched` → underlying key is set to `'[]'` |

All four cases fit in ~30 lines. No new deps, same in-memory `Map`
mock the existing test file uses.

---

## 4. Standing items (unchanged from morning cycle)

The two propose-only items from `qa-reports/proposal-lint-2026-05-23.md`
and `qa-reports/proposal-ci-2026-05-23.md` are still the gating
infrastructure work. Re-surfacing them here would be noise — see the
morning report's §5 for the full pitch.

---

## 5. DECISIONS FOR SKY

Net-new this cycle (the morning report's decisions still stand):

1. **Authorize the four test-file adds in §2 + §3.** No new deps, no
   config change, four files (one new test file each for users.ts,
   flagsSupabase, feedbackSend; one extension to watchedFlags.test.ts
   and points.test.ts). Single commit per file on
   `test/coverage-extras-2026-05-25`. Expected coverage delta: +12-15
   statement points (79.82% → ~93%).

2. **Set a coverage floor in CI?** Once §1 is done, the CI proposal
   could add `jest --ci --coverage --coverageThreshold='{global: {lines: 90}}'`
   so future regressions don't quietly drop coverage. Adds ~10 lines
   to the proposed `ci.yml` — would land together with the CI
   workflow, not before.

3. **Skipped:** auto-running coverage on every `npm test` (slows
   local feedback ~3×). Only run it in CI and on demand.

---

## Cycle audit trail

- Started: 2026-05-24 evening, scheduled-task
  `gary-test-coverage-and-qa` (post-morning Gary cycle).
- Halt sentinel: absent.
- AUDIT-ONLY enforced: no file writes outside `qa-reports/`.
- Reversible-change budget used: 0 of 1.
- External sends: none (Const. 12.2 → 9.4 inherited).
- Files read: `package.json`, `jest.config.js`, `src/lib/*.ts`,
  `src/lib/__tests__/*.ts`, prior `qa-reports/background-2026-05-24-gary.md`.
- Coverage collected: `npx jest --coverage --collectCoverageFrom='src/lib/**/*.{ts,tsx}' --coveragePathIgnorePatterns='supabase.ts'`.
- Output: this report. STOP — Morgan picks it up on next sweep.
