# Project Manager Briefing — 2026-06-01
**Window covered:** 2026-05-31 → 2026-06-01 (since last PM briefing: `cycle-2026-05-31-morgan-main-briefing.md`)
**Prepared by:** Morgan

---

## Decisions needed from you

*10 total — ordered by urgency. AccessMap items 1–7, Portfolio items 8–10.*

---

### 🔴 ACCESSMAP — CRITICAL-1: Apply 3 Supabase migrations (Phase 5 features broken in production)
**What:** Steve (Phase 5 QA Sweep, 2026-06-01) confirmed that two Phase 5 features are **completely non-functional in production** until you apply migrations:
- **Guest browse shows a blank map** — the anon SELECT policy exists only as a file on disk (`2026-05-29_anon_flags_select.sql`), not in the live DB.
- **Anonymous flag reporting returns a 403 error** — the anon INSERT policy (`2026-05-30_anon_flag_reporting_photo_fix.sql`) is also only on disk.
- A prerequisite migration (`2026-05-29_account_deletion_cascade.sql`) must go first to make `flags.user_id` nullable.

**Apply in this exact order in the Supabase dashboard SQL editor:**
1. `supabase/migrations/2026-05-29_account_deletion_cascade.sql`
2. `supabase/migrations/2026-05-29_anon_flags_select.sql`
3. `supabase/migrations/2026-05-30_anon_flag_reporting_photo_fix.sql`

**Risk if deferred:** Phase 5's marquee features (guest browse, anon reporting) are advertised in release notes but produce blank maps / silent 403s for real users on TestFlight.

---

### 🔴 ACCESSMAP — CRITICAL-2: Approve EAS rebuild
**What:** Build 13 (3a42b491) is stale — it compiled with missing Supabase environment variables. Production env has since been fixed. A fresh build is needed before any TestFlight submission is meaningful.
**Action:** Say "yes, rebuild" → team triggers `eas build --platform ios --profile testflight` (~35–45 min of EAS cloud build time).
**Risk if deferred:** Any TestFlight distribution uses the stale binary that crashes on Supabase calls.

---

### 🔴 ACCESSMAP — CRITICAL-3: Complete TestFlight / App Store Connect checklist (Sky must do manually)
**What:** Even after a fresh build, `eas submit` is a Sky-manual step. Three checklist items are outstanding before submission:
- `app.json description` field is currently `null` (Apple requires it).
- App Store review notes need to be written (test account credentials + location / photo policy statement).
- `net.http_post` Supabase extension must be enabled before production build so push notifications work (`CREATE EXTENSION IF NOT EXISTS pg_net;` in SQL editor).

**References:** `docs/APP_STORE_LISTING.md`, `RELEASE_PLAYBOOK.md`, Phase 6 strategy Item 1.

---

### ✅ ACCESSMAP — Merge `feat/phase5-qa-sweep` (Gary + Peter + Steve sweep, all green)
**Branch:** `feat/phase5-qa-sweep` — 1 commit ahead of main (`b227172`).
**What it delivers:** Fixes 2 critical test failures (Unicode curly-quote parse errors in OnboardingCards.tsx, broken `font.family` mock in ReportFlagModal.test.tsx). Result: 94/94 suites pass, 1,530 tests, `tsc --noEmit` clean.
**Steve's 2 CRITICAL findings** are both DB-only — handled by the migration decisions above (Decision 1). No app code risk.
**Peter's MEDIUM finding** (conditional `location` dep in `filteredFlags` useMemo) is propose-only and does not block the merge. Approve or defer the fix separately.
**Risk:** Very low. Purely additive fixes. Fully reversible.

---

### ✅ ACCESSMAP — Merge `a11y/phase5-deep-2026-05-31` (Alex approved, no gate needed)
**Branch:** ~6 commits ahead of main. Alex approved. Must merge **before** Decision 6.
**What it delivers:** 6 WCAG 4.1.2 fixes across trust-score UI (tier progress bars, point history list, leaderboard); Dani visual polish; warm UX copy for tiers; test coverage for `getNextTierProgress()`.
**Risk:** Low. Alex sign-off is in place. No DB changes.

---

### ✅ ACCESSMAP — Merge `a11y/phase5-anon-banner-2026-05-31` (after Decision 5)
**Branch:** 2 commits ahead of main (`fc94032`, `7e56a50`). Alex approved.
**What it delivers:** WCAG 4.1.2 fix exposing the Sign In link to VoiceOver in the anon reporting banner; Phase 5 deep audit docs.
**Dependency:** Merge Decision 5 first (branched from main, clean base needed).
**Risk:** Very low.

