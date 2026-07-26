# BP8 / MP4 — The Trust Ledger — Verification Evidence

**Phase:** T2 phase **5 of 6** (the material-migration train MP0→MP5). Hardest last.
**Branch:** `r2/mp4-trust-ledger` — base `db59980` (MP3 tip, rollback anchor) → tip `205108c`.
**Commits:** `243a0c6` M-36 FlagDetailModal · `205108c` M-41 StatusHistoryModal. (Arbiter/evidence/DECISIONS artifacts live in the untracked `design-reviews/` tree — not tracked commits.)
**Provenance (S-10):** BP8 file authored on Fable 5 max (2026-07-15); executed on **Opus 4.8 ultracode, max effort** (all sub-agents max) per Sky's standing direction on this train.
**Result:** ✅ Built + green + **STOPPED on `r2/mp4-trust-ledger`**. NOT merged / pushed / built / deployed — Sky's hands.

---

## 1 · What shipped (per commit-plan item)

| Commit | File | Change |
|---|---|---|
| `243a0c6` | `src/components/FlagDetailModal.tsx` (M-36) | Card `<View>` → `<GlassSurface variant="bulk" borderRadius={0} forceEngineered>`; `accessibilityViewIsModal` moved onto it; card style drops `backgroundColor: color.surface`, adds `overflow:'hidden'`; on-glass `textMuted`/`textSubtle` → `inkGlassMuted` (10 sites); reopen `accentOrange` → `brandText` (O-2 default, no veto); `commentsEmptyLabel` gains `bodyMedium`. |
| `205108c` | `src/components/StatusHistoryModal.tsx` (M-41) | Same recipe wrap; `loadingText` + `emptyBody` → `inkGlassMuted` + `bodyMedium`. |

**Shared recipe (matches the 7 prior migrated sheets):** container → `GlassSurface variant="bulk" borderRadius={0} forceEngineered`; card owns the fill via the primitive, not `backgroundColor`; **no `cardWrap`/shadow** (these two cards had no up-shadow at HEAD — nothing to relocate). Machinery threaded, not modified — `GlassSurface.tsx` and `theme.ts` untouched.

**Three change axes only:** (1) container material, (2) named-ink role re-maps, (3) the recipe's ≥500 on-glass body-weight rule on clean body-variant lines. Nothing else.

---

## 2 · On-glass vs opaque-inner classification (the judgment-heavy part)

**M-36 FlagDetailModal — RE-INKED (on-glass `textMuted`/`textSubtle` → `inkGlassMuted`):**
`beforeAfterCaption`, `beforeAfterArrowGlyph`, `sectionLabel`, `editLabel`, `commentsSoonText`, `commentsEmptyLabel`, `reopenMessage`, `reopenFormLabel`, `reopenCharCounter` (textSubtle mono counter), and the empty-state `MessageCircle` icon (decorative, on-glass). **Reopen re-ink** (O-2 proceed): `reopenBtn` border + `reopenBtnText` `accentOrange → brandText`.

**M-36 — KEPT (correctly not re-inked):**
- Inner-opaque: `contextChipText` (on `surfaceNeutral` chip), `anonBadge` fill, the three `placeholderTextColor` sites (on `surface`/`surfaceSoft` inputs), comment bubbles (`surfaceNeutral`).
- Amber affordance grammar: `Star` watch glyph + `watchBtnActive` border (`accentOrange`) — deliberate watch/pin affordance, not a legibility fail.
- Semantic/pins: severity/status badges (arbitrated fills + `textOnColor`, PROTECT-4); `description` stays `textStrong` (no down-ink); `coordsCopyGlyph` stays `color.brand` (interactive-icon floor, SR-labeled); `metaValue` stays `color.text` (body role, passes 8.93/8.94).
- Dead styles (unreferenced in JSX, left untouched): `commentsEmptyText`, `watchBtnGlyph`.

