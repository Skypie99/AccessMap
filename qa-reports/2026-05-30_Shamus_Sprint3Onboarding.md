# Shamus — Sprint 3 / Phase 5 Item 1: Onboarding Flow

**Date:** 2026-05-30
**Role:** Shamus (Feature Pusher)
**Branch:** `feat/sprint3-onboarding`
**Commit:** `f3e5bf5`
**Status:** Built + verified (typecheck clean, full test suite green). UI DONE **pending Design Compiler** (see request block below).

---

## What Sky asked for

A full-screen, once-only first-launch onboarding carousel (standalone, not overlay
tooltips), 5 slides: Welcome → How it works → Location permission → Notifications →
You're ready. Skippable at any point. Location + notification permission priming.
No PII (Jordan note). New file `src/screens/OnboardingScreen.tsx` (FlatList), key
`@accessmap:onboarding_complete`.

## What I found first (the important part)

AccessMap **already shipped** a device-wide first-launch carousel:

- `src/components/OnboardingCards.tsx` — horizontal `pagingEnabled` carousel, dots,
  Skip, Back/Next, **location permission priming on the last card**, full a11y
  (reduced motion, `announceForAccessibility`, roles/labels, 44pt targets, contrast).
- Wired into `App.tsx` → `FirstLaunchGate`, gated on `@accessmap/onboarded_v1`
  (`src/lib/onboardingState.ts`), and replayable from Settings.
- Plus a separate per-user post-sign-in `OnboardingModal` (3 cards).

Building the spec literally (new `OnboardingScreen.tsx` + new key + FlatList) would
have created a **second device-wide first-launch flow** firing back-to-back with the
existing one, plus ~80% duplicated code (a Design Compiler Layer 3 component-debt
flag, and the same trap as the W6-4 heatmap re-dispatch).

**Surfaced to Sky → decision: extend `OnboardingCards.tsx`, keep the existing
FirstLaunchGate wiring.** This report reflects that.

## What I built

Reshaped the existing carousel to the 5-slide arc and added the genuinely-new piece
(notifications priming):

| # | Slide | Copy / behavior |
|---|---|---|
| 1 | Welcome | "AccessMap helps you find and report accessibility barriers in your community." |
| 2 | How it works | "Tap the map to report a barrier. Add a photo, rate how severe it is, and help others navigate safely." |
| 3 | Location | Honest rationale ("only used while the app is open — never stored on our servers beyond the flag you place"). **"Allow Location"** → `expo-location` request, then advance. |
| 4 | Notifications | "Get notified when flags near you are updated or resolved… optional." **"Turn on Notifications"** → OS push prompt; **"Maybe later"** skips just this step. |
| 5 | You're ready | **"Open the Map"** → finishes onboarding. |

Mechanics:
- Generalized the single-permission handling to **two** permission slides. Each does a
  no-prompt `getPermissions` check on entry (returning users who already granted see a
  green check + "Continue" instead of a redundant dialog).
- Denying or skipping **either** permission never blocks reaching the map.
- Skip (top-right) exits all of onboarding; "Maybe later" only skips notifications.
- Preserved every a11y affordance already in the component.

New lib helpers in `src/lib/pushNotifications.ts`:
- `getNotificationPermission()` / `requestNotificationPermission()` — OS permission
  only, **no token, no DB write**. Onboarding runs pre-sign-in, so there's no userId
  to attach a token to; token registration stays in the existing post-sign-in Settings
  flow. Centralizes the optional-dep dynamic `require('expo-notifications')` + graceful
  degrade (web / not-installed → null/false, never throws).

## Jordan privacy note (addressed)

No PII collected in onboarding. Permission copy is honest about data use:
- Location: "only used while the app is open — never stored on our servers beyond the
  flag you place." Matches actual foreground-only location behavior.
- Notifications: framed as optional, with a clear "Maybe later" and a Settings re-entry.
- Notification copy is platform-neutral and iOS-accurate (Phase 5 doc soft-dependency:
  don't promise Android push before it exists — copy makes no platform promise).

Recommend Jordan do the light permission-copy review the Phase 5 strategy doc calls for.

## Quality gates

- **TypeScript:** clean. (The only `tsc` output is a pre-existing `tsconfig.json`
  `baseUrl` deprecation under TS 5.9 — present in HEAD, not introduced here; zero errors
  with `--ignoreDeprecations 6.0`.)
- **Tests:** `npm test` → **85 suites, 1341 passed, 18 todo, 0 failed** (was 1334; +7
  new for the permission helpers). AsyncStorage mock + `jest.clearAllMocks()` per the
  repo convention; expo-notifications virtual-mocked.
- **ESLint:** could not run locally — pre-existing env drift (ESLint **v10.4.1** installed
  vs. repo config targeting v9; `react-hooks/set-state-in-effect` rule missing). Tooling
  issue, not this change. Flag for Rory/Gary. Code follows the existing file's patterns
  (same `eslint-disable` lines for the dynamic require).

## Files

- `src/components/OnboardingCards.tsx` — reshaped to 5 slides + 2-permission logic.
- `src/lib/pushNotifications.ts` — +2 priming helpers.
- `src/lib/__tests__/pushPermission.test.ts` — new, 7 tests.

## DECISIONS FOR SKY / follow-ups

1. **Notifications token gap (by design, worth confirming):** granting notification
   permission in onboarding fires the OS prompt but does **not** register a push token
   (no userId pre-sign-in). The token registers when the user later toggles notifications
   in Settings post-sign-in. If we want the grant to "stick" automatically, a small
   post-sign-in hook could check permission and register the token. Out of scope here —
   flag for a follow-up if desired.
2. **expo-notifications install:** push requires `npx expo install expo-notifications`
   (already noted in the codebase). Helpers degrade gracefully if absent.
3. **Design Compiler gate** — pending (below). Sky said "commit when done" so I committed;
   recommend the compile before merge.

---

## Compile Requested

- **Branch:** `feat/sprint3-onboarding` (commit `f3e5bf5`)
- **Feature:** Sprint 3 onboarding — 5-slide first-launch carousel with location +
  notification permission priming.
- **Surface changed:** `src/components/OnboardingCards.tsx` (first-launch overlay).
- **Adjacent surfaces to check for regression:** Settings "Replay tutorial"
  (`OnboardingModal`, unchanged), `App.tsx` FirstLaunchGate (wiring unchanged).
- **Request:** Dani + Alex run the 7-layer Design Compile (tokenization, a11y parity,
  component consistency, visual entropy, luxury score, regression safety, decision) and
  write `qa-reports/2026-05-30_DesignCompile_sprint3-onboarding.md`. I'll mark UI DONE
  only on RESULT = COMMIT.
