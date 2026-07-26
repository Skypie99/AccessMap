# R2 BUILD TRAIN — DEPLOY CHECKLIST (the one Sky fires from)

> Authored by **BP17** (the caboose), 2026-07-19. Provenance (S-10): this train was authored on Fable 5, executed on **Opus 4.8 ultracode max effort**. This file consolidates the whole R2 train's **merge → build → device gate** into one page. It lives in the untracked `design-reviews/` working tree (like `DECISIONS.md`), not the app repo history.
>
> **Nothing here is auto-run. Every step is Sky's hands: Sky merges, Sky builds, Sky owns the device gates.** (Const. Art. 1 — AccessMap is not on the Art. 17 delegated-merge grant.)

---

## 0 · What the R2 train shipped (the stack)

A linear stack on the audited base — one phase per branch, each built + green + STOPPED. **Tracked tip = `d43f867`** (BP17 commit 6, the post-verify guard tightening). §P lineage (base → tip):

| Phase | base → tip · date |
|---|---|
| BP1 (callout true) | `a8549ff` → `3d13c8b` · 07-16 |
| BP2 (perception floor) | `3d13c8b` → `373c582` · 07-17 |
| BP3 (trust hand) | `373c582` → `db61189` · 07-17 |
| BP4 / MP0 (first frame) | `db61189` → `c4d484f` · 07-17 |
| BP5 / MP1 (Home stage) | `c4d484f` → `31086fd` · 07-17 |
| BP6 / MP2 (Profile lists) | `31086fd` → `828f736` · 07-17 |
| BP7 / MP3 (overlay rest) | `828f736` → `db59980` · 07-17 |
| BP8 / MP4 (trust ledger) | `db59980` → `205108c` · 07-17 |
| BP9 / MP5 (Admin editorial) | `205108c` → `8a190a3` · 07-17 |
| BP10 (T5 severity grammar) | `8a190a3` → `d0ed1b1` · 07-17 |
| BP11 (T3 press vocab) | `d0ed1b1` → `8acb184` · 07-17 |
| BP12 (T6 status ledge) | `9d1ff85` → `705a798` · 07-17 |
| BP13 (T7+T9 arrival) | `705a798` → `6e8e636` · 07-18 |
| BP14 (T13+T14 frame) | `6e8e636` → `edfcb08` · 07-18 |
| BP15 (T12+T10 drawer+guest) | `edfcb08` → `c0ee449` · 07-18 |
| BP16 (T17+T18 copy gate) | `c0ee449` → `8adb4d4` · 07-18 |
| **BP17 (T19+T15+T20 hygiene+deploy)** | **`8adb4d4` → `d43f867`** · 07-19 |

**BP17's 5 commits:** `b11cd6f` T19 ghost hues + LogoMarks (comment-only) · `0ab983a` T15 tab-bar inactive ink (`#6B7280` → `#515964`) · `36586d4` T20 containment (MyWatched `accessibilityViewIsModal`) · `e9e89c9` T20 dialog tier UNIFY (fade + `shadow.e3` four-of-four) · `bd11d7d` T20 paper (GLASS §8 + index.html sync comment) · `d43f867` post-verify guard tightening (containment test → content-placement assertion).

---

## 1 · Sky's merge

1. **Pick the tip:** `r2/bp17-hygiene-deploy` @ **`d43f867`** — the whole train rides this one linear stack.
2. **Pure fast-forward expected** (the stack is linear from the base; no cross-merges).
3. ⚠️ **The bp12 commit-order wart — COSMETIC, does NOT block the build.** A concurrent BP11 agent's commit `eafd20e` ("r2/bp11 — T3: finish the estate") landed interleaved among the BP12 commits, so it **IS in the mainline history** (an earlier note here said "only on the side branch" — git ancestry disproves that: `git merge-base --is-ancestor eafd20e d43f867` = yes; verified 2026-07-19). It is **not** a functional duplicate within the stack — the tree at `d43f867` is correct and every gate is green — so the ff-merge produces a correct, buildable `main` either way. Options: **(a) merge as-is** — the only cost is one BP11-labelled commit sitting among BP12's in the log (harmless), or (b) tidy the attribution first via a deliberate history rewrite. ⚠️ Note `eafd20e` carries real BP11 content that is NOT elsewhere in the mainline, so a naïve `git rebase --onto 7de1f34 eafd20e …` would DROP that content — do not run it blind. **Recommendation: merge as-is; the wart is cosmetic and the build is unaffected.**
4. **Merge is Sky-only** (Const. Art. 1 / 17 — AccessMap has no delegated-merge grant).

