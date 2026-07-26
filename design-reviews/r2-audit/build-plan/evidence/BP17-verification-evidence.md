# BP17 — verification evidence (hygiene tail + DEPLOY CHECKLIST)

**Branch:** `r2/bp17-hygiene-deploy` · **base/rollback** `8adb4d4` (tip of `r2/bp16-copy-gate`) · **tip** `d43f867` (6 commits) · **date** 2026-07-19.
**Provenance (S-10):** planned/authored on Fable 5; executed **Opus 4.8 ultracode max effort**, all sub-agents max.
**Decisions applied:** O-1 = INCLUDE (default) · O-3 = DEFAULT (executor lands the paper commit) · **O-4 = UNIFY** (Sky, this session) · **T19 = comment-only** (Sky, this session) · S-10 model law.

Honesty tags used below: **[verified]** (gate/arbiter/test proved it) · **[web-approx]** · **[code-inferred]** · **[NEEDS-SKY-DEVICE]**.

---

## Per-commit — what shipped

### 1 · T19 ghost hues + brand marks (comment-only) — `b11cd6f`
- **[verified]** `app.json` notification.color `#1a4fa3` → `#1466E0`; new guard in `theme.test.ts` pins `notification.color === web.themeColor === splash.backgroundColor === '#1466E0'`.
- **[verified]** accentOrange **unchanged** at `#f1a520` (comment-only). `theme.ts:136` comment corrected (dropped the stale `#e67e22` distinctness claim; states the accepted sev-2 `#F0A030` hue-share defused by the BP10 disc grammar). `theme.test.ts` guard re-pointed from `severity4Color()` → `severity2Color()` (the real near-twin), still a passing exact-inequality.
- **[verified/arbiter]** LogoMarks seated: signed-out Profile (`GuestProfile.tsx` top of `guestBody`, ~56pt) + About title (`AboutScreen.tsx` headerRow, 22pt, SR-hidden to avoid double-speak). Both **theme-aware** (`variant='color'` light / `'white'` dark). Arbiter `r2-brand-cameo-stacks.json` **exit 0**: accentOrange fill duty 7.68:1 both modes; Profile cameo 3.74:1 light / 14.61:1 dark.
- **Correction to recon:** AboutScreen `heroBadge:73` is NOT a decorative emoji — it is a Lucide `MapIcon` + version pill (the stale `:74` comment misled the recon). **No PROTECT-24 violation there**; BP16's Bell really was the last emoji. The About mark is therefore purely additive (beside the title), not a replacement.
- **[NEEDS-SKY-DEVICE]** the marks' look on the guest stage + bulk sheet both themes; the MyWatched orange-adjacency row; Android notification tint (else code-verified hex parity).

### 2 · T15 tab-bar inactive ink — `0ab983a`
- **[verified/arbiter]** `theme.ts` light `tabBarInactiveTint` `#6B7280` → `#515964`, arbiter-decided (candidate spread run; `#6B7280`=3.17 FAIL, `#3F4854`=6.07 overshoot). `#515964` is the **lightest** slate clearing 4.5:1 with margin — **4.65:1** on the 0.82/#000 worst composite, **5.92:1** on the 0.92 RT/web surface (`r2-tabbar-ink-stacks.json` exit 0). Luminance ~0.098 ≈ active `#0F53BE` (~0.100) → active/inactive separate by hue, not weight. `:186` stale "~4.8:1 on white" comment corrected.
- **[verified]** Dark mode untouched (separate token `darkColor.tabBarInactiveTint = rgba(255,255,255,0.55)`; arbiter regression rows 5.17 / 5.87 PASS). No consumption-line edit (`RootNavigator:286` already reads the token). New `theme.test.ts` guard pins the hex + AA on `#D1D1D1`.
- **[verified]** M-48 kill intact: `r2-trials-stacks.json` still **exit 1 by design** (mechanism stays dead; only the ink repaired).