**M-41 StatusHistoryModal — RE-INKED:** `loadingText`, `emptyBody` → `inkGlassMuted` + `bodyMedium`.
**M-41 — KEPT:** `entryLine` stays `textStrong` (ledger honesty surface — no down-ink); `title` `textStrong`; `emptyTitle` `color.text`; entry dots keep `statusDotColor`; `entryLineConnector` keeps `color.divider`; `closeBtn` (`surfaceNeutral`).

**Weight-rule scope (≥500 on-glass body):** `bodyMedium` added ONLY to clean, non-italic, `variant="body"` (400) muted lines being re-inked — M-36 `commentsEmptyLabel`; M-41 `loadingText`, `emptyBody`. Italic hints (`commentsSoonText`, `reopenMessage`) got the color re-ink but **kept italic** (no fontFamily swap, to preserve the italic rendering). Label-variant sites (already 600) and the mono counter got color-only.

---

## 3 · Gate results (all hard gates passed)

| Gate | Result |
|---|---|
| `npm run typecheck` | **0 errors** |
| `npm test` | **1944 passed / 0 failed / 84 todo / 2028 total · 131 suites** — baseline unchanged, no guards added |
| `npm run lint` | **0 errors / 77 warnings** — baseline, no new warnings |
| Arbiter | `tools/r2-material-stacks.json` re-run VERBATIM → **exit 0, RESULT: ALL PASS**; all 12 MP4 `detailSheet` rows PASS both modes. **No value drift → no sibling `r2-mp4-stacks.json`.** Banked: `evidence/BP08/arbiter-r2-material.txt`. |
| `theme.ts` / `GlassSurface.tsx` / `ThemeContext.tsx` | **0 edits** (diff-checked) |
| 7 immutable prior stacks files | **untouched** (not in `git diff --name-only`) |
| Diff scope | **only** `FlagDetailModal.tsx` + `StatusHistoryModal.tsx` (+47/−20). Banked: `evidence/BP08/source-diff.patch`. |
| Blur budget | **+0** — both sheets `forceEngineered` → `material='engineered'` (GlassSurface.tsx:204–211), so `useBlurPaneBudget(material==='blur')` never increments. Deepest stack (Tasks 12 → FlagDetail → StatusHistory) stays **12** (+1 manual tab-bar pane). |

---

## 4 · Drift resolutions (verify-first)

Every cited `file:line` was re-grepped before editing; **no meaningful drift** from the spec anchors (audit HEAD `a8549ff`). Line numbers matched the plan exactly (FlagDetail mount `:739`/card `:1495`; StatusHistory mount `:136`/card `:222`). The arbiter path is relative to `design-reviews/r2-audit` (not repo root) — run from there. No STOP condition triggered.

---

## 5 · Adversarial self-verify (4 independent skeptics, each defaulting to "refuted")

**All four UPHELD — 0 refutations.**

