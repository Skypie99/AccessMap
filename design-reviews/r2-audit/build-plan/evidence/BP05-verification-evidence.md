# BP5 / MP1 — Home joins the stage (M-06) — Verification Evidence

**Phase:** BP5 / MP1 (T2 material-migration train, phase 2 of 6)
**Branch:** `r2/mp1-home-stage` · **base** `c4d484f` (`r2/mp0-first-frame` tip) → **tip** `31086fd` · **date** 2026-07-17
**Provenance:** spec authored on Claude Fable 5 max (2026-07-15); executed on **Opus 4.8, ultracode, max effort** (S-10 / S-11, Sky's in-chat direction for this train), all sub-agents max effort.
**Result:** ✅ Built + green + **STOPPED on branch**. Not merged/pushed/built/deployed (Sky's hands).

---

## 1 · What shipped (per commit-plan item)

**One tracked source commit** (`31086fd`), 24 insertions / 23 deletions, `src/screens/HomeScreen.tsx` only — the whole M-06 block per `04_material_migration_spec.md` MP1. No data paths.

| # | Change | Sites |
|---|---|---|
| root → stage | `screen` bg `surfaceMuted` → `stage1`; `<ScreenStage />` inserted as first child of root `View` | import + JSX + style |
| search pill | legacy `intensity={20}` → `variant="row" forceEngineered` (engineered-literal; retires the app's last legacy pane outside the map's pinned pair — B2) | pill GlassSurface |
| list card | opaque `surface` `View` → one `<GlassSurface variant="row" forceEngineered={glassLite}>` across **all 4** state branches (error / first-load / empty / list); inner `sep` separators + `SkeletonRow` bars kept | 4 branches |
| border/fill deletes (iv) | `styles.search` hairline `borderWidth/Color` deleted; `styles.listCard` `backgroundColor` + `borderWidth/Color` deleted (row variant paints its own edge + surface; `overflow:hidden` + `borderRadius` kept so rows clip to the rounded pane) | 2 styles |
| header re-ink (v) | `ScreenHeader` gains `eyebrowColor={color.inkOnStage}` + `subtitleColor={color.inkOnStage}` (Profile precedent `ProfileScreen.tsx:900-901`; color only, no weight bump) | header mount |
| section label | `sectionLabel` `textSubtle` → `inkOnStage` (the stage's arbitrated section-header ink) | style |
| on-glass ≥500 weight (vi) | `rowMeta` + `searchText` gain `fontFamily: font.family.bodyMedium` (PublicSans_500Medium; the Tasks TYPE-LAW pattern) | 2 styles |
| swap/state inks (vii) | `errorText` + `emptyText` (`textMuted`) → `inkGlassMuted`; `searchText` placeholder → `glassPlaceholder`; row meta / chevron / search icon → `inkGlassMuted`; search-active text stays `textStrong` | 5 sites |
| clear-X icon (D1) | `X` clear icon `textMuted` → `inkGlassMuted` — **PROPOSED** micro-extension (see §5) | 1 site |

Machinery **threaded, not modified**: `GlassSurface` (`variant="row"` + `forceEngineered`), `ScreenStage`, `useGlassMode()` (READ-only: `const glassLite = useGlassMode() === 'lite'`).

---

## 2 · Hard gates — ALL GREEN

| Gate | Result | Tag |
|---|---|---|
| `npm run typecheck` | **0 errors** | verified |
| `npm run lint` | **0 errors / 77 warnings** = the BP4 baseline exactly; `grep HomeScreen` → 0 (no new warnings, touched file clean) | verified |
| `npm test` | **131/131 suites · 1944 passed / 0 failed / 84 todo** (2028 total) = baseline unchanged, no guards needed | verified |
| arbiter | `contrast-check.mjs r2-material-stacks.json` → **EXIT 0, RESULT: ALL PASS** (80 pairs, 0 fail); no drift → **no sibling `r2-mp1-stacks.json`** (shipped hexes == spec declarations). Proof: `evidence/BP05/r2-material-arbiter-mp1.txt` | verified |
| diff scope | tracked diff = **`src/screens/HomeScreen.tsx` only**; zero `theme.ts`/`ThemeContext.tsx`; `GlassSurface.tsx` + `ScreenStage.tsx` untouched; 7 immutable prior stacks files untouched; `.claude/launch.json` deletion NOT staged (`git show --name-status 31086fd` = 1 file) | verified |
| RT + C-lite | implemented as specced, not deferred: RT = the `variant="row"` primitive's designed opaque state (overlay 0.97 + borderStrong, automatic); C-lite = engineered via `forceEngineered={glassLite}` on the card, engineered-literal on the pill | verified (arbiter homeRowLite/homeRowRT pairs PASS) |

### Arbiter — all 20 M-06 (Home) verdicts PASS
Light + dark × blur / C-lite / RT. Worst Home ratio **5.44:1** (light search placeholder `glassPlaceholder`); most ≥8:1. Every re-ink token resolves to the exact hex the arbiter declares: `inkGlassMuted` `#414B5A`/`#B8BEC9` · `glassPlaceholder` `#5B6470`/`#C9CFD9` · `textStrong` `#222`/`#f5f5f5`. `errorText`/`emptyText` → `inkGlassMuted` are covered by the banked `homeRow` meta pair (8.01/8.32).
`inkOnStage` (`#525C6B`/`#AAAAAA`, eyebrow/subtitle/sectionLabel) is intentionally **not** in this arbiter — proven in the shipped/wave2 sets (shipped-stacks 4.83:1 light / 6.29:1 dark over the identical token+backdrop); the override is genuinely needed because the ScreenHeader default `textMuted` is 4.10:1 on the stage (below AA).

---

## 3 · PROTECT — byte-identity held (firsthand diff-check)

Every protected surface produced **0 changed (+/-) diff lines** — confirmed by targeted `git diff` grep:

| PROTECT surface | Check | Result |
|---|---|---|
| **PROTECT-10 / S17** map peek | `pointerEvents="none"` wrapper (`:270`), `suppressAttribution` (`:275`), hint `pointerEvents="none"` (`:278`) | 0 diff lines — **byte-identical** |
| Row a11y distance label | `${formatDistance(item.km)} away` clause (locked by `bp3TrustEngineGuards.test.ts:102`) | 0 diff lines — byte-identical; guard passes |
| B9b refresh-failure banner | `error && flags.length > 0 && !isOfflineCache` guard + strings + `accessibilityLiveRegion`/role + `void refresh()` (locked by `HomeScreenRefreshFailure.test.ts`) | 0 diff lines; guard passes |
| Home honesty law | eyebrow `NEARBY/LATEST`, subtitle, `CLOSEST/RECENT`, `FALLBACK_PEEK_REGION` (peek-only, never a distance origin), `formatDistance` only inside `km != null` | 0 diff lines — no fabricated distances |
| Self-contained CTAs / pins | header buttons, locate btn, offline banner, **retry button**, Report pill, severity dot, `sep`, `rowTitle`, `searchTextActive` | untouched (retry `retryBtn`/`retryText` confirmed context-only in diff) |

Rendering correctness (adversarially confirmed): `ScreenStage` is first child, absolute-fill + `pointerEvents` none + a11y-hidden (behind the transparent ScrollView, no touch theft); `styles.listCard` keeps `overflow:'hidden'` + `borderRadius` so rows clip to the rounded pane while the material sits at `zIndex:-1` below the children; all four new tokens are dark-overridden in `ThemeContext` (no light-value leak — dark screen bg is `#14151A`).

Note on captures: the **contrast** floor is arbiter-verified (the AA guarantee). The **material feel / frost / stage appearance** is expo-blur + expo-linear-gradient native rendering — genuinely **NEEDS-SKY-DEVICE** (R2-D14); web-probe approximations would misrepresent the native material, so none are attached (evidence-honesty rail).

---

## 4 · Adversarial verify — 4 skeptics, **4/4 UPHELD, 0 refutations**

Independent parallel skeptics (Opus 4.8 max effort; workflow `wf_92a776ab-106`), each running real `git`/`grep`/`node`/`npm`:

- **S1 correctness + PROTECT** — UPHELD. Diff one file; all PROTECT blocks byte-identical (awk-sliced); JSX balanced (5 GlassSurface open/close, View deltas 4/4, tsc 0); ScreenStage/clip/z-index correct; new tokens dark-overridden; 35/35 guard tests pass.
- **S2 diff-scope + train discipline** — UPHELD. Exactly one tracked file; theme.ts byte-identical; GlassSurface/ScreenStage/ThemeContext/map-stacks.json absent; no token invented; launch.json unstaged.
- **S3 ink/arbiter + budget** — UPHELD. Hexes exact, no drift, no sibling; arbiter exit 0 / ALL PASS / 20 M-06 PASS; `inkOnStage` coverage in shipped-stacks confirmed necessary+sufficient; blur budget net-zero (`useBlurPaneBudget` gated on `material==='blur'`; pill unconditionally engineered so pill+card never blur simultaneously).
- **S4 gates (independent re-run)** — UPHELD. typecheck 0; lint 0/77 (HomeScreen clean); jest 131/131 · 1944/0; 3 named Home guard suites 35/35.

---

## 5 · Deliberate decisions flagged for Sky (defaults applied, revertible)

- **D1 — clear-`X` icon re-ink → `inkGlassMuted`.** The MP1 block enumerates the *leading* Search icon → `inkGlassMuted`; the clear-`X` sits in the same now-glass pill and GLASS §7.4 bans muted faces on glass, so it was extended for consistency. One-line revert if unwanted. *(Not arbiter-gated as a separate pair — same token/backdrop as the leading icon, which passes 8.01/8.32.)*
- **D2 — no `hydrateGlassMode` on Home.** The spec is "no data paths"; Home READs `useGlassMode()` only. `hydrateGlassMode` is a one-shot that Tasks/Profile kick off on mount over a shared module store, so a user who cold-launches straight to Home and has previously chosen **lite** briefly sees full-blur glass on the list card until they visit Tasks/Profile. This is an ephemeral A/B preference (hidden long-press toggle, slated for removal in a later cleanup). If Sky wants Home to honor a persisted lite pref on first paint, that is a later one-line `useEffect(() => { void hydrateGlassMode(); }, [])` — deferred here as out-of-material-scope.

---

## 6 · §PARKING-LOT candidate (surfaced adversarially, NOT fixed)

- **Home "Try again" retry button — white on `color.brand` = 3.42:1 (dark).** Surfaced by the S3 ink-skeptic. It is **pre-existing and byte-identical** (`retryBtn`/`retryText` context-only in the diff), a self-contained CTA whose contrast is against its own brand fill (independent of the now-glass card behind it), and the spec keeps self-contained pills/CTAs on their opaque tokens as pins — so it is **out of MP1's material-only scope**, not a defect introduced by this phase. Same latent `color.brand`-white pairing MP0 fixed on the M-52 View button (`brand`→`ctaFill`). A future CTA-token sweep (or the relevant later MP if it names Home's error CTA) could re-ink it; recorded, not scheduled.

---

## 7 · Anything Sky must eyeball / NEEDS-SKY-DEVICE

- **R2-D14 (device gate):** Home stage in **both palettes**; the engineered row-tier pill + the list-card frost/perf feel over the stage; an **RT sweep** (OS Reduce Transparency + Settings toggle) confirming the card/pill render the designed opaque state (overlay 0.97 + borderStrong), not a low-contrast smear; a VoiceOver pass (the search pill + rows read as before — a11y props byte-identical).
- **D1 / D2** above — Sky's call to keep or revert.
- No DECISIONS-FOR-SKY blockers. No privacy-sensitive change (no location/auth/disability-data logic touched — material + ink only).