---

### ⏳ ACCESSMAP — Dispatch Gary: QA gate on `feat/phase5-trust-score` and `feat/phase5-anon-reporting`
**What:** Two branches are blocked on Gary's test suite before they can merge:
- `feat/phase5-trust-score` (5 commits: a11y fixes, tests, polish, copy, Alex audit) — needs Gary gate + Jordan Condition 1 (RLS migration `fa7bad7` on the branch) verified as a standalone migration.
- `feat/phase5-anon-reporting` (at least 1 Shamus commit + Dani design compile `73638ed`) — no Gary coverage report filed yet.
**Action:** Dispatch Gary to run test suites against both branches concurrently. On PASS for trust-score, verify Jordan Condition 1 → merge. On PASS for anon-reporting → merge.
**Note from prior briefing (verified):** A background agent previously reported `feat/phase5-trust-score` as merged to main. Git log confirms this is FALSE — the branch has 5 commits not on main. Do not treat it as done.

---

### ⚠️ PORTFOLIO — Fix `.cin-line-N` class mismatch before merging `feat/phase5-cinematic-v2`
**What:** Peter (2026-06-01 perf pass) flagged that mobile CSS targets `.cin-line-1/2/3` classes for the staggered title animation, but `CinematicIntro.tsx` renders `<p className="cinematic-title-wordmark">` and `<p className="cinematic-title-sub">` — the `.cin-line-N` classes don't exist in JSX.
**Effect:** Mobile title lines render at `opacity: 1` immediately (no stagger) on all mobile devices, silently.
**Fix:** Will or Shamus adds `cin-line-1/2/3` to the `titleContent` paragraphs, OR reverts the mobile CSS to target the existing class names. Peter's `will-change` additions and Will's desktop stagger are both correct and can merge once this is resolved.
**Risk if merged as-is:** Live site (skypistudio.com) ships broken mobile title animation.

---

### ⚠️ PORTFOLIO — Address aging unmerged branches: `feat/phase4-security-review` + `feat/phase4-a11y-perf-qa`
**What:** Both branches have been unmerged since 2026-05-29 (4 days). Neither has a recent report explaining why.
**Action needed:** Decide — merge, close, or document why they're on hold. The security review branch in particular should not sit indefinitely.
**Risk if ignored:** Security and a11y work ages poorly. If `main` has moved, merge conflicts will grow.

---

### 🐛 PORTFOLIO — P0 live-site bugs (skypistudio.com, currently affecting production)
**Source:** FEATURES.md audit (Opus 4.8 overnight, 2026-05-29). Still unactioned as of today.
**Items confirmed outstanding:**
- `ProjectCard` uses raw `<a>` → internal links 404 under the production `/portfolio` basePath. Fix: use `next/link`.
- `metadataBase` points at the wrong GitHub Pages domain → broken OG/canonical tags on every page.
- Two GH Pages deploy workflows both trigger on push to `main` — one is redundant, causes double-deploys.

**Recommended owner:** Shamus or Rory (one focused session).
**Risk:** These are live on skypistudio.com right now and affect recruiters/hiring managers who visit the portfolio.

---

## Status by project

### AccessMap

**What shipped (merged to main since 2026-05-31):**
- Brand app icon + version bump to 3.0.0 (`430d5a7`)
- Phase 5 TestFlight release notes added (`71f6da2`)
- Filter row `paddingTop` fix — pill overlap resolved (`22672d6`)
- `OnboardingModal` removed; `AppText` rolled out to all main screens (`7d8dd8e`)
- Privacy policy draft + EAS CI hardening merged from `jordan/privacy-policy-gaps-2026-05-29` (`802e338`)
- Multi-photo support + VoiceOver a11y fix merged (`e0ee0e1`)
- iOS AppDelegate fix + CHANGELOG — `release/auto-2026-05-30` (`623a648`)
- `RELEASE_PLAYBOOK.md` added — definitive TestFlight build + submit guide (`ec86d27`)
- Dani Wave 6 visual polish pass 2 — `design/wave6-polish-pass2` (`47f3b57`)
- Design system phases 1–4 all merged — tokens, primitives, screens, fonts
- Gary coverage: 94 suites, 1,530 tests green (`bb74454`)

