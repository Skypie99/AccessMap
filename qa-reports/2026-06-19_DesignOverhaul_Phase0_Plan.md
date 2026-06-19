# AccessMap — Presentation / UX / A11y Overhaul (Phase 0 critique + phased plan)

> **Status:** Phase 0 complete (read-only). Awaiting Sky's approval of the plan, then phase-by-phase execution.
> **Scope:** PRESENTATION · LAYOUT · VISUAL MATERIAL · MOTION · COPY · COMPONENT STRUCTURE (presentation side) · ACCESSIBILITY.
> **Out of scope (HARD FENCE):** all data / auth / privacy / security / EXIF / RLS / RPC / migration / realtime / env logic — read-only, never touched.
> **Merge model:** AccessMap is NOT Art. 17 → **Sky merges every phase.** One branch, one Sky-gated PR per phase.

---

## Context — why this work

AccessMap is Sky's flagship credibility artifact: a real production-stack mobile app (Expo SDK 54 / RN 0.81 / Supabase / TS-strict, ~1,740 tests) for crowdsourced accessibility-barrier reporting. It serves her near-term footing goal — an Implementation / Technical-Product role in 1–2 months. The bar: the live demo's first 10 seconds, the core map, the report-a-flag flow, and the verify/resolve moment should feel like a *considered, expensive product* a hiring manager trusts — while the senior-grade privacy engineering underneath (itself a top selling point) stays **completely intact and demonstrable.**

**The central finding from a 9-lens read-only recon (Opus 4.8, max effort) + self-verified synthesis:** AccessMap is *already good* on the presentation side — a mature 434-line token system, a coherent "Wayfinder Blue + Civic Gold" brand, ~1,380 a11y attributes, Dynamic Type respected (`allowFontScaling=false` appears **zero** times), color-never-alone severity/status, and the attribution splash + OG card already merged. This is **not a rescue. It is "make the existing depth legible"**: surface the invisible privacy craft as a trust signal, finish the half-applied systems (dark-mode depth, token enforcement, the unused `Sheet` primitive), and give the three hero moments their felt payoff — all on top of an untouched fence.

---

## 🔒 THE HARD FENCE — canonical OFF-LIMITS list (never edit, never apply)

Every phase's diff must show **ZERO** changes to these. If a UI change appears to need a fenced change, **STOP and FLAG for Sky** — never reach in.

