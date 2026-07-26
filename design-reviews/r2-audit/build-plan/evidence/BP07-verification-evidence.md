# BP7 / MP3 — The overlay remainder joins the bulk material (M-37 · M-22 · M-42 · M-24) — Verification Evidence

**Phase:** BP7 / MP3 (T2 material-migration train, phase 4 of 6)
**Branch:** `r2/mp3-overlay-rest` · **base** `828f736` (`r2/mp2-profile-lists` tip) → **tip** `db59980` · **date** 2026-07-17
**Provenance (S-10):** spec authored on Claude Fable 5 max (2026-07-15); executed on **Opus 4.8, ultracode, max effort** (S-10 / S-11, Sky's standing direction for this train), all sub-agents max effort.
**Result:** ✅ Built + green + **STOPPED on branch**. Not merged / pushed / built / deployed (Sky's hands).

Converges the remainder of the opaque-overlay tier onto the one shipped bulk material — including the two notification surfaces that split Settings' hallway (RB7). Six live AA-drifts in the Leaderboard move from recorded finding to repaired code.

---

## 1 · What shipped (per commit-plan item)

Four tracked source commits (one per M-id), **126 insertions / 25 deletions across exactly 4 files**. The shared **B4-engineered bulk recipe** applied four times + M-22's three drift re-inks + M-42's spinner-ink fix.

| Commit | File | Change |
|---|---|---|
| `6322b98` | `AchievementsModal.tsx` (M-37) | container → `cardWrap` + `<GlassSurface variant="bulk" borderRadius={0} forceEngineered>` (a11yViewIsModal moved onto it); `card` drops `backgroundColor: surfaceMuted` (retires the wash variant — one material) + gains `overflow:hidden`; on-glass `subtitle` → `inkGlassMuted` + ≥500 (`bodyMedium`); **Fork-12 default: `rowDimmed {opacity:0.7}` KEPT** |
| `6727722` | `LeaderboardScreen.tsx` (M-22) | same recipe (drops `shadow.e2` to cardWrap); on-glass `rank`/`stateHint` → `inkGlassMuted`, `subtitle`/`stateText` → `inkGlassMuted` + ≥500, `name` → +≥500; **drift re-inks:** `segBtnActive` + `retryBtn` fills `brand`→`ctaFill`, `rankTop` `brand`→`brandText` |
| `32d671c` | `NotificationPrefsModal.tsx` (M-42) | same recipe; on-glass `subtitle` → `inkGlassMuted` + ≥500, `footer` → `inkGlassMuted`; **spinner:** `ActivityIndicator` gains `color={color.text}` |
| `db59980` | `NotificationPreferencesScreen.tsx` (M-24) | same recipe (drops `shadow.e3` to cardWrap); on-glass `titleSubtitle` → `inkGlassMuted` + ≥500, `footer` → `inkGlassMuted`; spinner already inked `color.text` (kept) |

**The shared recipe (from the shipped B4 precedent, applied verbatim as MP2 did):**
`<View cardWrap>` (top-radii + up-shadow — `#000`/`shadowTint` per scheme, `shadowRadius:14`, offset `{0,-4}`, elevation 5) → `<GlassSurface variant="bulk" borderRadius={0} forceEngineered style={card}>`; `card` loses its `backgroundColor` (the variant owns the surface) and gains `overflow:'hidden'` (clips the square material to the rounded top). `cardWrap` radius matches each card's top radius (xl for M-37/M-22/M-24, lg for M-42).

**Machinery threaded, not modified:** `GlassSurface` (`variant="bulk"` + `forceEngineered`) — the primitive is never touched.

**Three change axes (all part of the shared recipe):** (1) material — the container→bulk transform; (2) named-ink — the role-mapped re-inks + the three drift re-inks; (3) the recipe's **on-glass ≥500 weight bump** (`fontFamily: font.family.bodyMedium`, 6 style rules) — spec §3, MP2 precedent (ActivityFeed `subtitle`/`emptyBody`). No fourth axis: no strings, a11y, testIDs, logic, or data paths changed.

---

## 2 · On-glass vs opaque-inner classification (the judgment-heavy part)

Re-inked (directly on the glass sheet); kept (inside a container with its own opaque `backgroundColor`):

- **M-37:** re-ink header `subtitle`. KEEP the achievement `row` (opaque `surface` card) contents — `rowTitle`/`rowDesc`/`statePill*`; KEEP the earned icon `goldDark` on `achievementEarnedBg`.
- **M-22:** re-ink `subtitle`, `rank`, `stateText`, `stateHint`, `name` (transparent-on-glass rows/wraps). KEEP `segLabel` (in opaque `surfaceNeutral` segment), `verifiedBadge`, `youBadge`, `rowHighlight`, `footer` band + `footerText`/`footerRank`, `points` (textStrong), podium tier washes, empty-state `Trophy goldAccent` (decorative).
- **M-42 / M-24:** re-ink `subtitle`/`titleSubtitle` + `footer`. KEEP `rowDesc`/`toggleSubtitle` (in opaque `surfaceMuted` rows), the `accentOrange`/`warningBg`/`warningFg` sign-in notice (semantic).

**xs-meta = ink-only:** `stateHint` and both `footer` footnotes get `inkGlassMuted` but NOT the weight bump — matching MP2's `sectionHeaderCount` treatment (small meta gets the ink, not the ≥500 body weight). Deliberate, not an omission.

---

## 3 · Gate results (all hard gates passed)

| Gate | Result |
|---|---|
| `npm run typecheck` | **exit 0** (0 errors) |
| `npm run lint` | **exit 0** — 0 errors, 77 warnings (BP6 baseline unchanged, **no new**; the surfaced warning is pre-existing in `NearbyFlagsModal.tsx`) |
| `npm test` (full) | **exit 0** — **1944 passed / 0 failed** / 84 todo / 2028 total · **131 suites**. Baseline unchanged (material/ink adds no guards). `NotificationPreferencesScreen` render test **15/15**. |
| Arbiter (`r2-material-stacks.json` verbatim) | **exit 0 · ALL PASS · 80 pair rows · 0 FAIL** — banked at `evidence/BP07/arbiter-r2-material.txt` |
| Diff scope | tracked diff = **exactly the 4 intended files** (126+/25−); nothing else in the tracked diff |
| `theme.ts` / `GlassSurface.tsx` / `ThemeContext.tsx` | **0 edits** (diff-checked) |
| 7 immutable prior stacks files | **untouched** (diff-checked) |
| Blur budget | **+0** (`forceEngineered` = engineered, no BlurView added anywhere) |

**No arbiter drift → no sibling `r2-mp3-stacks.json`.** Every shipped token resolves to the exact declared hex in both palettes (verified below), so the spec-level declaration re-runs unchanged.

---

## 4 · Drift resolutions (verify-first; both were false-alarm STOP candidates)

- **`goldChip` — NOT a code edit.** `goldChip` is an **arbiter surface-declaration name** in `r2-material-stacks.json`, not a theme token. The code already ships `goldDark` (`#B45F09`/`#FCC44D`) on `achievementEarnedBg` (`#fff3d1`/`#3D2A00`) — the exact `goldChip` pin at 4.15/8.59 (SC 1.4.11 non-text, 3:1 floor, paired with its own "Earned" label). The "4.15 correction" is the recorded/corrected figure; the earned icon is unchanged. **No-op verify.**
- **`rankTop` — a local style key, not a token.** `LeaderboardScreen.tsx` `rankTop` sourced `color.brand`; the "→ brandText" re-ink is an ordinary style-color change (brand hit ≈4.45 on the dark podiumGold row → `brandText` is the arbitrated on-glass select ink, ≈5.4/6.6). Shipped.

---

## 5 · Adversarial self-verify (4 independent skeptics, each prompted to REFUTE)

| Lens | Verdict |
|---|---|
| On-glass vs opaque-inner classification | **UPHELD** — every re-ink/keep decision correct across all 4 files |
| Recipe / token / JSX integrity | **UPHELD** — recipe matches the MP2 sibling exactly; JSX balanced (tsc 0); all 6 tokens exist in both palettes; GlassSurface unedited |
| Arbiter drift / AA | **UPHELD** — exit 0 / ALL PASS / 80 pairs; **zero token drift** (every shipped token == declared hex both palettes); every re-ink meets its applicable WCAG AA criterion |
| Byte-identity / PROTECT | **PASS_WITH_CLARIFICATION** — all 7 protected surfaces byte-identical, no logic/data path touched; the only flagged "deviation" is the 6 `bodyMedium` additions, which the skeptic itself notes are admissible (they ARE the recipe's on-glass ≥500 step, spec §3 + MP2 precedent). Resolved as a claim-wording clarification, not a code defect. |

Net: **4/4 confirm the migration is correct.** No code change resulted from the pass.

---

## 6 · PROTECT verification (BP4–BP9 band: diff-verified)

- **PROTECT-21 (bulk tier):** the four sheets **join** the exact `variant="bulk" borderRadius={0} forceEngineered` recipe (never fork it); GlassSurface.tsx untouched. ✓
- **PROTECT-27 (ThemeContext total default):** every re-ink token (`inkGlassMuted`, `brandText`, `ctaFill`, `textOnBrand`, `goldDark`, `bodyMedium`, `shadowTint`, `scheme`) exists in both `theme.ts` (light) and `ThemeContext.tsx` (dark) — `useColor()` never made throwing; no ThemeContext edits. ✓
- **Byte-identity (diff-verified):** the shared "Sign in to save notification preferences." string (M-42 + M-24), all a11y labels/hints/roles/`accessibilityViewIsModal`, testIDs, `useFocusOnOpen`, toggle semantics, podium order/labels + tier washes, `removeClippedSubviews`+`initialNumToRender={20}`, `rowDimmed {opacity:0.7}`, and the semantic sign-in notice — all unchanged. ✓

**Evidence-format note (honest):** per prior MP convention (BP04–BP06), evidence is the banked arbiter proof + full gate suite + the render test + the 4-skeptic diff-verified byte-identity — not static-export screenshots. These four surfaces are Modals over a scrim (the web export can't open them without driving, and the dev server crashes on the lucide lazy boundary), so the **visual material render / frost-feel is NEEDS-SKY-DEVICE** (see §7). Byte-identity is proven more strongly here by `git diff` than a screenshot could.

---

## 7 · NEEDS-SKY-DEVICE (record, not attempted) → contributes to R2-D14

iOS device, **both palettes**: (a) the Achievements / Leaderboard / Notifications / Notification-Preferences sheets read as the house engineered bulk material, matching the sheets they sit beside; (b) frost/perf feel of the engineered bulk tier over live content; (c) an **RT sweep** (OS Reduce Transparency + Settings toggle) confirming all four render the *designed opaque state* (overlay 0.97 + `borderStrong` top edge), never a low-contrast smear; (d) a VoiceOver pass — each sheet reads exactly as before (a11y byte-identical); (e) the Leaderboard `ctaFill` retry/segment + `brandText` rank-1 read cleanly in dark. **M-24 caveat:** unreachable in production at HEAD (gated behind `PUSH_NOTIF_TYPES_ENABLED=false`); its identical sheet is live via M-42, so the device read covers both.

---

## 8 · Parked (recorded, NOT scheduled — out of MP3 scope)

- **Leaderboard close-`X` icon** uses `color.textMuted` while the other three modals' `X` uses `color.text`. The X sits inside the opaque `surfaceNeutral` `closeBtn` circle (not on-glass sheet text), so it is out of MP3's on-glass scope — a pre-existing cross-file inconsistency. A future chrome-icon sweep could align it.
- **Leaderboard `closeBtnText` dead style** — unused (the close button renders the `<X>` icon). Pre-existing; a hygiene pass could delete it.

---

## 9 · Handshake

- base `828f736` → tip `db59980` · 4 source commits (`6322b98` · `6727722` · `32d671c` · `db59980`) · gates green (jest **1944/0** · arbiter exit 0, 80 pairs) · zero `theme.ts`, GlassSurface.tsx untouched, 7 immutable stacks untouched · blur budget +0.
- **STOPPED on `r2/mp3-overlay-rest`.** Never merged/pushed/built/deployed — Sky's hands. ✅ BP8 (MP4) may cut from this tip.