**What's open (unmerged, pending your action):**
- `feat/phase5-qa-sweep` — ready to merge (Decision 4)
- `a11y/phase5-deep-2026-05-31` — ready to merge (Decision 5)
- `a11y/phase5-anon-banner-2026-05-31` — ready after Decision 5 (Decision 6)
- `feat/phase5-trust-score` — needs Gary gate (Decision 7)
- `feat/phase5-anon-reporting` — needs Gary gate (Decision 7)
- `perf/auto-2026-05-31` — Peter's performance branch, unmerged (no report read this cycle)
- `privacy/auto-2026-05-30` — privacy branch, unmerged (no report read this cycle)
- `eas-build-fix` — unmerged (no report read this cycle)
- `feat/riley-wave-b-2026-05-30`, `feat/riley-f8-offline-queue-2026-05-30`, `feat/riley-f9-severity-guidance-2026-05-30`, `a11y/riley-f6-bearing-2026-05-30` — Riley Wave B features, unmerged (no report read this cycle)
- `feat/phase5-copy-sweep`, `feat/phase5-creative-sweep` — unmerged

**What's proposed (not yet in code):**
- 3 Supabase migrations (Decisions 1) — on disk, not applied
- Peter's `filteredFlags` conditional dep fix (Decision 4 sub-item)
- Gary's sign-in/sign-out smoke test (propose-only, low urgency)
- `getTier(null)` → profile-aware hook for FlagDetailModal (F10 Phase 2 scaffolding)
- Server-side IP throttle for anon rate limiting (AsyncStorage bypass known, Phase 2 hardening)
- Phase 6 Strategy: App Store submission (Item 1), Onboarding A/B (Item 2), push notification content strategy (Item 3) — all Sprint 4+

**Health and trajectory:** 🟡 **Pre-launch hold.** Code work is ahead of Sky's unblocking actions. The team has built more than the DB/EAS pipeline can currently absorb. TestFlight is stalled on EAS rebuild approval + 3 migration applies. Once those gates clear, Decisions 4–7 can land rapidly and the production build can go out. Phase 5 feature completeness is high — anon reporting, trust scores, onboarding, design system all committed or staged.

---

### Portfolio (skypistudio.com)

**What shipped (merged to main since 2026-05-31):**
- Cinematic desert scroll intro (Shamus) — starry night, SVG landscape, WA title card — `feat/phase5-cinematic-intro` (`5d65066`)
- Luxury copy pass (Will) — Wes Anderson voice, nav rename, hero headline, footer Okanagan Valley — `feat/phase4-copy-luxury` (`323cce8`)
- Phase 4 animations + email obfuscation — `feat/phase4-animations` (`44da818`)
- About page apostrophe fix — `dd2fae8`

**What's open (unmerged):**
- `feat/phase5-cinematic-v2` — Peter's `will-change` GPU acceleration + Will's per-line stagger (CURRENT branch). Ready after `.cin-line-N` fix (Decision 8).
- `feat/phase4-security-review` — aging (Decision 9)
- `feat/phase4-a11y-perf-qa` — aging (Decision 9)
- `feat/phase5-mobile-polish` — unmerged, no report read this cycle
- `feat/phase5-seo` — unmerged, no report read this cycle

**Note:** Two untracked files exist in `qa-reports/` on the current branch (`2026-05-31_Shamus_Phase5_CinematicIntro.md`, `2026-05-31_Will_LuxuryCopy.md`) — these reports will be lost unless committed or the branch is merged.

**What's proposed (not yet actioned):**
- P0 live-site bugs (Decision 10): `ProjectCard` raw `<a>`, `metadataBase` wrong domain, duplicate deploy workflow
- P1 bugs from FEATURES.md audit (next Shamus cycle): dead components, agent-count drift, future-dated blog post published
- P2 tech-debt: Tailwind shadow utilities, `AppMockup` duplicate keyframes, `cn.ts` drift

**Health and trajectory:** 🟡 **Phase 5 active.** The Wes Anderson / cinematic direction is landing well — main looks significantly more polished than a week ago. But the site is live and carrying 3 P0 bugs that affect real visitors. The `feat/phase5-cinematic-v2` merge will close one visual gap; the P0 bugs need a dedicated fix pass. Attention balance: this project gets less coverage than AccessMap; Phase 5 is giving it a meaningful push.

---

## What the team has been doing

