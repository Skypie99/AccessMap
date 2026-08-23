# MORGAN — v4.1.1 EAS build readiness

2026-08-22 · AccessMap / Flagstone · branch `release/v4.1.1-2026-08-22`

Answers two questions Sky asked: **is everything merged and done from the waves
phase**, and **is this ready to build as 4.1.1**. Read-only on the audit; the
version bump is on a branch, not on `main`.

---

## 1. MERGE AUDIT — the short answer is YES for the waves and the phases

Verified with `git merge-base --is-ancestor` across **every** local branch (96 of
them), not from any report.

| Set | Status |
|---|---|
| Art-direction build phases `design/gsp-00` … `design/gsp-07` (all 8) | ✅ **all merged** |
| Sim-walk waves `fix/simwalk-w1` · `w2-high` · `w3-med` · `w3-followups` · `w4-low` (all 5) | ✅ **all merged** |
| `main` vs `origin/main` | ✅ **identical — `a1a94f6`, 0 ahead / 0 behind** |
| Working tree | ✅ clean (no modified tracked files) |

**Nothing from the waves phase or the art-direction series is outstanding.**

### The six branches that are NOT merged — and why five of them should stay that way

This is the part worth reading. "Unmerged" turned out to be the wrong frame for
most of them: several are **stale branches that would REGRESS `main` if merged.**

| Branch | Verdict |
|---|---|
| `security/reviewer-cred-purge` | ⚠️ **DO NOT MERGE AS-IS — it would ship false instructions to an App Store reviewer.** See §1a. Cherry-pick one commit instead. |
| `fix/tasksflagcard-date-flake` | ❌ **Stale — would REVERT art-direction Phase 2a.** `main`'s copy of that test was re-pinned 2026-08-21 for the new FlagCard contract; the branch still holds the old six-element Material Lab contract. Main is already time-stable. Delete. |
| `fix/fmt-xcode26-local-sim-2026-07-25` | ❌ **Stale by 1307 files / 270k deletions.** Its actual payload — `plugins/withFmtXcode26Fix.js` and the app.json plugin entry — is **already on `main`**. Merging would roll the repo back a month. Delete. |
| `fix/noscript-fallback` | 🔵 Web-only (`public/index.html`). Irrelevant to an iOS build. Merge whenever, no urgency. |
| `docs/presubmit-prompt` | 🔵 Docs only, 1 file. Optional. |
| `docs/ship-preflight-2026-08-17` | 🔵 Docs only, 1 file. Optional. |

### §1a — the security branch, in detail

`security/reviewer-cred-purge` contains one genuinely valuable thing and one
genuinely dangerous thing.

**Valuable — and missing from `main`:**
`src/__tests__/noCredentialsInTree.guard.test.ts` (347 lines) fails the build if a
password-shaped literal reappears next to reviewer-account language. `main` has
no such guard.

**Dangerous — it rewrites `docs/APP_STORE_REVIEWER_NOTES.md` with claims that are
false today:**

| The branch says | The truth |
|---|---|
| "5 pre-seeded accessibility flags in **downtown Vancouver**" | The data is in **Kelowna, BC**. There are **12** seeded flags. |
| "pan to **Vancouver** … to see the pre-seeded flags" | A reviewer who pans to Vancouver sees an **empty map** and may reject the app. |
| "a contributor profile with **25 points**" | The real account has **124 points** (SW-41, verified on device). |

It also **deletes** `main`'s correct paragraph telling the reviewer that reports
are concentrated around Kelowna, and the guidance that the map is browsable
without an account.

The branch's security purpose is **already achieved on `main`** — the notes
already read `[PROVIDED IN APP STORE CONNECT REVIEW NOTES]` for both credentials.
Only the guard is missing.

> **Recommendation:** cherry-pick `ae38d0a` (the guard test) onto a fresh branch
> and leave the doc commits behind.
> ```
> git cherry-pick ae38d0a
> ```
> **Do not** merge the branch.

---

## 2. WHAT CHANGED FOR 4.1.1

Branch `release/v4.1.1-2026-08-22`, off `main` `a1a94f6`.