### 3 · T20 containment — `36586d4`
- **[verified]** `MyWatchedModal.tsx`: `accessibilityViewIsModal` added to the **content GlassSurface** (`styles.sheet`), mirroring `MyReportsModal.tsx:274` — **never the backdrop**. Breadcrumb updated. New render guard (`MyWatchedModal.containment.test.tsx`, 1/1) asserts a node carries the flag.
- **[NEEDS-SKY-DEVICE]** R2-D18: VoiceOver stays inside the sheet until close (device proves containment; jest proves presence).
- **Post-verify tightening (`d43f867`, commit 6):** the guard was upgraded from an *existential* check to a *content-placement* check (the GlassSurface mock now tags its View with `testID`, and the test asserts THAT node carries the flag) — so it now fails if the prop were ever moved to the backdrop, not just if it vanished. Test-only; the containment code (`36586d4`) is unchanged.

### 4 · T20 dialog tier UNIFY — `e9e89c9`
- **[verified]** shared Map `nameCard` gains `...shadow.e3` (unconditional — solid-surface cards) → depth four-of-four; ProfileScreen tier-explainer + delete-account `animationType` `slide` → `fade` (RM ternary preserved) → entrance four-of-four. New guard `dialogTier.test.ts` (5/5) + `reduceMotion.modalGate.test.ts` still green (ternary intact).
- **[NEEDS-SKY-DEVICE]** the fade feel + RM-off (folds under R2-D6 / R2-D5); simulator-verifiable.

### 5 · T20 paper — `bd11d7d`
- **[verified]** `GLASS.md` §8 Home "chrome" → "row" (matches `HomeScreen.tsx:239` shipped truth); tab-bar cleanup line replaced with the **M-48 kill as self-contained prose** (guards the AA cliff); drawer + four-dialog-tier ratification notes added. `public/index.html` keep-in-sync comment enumerating the 11 distinct splash hexes + app.json literals — **comment-only, byte-identical** (15 insertions, 0 deletions).
- O-1 = INCLUDE → **no B14 line**. O-4 = UNIFY → **no dialog record-note**.

### 6 · DEPLOY-CHECKLIST + this evidence + DECISIONS append (untracked deliverables)
- `build-plan/DEPLOY-CHECKLIST.md` — merge (tip `bd11d7d`, pure-ff, bp12 dup-rebase flag) · the one build command (`testflight` profile, confirmed) · R2-D0…R2-D18 verbatim ordered D1→D4→D14 + the BP1–16 §D bucket roll-up + R2-D18 · open Sky items · evidence index.

---

## Gate results (final sweep at `d43f867`)

| Gate | Result |
|---|---|
| `npm run typecheck` | **0 errors** [verified] |
| `npm run lint` | **77 problems (0 errors, 77 warnings)** = baseline, **0 new** [verified] |
| `npm test` | **2057 passed / 84 todo / 146 suites / 0 fail** [verified] — baseline 2047 + **10 new guards** (T19 ×2, T15 ×2, containment ×1, dialogTier ×5); +2 suites |
| Arbiters | `r2-brand-cameo-stacks.json` **exit 0** · `r2-tabbar-ink-stacks.json` **exit 0** [verified] |
| M-48 trials | still **exit 1 by design** [verified] |
| 7 immutable prior stacks | **untouched** (diff-check: none in `8adb4d4..HEAD`) [verified] |
| Tracked diff scope | **12 intended files only** (`ThemeContext.tsx` NOT touched — hue unchanged); `.claude/launch.json` deletion NOT staged [verified] |

---

## Adversarial verify (ultracode, S-10)

Workflow `wf_5cdc7937-5ed` — **6 skeptics, all Opus 4.8 high effort**, one per commit + a whole-phase completeness/honesty/PROTECT/scope critic. Each was told to REFUTE (read the real code, re-run the gates/arbiters). **Result: 5 UPHELD (high confidence) + 1 minor DEFECT (fixed) + 1 nit (fixed); 0 blocker/major.**