**Steve (Safety & Robustness):** Phase 5 QA sweep on `feat/phase5-qa-sweep` (2026-06-01). Found 2 CRITICAL DB-level gaps (anon INSERT + anon SELECT policies not applied to live DB — Phase 5 features non-functional). 4 MEDIUM findings accepted/documented: AsyncStorage rate limit bypassable, reputation tier threshold client-side only, `getTier(null)` UX bug, reopen vote dedup client-side. Verified photo URL injection guard is effective.

**Gary (QA / Tests):** Phase 5 QA sweep (2026-06-01). Fixed 2 critical test failures: Unicode curly-quote parse errors crashing `tsc` (149 cascading errors), broken `font.family` in `ReportFlagModal.test.tsx` mock. Delivered: 94/94 suites passing, 1,530 tests, 0 TS errors. Audited critical-path coverage — all major flows covered except sign-in/sign-out (flagged as propose-only gap). 136 `it.todo()` stubs are normal, not failures.

**Peter (Performance):** Two passes on 2026-06-01. AccessMap: identified `filteredFlags` useMemo GPS re-computation (MEDIUM, propose-only). Portfolio: added 8 `will-change` hints to `globals.css` and `CinematicIntro.tsx`, lifting all scroll-animated elements to compositor layers. Expected to keep 60fps budget on mid-range mobile during the cinematic scroll. Flagged `.cin-line-N` class mismatch cross-domain (Decision 8).

**Alex (Accessibility & UX):** `a11y/phase5-deep-2026-05-31` (6 commits — WCAG 4.1.2 fixes, test coverage, Dani visual polish, copy) and `a11y/phase5-anon-banner-2026-05-31` (2 commits — VoiceOver sign-in link fix) both ready to merge.

**Shamus (Features):** Anonymous reporting UI shipped to `feat/phase5-anon-reporting` (anon banner, simplified form, gray pins, rate-limit alert). Trust score feature on `feat/phase5-trust-score` (5 commits). Portfolio: Phase 5 cinematic desert scroll scene merged to main.

**Will (UX copy, Portfolio):** Luxury copy pass merged (Phase 4). Phase 5 cinematic copy pass on `feat/phase5-cinematic-v2` — split `titleOp` into 3 independent per-line stagger transforms (desktop), per-line CSS animation-delay on mobile, scroll prompt + skip link refinement. Result: title reveal reads as stage direction, not animation.

---

## Cross-cutting insights

**1. Proposals are accumulating faster than they're being actioned — recurring pattern.** AccessMap has 30+ unmerged local branches. The bottleneck is Sky's DB and EAS actions (decisions 1–3), not the team's output. Once you clear the migrations and EAS rebuild, Decisions 4–6 can land in under an hour. This pattern was present in the prior briefing; it's structural, not a one-cycle anomaly.

**2. Feature completeness is high; infrastructure is the critical path.** Phase 5 features (anon reporting, trust scores, onboarding, design system) are all code-complete. The reason they're not live is missing migration applies and a stale EAS build — both Sky actions. The team cannot unblock this for you.

**3. Cross-role verification catch — trust score "merged" claim was false.** The prior briefing (2026-05-31) already flagged this, but worth re-emphasizing: a background agent reported `feat/phase5-trust-score` as merged to main. Git log verified this is false. The PM verification step caught a decision that would have been made on bad information. This is why verify-against-git is non-negotiable before reporting branch state.

**4. Portfolio P0 bugs are live and unactioned for 3 days.** The `ProjectCard` raw `<a>` and `metadataBase` issues were identified 2026-05-29. skypistudio.com is live. Hiring managers who click through to project pages hit 404s. This should move from backlog to the next available Shamus cycle.

**5. Riley Wave B features are accumulating.** Four Riley branches (`riley-f6`, `riley-f8`, `riley-f9`, `riley-wave-b`) are all unmerged. No reports were read this cycle — these are data-blind for this briefing. Recommend a dedicated review next cycle.

**6. No Access Map Summaries folder found.** The central summaries folder referenced in `team-and-artifacts.md` could not be located in any mounted directory. The `qa-reports/` directories in each repo are the de facto location. This briefing is saved to `AccessMap/qa-reports/` as the fallback. If the summaries folder exists elsewhere (e.g. iCloud, Google Drive), it should be connected so the PM can read prior reports.

---

## What each role recommends next

**Steve:** Apply the 3 migrations (Decisions 1). Phase 2 hardening for anon rate limiting (server-side IP throttle). Wire `user.points` from AuthContext into FlagDetailModal to fix the `getTier(null)` UX bug.