| File | Change |
|---|---|
| `app.json` | `"version": "3.0.0"` → **`"4.1.1"`** |
| `package.json` | `"version": "3.0.0"` → **`"4.1.1"`** |
| `src/components/ChangelogModal.tsx` | new `v4.1.1` release entry prepended |

### What did NOT need touching, and why

- **`src/screens/AboutScreen.tsx`** — `APP_VERSION` reads
  `Constants.expoConfig?.version`, so the About badge follows `app.json`
  automatically. No edit, no second source of truth.
- **`ios/Flagstone.xcodeproj`** — `MARKETING_VERSION = 1.0` in the pbxproj is
  overwritten by Expo prebuild from `app.json`. Editing it by hand would be noise.
- **`ios.buildNumber` (still `"15"`)** — `eas.json` sets
  `appVersionSource: "remote"` with `autoIncrement` on both store profiles, so
  **EAS owns the build number** and the app.json value is inert for a testflight
  upload. `src/__tests__/appConfig.guard.test.ts:204` states this explicitly.
  Left alone deliberately.
- **`android.versionCode: 2`** — no Android build in scope.

> ⚠️ **A trap worth recording:** `package.json` also contains
> `"expo-status-bar": "~3.0.0"`. A blind find-and-replace on `3.0.0` would have
> silently changed a **dependency version**. Both bumps were done as targeted
> single replacements and the dependency was verified untouched.

### ⚠️ The changelog entry is DRAFTED, NOT RATIFIED

`ChangelogModal` is user-facing copy, and the project's rule is that words are
Sky's. The new entry is drafted from what actually shipped in phases 00–07 and
the sim-walk waves, and it is marked `SKY-EDITABLE` in a comment above itself.

**Two things need your hand before submission:**
1. Read the ten bullets and cut or rewrite any that overclaim.
2. Set `date:` — it is currently `'2026-08-22'`, which is today, not necessarily
   the public release date.

Leaving it unedited is survivable — every bullet describes something that really
shipped — but the version badge would then say 4.1.1 above a changelog written by
an agent.

---

## 3. GATE — on the branch

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ **0 errors** (now reports `accessmap@4.1.1`) |
| `npm run lint` | ✅ **0 errors**, 82 warnings — the standing baseline, unchanged |
| `npx jest --ci -w 3` | ✅ **241 suites · 3600 passed · 32 todo · 0 failed** (44s) |

Identical to the baseline recorded on merged `main` after phase 07. The version
bump and the changelog entry broke nothing — including
`src/__tests__/appConfig.guard.test.ts`, which asserts `app.version` matches
`^\d+\.\d+\.\d+$`. `4.1.1` satisfies it.

---

## 4. THE BUILD

Logged in as `skypie911` / skylerhalisky@gmail.com. EAS project
`a7149107-fb9b-4853-a053-648320c05cb6`.

```bash
cd ~/AccessMap && npx eas build --platform ios --profile testflight
```

`testflight` = store distribution, Release config, `APP_ENV=production`.
Not `preview` — that is an internal link, not TestFlight.

**Paid build. Sky fires it. No agent runs it.**

### ⚠️ App Store Connect will need a matching version record

The binary will carry `CFBundleShortVersionString = 4.1.1`. If the App Store
Connect app record currently has a **3.0.0** version sitting in *Prepare for
Submission*, a 4.1.1 build will not attach to it. Either create a new **4.1.1**
version in App Store Connect first, or change that record's version number.
This is a website step, not a repo step — flagging it so it does not surprise you
after a 20-minute build.

---

## 5. DECISIONS FOR SKY

1. **Merge `release/v4.1.1-2026-08-22`?** It is one fast-forward off `main`.
   Nothing else can go into the build until it lands.
2. **Ratify or rewrite the v4.1.1 changelog bullets**, and set the release date.
3. **Cherry-pick the credential guard** (`ae38d0a`) — yes or no. Recommended yes.
   Merging its branch — recommended **no**, see §1a.
4. **Delete the two stale branches?** `fix/tasksflagcard-date-flake` and
   `fix/fmt-xcode26-local-sim-2026-07-25` are traps for whoever tidies up next.
5. **The reviewer notes' Kelowna paragraph is currently correct — keep it.** Do
   not let any tidy-up reintroduce the Vancouver text.