**Rollback anchor (BP17):** base `8adb4d4` → `git reset --hard 8adb4d4` (+ force-with-lease if already pushed).

---

## 2 · The ONE build command

After the merge, one TestFlight build:

```
cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive
```

Then, to actually land it in **TestFlight** (the build step only produces the artifact — it does NOT auto-submit):

```
cd ~/AccessMap && npx eas-cli submit --platform ios --profile production --latest
```

**Sky's build, Sky's merge, Sky's submit — never auto-run.** (`testflight` build profile + the `submit.production.ios` config — appleId / ascAppId `6774709116` / teamId — both confirmed in `eas.json`. No web deploy and no *public* App Store release are part of this train.)

**expo-doctor (2026-07-20): 16/18 pass; the 2 failures are PRE-EXISTING and proven non-blocking** — (a) `app.json` `privacyPolicyUrl` is an unknown-to-schema key, but it is present at `main` (`373c582`) *and* at the audited base (`a8549ff`), so it was in place for the prior successful TestFlight build (`c64154cc`); (b) version drift vs SDK 54's expectations — `typescript` 6.0.3 (package.json deliberately pins `~6.0.0`; dev-only, Metro/Babel strip types, EAS never typechecks) and `expo` 54.0.35 vs 54.0.36 (a patch inside the `~54.0.0` pin). **Decisive:** the train changed **zero** dependencies — `git diff 373c582 d43f867 -- package.json package-lock.json` is empty — so the build environment is identical to the one that already shipped successfully.

**Pre-flight verified 2026-07-19 (so this build succeeds):** ff-merge is clean (main `373c582` is an ancestor of `d43f867`) · `testflight` profile is `distribution: store`, `autoIncrement: true` (buildNumber auto-bumps — no collision), Release config, and **builds WITHOUT auto-submitting** (no `autoSubmit`; `eas submit` is a separate step) · `.env` present (Supabase `EXPO_PUBLIC_*` bake in) · JS gates green at `d43f867`. **Two Sky-side prerequisites the CLI needs:** you're logged in (`eas whoami`) and your iOS distribution creds are on EAS (they are, from the prior `c64154cc` build) — with `--non-interactive`, a missing cred would fail rather than prompt.

---

## 3 · The device gate — R2-D0 … R2-D18

Every gate below waits on the single TestFlight build above. **Order: R2-D1 (highest stakes) → R2-D4 (privacy) → R2-D14 (the material train) first**, then the rest. D9 / D10 are already CLOSED (Sky device reads, recorded — not re-listed here).