| Lens | Verdict |
|---|---|
| A · Classification (on-glass vs inner-opaque) | **UPHELD** — every re-ink is on a transparent container; every kept muted token is on an opaque fill / semantic-affordance fill / dead. Completeness sweep: the only remaining `textMuted`/`textSubtle` in M-36 are the 3 opaque-input placeholders, `contextChipText` (chip), `anonBadge` (fill), and the 2 dead styles — nothing on-glass missed. M-41 has zero remaining muted tokens. |
| B · Recipe integrity (wrap well-formed, no cardWrap, theme/GlassSurface untouched, RT+C-lite) | **UPHELD** — JSX balanced (1 open/1 close per file), `accessibilityViewIsModal` moved not dropped/duplicated, imports added, no `cardWrap`/shadow, card style correct, `git diff --name-only` = only the 2 modals, blur +0 by construction. |
| C · Arbiter drift (shipped hex == declared pairs, exit 0) | **UPHELD** — all 4 tokens resolve to the exact declared hexes both modes (`inkGlassMuted` #414B5A/#B8BEC9, `brandText` #0F53BE/#84AEF6, `brand` #1466E0/#4E89EF, `textStrong` #222/#f5f5f5); arbiter re-run exit 0 / ALL PASS; no sibling file needed (absence correct). |
| D · Byte-identity / PROTECT (material-only, Fork 5, anonymity, RM) | **UPHELD** — every diff line is a token swap / `bodyMedium` add / structural wrap / card-style change / comment; no string, label, hint, role, testID, or `animationType` changed; anonymity set + RM gate + Fork 5 read-half + `description`/`entryLine` textStrong all byte-preserved; weight bump only on the 3 clean non-italic body lines (italic hints kept italic). |

**`accessibilityViewIsModal` forwarding (closing Skeptic D's out-of-lens note):** `GlassSurface` destructures `...rest` (`GlassSurface.tsx:194`) and spreads `{...rest}` onto its root `<View>` in **all three** material branches (engineered `:274`, opaque `:224/:262`, blur `:230`) → the prop reaches the rendered view in every mode. VoiceOver modal boundary preserved (matches the shipped reference modals).

**`coordsCopyGlyph` note (Skeptic A, non-refuting):** its `color.brand`-on-glass is the arbiter-declared **pin**, verified PASS at 3.70 (light) / 3.56 (dark) against the 3.0 non-text floor, SR-labeled — not a nit, in scope and passing.

---

## 6 · PROTECT verification (diff-verified)

- **PROTECT-8 (anonymity set):** `Reported by` · `accessibilityLabel="Reported anonymously"` (`:924`) · `Anonymous` · `Reported on ${...}` — present, **absent from the diff** (byte-preserved).
- **PROTECT-7 (reduced-motion gate):** `animationType={reducedMotion ? 'none' : 'slide'}` unchanged in both modals.
- **PROTECT-4 (severity/status badges):** arbitrated fills + `textOnColor` unchanged.
- **PROTECT-5 (arbitration system):** the script decided (80 pairs, exit 0); no eye-tuned floor; `GlassSurface.tsx` DO-NOT-EDIT held.
- **PROTECT-21 (bulk tier):** the two sheets JOIN the recipe (never fork it).
- **PROTECT-27 (ThemeContext default):** `ThemeContext.tsx` untouched.
- **S3 read half byte-identical / Fork 5:** `statusDotColor`, `entryLineConnector`, row `accessibilityLabel={item.line}`, `entryLine` (textStrong), status announcements — all unchanged. No verifier count, no guest flag-as-wrong added.

**Evidence-format note (honest):** FlagDetailModal + StatusHistoryModal are `Modal`s over a scrim that the static web export cannot open (BP07 precedent). Byte-identity is proven by `git diff` + the 4-skeptic pass; contrast by the arbiter; the material/frost **visual** is device-only → §7.

---

## 7 · NEEDS-SKY-DEVICE (record, not attempted) → contributes to R2-D14

- A **VoiceOver walk of FlagDetail** post-material (the train's named device close-out).
- The frost/perf feel of the engineered sheet tier over the live map + over Tasks, both palettes.
- An RT sweep (OS Reduce-Transparency + Settings toggle) — confirm the designed opaque state renders on both sheets.
- Dark + light read of the reopen button's new `brandText` and the re-inked ledger meta.

---

## 8 · Parked (recorded, NOT scheduled — out of scope)

- **`reopenSubmitBtn` amber fill** (`FlagDetailModal.tsx:~1992`): `backgroundColor: color.accentOrange` with white text (≈1.9:1). A **separate** white-on-amber case the MP4 spec deliberately did **not** name (it re-inks only the outlined trigger's border + text). Left as-is — material-only + spec-authority discipline. Surfaced for Sky.
- Dead styles `commentsEmptyText` + `watchBtnGlyph` (FlagDetailModal): unreferenced; left untouched.

---

## 9 · Handshake

`base db59980 → tip 205108c` · 2026-07-17 · gates green (typecheck 0 · lint 0/77 no-new · jest 1944/0 · arbiter exit 0, ALL PASS). **STOPPED on `r2/mp4-trust-ledger`.** BP9 (MP5, optional) may cut from this tip. Sky merges; Sky owns the R2-D14 device gate.
