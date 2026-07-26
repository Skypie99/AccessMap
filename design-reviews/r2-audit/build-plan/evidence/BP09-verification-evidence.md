# BP9 / MP5 — Admin editorial — Verification Evidence

**Phase:** BP9 = MP5 (T2 phase 6 of 6, the optional caboose) · **Branch:** `r2/mp5-admin-editorial`
**Base (rollback anchor):** `205108c` (`r2/mp4-trust-ledger` tip) · **Tip:** `8a190a3`
**Date:** 2026-07-17 · **Provenance (S-10):** prompt authored Claude Fable 5 max (2026-07-15); executed **Opus 4.8 ultracode, max effort, all sub-agents max**.
**O-1 gate:** Sky answered **INCLUDE** in-window (recorded in DECISIONS §A). Both hard preconditions passed: §P carries the MP4 tip; O-1 = INCLUDE.

---

## What shipped (per commit-plan item)

| # | Item | Result |
|---|------|--------|
| 1 | O-1 gate — record Sky's INCLUDE | DECISIONS §A updated (untracked ledger; no source edit). |
| 2 | **M-23** `src/screens/AdminScreen.tsx` | Commit `91f47f2`. AdminScreen joins the editorial stage family. |
| 3 | **M-49** `src/navigation/RootNavigator.tsx` | Commit `8a190a3`. The last nav header retired app-wide. |
| 4 | Arbiter + captures + PROTECT diffs + rollback anchor | This report + `evidence/BP09/`. |

**M-23 detail:** root `surfaceMuted` → `stage1` + `<ScreenStage/>`; in-screen S8 `<ScreenHeader eyebrow="ADMIN" title="Admin">` with the `<HeaderActions onMenu={drawer.setOpen(true)} onFeedback={setOpen('feedback')} iconColor={textStrong}>` cluster, **mounted as the FlatList `ListHeaderComponent`** (the recorded Stage-6 grammar exception — scroll-away, keeps blur budget 1→1) **and rendered above the loading + access-denied centered states** so the drawer/menu escape is reachable in all three states. Section cards `<Card>` → `<GlassSurface variant="row" forceEngineered>` (engineered-literal → 0 new blur panes; C-lite engineered by construction; RT = the variant's designed opaque state, automatic). Five stage-direct muted sites → `inkOnStage` (Lock icon, denied body, list-header counter, empty Inbox icon, empty body); on-card coord meta → `inkGlassMuted`; description body gains `font.family.bodyMedium` (the shared recipe's ≥500 third axis).

**M-49 detail:** Admin `Tab.Screen` `headerLeft: renderMenuButton` → `headerShown: false` (now mirrors FullMap/Settings). Dead code removed with zero dangling references: `renderMenuButton`, the orphaned `const drawer = useDrawer()` in `NavInner` (the `useDrawer` import stays — `DrawerHost` uses it), the `MenuIcon` lucide import, the `icon` theme import, and the `hamburgerBtn`/`hamburgerBtnPressed` styles.

---

## Gate results (all hard — all green)

| Gate | Result | Tag |
|------|--------|-----|
| `npm run typecheck` | **0 errors** | verified |
| `npm run lint` | **0 errors, 77 warnings** (== baseline; 0 warnings in either edited file) | verified |
| `npm test` (jest) | **1944 passed / 0 failed / 84 todo** (131/131 suites) — == baseline 1944/0, no guards added | verified |
| Arbiter `r2-material-stacks.json` (verbatim) | **exit 0 · RESULT: ALL PASS** (banked spec-time proof; no drift) | verified |
| Sibling `r2-mp5-stacks.json` | **not created** — MP5 introduces zero new token+backdrop pairs (see coverage below) | verified |
| Zero `theme.ts` edits · GlassSurface/ScreenStage/ScreenHeader/HeaderActions/ThemeContext untouched | confirmed (not in diff) | verified |
| 7 immutable prior stacks files untouched | confirmed (6 untracked + `map-stacks.json` tracked, none in diff) | verified |
| Diff scope = 2 source files only | confirmed; ` D .claude/launch.json` (pre-existing) NOT staged | verified |
| Blur budget 1 → 1 | 0 BlurView in AdminScreen; `forceEngineered` unconditional; ScreenStage 0 live panes; the 1 pane is the invisible tab-bar pane | verified |

Arbiter raw output → `evidence/BP09/arbiter-r2-material.txt`. Full source diff → `evidence/BP09/mp5-source.diff`.

---

## Arbiter coverage (why no sibling file)

MP5's inks land on **already-banked** token+backdrop pairs — no new declaration:
- **`inkGlassMuted` on the row material** (coord meta) → banked in `r2-material-stacks.json` itself (M-06 row-meta: `#414B5A`/homeRow = 8.01 light / 8.32 dark, PASS).
- **`inkOnStage` on the stage** (the 5 sites + the header eyebrow) → banked in the immutable shipped `wave2-stacks.json` (`#525C6B`/stage 4.83 light, `#AAAAAA`/stage 6.29 dark, PASS; icons need only 3.0 — a fortiori covered).
- **`color.text` @ ≥500 on the row material** (description) → banked in `wave2-stacks.json` (`#333`/row, min 4.5).

Dark re-inks of the three `textMuted` sites are **no-ops** (dark `textMuted #aaa` ≡ dark `inkOnStage #AAAAAA`). The r2 `_doc` "NOT DECLARED" register already states MP5's re-inks land on the shipped/wave2 arbitration — confirmed accurate.

---

## PROTECT — re-verified by diff (`evidence/BP09/mp5-source.diff`)