> **R2-D1 — THE SINGLE HIGHEST-STAKES CHECK.** L6-04 / S13 Tasks-card-action VoiceOver flattening: are Verify / Resolve / Reject / Details independently focusable, or does the `accessible` parent collapse them? (T8's spoken recompose rides this exact check.) · **Fed by BP3.**

> **R2-D4 — THE PRIVACY GATE.** EXIF-strip GPS removal on a real photo after upload (the strip-by-re-encode is code-confirmed; on-device removal is device-only).

> **R2-D14 — the material train's own gate.** Dark-launch first frame (M-56); Home stage in both palettes; frost/perf feel of the engineered sheet tier over live content; an RT sweep (OS + Settings toggle); a VoiceOver walk of FlagDetail post-MP4. · **Fed by BP4, BP5, BP6, BP7, BP8, BP9.**

Then, in ledger order:

> **R2-D2** — SignIn `accessibilityViewIsModal` containment.
> **R2-D3** — native VoiceOver truth broadly (~30 state sites, announce dual-wiring, legend backdrop sibling, every RN-web-artifact caveat). · **Fed by BP2, BP15 (guest header), BP16 (announce gate).**
> **R2-D5** — native reduce-motion feel (instant cut vs swooping arc on the FIND payoff).
> **R2-D6** — Reduce Transparency posture (the glass surfaces' C-lite fallback under iOS Reduce Transparency). · **Subsumes the T2/T5/T20 RT legs — incl. BP17's dialog-tier fade under RM.**
> **R2-D7** — real Dynamic Type (native per-variant caps ~1.5–1.6; header collision at the capped size). · **Fed by BP14.**
> **R2-D8** — iOS light Apple-tile pin/ring visuals (anon ring, pin hairline; the on-device light-tile regime the harness can't render).
> **R2-D11** — real-tile / runtime states on device (single-pointer zoom-out, pinch/VoiceOver, Split View / true-320pt, tap-swallow, announcement timing, poor-signal ceiling). · **Fed by BP14 (overflow scent).**
> **R2-D12** (T1) — native Callout occlusion on top-third pins, both themes, RM on/off; rapid Nearby A→B yields B only; theme-flip continuity (map never blanks). · **Fed by BP1.**
> **R2-D13** (T3/T4) — the press-vocabulary felt dialect across drawer row / Map tool / tab / filter chip; press-in haptics on the pickers; the tab-press haptic; RM-on dims still answer. · **Fed by BP11.**
> **R2-D15** (T5) — the auth-fenced grammar surfaces (Profile pill, MyReports, MyWatched, the detail chip, the Tasks pill): Sky signs in, VoiceOver pass, both themes. · **Fed by BP10. Also picks up BP17/T19's signed-out Profile LogoMark + T20 dialog fade.**
> **R2-D16** (T6) — the status-ledge placement on device (no header collision; SR announce timing preserved through the reposition). · **Fed by BP12.**
> **R2-D17** (T7) — closes 02 honesty-ledger #16: does the native denied-arrival banner render-then-clear on this reach, or require a state the harness missed? + the no-location single voice. · **Fed by BP13.**
> **R2-D18** (T20 — BP17's own leg) — **MyWatched `accessibilityViewIsModal` native containment**: VoiceOver stays inside the sheet until close, side-by-side with MyReports. (jest proves presence; device proves containment.)

**BP17-specific device eyeball items (fold into the gates above):**
- **T19 marks** (→ R2-D15 / a light eye-pass): the signed-out Profile brand LogoMark (~56pt, colour pin light / white knockout dark) reads right on the guest stage both themes; the small About-title mark reads right on the bulk sheet; the auth-fenced MyWatched **orange-adjacency** row — one amber Star ("watched") never reads as a severity-2 disc (structurally defused by the numbered discs). Android notification tint shows the new `#1466E0` **if an Android device is available** — else it ships code-verified as hex parity with the front-door set.
- **T15 ink** (→ R2-D14 / a glance): the light-mode inactive tab labels read cleanly over dark photos / dark web tiles (the composites that failed AA before). Code-verified by the arbiter; a device glance is welcome, not required.
- **T20 dialog fade** (→ R2-D6 / R2-D5): the tier-explainer + delete-account dialogs now fade in (were slide); RM on = no entrance motion. Simulator-verifiable; a device feel is a bonus.

---

## 4 · Open Sky items at close

- 🔴 **BP16 copy-gate string picks + Jordan sign-off (STILL OWED).** BP16 shipped its two mechanics (T17 Bell, T18 announce-gate) but **zero strings** — its 30-mechanical + 3-taste string table is PROPOSED, waiting on Sky's §A per-row picks + a recorded Jordan Art. 7 k≥3 sign-off (the k≥3 caveat rewording is the privacy disclaimer). Picks land under DECISIONS §A "SKY'S PICKS LAND BELOW THIS LINE" (line 149); then re-fire BP16's resume (item 4) to ship the strings. **Independent of BP17** — the train can merge without it, but the copy stays un-shipped until Sky acts.
- **The bp12 duplicate-commit rebase** (§1 step 3) — a one-line pre-merge cleanup on the side branch.
- **T19 accentOrange — RESOLVED comment-only (recorded, no action).** Sky picked comment-only this session: the brand amber (`#f1a520`) knowingly shares the sev-2 band; the numbered-disc grammar defuses it. No hue moved; the stale comment was corrected. (If Sky ever wants the hue-nudge instead, it's a fresh fork with an arbiter mockup gate.)
- **Unanswered forks (§F).** Forks 1–13 remain Sky's, carried forward untouched (proximity/geo · points economy · auth-wall/guest · k-anonymity · trust-model scope · product name · stagePoolB · dark saved-place chips · ui/Button · M-12/M-13 swap · bulk mechanism lever · M-37 locked rows · lightbox blacks). No phase answers a fork.
- **Recorded-not-scheduled notes** (adversarial-skeptic surfaced across phases; none a regression): BP10 two un-enriched spoken severity labels; BP11 stale animation comment; BP15 drawer-effect cleanup (unreachable); BP16 stale SettingsScreen comment. A future hygiene sweep could close them.

---

## 5 · Per-phase evidence index

Every phase's proof (what shipped · per-gate results · honest tags · PROTECT before/after · device items):

`design-reviews/r2-audit/build-plan/evidence/BP01-verification-evidence.md` … `BP16-verification-evidence.md` (16 files, one per phase) **+ `BP17-verification-evidence.md`** (this phase).

BP17 also carries its named arbiter siblings under `design-reviews/r2-audit/tools/`: `r2-brand-cameo-stacks.json` (T19) and `r2-tabbar-ink-stacks.json` (T15), both exit 0.
