# LENS 7 — AI-SLOP + ONE-AUTHOR CENSUS · code-qa 2026-08-06 · `[F5/2026-08-06]` · (run 2nd per SLOP-FOCUS)

**Bar:** a hiring manager's engineer skims this repo — one craftsperson or a committee of bots?
**Protected-Comment Law in force:** every `SR-nnn` / `C-nn` / `F-nn` / `BP-nn` / `PROTECT-n` / §SKY-ref / fence / DO-NOT-EDIT comment was treated as institutional memory and is untouchable. Nothing below flags preserved-WHY.

## The censuses that came back CLEAN (one-author positives — recorded so no future pass re-hunts them)
- **Section banners:** 0 repo-wide. **Restated-WHAT comment shapes** (`// Set the…`, `// Loop through…`, `// This function…`): 0. The comment voice is singular: dense, ledger-ID-anchored WHY prose. It is the house's signature, not slop.
- **Empty/comment-only catches:** 0. Every catch either surfaces per the CLAUDE.md tier table or documents its fail-soft contract.
- **Naming:** no `temp`/`helper2`/`handleThing` anywhere. `const result = await <picker/share>` and `const data = await list<X>()` are *uniform* idioms, not drift.
- **Emoji in source:** all hits are data or ratified copy (`CATEGORY_ICONS`, status-grade glyphs inside doc prose, copy.ts strings) — zero decorative emoji comments.
- **Storage modules:** 20 of 22 AsyncStorage modules share one canon (`@accessmap/<name>_v1[:uid]` + defensive parse + fail-soft load/save per tier table). Two drifters → SLOP-2.
- **The six list modals** (MyReports/MyWatched/MyFeedback/ActivityFeed/StatusHistory/HiddenComments) share the identical `useFocusOnOpen + loading + if (visible) load()` lifecycle — consistent idiom, no diverging bugs. Counted as one-author evidence, NOT duplication-to-fix (see lens 5 for the measured non-finding).
- **Alert-vs-notify-vs-confirm-vs-LiveStatus:** usage matches the codified tier table everywhere sampled; all three Alert-button menus are web-gated (file-input path / web skip / F48 branch). The apparent "drift" is a documented tiering system.

## Findings

### SLOP-1 · MEDIUM — `blockedTerms.ts` opens with a stale header that its own successor contradicts
**Surface:** `src/moderation/blockedTerms.ts:1-48` vs `:50-123`.
**Evidence:** Header #1 (lines 1-48) still claims *"This file is NOT a verbatim vendoring of that list — no network fetch happened"* and *"⚠ SKY / JORDAN REVIEW WANTED … (a) vendor the real LDNOOBW English file"*. Header #2 (lines 50-123) documents that the vendoring **happened** (§SKY-6, 2026-07-28, SHA-256 pinned) and says the old fence was *"CONVERTED — replaced by the provenance block above … not deleted"* — but the old block was not replaced; it still leads the file. A future reader hits the false claim first, in the one file where provenance is the point.
**Not protected:** header #2 preserves the fence's history (the conversion note); header #1 is the superseded artifact it refers to.
**Disposition:** Phase B — delete lines 1-48 (comment-only; gates unaffected). Keep header #2 verbatim.

