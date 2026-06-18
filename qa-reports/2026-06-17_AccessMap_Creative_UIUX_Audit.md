# AccessMap — Creative + UI/UX + Accessibility Audit & Overhaul Map

**Mode:** READ-ONLY study (Opus 4.8 ULTRACODE). Nothing changed, nothing run that writes, data/auth/privacy fences untouched.
**Date:** 2026-06-17 · **Scope:** every screen × state × text-scale, code-level.
**Method:** 16-agent read-only workflow (12 per-surface walks across all ~65 source files + 4 synthesis passes), then **manual source verification of every headline claim** before publishing.

> **This report is the deliverable map.** The overhaul does **not** execute as part of this study — it proceeds as scoped passes *after Sky reviews this and picks the design direction* (§10, Decision #1). Pass 0 (on-device verification + screenshots) is the first execution step. Working copy / plan file: `~/.claude/plans/opus-4-8-ultracode-effervescent-pie.md`.

---

## CONTEXT — why this exists

Sky asked to modernize AccessMap — "better-looking, more well-made, mobile-optimized" — with two concrete complaints: **(1) layout integrity is broken in places** ("everything must fit and be centred; nothing touching other buttons"), and **(2) it should feel more crafted and modern** — plus **10 net-new UI/UX improvements beyond fixing**. The spine: **accessibility is the product, not a constraint.** AccessMap exists to serve disabled users; its own UI must be an exemplar of WCAG 2.2 AA and aim above it. Every finding is judged first by "does this serve the people who rely on this app — screen reader, large dynamic type, switch control, colour-blindness, motor constraints?"

This study maps the whole app so Sky can drive the overhaul from a verified picture rather than memory.

---

## ⚠️ A CREDIBILITY NOTE YOU SHOULD READ FIRST

The multi-agent walk produced **278 raw findings** (109 layout defects, 64 dynamic-type risks, 105 a11y findings). It is a rich map — but when I **verified the headline claims against source**, the synthesis agents had **systematically over-graded severity and made citation errors.** Concretely, I confirmed by reading the code that:

- The "5 severity buttons always overflow a 375pt phone" claim is **false** — they're single digits totalling ~252pt, which fits (`ReportFlagModal.tsx:560`).
- "Map filter rows have no horizontal scrolling" is **false** — the Categories row **is** a horizontal `ScrollView` (`MapScreen.tsx:1439`).
- "FlagDetailModal action rows always collide" is **overstated** — they use `flexWrap:'wrap'` + `minHeight` (not fixed height), so they wrap defensively (`FlagDetailModal.tsx:1456`). The agents also mis-pathed this file as `src/screens/…` and cited line numbers beyond file length.
- The "**critical** PointsChip contrast violation" is **false/misattributed** — `PointsChip` uses dark-ink-on-light tones (AA-safe). The real sub-AA token (`pointsPillText`) lives elsewhere (Profile hero + comment timestamps).

**Net:** at **default text on a normal phone, the app mostly fits and is carefully built.** The real, *verified* defect class is **large-dynamic-type fragility + a few sub-44pt stragglers + map floating-chrome/safe-area items + token/doc drift + craft-consistency gaps** — important (it's the accessibility case!) but **not** a "the app is visibly broken" crisis. Everything stated below as fact, I read in source. Items I could not verify are labelled **[UNVERIFIED — device check]**.

---

## 1. TL;DR (2-minute read)

**What AccessMap is today:** a mature, functionally-complete Expo/RN crowdsourced accessibility-barrier map (16 screens, ~47 components, a real 434-line token system, dark-mode foundation, motion tokens, an "expressive" gradient/glow layer Sky chose on 2026-06-03). It has an **established, documented design language** (DESIGN.md + `src/theme.ts` + `src/components/ui/`). So the creative job is **evolve & enforce the system, not rebuild.**

**The worst problems (verified):**
1. **Large-dynamic-type fragility — the #1 real layout issue, and it IS the accessibility case.** ~15 `numberOfLines={1}` on titles/names (violates AccessMap's *own* DESIGN.md rule); fixed `height:` on some text rows/banners where `minHeight:` is needed; a handful of chip/stat/leaderboard rows that collide or clip only when text is enlarged. This is exactly the setting disabled users rely on — so it serves both of Sky's complaints at once.
2. **Map floating-chrome & safe-area** — the highest-confidence *base-text* risk and the most likely thing Sky is seeing: absolutely-positioned banners/legend/chips over the map, a non-scrolling filter panel that can exceed a short screen, `FlashBanner` top:56 without safe-area inset. **Needs on-device confirmation** (I can't render).
3. **A few sub-44pt stragglers** — `searchClearBtn` 32pt, HelpModal FAQ header 32pt, MyFeedbackModal chips 36pt (the team has been actively bumping others to 44 — these are leftovers).
4. **Token & doc drift** — DESIGN.md §1 + several code comments still say brand `#2f80ed`; live token is `#1466E0`. Hardcoded `#0d1829`/`#60a5fa` in the nav shell; scattered raw px. Cosmetic-but-corrosive.
5. **Two real contrast edges** — `pointsPillText #dbe7fb` on brand (~3.1:1) used at small sizes (comment timestamp, small profile labels); the tab-bar label has no `maxFontSizeMultiplier`.

**Headline creative direction:** *Evolve the existing expressive system into a coherent, enforced one.* Fix the drift, lock a 4-tier elevation language, add a restrained frosted-glass map-chrome material, finish gradient/focus-ring adoption — every move AA-or-better.

**Top UX improvements (net-new):** viewport-aware filter counts, smart empty-state recovery, a location-aware "suggested next action" nudge, swipe-to-triage on Tasks, before/after resolution photos, a verification timeline, voice search, leaderboard time-windows.

**Recommended order:** **Pass 0 device-verification → Pass 1 dynamic-type & layout repair → Pass 2 accessibility deep-fix → Pass 3 visual-system enforcement → Pass 4 the net-new UX → Pass 5 QA gauntlet.** (Detail in §9.)

---

## 2. Coverage proof — what I studied, and what I could NOT verify

**Studied (code-level, exhaustive):** all 16 screens and ~47 components, read in full including `StyleSheet.create` blocks, via 12 per-surface walk agents; the token foundation (`theme.ts`, `ThemeContext`, `AppText`, `Button`, `Input`, `Card`, `Pill`, `PointsChip`, `Sheet`, nav shell) read directly. Every state class was examined per surface: loading · empty · populated · error · offline · permission-denied · submitting · success · disabled · focused · pressed. Layout judged at default **and** enlarged dynamic type, at small-phone 375pt, with safe-area/keyboard reasoning.

**Personally re-verified in source (not just agent-reported):** `theme.ts` (full), `AppText.tsx` (full), `PointsChip.tsx` (full), `RootNavigator` tab/header, `ReportFlagModal` category/severity/description region, `FlagDetailModal` action rows, `MapScreen` filter rows, `TasksScreen` search/filter styles, and a repo-wide grep of `numberOfLines`, fixed `height:`, and `pointsPillText`.

| Dimension | Covered | Honest gap |
|---|---|---|
| Screens × states | ✅ all 16 screens, all major states by code | runtime-only states (e.g. real network errors, live realtime pulses) not exercised |
| Component layout/styles | ✅ all ~47 read | — |
| Dynamic type | ✅ reasoned from code (caps, fixed heights, numberOfLines) | **not rendered at 200% on device** |
| Platform sizes | ✅ reasoned 375pt→large | **no simulator/device render** |
| **Live rendering** | ❌ **NOT DONE** | plan mode + read-only fence forbade starting a dev server; Expo **web** wouldn't prove native iOS/Android anyway |
| Screen-reader flow | ⚠️ inferred from a11y props | **no real VoiceOver/TalkBack pass** |
| Dark mode | ⚠️ tokens exist, light-only ships | dark palette not yet enabled; contrast unverified |

**The single biggest caveat:** this is a **code-level** audit. It is very strong for declarative RN layout/dynamic-type/touch-target/a11y-prop analysis, but **a web/Chromium render has shipped real bugs before on this project.** I could **not** confirm what Sky is *visually* seeing at base text — the map floating-chrome and safe-area items especially need a device. **Pass 0 of the overhaul is on-device verification.** Screenshots captured at execution time (a manual on-device a11y checklist already exists at `qa-reports/2026-06-09_AccessMap_ReSweep_Fixes.md §7`).

---

## 3. Current-state read

**What it is & how finished:** Production-bound (main is green, build-ready per `PROJECT_STATE.md`; the only remaining gate is Sky-side EAS build). Finishedness by surface, from the walk: most screens **functional**; SignIn/Onboarding, Settings, and the design-system foundation read **polished**. There is an active, documented remediation history (44pt bumps with `// WCAG 2.5.5` comments, live regions, `accessibilityState` everywhere). This is a *cared-for* codebase, not a careless one.

**Design-language verdict: ESTABLISHED — evolve it, do not invent.** AccessMap has a genuine, premium-leaning system: semantic colour roles with documented WCAG pairings, a 4pt spacing grid, three cool-tinted elevation tiers, three brand font families (Plus Jakarta Sans / Public Sans / JetBrains Mono via `AppText`), motion tokens with reduced-motion gating, focus-ring tokens, and a Sky-chosen "more expressive" layer (`gradient.brand/brandHero/gold`, `shadow.glowBrand/glowGold`). My creative work (§6) is therefore **consolidation + enforcement + a few signature moves**, not a rebrand.

**What's broken/unverified right now:** the large-dynamic-type fragility (§5), the map-chrome/safe-area items pending device check (§5), token/doc drift (§6), the contrast edges (§8), and the fact that the **expressive UI is LIVE but never device-verified** (gradients/shadows/haptics only fully render on-device — flagged in `PROJECT_STATE.md` Open Risks).

---

## 4. Already good — PROTECT (do not let the overhaul wreck these)

- **The token foundation** (`theme.ts`) and **`AppText`'s per-variant Dynamic Type strategy** — body/bodyMedium **uncapped** (correct, WCAG 1.4.4), display/heading/label/mono capped sensibly. `heading` auto-exposes `accessibilityRole="header"` for rotor nav. Keep.
- **Colour-not-alone is designed-in:** severity carries `{color, label, textOnColor}`; status pills always pair colour + word; categories use icon + label. Keep this invariant absolutely.
- **Live regions & SR announcements:** `FlashBanner`/`UpdateBanner` use `accessibilityLiveRegion` **plus** `AccessibilityInfo.announceForAccessibility` (Android+iOS redundancy); comment-post announces success; the photo-nudge is a polite live region. Exemplary — extend the pattern, don't remove it.
- **Reduced-motion gating** on Button, Skeleton, HamburgerDrawer, OnboardingCards, Sheet. Keep the gate on every new animation.
- **Safe-area done right in the nav shell:** tab bar `height: 62 + insets.bottom`, `paddingBottom: 8 + insets.bottom` (`RootNavigator.tsx:218`). Don't regress this.
- **The `ui/` primitives** (Button/Input/Card/Pill/Sheet/Skeleton) — robust, themed, a11y-wired, 44pt-enforced. The overhaul should *increase* adoption of these, never bypass them.
- **The privacy posture** (EXIF/GPS fail-closed, anon rate-limiting, owner-scoped storage paths) — **out of scope, do not touch** (see §5 fences).

---

## 5. Defect catalogue — the "must fit, must be centred, nothing touching" workstream

This becomes **execution Pass 1**. Presented as **verified clusters** (credibility-checked against source), not the raw 109 (many over-graded). Each cluster names the real pattern, where it bites, and the fix. **Severity reflects what I could verify**; nothing here is graded "critical at base text" because verification didn't support that.

### Cluster A — Dynamic-type truncation on content text (HIGH; a11y-critical)
`numberOfLines={1}` on **titles/names** — violates DESIGN.md §2's own rule ("Don't use `numberOfLines={1}` on content text"). Verified instances incl. `FlagCard.tsx:96` (category), `LeaderboardScreen.tsx:176` & `LeaderboardModal.tsx:100` (names), `MyReportsModal.tsx:193`, `MyWatchedModal.tsx:231`, `SavedPlacesModal.tsx:350`, `FilterPresetsModal.tsx:281` (name **and** summary), `MapScreen.tsx:1290` (place chip), `ProfileScreen.tsx:1015`, `ActivityFeedModal.tsx:157`, `CommentBubble.tsx:68` (author), plus raw `<Text>` callout title at `PlatformMap.tsx:227`.
**Fix:** audit each — *essential identifier* → remove the cap (allow 2 lines), grow row `minHeight`; *pure metadata* (coords, timestamps) → keep `numberOfLines={1}` + `ellipsizeMode="tail"`. Acceptance: legible at 200% on iPhone SE.

### Cluster B — Fixed `height:` where `minHeight:` belongs (HIGH; a11y-critical)
Text-bearing rows/banners that pin `height` clip wrapped text at large type. Verified candidates: `UpdateBanner.tsx:115`, `SearchInputRow.tsx:113`, `HamburgerDrawer.tsx:296`, and the row screens (`Resources`/`About`/`HowToHelp`/`NotificationPreferences`, all `height: 44`). **Distinguish** these from legitimately-fixed **icon-only** buttons (e.g. `MyWatchedModal` 44×44 close/view buttons — fine). **Fix:** `height` → `minHeight` on any container that holds text; verify the icon-only ones stay fixed.

### Cluster C — Map floating-chrome & safe-area (MEDIUM-HIGH; **base-text risk — device-verify**) [partly UNVERIFIED]
The most likely source of what Sky *sees*. (a) Min-severity row is a plain `View` while Categories scrolls (`MapScreen.tsx:1467`) — single digits fit today but it's inconsistent and grows at large text; (b) the **filter panel itself is not wrapped in a ScrollView** — many expanded sections on a short phone can exceed the viewport; (c) `FlashBanner` `position:absolute top:56` with **no safe-area inset** (`FlashBanner.tsx:77`) → collides with the status bar on notched devices/landscape; (d) heatmap disclaimer/legend lack explicit inset safety. **Fix:** wrap filter panel in a scrollable container; `useSafeAreaInsets()` on the absolute banners/legend; make the min-severity row consistent with Categories. **Confirm exact breakage on a real device first.**

### Cluster D — Horizontal button/chip rows at large text (MEDIUM)
Action/secondary rows that already `flexWrap:'wrap'` (FlagDetailModal) are mostly OK but can produce ragged last rows and tight labels ("Submit reopen request") at large text; tag-chip rows in ReportFlagModal grow tall and break rhythm at 1.5×+. **Fix:** bump chip `paddingHorizontal` to `spacing.lg`, give wrapped rows consistent `marginBottom`, and let long-label buttons shrink-wrap (`minWidth:'auto'`) rather than clip. No "always-collides" cases verified.

### Cluster E — Settings / list rows: label + trailing control (MEDIUM)
Long label + trailing switch is the classic large-text collision. `NotificationPrefsModal.tsx:280` `minHeight:56` with uncapped `rowDesc`; several modal rows at `minHeight:56` should be 64. **Fix:** standardise a `MODAL_ROW_MIN_HEIGHT = 64`; ensure label wraps *under* growth without crashing into the control.

### Cluster F — Sub-44pt touch targets (MEDIUM; stragglers)
Verified: `searchClearBtn` `minHeight:32` (`TasksScreen.tsx:1652`); HelpModal FAQ header `minHeight:32`; `MyFeedbackModal` chips `minHeight:36`. **Fix:** raise to 44 (the surrounding code already did this for `searchInput`/`sevChip`/`catChip` — these are leftovers).

### Cluster G — Token / off-grid drift (LOW; craft)
Raw px and literals instead of tokens: `UpdateBanner` (gap:10, padding:12/14), `RootNavigator` header/tab raw colours, place-chip `rgba(255,255,255,0.95)` vs `color.overlay`, ReportFlagModal raw chip paddings. **Fix:** mechanical token sweep (rolls up into §6 Phase 1).

> **Honest correction to the raw catalogue:** the agents' `CRIT-01/02/05/08` (severity-row overflow, map-rows-not-scrollable, action-row-always-collides) and the "critical PointsChip contrast" item did **not** survive source verification — they're downgraded or removed above. The genuine spine is Clusters A–C.

### Data/auth/privacy ENTANGLEMENTS (flag-and-leave — overhaul must NOT reach in)
36 flagged; the load-bearing ones the UI work must route *around*: **ReportFlagModal** ↔ EXIF/GPS-stripping + anon rate-limiting + photo upload path scheme; **MapScreen/Profile** ↔ `expo-location` reads; **FlagDetailModal/AdminScreen** ↔ RLS-driven status transitions + `is_admin` visibility; **Settings** ↔ account delete / data export. Presentation changes (labels, layout, materials, states) are fair game; **any change touching these logic paths is a BLOCKER → surface to Sky.**

**Pass-1 acceptance:** no clipping/overflow/collision and every interactive target ≥44pt, verified at **default AND ≥180% dynamic type** on **375pt + a notched device**, with `typecheck` + the 1,680-test suite green.

---

## 6. Creative / visual modernization direction

**Verdict:** the system is accessibility-first and well-documented, but **execution is ~80% consistent** — token drift across ~17 surfaces, inconsistent elevation/border usage, raw-px holdouts, and the brand-hex doc drift. "More well-made and modern" here = **finish and enforce the expressive system**, plus a few signature moves. *My eye proposes; Sky's eye arbitrates.* Every item below is AA-or-better; anything prettier-but-less-accessible is disqualified and named as such.

**TYPE — keep the palette, refine rendering.** Keep the 3 families + the ×1.4 line-height formula. Refine: fix the `#2f80ed → #1466E0` doc drift (DESIGN.md §1 *and* stale code comments at e.g. `FlagDetailModal.tsx:1488`, `ProfileScreen.tsx:1874`); document the per-variant Dynamic-Type cap rationale in `AppText` JSDoc; verify essential button text doesn't ride the `label` cap (1.6×) in a way that hides content.

**COLOUR — refine, then complete dark mode.** Keep semantic roles + the documented AA pairings. Add the 3 missing tokens currently hardcoded (`headerBg #0d1829`, `tabBarActiveTint #60a5fa`, `achievementEarnedBg`). Fix the two real contrast edges (§8). Dark mode: the foundation exists (`ThemeContext`) but ships light-only — when enabled, re-verify severity/status/brand on dark surfaces (it's a "loaded gun" for later, not today).

**SPACING/RHYTHM — unify the 4pt grid.** Replace ~60 raw-px offsets with tokens; standardise list-row `minHeight` to 64; pick one chip-row strategy (scroll vs wrap-with-consistent-gap) and apply everywhere.

**MATERIALITY — a clear elevation language (signature move).** Today shadow tiers are used ad-hoc. Lock a 4-tier semantic scale — **Flat / Lifted (e1) / Floating (e2) / Prominent (e3 + optional glow)** — tied to role, so depth reads via shadow + position, **never colour alone** (helps colour-blind users perceive hierarchy). Unify border-vs-shadow card treatments and document in DESIGN.md §5/§7.

**Signature move — refined map chrome (frosted glass).** The map is the hero surface. Give overlays (filter panel, offline banner, legend) a restrained frosted-glass material: `rgba(255,255,255,0.85)` + blur, on `shadow.e3`. Premium and modern. **Accessibility guard:** the solid-ish overlay carries the contrast; the blur is decorative only; verify text/controls inside hit AA at both themes on-device. *If blur perf or iOS clipping is a problem, fall back to the current solid overlay — do not ship a blur that drops contrast.* (Sky decision — §10.)

**Other moves:** finish **gradient adoption** on primary CTAs (FAB already does; extend to Save/Resolve/Submit/Apply — gradient is ≥ AA-large, same posture as solid brand); finish **focus-ring adoption** on remaining raw Pressables (filter chips, form pills, tabs); add an **icon-size scale** (`icon.sm/md/lg/hero`) to kill ad-hoc `size={18}`; keep motion exactly as-is but close the two reduced-motion gaps (§8).

---

## 7. The 10 net-new UI/UX improvements (beyond fixing)

Curated from 65 surface seeds for **genuine net-new value, diversity across the app, and AA-or-better**. **Honesty note:** the synthesis pass tried to count *fixes* (keyboard-dismiss, status-change SR announcement, focus rings, save-toast, responsive hero) as "improvements." Those are **real and worth doing — but they're repair/a11y/polish folded into Passes 1–3, NOT padded into this list.** The 10 below are true additions.

| # | Improvement (essence) | Area | Helps whom | Effort | Fence note |
|---|---|---|---|---|---|
| 1 | **Viewport-aware filter counts** — live "Stairs 8 · Ramp 3" on category chips, recomputed on pan/zoom; also add to a11y labels | Map / discovery | triage; cognitive load | S–M | none (presentation) |
| 2 | **Smart empty-state recovery** — when filters hide everything, offer the *specific* one-tap undo ("Clear distance filter?") | Map / states | users confused why results vanished; cognitive a11y | S | none |
| 3 | **"Suggested next action" nudge** — location+status-aware chip ("Verify 2 open flags within 200 m") | Discovery / Tasks | new users; impact-routing | M | reads location (existing) — stays in UI |
| 4 | **Swipe-to-triage on Tasks cards** — left=verify, right=resolve, **with the existing buttons kept** for switch/SR users | Discovery / contribution | coordinators; high-volume | M–L | keep non-swipe path (AA) |
| 5 | **Before/after resolution photos** — on resolve, optionally pair a "fixed" photo with the original | Flag detail / contribution | community proof; motivation; officials | M | reuses photo pipeline → **respect EXIF fence** |
| 6 | **Verification timeline view** — render StatusHistory as an icon+dot timeline instead of a raw list | Flag detail | visual/cognitive learners | M | none |
| 7 | **Voice-to-text search** — hands-free address/flag search | Search / discovery | motor impairment; hands-free; **raises a11y bar** | M | platform speech API → device check |
| 8 | **Leaderboard time-windows** — All-time / Month / Week | Gamification | re-engagement; fairness to newcomers | S–M | none |
| 9 | **Tap-to-filter status pills on Profile** — tap "Open 4" → your open reports | Profile / contribution | quick self-triage | S–M | none |
| 10 | **Severity shown as word + number on the chip** ("Critical · 5"), not a bare colour+digit | Flagging | **colour-blind / low-vision sighted users** (SR already gets the full label) | S | none — pure a11y-positive |

**Ranking by impact-per-effort (build order):** **10, 2, 8** (small, high-value, two are a11y wins) → **1, 9** (small-med, discovery) → **3, 6** (med, engagement/clarity) → **4, 5, 7** (med-large, highest ceiling). All hold AA; #7 and #10 actively raise it. Items touching the photo/speech/location fences (3, 5, 7) stay strictly in the presentation layer and are flagged for Sky.

---

## 8. Accessibility-specific findings (held above AA — does the app MODEL what it advocates?)

**Verdict: ~7/10 — "accessible by framework, getting toward accessible by craft."** (I revised the agent's harsher 6/10 *up*, because verification showed the foundation and remediation history are stronger than the raw findings implied — e.g. the "critical PointsChip" item was false.) The architecture is genuinely good; the gaps are craft-level and cheap.

**1. Screen-reader flow.** Form flows (ReportFlagModal, FlagDetailModal) have logical order, rich labels, live-region hints, and success announcements on comments — strong. **The map canvas itself is likely not individually SR-navigable** (native markers usually aren't) **[UNVERIFIED — needs a real VoiceOver/TalkBack pass]**; today SR users reach flags via Tasks/search, which is an acceptable but not ideal fallback. Status-change (verify/resolve/reject) **does not announce success** — add an `announceForAccessibility` parallel to the comment-post pattern.

**2. Labels/roles/hints.** Mostly present and correct (`accessibilityRole/Label/State` widespread). Real gaps: **no visible focus ring** on the raw Pressables for ReportFlagModal severity/category/tag chips and several modal chips (WCAG 2.4.7 — matters for switch-control/keyboard/web; moot on touch-only). Fix by routing through the `Pill`/`Button` focus pattern or adding the `a11y.focusRing*` overlay.

**3. Dynamic-type integrity** — the cross-cutting view of Clusters A/B (§5). This is the dominant a11y theme: the app *scales* fonts but doesn't always *preserve layout* at 150%+. **WCAG 1.4.4 / 1.4.10.**

**4. Colour-not-alone (1.4.1)** — mostly compliant (severity/status/category all carry redundant text/number/icon). One borderline: the **active severity button signals selection by background colour only** (the digit doesn't change) — improve with a non-colour cue (border/checkmark/weight); this is also UX-10 #10's payoff.

**5. Touch targets (2.5.8)** — the three stragglers in Cluster F.

**6. Reduced motion (2.3.3)** — ~90% gated; **two modal slides not gated**: `NotificationPrefsModal.tsx:138` and `NotificationPreferencesScreen.tsx`. Fix: `animationType={useReducedMotion() ? 'none' : 'slide'}`.

**7. Contrast (1.4.3), both themes.** Verified-real edges: **`pointsPillText #dbe7fb` on brand ≈ 3.1:1** (acknowledged in code comments at `ProfileScreen.tsx:1873`/`:1929`) — fine for the **large** hero numeral, but used at **small** sizes for the own-comment timestamp (`CommentBubble.tsx:101`, ~11pt) and small profile labels where it **fails** → use `textOnBrand`/`brandText` or enlarge+bold. The **tab-bar label** has no `maxFontSizeMultiplier` (`RootNavigator.tsx:225`) → cap or test at 1.6×. `textSubtle #999` (~3:1) is correctly reserved for non-essential/large per DESIGN.md — keep that discipline. Dark-mode pairings unverified (ships light-only).

**Top 5 a11y fixes to model the mission:** (1) de-cap `numberOfLines={1}` on essential content; (2) focus rings on all interactive Pressables; (3) fix the small `pointsPillText` contrast uses + tab-label cap; (4) gate the two modal slides; (5) announce status-change success + confirm map SR strategy on device. Est. ~1 focused day; the framework is solid.

---

## 9. The overhaul plan — scoped execution passes (does NOT run as part of this study)

Each pass is a coherent, reviewable branch with its own acceptance; each notes what needs a device and what touches fences. Suggested branch prefix `ui/` or role-routed (Shamus builds, Alex a11y-gates, Dani design-compiles).

- **Pass 0 — On-device verification & screenshots (FIRST).** Run the app on a real iOS device (+ TalkBack on Android) at default and ≥180% text on a 375pt and a notched device. Confirm Cluster C (map chrome/safe-area) and the SR map-canvas question. Capture the screenshot set this audit couldn't. *Output: confirmed defect list + baseline screenshots.* No code change. **Sky/device-gated** (agents can't run EAS/simulators).
- **Pass 1 — Dynamic-type & layout repair (Clusters A–F).** The "everything must fit & be centred" workstream. Pure presentation. Acceptance in §5. Device re-check at 200%.
- **Pass 2 — Accessibility deep-fix (§8 top-5).** Focus rings, reduced-motion gates, contrast fixes, status-change announcements. Alex-gated; on-device VoiceOver/TalkBack sign-off.
- **Pass 3 — Visual-system enforcement (§6).** Token/doc drift sweep, elevation language, gradient + focus-ring + icon-scale adoption, **frosted-glass map chrome** (if Sky approves; with the contrast/perf guard). Dani Design-Compiler gate. *Touches no logic.*
- **Pass 4 — Net-new UX (§7), prioritised.** Ship in impact/effort order; each its own small branch. Items 3/5/7 carry fence notes — presentation-only, surface to Sky before any logic touch.
- **Pass 5 — QA gauntlet.** `typecheck` + full Jest suite + lint; a **dynamic-type snapshot test** (render primitives at 1.8× and flag overflow — UX seed from the foundation walk) added to CI so this fragility can't regress; final device a11y checklist.

**Fence reminder for every pass:** no change to data/auth/RLS/EXIF/location logic; migrations remain files; only Sky merges; Morgan is the only agent who messages Sky.

---

## 10. Open decisions for Sky (each answerable in one line)

1. **Design direction** — confirm **"evolve & enforce the existing expressive system"** (my recommendation), or do you want a **bolder redesign**, or **fix-only (no visual modernization)**? *(Foremost — Passes 3–4 depend on it.)*
2. **Frosted-glass map chrome** — yes (premium, with the AA/perf guard + device check) or keep the current solid overlays?
3. **Pass sequencing** — proceed Pass 0 → 1 → 2 → 3 → 4 → 5 as written, or reorder (e.g. visual-first)?
4. **Which of the 10 UX ideas** are greenlit, and in what order? (Default: the impact/effort order in §7.)
5. **`pointsPillText` contrast** — OK to fix the small-size uses (comment timestamp / small profile labels) to a passing token, leaving the large hero numeral as-is?
6. **Dark mode** — enable + verify now, or leave the foundation parked?
7. **Device for Pass 0** — which device(s)/text sizes should the on-device verification target?

---

## Appendix — provenance & where to look

- **Raw findings (278):** 12 per-surface structured walks + 4 synthesis sections (16-agent read-only workflow). Used as a *map*; every published claim re-verified against source.
- **Files re-read in full during verification:** `theme.ts`, `AppText.tsx`, `PointsChip.tsx`, `RootNavigator` (tab/header), and targeted ranges of `ReportFlagModal`, `FlagDetailModal`, `MapScreen`, `TasksScreen`; greps for `numberOfLines`, fixed `height:`, `pointsPillText`.
- **Heaviest surfaces (line count):** `MapScreen` 2473 · `ProfileScreen` 2392 · `FlagDetailModal` 1797 · `TasksScreen` 1844 · `ReportFlagModal` 1224 — prioritise these for Pass-0 device screenshots.
- **Next step:** Pass 0 (on-device verification + screenshots) once Sky answers Decision #1.
