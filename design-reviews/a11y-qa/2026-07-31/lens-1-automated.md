# LENS 1 — AUTOMATED BASELINE (banked 2026-07-31)

**Verdict: GREEN — all repo gates hold at the audited tip `5ab3f0c`.** Evidence tag: programmatic (all runs executed this session on Sky's Mac).

| Gate | Result | Baseline match |
|---|---|---|
| `npx jest --ci -w 3` | **186 suites / 2826 passed / 0 failed / 84 todo · exit 0** (240s) | ✅ exactly the Run-3 baseline, now confirmed at the post-bp11-merge tip |
| `npm run typecheck` | **0 errors** | ✅ |
| `npm run lint` | **0 errors / 80 warnings** | ✅ exactly the known-true baseline (80, not the stale "79") |

Notes:
- Jest emitted "A worker process has failed to exit gracefully" after the final suite — known leak-noise class (timing-heavy suites; the run itself passed with exit 0). Not a finding; consistent with the documented flake class that `-w 3` remedies.
- The 84 `todo` tests are the documented baseline, unchanged.
- Slowest suites: `TasksScreenFlagCard` 35s, `MapScreen.deeplink` 9s — consistent with the known contention profile.

## What the automated line actually covers (the law: automation is the start line, never the verdict)

- **There is no axe here (RN app) and no a11y lint plugin**: `eslint.config.js` carries no `eslint-plugin-react-native-a11y` / `jsx-a11y` rules. The repo's real automated a11y floor is its **jest guard-suite family** (top-level: `dismissalStandard.guard` incl. escape-law assertion B2 + drawer-freeze H + guard J call-site census, `dynamicTypeGuard`, `terms.guard`, `privacy.guard`, `privacyLink.guard`, `reportControl.guard`, `webResilience`, plus per-component a11y guards counted in later lenses). These are stronger than lint rules — they pin behavior, not syntax — but they only cover what past findings taught them.
- **Finding L1-1 (Low, process):** no static a11y lint rule runs on new code; a newly added `Pressable` with no role/label compiles, lints, and passes jest unless a guard already fences that surface. `eslint-plugin-react-native-a11y` (or a small custom rule) would be a cheap standing floor for the classes guards don't fence. Evidence: `eslint.config.js` (no a11y plugin), programmatic.
- Arbiter (contrast) proof-set re-runs are counted under Lens 4, not here.

**FINISHED** — 1 finding (L1-1 Low). The 79 remaining lint warnings are the known carried set (console/any/exhaustive-deps in 4 files) — not a11y-relevant.
