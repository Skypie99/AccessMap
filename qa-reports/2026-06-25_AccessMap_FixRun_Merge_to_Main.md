# AccessMap — QA Fix-Run (Prompts 1–5) Merged to `main` + Demo-Build Handoff

_2026-06-25 · Local merge only · Sky-authorized the merge in-session · No push, no deploy, no paid build_

---

## TL;DR
The hardening era is closed out. `fix/qa-sweep` (22 commits) fast-forwarded cleanly onto `main`, which is now **verified green and demo-ready** at `8a7cce5`. The −45% bundle win is **confirmed by a real web export** (main chunk 2.28 MB). The backend fence held (zero `supabase/`/DB/migration/RLS/EXIF). `fix/qa-sweep` is preserved as a safety anchor. **Push, deploy, and the paid EAS build are yours to fire** — the exact commands are at the bottom.

---

## Merge result
| | |
|---|---|
| Strategy | **Fast-forward** (`Updating 45bca1a..8a7cce5`, no merge commit) |
| `main` before | `45bca1a` |
| **`main` now** | **`8a7cce5`** (HEAD == main) |
| `fix/qa-sweep` | preserved at `8a7cce5` (kept as anchor — not deleted) |
| `origin/main` | unchanged at `45bca1a` → local main is **22 commits ahead, NOT pushed** (your call) |

## Pre-flight (before merge)
- Branch was `fix/qa-sweep`, no uncommitted **tracked** changes (code tree clean). Untracked files were `qa-reports/*.md` docs + a `supabase/.temp/` CLI cache only — not code, didn't affect the FF.
- `fix/qa-sweep..main` empty → main had not diverged → clean FF possible.
- Gate on `fix/qa-sweep`: typecheck **0**, jest **1722 passed / 0 failed** (107/107 suites, exit 0), lint **0 errors** (87 pre-existing warnings).

## What landed (22 commits, +983 / −316 across 42 files)
- **FIXED:** drawer open + nav-retry, points-truth UI constant, GPS/search timeouts, web Report FAB tappable, Profile/AddressSearch/reconcile error+retry, deep-link race, PhotoGallery rotation, confirm-before-Reject, ~13 minor cleanups.
- **HARDENED:** screen-reader focus-on-open, GPS 15s timeout, Nominatim 8s timeout + retryable errors, reduce-motion swipe, permission `.catch`.
- **PERF:** React.lazy code-split (Settings/Admin/Report/FlagDetail now separate chunks) + lucide deep-imports → **main chunk 4.15 MB → 2.28 MB (−45%)**.

### 🔒 Fence — honest version
- **Backend fence FULLY held:** `supabase/` = 0 changes; migrations / `.sql` / RLS / policies = 0; EXIF = 0.
- **Three privacy-adjacent CLIENT files were touched** (so the "no auth changes" claim isn't literally true — flagging precisely):
  - `src/lib/auth.tsx` — `useMemo` wrap of the context value. **No** auth/session/token/permission behavior change (render-perf only).
  - `src/lib/location.ts` — 15s timeout race on GPS. Same accuracy/data/permissions.
  - `src/lib/geocode.ts` — 8s fetch timeout + retryable-error variant. Same Nominatim endpoints, **no new data sent**.
  - `src/lib/points.ts` — adds a `POINTS` constant **mirroring** the live DB trigger (10/3/15/7); no DB change.

## Post-merge verification (on `main`)
| Check | Result |
|---|---|
| `npm run typecheck` | **0 errors** ✓ |
| `npm test` | **1722 passed / 0 failed**, 107/107 suites, exit 0 ✓ |
| `npm run lint` | **0 errors**, 87 warnings, exit 0 ✓ |
| `npx expo export --platform web --clear` | **clean, exit 0**, 1202 modules, no errors ✓ |
| Main chunk (`AppEntry-….js`) | **2,281,757 bytes = 2.28 MB** ✓ |
| Total JS / total dist | 2.3 MB / 3.3 MB |
| Code-split chunks | SettingsScreen 29 kB · AdminScreen 8.9 kB · FlagDetailModal 48 kB · ReportFlagModal 27 kB (separate on-demand) ✓ |
| Tree | `dist/` gitignored, **0 tracked changes** on main ✓ |

## Build readiness (for your demo build)
- `eas` CLI present (**eas-cli@20.3.0**, satisfies eas.json `>=10.0.0`), logged in as **skypie911 / skylerhalisky@gmail.com**.
- App config: `ios.bundleIdentifier: com.accessmap.app`, `version: 3.0.0`, EAS project linked (`a7149107-…`). Prior builds exist (remote buildNumber 17) → build path proven.
- `eas.json` `testflight` profile (store dist, Release, autoIncrement) + `submit.production.ios` (appleId/ascAppId `6774709116`/teamId) valid.

### Notes / non-blockers (not fixed — by design)
1. **EAS production env vars** — I can't verify these (needs your login). **Check before building** or the app launches blank (Step 0 below). This is the one true pre-build gate.
2. **Android submit** — `serviceAccountKeyPath` is a TODO placeholder in `eas.json`. iOS-only; not a blocker for the iOS build. `eas submit --platform android` would fail until set.
3. **Avoid `npm run deploy:testflight`** — its submit step uses `--profile preview`, but the only submit profile defined is `production`. Use the explicit commands below instead.
4. **Pre-public-review carry-overs (not build blockers):** rotate the `reviewer@accessmap.com` password (old value in git history); reconcile points-doc drift in `schema.sql`/`CLAUDE.md` (5/2/10/5) to the live 10/3/15/7 — note the UI's new `points.ts` already uses the correct 10/3/15/7.

---

## ▶️ Your commands (copy/paste — these are yours to fire, not the agent's)

**Step 0 — confirm EAS prod env vars exist (must show both Supabase vars):**
```bash
cd ~/AccessMap && npx eas-cli env:list --environment production
```

**Demo build → TestFlight (~15–20 min on EAS servers):**
```bash
cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive
```

**Submit the finished build to App Store Connect / TestFlight (separate, your call):**
```bash
cd ~/AccessMap && npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

**Lighter alternative — internal demo build (ad-hoc/internal distribution, no App Store Connect submit):**
```bash
cd ~/AccessMap && npx eas-cli build --platform ios --profile preview --non-interactive
```

> Pushing `main` to `origin` and any web-demo deploy are **also your call** — both may trigger the public demo / cost. Nothing has been pushed or deployed.

## Rollback (if ever needed)
`main` was a clean fast-forward, so to undo the entire fix-run locally:
```bash
git -C ~/AccessMap switch main && git -C ~/AccessMap reset --hard 45bca1a
```
(`fix/qa-sweep` still points at `8a7cce5`, so nothing is lost.)