**Data layer:** `src/lib/flags.ts` *(data/EXIF/RPC engine portions — see seam note)*, `photos.ts`, `users.ts`, `account.ts`, `admin.ts`, `comments.ts`, `feedbackStore.ts`, `statusHistory.ts`, `userReportStats.ts`, `points.ts`, `pointEvents.ts`, `dataExport.ts`, `flagsStore.tsx` *(its returned data/state shape is a contract — consume, don't rewire)*, `src/types/database.ts` *(Gotcha #1: `type` not `interface` — load-bearing for postgrest)`.
**Auth / session:** `src/lib/supabase.ts`, `auth.tsx`, **`App.tsx` `Gate()` (L106–149 — the web/guest branch L143–146 is the demo's biggest strength; protect it)**, `SignInScreen.tsx` *auth logic*, `featureFlags.ts` (`GUEST_SIGNIN_ENABLED` stays false).
**EXIF / privacy:** the `flags.ts` strip engine — `stripExifNative` (L59), `stripExifWeb` (L147), `verifyExifStripped` (L278), `jpegHasMetadataSegment` (L311), `pngHasExifChunk` (L343), `detectMimeFromBytes` (L377), `uploadStrippedImage` (L445), `uploadFlagPhoto` + the guard consts `MAX_PHOTO_BYTES`/`ALLOWED_PHOTO_EXTS`/`ALLOWED_PHOTO_SCHEMES`/`FLAG_PHOTOS_BUCKET`; `users.ts` `uploadAvatar`. **No pre-resize before the strip, ever.** Locked by 20+ regression tests in `flags.test.ts`.
**RLS / RPC / migrations / triggers:** `supabase/schema.sql` (points trigger `handle_flag_status_change`, all SECURITY-DEFINER RPCs, column-locked non-owner status policy, storage path policy) + **all `supabase/migrations/**`** (files-with-rollback — never applied) + the `*.deprecated-option1-do-not-apply` files.
**Realtime / push / abuse / privacy-analytics:** `flagsRealtime.ts`, `realtimeLog.ts`, `pushNotifications.ts` (no-log contract), `anonRateLimit.ts`, `analytics.ts` `stripPII`, `location.ts` (permission-prompt timing), `heatmap.ts` `DEFAULT_K_FLOOR` (k≥3 aggregation).
**Edge fns / env / tooling:** all 3 `supabase/functions/*`, `.env*`, `apply-migrations.js`, `supabase/.temp/`.

### The thin seam — TWO files only (editable shell, FROZEN call)
- `src/screens/ReportFlagModal.tsx` (~L347) — `uploadFlagPhoto(user.id, uri)` + its cleanup. The **whole form UI is redesign-able**; the upload call, arg order, and fail-on-strip-error contract stay byte-identical.
- `src/screens/ProfileScreen.tsx` (~L521) — `uploadAvatar`. Same rule.

**Mixed-file warning:** the fence runs *through* `flags.ts` by symbol. Its `CATEGORY_LABELS` / `CATEGORY_DESCRIPTIONS` / `CATEGORY_ICONS` / `SEVERITY_LABELS` / `SEVERITY_DESCRIPTIONS` / `severityColor` dictionaries **ARE editable** (copy/icon/label polish); the `supabase.*` / strip / upload code in the same file is **not**.

---

## Coverage confidence (be honest)

- **High — act directly:** the fence (symbol+line, EXIF engine fully mapped), the design system (`theme.ts` / `ThemeContext` / `DESIGN.md` / all `ui/*`, raw-literal counts grep-quantified), the demo shell (`public/index.html` / `dist` / `PlatformMap.web.tsx` / `App.tsx`), centralized a11y patterns, the (bounded) motion surface (confirmed **no** reanimated / LayoutAnimation), the verify/resolve files, git/sequencing.
- **Medium — RE-READ the region before editing:** the five mega-screens were region-sampled + grepped, not read end-to-end — `MapScreen` (2,587 L), `ProfileScreen` (2,461 L), `FlagDetailModal` (~1,957 L), `TasksScreen` (1,929 L), `ReportFlagModal` (1,261 L). These were *over-graded once before* — re-verify each claim at execution.
- **Low — NEEDS-SKY-DEVICE:** on-device VoiceOver/TalkBack, max-Dynamic-Type truncation, Reduce-Motion snapping, native pin rendering, web bundle perf (3.96 MB inferred, not measured — bundle reduction is **out of scope**).

### Ground-truth corrections the synthesis caught (so we don't act on stale claims)
- **`Pill` / `PointsChip` were deleted** (`fbbdc44`) but DESIGN.md / CLAUDE.md still reference them → the fix is **doc-reconcile, not rebuild**.
- **Native map pin may already be rich** — `PlatformMap.tsx` wraps `<Marker>` with custom children (L130–184); confirm on a build before scoping any "unify pins" work.
- **Points strings ARE stale** (verified by me): `TasksScreen.tsx:542/549` show `+5/+2` and `+10/+5`; the live trigger (`schema.sql:132–139`) awards `+10/+3` and `+15/+7`; `schema.sql:112` = `DECISION PENDING`. → resolved by Sky below.

---

## The experience critique (named shortfalls, by surface)

- **Demo first-10s** — three stacked blank gates (`#fff` ignores dark mode) → text-only splash (the brand pin SVG at `assets/brand/logo-mark.svg` sits **unused**) → white→Dark-Matter-map color flip → no progress cue during the 3.96 MB parse → web guest lands on hardcoded SF (`MapScreen` L109–114) → no web manifest. *OG card is strong & truthful — leave it.*
- **Core map** — the action bar reads as a dev toolbar; overlay banners can stack; dead-code label `{heatmapEnabled ? 'Heat map' : 'Heat map'}` (`MapScreen:1551`, verified); dangling-pronoun empty state ("Try broadening them", read to SR); native callout is raw `<Text>` (no brand font/badges).
- **Report-a-flag** — **the privacy moment is invisible** (bare "Photo (optional)"; protection only appears on *failure*) — highest-leverage gap; ~8-section single scroll with optional metadata at equal weight; severity = five plain circles with no escalation; the anon "Sign in to attach a photo" reads like a paywall.
- **Verify/resolve** — triage buttons inert on tap (no scale/haptic, not the `Button` primitive); FlashBanner hard-pops with zero motion; **points strings stale** (correctness); before/after payoff is visually thin; modal closes before any celebration.
- **Design system** — **dark-mode elevation collapses** (`shadowColor:'#0F1B2D'` ×3 + cards darker than their wash); `Sheet` primitive imported by **zero** files (22 hand-rolled modals — opt-in, not a defect); ~165 hex / ~80 fontSize / ~55 letterSpacing token-bypass sites; OnboardingCards off-palette rainbow; SignInScreen the biggest token violator; **severity labels inconsistent** (sev 2 "Low" on badge / "Mild" in form; theme says "Minor/Low/Moderate/High/Critical").
- **Motion** — 3 inconsistent press tiers; onboarding CTAs opacity-only amid animated dots; `RealtimePulse` is the good reduced-motion reference.
- **A11y (flagship-grade — protect, then finish)** — `textSubtle` used on a few <18pt texts (e.g. `TasksScreen:1674` `cardHint` 11pt italic, verified); **`setAccessibilityFocus` = 0 repo-wide** (no SR focus move on modal open); ~16 modals ungated for Reduce Motion; Tasks badge count not spoken; web has no focus rings.

---

## Fable-worthy surfaces (felt target · checkable AC · the presentation↔fence line)

**Hero 1 — Demo first 10s** · *Feels like a considered, expensive product Sky made.*
AC: brand logo mark in the **first** painted frame; no white→black flash (`prefers-color-scheme` block in the static splash); a reduced-motion-safe progress cue; the **built** `dist` keeps author/OG/canonical/backlink; clean `expo export`.
**Line:** edits live in `public/index.html` + a static manifest. Fence begins at `Gate()` routing and at *when* geolocation fires.

**Hero 2 — Report privacy moment** · *Placing a flag feels safe and dignified.* (Sky: **calm, clearly visible.**)
AC: a calm inline affordance near the photo control ("Location is removed from photos automatically") shown **before** any failure; a brief post-strip "GPS removed" confirmation sourced from the *existing* success path; in-flow success (no silent close); `uploadFlagPhoto` args + cleanup unchanged; **zero diff to strip functions; EXIF tests pass.**
**Line:** JSX/copy *around* the upload call. Fence begins at the call.

**Hero 3 — Verify/resolve** · *A small civic win, earned where you tapped.*
AC: press-scale + success haptic on the triage action; an animated, AA-legible reward (still announced under reduced motion); **the shown number == the awarded number (10/3/15/7)**; the reward registers in-context (modal doesn't vanish first); `updateFlagStatus` + the points trigger **zero diff.**
**Line:** press-feel / animation / copy. Fence begins at `updateFlagStatus` + the trigger.

---

## Sky's locked decisions (2026-06-19)

1. **Points display →** *Match UI to live (10/3/15/7).* Presentation-only string fix in `TasksScreen` (and any other display site) so the celebration reflects the live trigger. Trigger stays fenced.
2. **Privacy trust-signal →** *Calm, clearly visible.* Inline line + post-strip confirmation; no loud shield/badge.
3. **Device verification →** *Fold into the queued EXIF re-verify TestFlight build.* I self-verify every phase in the web/sim build and flag all NEEDS-SKY-DEVICE items; they ride the existing TestFlight pass — no separate per-phase device sessions.
4. **ResourcesScreen →** *Seed a small curated list* of real accessibility resources (static presentation content) in Phase 3.

**Carried fence-safe defaults (Sky can override at phase time):** web-guest geolocation = add a "Use my location" affordance only, **no** auto-prompt (auto-prompt brushes the location fence); anonymous photo stays **gated** with reframed copy (enabling anon photos = a separate Sky data-decision, out of scope); OnboardingModal vs OnboardingCards = keep both, harmonize their visual style (no flow removal).

---

## The phased plan

Each phase forks from **`main` (current `4ebd824`)**, is one Sky-gated PR, and passes the gate: **`npm run typecheck` (0) · `npm test` · `npm run lint` (0 errors, warnings ≤ current).** ESLint stays pinned `^9`. Order: **Phase 2 before 3–6** (every later phase consumes its tokens); **4 after 3** (both edit `FlagDetailModal` + `TasksScreen`); Phase 1 is parallel-safe with 2 if it avoids token churn. The ~16-modal reduced-motion sweep is assigned **once**, to Phase 6.

| # | Branch | Goal | Sky-time | Device (folds into TestFlight) |
|---|---|---|---|---|
| 1 | `overhaul/phase1-demo-firstimpression` | Finish the branded cold open on top of merged attribution | ~20–30m | iPhone Safari cold-load |
| 2 | `overhaul/phase2-design-system` | Token enforcement + dark-mode depth + severity-label unification + doc-reconcile + `Sheet` adoption (last) | ~45–60m | dark elevation, glass fallbacks |
| 3 | `overhaul/phase3-map-report-ux` | Visible privacy trust + report success + dense-screen layout/Dynamic-Type fixes + Resources seed | ~45–60m | report flow, native pin, max type |
| 4 | `overhaul/phase4-verify-resolve-payoff` | Animated, in-context, correctly-numbered reward + celebratory before/after | ~30–40m | haptic + SR-announce race |
| 5 | `overhaul/phase5-motion-feel` | One crafted press language (FAB, onboarding CTAs, chips) | ~25–35m | all haptics / press-feel |
| 6 | `overhaul/phase6-a11y-completion` | Close every a11y gap + the consolidated device pass | ~30m + device | the big VoiceOver/TalkBack pass |

### Phase 1 — Demo first-impression *(highest external leverage; partly done)*
**Already merged (build on, never revert):** instant-paint text splash, OG/Twitter meta, `og-image.png`, byline backlink.
**Goal / scope (presentation only):** inline the unused brand pin SVG into `#am-splash`; add a `prefers-color-scheme` block so the splash harmonizes with dark mode and kills the white→Dark-Matter flip; a reduced-motion-safe progress cue inside the static splash; a static web `manifest.json`; a fence-safe "Use my location" affordance for the web guest (no auto-prompt) — or, if it brushes `location.ts`, FLAG instead. Files: `public/index.html`, a new static manifest, the `MapScreen` web-guest initial-region presentation (read first; the SF hardcode at L109–114 — confirm it's presentation, not a fenced default).
**Must NOT touch:** `App.tsx` `Gate()` routing, `location.ts` prompt timing, the OG/byline already shipped.
**AC:** logo mark in the first frame; no white→black flash; progress cue present + RM-safe; **built `dist/index.html`** retains author/OG/canonical/backlink after a clean `expo export`.

### Phase 2 — Design-system enforcement & depth *(unblocks 3–6)*
**Goal / scope:** fix **dark-mode elevation** (theme the shadow tokens / restore the lift order so cards read above their wash — `ThemeContext` shadow + surface tokens only, preserving the documented 4-tier language); **unify severity labels** to one source (`theme.ts` ramp) across badge + form + `flags.ts` dictionaries (editable exports); **doc-reconcile** DESIGN.md / CLAUDE.md to drop the deleted `Pill`/`PointsChip` and fix sample-value drift; a **bounded** token-bypass sweep on the worst offenders (SignInScreen, OnboardingCards palette); add a `minHeight:44` floor to `Button`; **adopt `Sheet`** for genuinely-bottom-sheet modals only (sequenced last in the phase, ahead of Phase 6's focus hook). Files: `src/theme.ts`, `src/theme/ThemeContext.tsx`, `DESIGN.md`, `CLAUDE.md`, `src/components/ui/Button.tsx`, `SignInScreen.tsx` (presentation), `OnboardingCards.tsx`, `flags.ts` *(label dictionaries only)*.
**Must NOT touch:** `flags.ts` engine, any data shape; don't convert intentionally full-screen page-sheets to `Sheet`.
**AC:** dark elevation reads as ordered depth in both palettes; severity labels identical everywhere; docs reference only primitives that exist; AA contrast holds; no token regressions.

### Phase 3 — Core map & report-a-flag UX *(the heart + Hero 2)*
**Goal / scope:** the **visible privacy trust signal** (calm inline line + post-strip "GPS removed" confirmation from the existing success path); an in-flow report **success** confirmation (no silent close); reframe the anon "Sign in to attach a photo" copy (stays gated); severity selector escalation polish; fix the dead heatmap label + dangling-pronoun empty state; brand-font the native callout; **seed ResourcesScreen** with a small curated real list; targeted Dynamic-Type/layout fixes on the dense screens. Files: `ReportFlagModal.tsx` *(UI around the frozen `uploadFlagPhoto` call)*, `MapScreen.tsx` (presentation regions), `ResourcesScreen.tsx`, `SeverityBadge.tsx`, `PlatformMap*.tsx` (callout presentation).
**Must NOT touch:** the EXIF strip/upload call + contract; `createAnonFlag`; `location.ts`; query logic.
**AC:** the privacy protection is communicated *before* failure + confirmed after; report success is felt in-flow; **diff shows zero changes to fenced modules; EXIF tests pass;** Resources reads as intentional.

### Phase 4 — Verify/resolve payoff *(Hero 3; after Phase 3)*
**Goal / scope:** make the triage action a `Button`-primitive press (scale + success haptic); animate the FlashBanner reward (RM-gated slide+fade) and **announce** the new status to screen readers; **correct the points strings to 10/3/15/7** (Sky-approved, presentation-only); let the reward register before the modal closes; thicken the before/after "this got fixed" payoff (captioned, AA-legible, non-color status cue). Files: `TasksScreen.tsx`, `FlagDetailModal.tsx`, `FlashBanner.tsx`, `StatusBadge.tsx` *(presentation around the frozen `updateFlagStatus` call)*.
**Must NOT touch:** `updateFlagStatus`, the points trigger, `points.ts`/`pointEvents.ts`.
**AC:** shown number == awarded number; reward animates + is announced (and lands correctly under reduced motion); before/after reads as payoff; **zero diff to fenced logic.**

### Phase 5 — Motion & interaction feel
**Goal / scope:** one crafted, eased, RM-safe press language across FAB, onboarding CTAs, chips, cards (reconcile the 3 inconsistent press tiers using the existing motion tokens + `RealtimePulse` as the reference); 60fps via `useNativeDriver`. Files: `src/components/ui/Button.tsx`, FAB in `MapScreen`, `OnboardingCards.tsx`, chip components.
**AC:** press feel is consistent + purposeful; reduced-motion rest states correct; no perpetual heavy animation; (60fps = NEEDS-SKY-DEVICE).

### Phase 6 — Accessibility completion + the gauntlet
**Goal / scope:** raise `textSubtle` usages on <18pt essential text to an AA pairing (targeted, not blanket); add `setAccessibilityFocus` to title on modal open (depends on Phase 2 `Sheet` adoption); the **one** ~16-modal reduced-motion sweep; speak the Tasks badge count; web focus rings; then the full gauntlet (every screen × state × phone size × both themes) self-verified in the built output, with all device items flagged for the TestFlight pass. Files: the modal set, `ui/*`, the screens.
**AC:** WCAG 2.2 AA verified in build; dynamic-type tested; **screen-reader / real-device items marked NEEDS-SKY-DEVICE and folded into the TestFlight build.**

---

## Sequencing & collision notes

- **Clean base:** `main == origin/main == 4ebd824` (0/0 ahead/behind), zero tracked WIP. Build on the merged attribution shell, 6 UX features, `GlassSurface`, and the Jordan privacy + tech-debt commits.
- **STALE-BRANCH HAZARD:** ~33 local + dependabot branches, all ≥18 days old; **every one carries the OLD pre-attribution `index.html`.** Merging any silently reverts shipped work (one would undo −13,843 lines). **Never branch off or merge any** — verify each phase's merge-base has nothing beyond `main`. Pruning is separate Rory/Sky housekeeping.
- **Don't disturb the release gate:** the EXIF on-device re-verify is a pending release gate — the overhaul must not claim to satisfy it; the visual phases' device confirmation rides the *same* TestFlight build (Sky's decision #3).
- **Downstream only:** this overhaul consumes the merged tech-debt + Jordan-privacy results; it never re-touches the hardened fence. ESLint pinned `^9`; do not pop a stash or resume the v10 ratchet.

## Verification approach

Per phase, before requesting Sky's merge: `typecheck` 0 · `test` green · `lint` 0-err; **a `git diff --stat` proving zero changes to any fenced path** (I'll diff against the fence list above); a built-output check where the change is web-visible (`expo export` → inspect `dist`, and the Chromium preview for the web surface, with the caveat that preview is Chromium-only and cannot certify Safari/iOS); a before/after note; and a NEEDS-SKY-DEVICE checklist folded into the TestFlight pass. **On approval, the first execution step copies this Phase 0 doc to `~/AccessMap/qa-reports/2026-06-19_DesignOverhaul_Phase0_Plan.md`, and each phase writes its own dated report there.**

## Recommended start
**Phase 1** (highest external leverage, smallest, parallel-safe) or **Phase 2** (unblocks 3–6). I recommend **Phase 1 first**, then **2**, then **3 → 4 → 5 → 6**.