- **Admin authorization gate — byte-identical:** `const isAdmin = useIsAdmin()`, `if (isAdmin === null)`, `if (!isAdmin)` unchanged (never appear as +/- lines); `src/lib/admin.ts` **not in the diff** (0 lines). Only the *inside* of each branch was wrapped in the stage/header presentation.
- **Denied + empty copy — byte-identical:** "Admin access required" / "This area is limited to moderators." / "No flags to moderate" / "You're all caught up. New reports will appear here." — word-for-word; only indentation + color tokens moved.
- **Moderation logic — byte-identical:** `handleRemove`/`handleDismiss`, the F18 `actioningRef` guard, `deleteFlag`, `updateFlagStatus(id, 'rejected', flag.status)` (F53 CAS), both `Alert.alert('Error', errorMessage(e))` paths — not in any diff hunk.
- **PROTECT-4:** sevPill keeps `sev.color` fill + `sev.textOnColor`; `{sev.label} · {item.severity}` preserved.
- **Card a11y:** GlassSurface renders a plain View (never injects `accessible`), so the moderation buttons stay reachable — the card still does not collapse the VoiceOver subtree (WCAG 4.1.2/2.1.1 comment intent held, updated only to name GlassSurface).
- **Lockstep test:** `qaMergeConsolidation` asserts `accessibilityRole="list"` + `{sev.label} · {item.severity}` — both present; suite green (11/11 on that file, 1944/0 overall).
- **PROTECT-27:** `useColor` untouched (ThemeContext not edited) — stays non-throwing.
- **Blur / RN reality:** no CSS-only tricks; no new BlurView; `pointerEvents` law N/A (AdminScreen is not the map).

**Transparency note (declared, not a regression):** the a11y *tree* is intentionally restructured — the menu, Feedback, and title move from the OS nav-bar header into the in-screen `ScreenHeader` (which adds an `accessibilityRole="header"` title + an "ADMIN" eyebrow). This IS the M-23/M-49 change; the same menu label ("Open navigation menu"), the same Feedback control ("Send feedback"), and the screen title survive with equivalent affordances. No logic/behavior/data path changed.

---

## Adversarial verify — 4 skeptics, Opus 4.8 max effort → **4/4 UPHELD, 0 refutations**

1. **PROTECT byte-identity** — UPHELD. All 7 protected surfaces byte-identical/affordance-preserving; independently ran the lockstep test (11/11 PASS). (Raised the a11y-tree transparency note above — not a refutation.)
2. **Diff-scope + dead-code** — UPHELD. Diff = exactly 2 files; every removed symbol has 0 remaining references; kept symbols still used; lint 0/77, neither edited file appears.
3. **Ink + material + budget** — UPHELD. 5 stage-direct inkOnStage + coord inkGlassMuted + description bodyMedium all correct; no over/under-migration; budget 1→1; tokens exist; every MP5 pair maps to a banked pair (no sibling needed).
4. **Independent gate re-run** — UPHELD. typecheck 0 / lint 0-err-77-warn / jest 1944-pass-0-fail-84-todo / arbiter exit 0 ALL PASS reproduced from scratch; exhaustive masked-failure hunt came up empty.

---

## Executor decisions (revertible / verify-first calls — logged to DECISIONS §A)

- **Layout (revertible):** the ScreenHeader mounts as the FlatList `ListHeaderComponent` per the spec's explicit Stage-6 grammar choice; the section cards get `marginHorizontal: spacing.xl` (self-inset) to align under the header (default `spacing.xl`), replacing the old container `padding: spacing.lg` — net card content ~16px narrower, a defensible editorial alignment. Empty state: header at top, "all caught up" message centered in the space below (`emptyInner` flex:1).
- **`:170` coord meta → `inkGlassMuted`** — the one on-card muted site the spec's 5-item stage-direct list does not name explicitly; it sits on the row material, so it follows the §3 recipe + MP1 row precedent (arbiter-confirmed, banked M-06 pair).
- **Description → `bodyMedium`** — the recipe's third (≥500 on-glass body) axis, per MP0–MP4 precedent.
- **`onFeedback` → `setOpen('feedback')`** — `HeaderActions` requires both `onMenu` and `onFeedback`; wired via `useSharedModals` exactly like SettingsScreen, preserving Admin's prior Feedback affordance (formerly the nav-header `renderHeaderRight`).

---

## Honest tags / NEEDS-SKY-DEVICE

- **Visual render of the 3 Admin states × 2 palettes = NEEDS-SKY-DEVICE (R2-D14).** Reaching AdminScreen requires an authenticated *admin* session; a headless static-export capture would require handling credentials (prohibited) and cannot navigate the auth wall. The migration is sound **by construction** — AdminScreen now uses the identical S8 pattern (`ScreenStage` + `ScreenHeader` + `HeaderActions` + `GlassSurface variant="row"`) as the shipped, rendered SettingsScreen — validated by typecheck + jest + the arbiter-banked inks. MP5 folds under the single **R2-D14** train device gate (no separate R2-D item).
- **Device gate (R2-D14, Admin editorial leg — gated/low-traffic):** on-device, both palettes — (a) all 3 states read as the house Deep Field stage; the section cards read as the engineered row material; (b) the in-screen menu (drawer) is reachable in loading / denied / loaded; (c) an RT sweep (OS + Settings toggle) confirms the cards render the designed opaque state, not a smear; (d) a VoiceOver walk — the moderation buttons still reachable, the gate + copy unchanged, the new header title/eyebrow read cleanly.

---

## STOP

Built + green + **STOPPED on `r2/mp5-admin-editorial`** @ `8a190a3`. **Not merged, pushed, built, or deployed** — Sky's hands. T2 (the material migration train) is now complete: **MP0→MP5, conservation 15/15**.