### SLOP-2 · LOW — Two storage keys defect from the 22-module namespace canon
**Surface:** `src/lib/anonRateLimit.ts:3` (`'anon_submit_timestamps'`), `src/lib/realtimePrefs.ts:21` (`'realtime_enabled'`).
**Canon:** `@accessmap/<name>_v1` (+`:uid`), 20 conforming modules (census in this file's evidence run).
**⚠ Migration cost:** a bare rename silently resets state — the anon 24-h window restarts (minor: device-local limit) and any realtime opt-in flips back to default-off (user-visible). **Disposition:** Phase B only WITH a one-time read-old-key fallback; otherwise PARK. One commit, both keys, fallback test each.

### SLOP-3 · MEDIUM — PATTERN DRIFT: five hand-rolled variants of "is this PostgREST error a missing relation/function?"
The same problem solved five ways, with a real diverging bug:
| Variant | Where | Drift |
|---|---|---|
| `isTableMissingError` (canonical) | `comments.ts:76-81` | **The exemplar** — `EMBED_ERROR_CODES` early-out (SR-092 lesson: embed errors legitimately contain "does not exist"), code-first |
| `isTableMissingError` (twin) | `photos.ts:16-20` | **Lacks the embed early-out** — a PGRST200/201 embed failure whose message says "does not exist" is misclassified as table-missing → `[]` (feeds COR-3) |
| `isUnknownColumnError` | `flags.ts:1088-1098` | column-missing (PGRST204) — same family, third shape |
| inline `isMissingFn` | `users.ts:114-122` | function-missing (42883/PGRST202/message regex) |
| inline code check | `flags.ts:1368-1375` (`requestFlagReopen`) | function-missing (PGRST202/42883, no message fallback) |
**House-canonical:** `comments.ts`'s, by citation — it is the only one hardened by a production incident (SR-092) and it documents why.
**Convert map:** extract `src/lib/postgrestErrors.ts` → `isRelationMissing` (embed-aware) + `isFunctionMissing`; convert photos.ts, users.ts, flags.ts×2, comments.ts (re-export). One family, one commit, each convert behavior-proven; **coordinate with COR-3** (photos' swallow-all is the other half of that fix).

### SLOP-4 · LOW — Ink/color literal families where the token already exists
- `'#0F1B2D'` ink: **17 literal sites**; the value exists as `severityRamp[n].textOnColor` (`theme.ts:607+`) and as the theme shadow ink. At-source uses (theme.ts, ramp defs) are fine; the ~10 screen/component literals (LegendModal:316,321 · PlatformMap:597,606,633,674 · PlatformMap:362 + PlatformMap.web:1064 which *re-derive* the white-vs-ink threshold the ramp already encodes) are converts. The ratified AA comments stay verbatim.
- Android Switch thumb `'#f4f3f4'` ×4 (ProfileScreen:1621, SettingsScreen:569, NotificationPreferencesScreen:123, NotificationPrefsModal:244) → one shared constant.
- MapScreen light-legacy hex ×6 (placeChip* :3208-3211, bannerLocatingText `'#333'` :3431, `'#1a1a1a'` :3528) → tokens.
- **NOT flagged (ratified/deliberate):** SignInScreen + OnboardingCards fixed-dark editorial literals (several carry Wayfinder-Blue WHY comments), PlatformMap.web:210 computed luminance pair, HamburgerDrawer scheme-conditional.
**Disposition:** Phase B, one sub-family per commit, visual parity proven (same rendered values — token equals literal today).

### SLOP-5 · LOW — Three `errorMessage()` bypasses in a 35-adopter estate
`ProfileScreen.tsx:695` (`notify('Account deleted', e.message)` — raw member access on an untyped catch, user-facing) · `reports.ts:278` and `feedbackStore.ts:101` (manual `e instanceof Error ? e.message : 'Unknown error.'` inlines of the helper's core). **Disposition:** Phase B — convert all three to `errorMessage(e)`.

### SLOP-6 · LOW — Dual analytics taxonomy, one of them dead-by-design
Legacy `track()` catalog (`analytics.ts:117-131`) declares `flag_status_changed`/`flag_viewed` with `flagId` props that `stripPII` unconditionally removes (permanently-dead props), while the live house calls use `trackEvent('flag_status_updated', …)` — two names for one action (TasksScreen:551 vs flags.ts:1344), both stubs today. **Disposition:** Phase B — converge on the `trackEvent` names and retire the legacy catalog (check test pins first); or PARK until Phase-6 analytics wiring. Cross-ref COR-4.

### SLOP-7 · LOW — Twin validators speak two voices
`createAnonFlag` errors are developer-voiced with value interpolation (`` `lat ${lat} is out of range [-90, 90]` ``, flags.ts:1755-1760); its twin `createFlag` is user-voiced ("Invalid coordinates: lat must be between -90 and 90.", flags.ts:1196-1201). Both surface via `errorMessage(e)` in the report modal, though only on defensive paths (the form always sends picker-valid values). **Disposition:** Phase B — align anon to the shipped createFlag phrasing (existing ratified precedent, not new copy; note BP16 adjacency in the commit message).

### SLOP-8 · LOW — DEV logging handled two ways (3 of the 80 lint warnings)
`flagsStore.tsx:288,341,405` bare `console.log` inside `__DEV__` (each a `no-console` warning) while `analytics.ts` wraps identical DEV logging with `eslint-disable-next-line no-console`. **Disposition:** Phase B — match the analytics.ts convention (or a tiny `devLog` helper); lint warnings 80 → 77.

## THE ONE-AUTHOR READ (preliminary — the close-out carries the final verdict)
This repo reads as **one craftsperson with an institutional memory most teams don't have** — the ledger-anchored comment voice, the uniform fail-soft tiers, and the 20/22 storage canon are the strongest one-author signals I've seen in this estate. The committee tells are few, specific, and all bankable: one stale doc header (SLOP-1), one five-variant helper family (SLOP-3), two interface twins (lens 4/5), two key-name drifters (SLOP-2), one dual analytics taxonomy (SLOP-6). Clear them and the skim is seamless.

**FINISHED** — lens 7 complete. 2 Med · 6 Low. Zero comment-slop deletions proposed beyond SLOP-1 (the comment estate is the house's asset, not its debt).