**Gary:** Dispatch Gary to QA gate `feat/phase5-trust-score` and `feat/phase5-anon-reporting` (Decision 7). Add sign-in/sign-out smoke tests in the next coverage cycle.

**Peter:** Approve or defer the `filteredFlags` conditional-dep fix (Decision 4 sub-item). Apply `will-change` fix then merge `feat/phase5-cinematic-v2` (Portfolio).

**Alex:** Merge Decisions 5 and 6 (no further gate needed on Alex's end). Phase 6 a11y pass planned.

**Shamus:** Fix `.cin-line-N` class mismatch in Portfolio (Decision 8). P0 Portfolio bugs (Decision 10). After AccessMap gates clear: `feat/phase5-trust-score` and `feat/phase5-anon-reporting` merge.

**Morgan's Phase 6 strategy (from `docs/PHASE6_STRATEGY.md`):** App Store submission is the Sprint 4 priority (#1). Onboarding A/B instrumentation (`onboarding_slide_viewed` event) should land with or before App Store submission. Push notification content strategy is Sprint 4–5.

---

## Learnings digest

From `LEARNINGS.md` (AccessMap) — standing items worth remembering at this stage:

- **Worktree isolation is mandatory for concurrent agents.** Two agents touching the same branch simultaneously have collided multiple times. `isolation: "worktree"` in every dispatch that touches the working directory.
- **Worktree node_modules must be symlinked** — `git worktree add` doesn't copy `node_modules`; new worktree needs `ln -s ~/AccessMap/node_modules /tmp/<worktree>/node_modules`.
- **Privacy-critical functions should be exported** so Gary can write direct unit tests rather than integration tests requiring full Supabase chain mocks.
- **Merge-on-done discipline** — integrate each branch into `main` as soon as it's finished and green. Never let branches stack.
- **Propose-only migrations pattern** — agents write the file, Sky applies. The file must be idempotent with a HOW TO APPLY block. Client code must degrade gracefully until applied.

From `Portfolio/docs/LEARNINGS.md`:

- `next/image` with `unoptimized: true` is mandatory for static export to GH Pages.
- `basePath` is only applied in production — gate on `NODE_ENV === 'production'`.
- `generateStaticParams` enumerates `[slug]` at build time from `content/deliverables.json`.
- `next lint` is deprecated in Next 16 — when the Next 16 bump lands, migrate to standalone ESLint CLI.
- 2 moderate `postcss` CVEs are accepted (build-time only, don't run at runtime on GH Pages).

---

## On Sky's question — "employee surveys"

Searched all files in both repositories. **No mention of "employee surveys" found anywhere.** The closest match is a 2026-05-27 planning note (`2026-05-27_Morgan_NewHireOnboarding.md`) listing "Design feature validation survey/interview questions" as a task for *user research* interviews (Wave 2–4 user research for AccessMap, not internal team/employee surveys). That task appears to have never been executed.

If "employee surveys" refers to a specific initiative you have in mind — e.g. gathering feedback from beta testers, from the agent team, or from real users — this would need to be created from scratch. There is no existing survey tooling, form, or database table in either project for this. Phase 6 Strategy Item 2 describes an A/B testing and Sentry instrumentation approach for onboarding — that is the closest thing to structured user feedback that's been planned.

---

## Data notes

- **Access Map Summaries folder not found.** The central summaries folder referenced in `team-and-artifacts.md` was not located in any connected directory. Briefing saved to `AccessMap/qa-reports/2026-06-01_Project_Manager_Report.md` as the confirmed fallback location.
- **Riley Wave B branches (4 branches, ~2026-05-30) — no reports read this cycle.** `feat/riley-wave-b-2026-05-30`, `feat/riley-f8-offline-queue-2026-05-30`, `feat/riley-f9-severity-guidance-2026-05-30`, `a11y/riley-f6-bearing-2026-05-30` are all unmerged. No associated reports were found and read. Their state is data-blind for this briefing.
- **`perf/auto-2026-05-31`, `privacy/auto-2026-05-30`, `eas-build-fix` — no reports read this cycle.** These branches are unmerged; their content is unknown to this briefing.
- **Portfolio branches `feat/phase5-mobile-polish` and `feat/phase5-seo`** — no associated reports read this cycle.
- **Previous PM briefing (2026-05-31) was `cycle-2026-05-31-morgan-main-briefing.md`** — found in `AccessMap/qa-reports/`. State-discrepancy flag from that briefing (trust-score branch falsely claimed merged) has been re-verified and confirmed accurate this cycle.
