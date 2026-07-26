# BP4 · MP0 — Verification Evidence

**Phase:** BP4 / MP0 — First Frame + Cheap Coherence (T2, phase 1 of 6)
**Branch:** `r2/mp0-first-frame` · **base `db61189`** (BP3 tip) → **tip `c4d484f`**
**Date:** 2026-07-17
**Provenance:** phase authored on Claude Fable 5 max effort (2026-07-15); **executed on Opus 4.8 ultracode, max effort** (S-10; Sky's in-chat direction for this train — the explicit approval the Opus gate requires).
**Migrating M-id partition:** MP0 = {M-52, M-55, M-56}. M-46/M-51 are in-tier ink repairs; M-43 comment-only (not counted in the 15 migrations). Partition holds — these M-ids appear only in this phase.

---

## What shipped, per commit-plan item

| # | Item | Files | What shipped |
|---|---|---|---|
| 1 | **M-56** boot frame | `App.tsx` | `FirstLaunchGate` loading frame `#fff` → `color.surfaceMuted` via `useColor()` (import extended). Kills the dark-mode white boot strobe (B8). |
| 2 | **M-55** map empty-card | `MapScreen.tsx` | Empty-filters card wrapped in `<GlassSurface variant="row" forceEngineered overlayTint={color.glassMapWash} borderRadius={radius.lg}>`; `styles.emptyCard` solid `overlay` fill + hairline border removed (GlassSurface supplies floor+edge; shadow+layout stay outer). On-glass re-ink: icon `textSubtle`→`inkGlassMuted`, body `textMuted`→`color.text`. Title `textStrong`, chips, CTA unchanged (declared pins). Render-only (B10). |
| 3 | **M-52** UpdateBanner | `UpdateBanner.tsx` | Banner `<View>` → `<GlassSurface variant="banner" forceEngineered borderRadius={radius.md}>`; `styles.banner` solid `brandSofter` fill + brand border removed; `View` import dropped (was the file's only `<View>`); GlassSurface imported. Re-ink: text + dismiss X `brandTextAlt`→`brandOnSoft`; View button `brand`→`ctaFill` (kills the **3.42** dark AA drift). 🔔 glyph + announce-once untouched (B11). |
| 4 | **M-46 + M-51** ink repairs | `PhotoLightboxModal.tsx`, `LiveStatusRegion.tsx` | M-46: close-X (`:102`), empty text (`:130`), caption (`:142`) `color.surface`→`color.textOnBrand` (kills the ~1.3:1 dark-chrome drifts). M-51: `pillInfo` `brand`→`ctaFill`; Retry action chip `rgba(255,255,255,0.22)`→`rgba(0,0,0,0.25)` (kills 3.21/3.54/2.54). Ratified rows stay ratified; ink-only. |
| 5 | **M-43** comment hygiene | `ProfileScreen.tsx`, `SettingsScreen.tsx` | Profile tier-explainer comment: dropped the stale "matches AboutScreen" claim (About moved to bulk glass; this dialog stays the dialog tier). Settings: dropped the stale "shared dark chrome" nav-header note (S8 removed that header). Comment-only, zero behavior. |
| 6 | Arbiter + evidence | — (untracked) | Arbiter re-run exit 0; this file + DECISIONS §P/§D/§A appends. No sibling stacks json (no drift). |

Git history: 5 source commits `0f213d6 → c4d484f` (M-56 · M-55 · M-52 · M-46+M-51 · M-43), each one item, in order. Diff stat: **7 files, +55 / −31** (most of it added explanatory comments).

---

## Gate results (all hard gates — all PASS)

| Gate | Result | Tag |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | **0 errors** | verified |
| `npm test` (jest) | **1944 passed** / 84 todo / 2028 total / 131 suites / **0 fail** — exactly the BP3 baseline (no new tests: material/ink/comment changes need no guards) | verified |
| `npm run lint` | **0 errors, 77 warnings** = baseline; **none in the 7 touched files** → no new warnings | verified |
| Arbiter — `tools/r2-material-stacks.json` verbatim | **EXIT 0 · RESULT: ALL PASS** (81 verdicts, 0 FAIL). MP0 stacks: M-46 textOnBrand 7.86/10.41/15.08; M-51 white-on-0.25-black chip 7.31 (successStrong) / 7.97 (ctaFill). Full log at `evidence/BP04/arbiter-r2-material.txt`. **No drift → no sibling `r2-mp0-stacks.json`.** | verified |
| Zero `theme.ts` edits | confirmed — not in tracked diff | verified |
| `GlassSurface.tsx` untouched | confirmed — not in tracked diff | verified |
| 7 immutable stacks files untouched | confirmed — none modified (`map-stacks.json` clean; the 6 untracked never edited) | verified |
| Diff scope = intended files only | 7 source files (+ the pre-existing ` D .claude/launch.json` deletion, **not staged**). No stray tracked files. | verified |
| Blur budget — zero new live panes | Both new GlassSurfaces pass `forceEngineered` → `material` resolves to `'engineered'` (LinearGradient, no BlurView), so `useBlurPaneBudget(material==='blur')` is inactive. Worst simultaneous pane count unchanged. | code-inferred |

---

## PROTECT re-verification (by diff)

| PROTECT surface | Proof | Result |
|---|---|---|
| M-55 card alert role + live region + label (byte-identical) | `accessibilityRole="alert"` present; label `"No flags match your active filters…"` unchanged; props moved onto GlassSurface via `...rest` passthrough | held |
| MapScreen `pointerEvents="box-none"` overlay law | `git diff db61189..HEAD -- MapScreen.tsx` → **0 box-none diff lines** | held |
| M-52 announce-once + button label/hint (byte-identical) | `announceForAccessibility` + hint `"Opens the Activity Feed and marks these updates as seen"` unchanged | held |
| PROTECT-27 ThemeContext total default | `useColor()` added in `FirstLaunchGate` (inside `ThemeProvider`); the hook was **not** converted to a throwing hook — the FirstLaunchGate/ErrorFallback safety net is intact | held |
| PROTECT-21 bulk tier | untouched — MP0 migrates no bulk sheet | held |
| PROTECT-5 arbitration | contrast decided by `contrast-check.mjs` (exit 0), not the eye | held |

---

## Honest notes / things for Sky to eyeball

- **M-56 light-frame residual (recorded, not a bug):** an OS-light / app-dark user gets one `surfaceMuted`-light frame during the ~50 ms AsyncStorage read. The strobe's whole audience (OS-dark) gets the dark wash on frame 1 — the fix's target. Deeper fix (mode-from-storage before first paint) is out of MP0's scope.
- **M-46 drift-number reconciliation nit:** the spec records the pre-fix dark lightbox chrome as **1.31/1.26/1.10** in one place and **~1.36/1.24/1.6** in another (same defect, two recorded figure-sets). The repair target was unambiguous (`color.textOnBrand`), and the arbiter now proves the *fixed* values (7.86/10.41/15.08). Only the historical pre-fix numbers disagree; not load-bearing.
- **Dead style observed, left out of scope:** `PhotoLightboxModal.closeBtnText` (`:155`) still carries `color.surface`, but it is **unused** (the close button renders the `<X>` icon, not that text) — not one of the spec's three named sites and not an arbiter-declared stack. Migrating it would be an unrequested change; flagged here as a candidate for a future hygiene pass.
- **No PROPOSED strings:** MP0 ships zero new/changed user-facing copy — all changes are material, ink, or code comments. (S-8 copy gate not exercised.)

---

## NEEDS-SKY-DEVICE (visual/feel — the arbiter proves contrast; feel is the device gate)

React Native native surfaces (boot frame, native-map card, banner over live content) don't render reliably in the browser/static-export rig, and the empty card / banner / lightbox are conditionally-mounted. Render-regression is covered by the green jest suites (MapScreen ×9, LiveStatusRegion); contrast by the arbiter. The following are Sky's device gate (see §D → R2-D14):

1. **Dark-launch first frame** (M-56) — headline: cold launch on an OS-dark device shows the dark wash on frame 1, no white strobe.
2. Empty-filters card + UpdateBanner in **both palettes** — material reads as the house Deep Field tier, inks legible.
3. Frost/perf feel of the engineered banner/row over live map content.
4. **RT sweep** (OS Reduce Transparency + Settings toggle) — both new surfaces render the *designed opaque state* (banner → brandSofter+brand border; row → overlay+borderStrong), never a low-contrast smear.

---

## STOP

Built + green + **STOPPED on `r2/mp0-first-frame`** (tip `c4d484f`). Not merged, pushed, built, or deployed — Sky's hands. Rollback anchor: `db61189`.