- **T19** — UPHELD, 0 findings. Confirmed accentOrange unchanged both palettes, notification parity guard passes, `severity2Color()` returns the real `#F0A030`, marks theme-aware + About SR-hidden, arbiter honest (exit 0), About heroBadge really is a Lucide icon (not emoji), zero new strings.
- **T15** — UPHELD; 1 **nit**: the "~0.0995" luminance figure was ~2% high (actual ~0.098) in the arbiter `_doc` + this evidence → **corrected**. Confirmed `#515964` = 4.65/5.92, genuinely the lightest-with-margin (a 5% lighter step already fails 4.36), dark untouched, `#D1D1D1` math correct (round(255·0.82)=209=0xD1), M-48 trials still exit-1, `anonNeutral` NOT touched.
- **T20-containment** — **DEFECT (minor), FIXED in `d43f867`**: the guard's title/comment claimed "not the backdrop" but the assertion was existential-only (would pass even if the prop sat on the backdrop). The shipped code was verified correct (the prop reaches a native View via GlassSurface's `...rest`; mirrors MyReports). Guard re-scoped to a content-sheet `testID` assertion.
- **T20-dialog** — UPHELD, 0 findings. Confirmed four-of-four `shadow.e3` (Map `nameCard` + `tierSheet` + `deleteSheet`), both Profile dialogs slide→fade with RM ternary intact, the out-of-scope sign-in modal STILL slide (untouched), no 5th dialog missed, guards green, no bare literal.
- **T20-paper + DEPLOY-CHECKLIST** — UPHELD, 0 findings. Confirmed §8 Home matches `HomeScreen.tsx` `variant="row"`, the M-48 prose is self-contained + accurate, index.html byte-identical (0 deletions) with a correct hex enumeration, no B14 line, no record-note, the R2-D ledger + bp12 command + `testflight` profile + §P lineage all check out.
- **Completeness/honesty/PROTECT/scope** — UPHELD, 0 findings. The critic **independently re-ran typecheck/lint/jest/arbiters** and confirmed this evidence's numbers; verified `GlassSurface.tsx` untouched, RM ternaries preserved, no emoji added, 12-file scope, `launch.json` deletion unstaged, no immutable stacks touched, no invented copy, no fork decided.

## PROTECT + visual verification

No PROTECT surface was regressed — verified by mechanism, not pixels:
- **PROTECT-5** (arbitration + `GlassSurface.tsx` DO-NOT-EDIT): GlassSurface untouched (diff-check); two new arbiter siblings added, both exit 0; the 7 immutable stacks untouched. [verified]
- **PROTECT-7** (RM designed-stillness): the dialog fade change preserves every RM ternary — pinned by `dialogTier.test.ts` (5/5) + the global `reduceMotion.modalGate.test.ts` (no bare literal). [verified]
- **PROTECT-24** (Lucide house style): no decorative emoji added (LogoMark is an SVG brand mark); the BP16 emoji-census guard stays green. The About `heroBadge` "emoji" was already a Lucide icon (recon corrected). [verified]

**Pixel before/after frames were not generated.** Rationale (honest): BP17's changes are token / prop / doc-level and are fully covered by the arbiters (exact contrast), the new jest guards (props + RM ternary), and the diff-scope check; motion (fade vs slide) is not capturable in a static frame; and every visual (the two LogoMarks, the tab-ink shade, the dialog fade) is already a **NEEDS-SKY-DEVICE** eyeball item in the DEPLOY-CHECKLIST device gate. The static-export rig remains available if Sky wants frames.

---

## Proposed strings / new copy

**None.** BP17 adds zero user-facing copy — the LogoMarks add no text (the About mark is SR-hidden; the Profile mark reuses LogoMark's baked "AccessMap" label), T15/T19 are token/comment changes, T20 is mechanics + docs. Honesty fence satisfied trivially.

## For Sky to eyeball / decide (also in DEPLOY-CHECKLIST §4)
- 🔴 BP16 copy-gate string picks + Jordan sign-off (still owed — independent of BP17).
- The bp12 duplicate-commit rebase (pre-merge cleanup).
- The BP17 visual eyeball items on device (marks, tab ink, dialog fade) — the NEEDS-SKY-DEVICE legs above.
- T19 accentOrange shipped comment-only (hue-share accepted, recorded — no action).
