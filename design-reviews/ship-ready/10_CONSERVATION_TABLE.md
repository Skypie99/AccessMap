# SHIP-READY — 10 · THE CONSERVATION TABLE

**Built 2026-07-27** at branch `shipready/3-polish-submission` tip **`6657d4f`** (base `main == 512494a`).
Provenance: Opus 5. Method: **verify-first** — every FIXED row was checked against `git show` and/or the
live source at HEAD, not against a doc's own claim. Where a doc's claim did not survive, the row says so
and §7 lists it.

**Nothing was committed. One file was written (this one).**

---

## Legend — the disposition vocabulary

| Tag | Means |
|---|---|
| **FIXED** | A commit on this branch (or the Phase-2 branch below it), or an applied live-DB migration ledger row, closes it. SHA / ledger name given. |
| **ROUTED** | Belongs to another in-flight train (BP16 · R2 · device-tune · `fix/fmt-xcode26-local-sim` · `fix/photo-privacy-sanitize` · F-22 parked). |
| **FORKED** | An artifact is written and ready; Sky picks. Artifact path given. |
| **SKY-SIDE** | Only Sky can do it — dashboard, ASC, wording, credentials, or a device she holds. |
| **DEFERRED** | Consciously not done, with the stated reason quoted. |
| **DEFERRED·OPEN** | ⚠ **Sky PICKED it and it is demonstrably NOT built at `6657d4f`.** Not a closed row — still owed. |
| **FALSIFIED** | Checked and proved wrong. |
| **CLOSED-VERIFIED** | Checked; the substance was confirmed correct-as-shipped or the row was a question answered, so no work is owed. Distinct from FALSIFIED. |

> **Two tags are not in the six the brief named — `DEFERRED·OPEN` and `CLOSED-VERIFIED` — and that is
> deliberate.** Folding "Sky picked it, nobody built it" into DEFERRED would have hidden 15 still-owed items,
> and calling "we checked and it was fine" FALSIFIED would have been a lie in the other direction. Both are
> flagged here rather than smuggled in.

---

## §1 HEADLINE COUNT

**Universe: 117 SR findings (SR-001 … SR-117, contiguous, no gaps)** + 7 BLOCKING rows (B-1…B-7) + 15
RECOMMENDED rows (R-1…R-15). B-* and R-* rows **alias** SR ids and are not counted again; B-3 is the one
B/R row with **no** SR alias (see §2).

| Disposition | Count | Share |
|---|---|---|
| **FIXED** | **26** | 22% |
| **DEFERRED** (reason stated) | **43** | 37% |
| **DEFERRED·OPEN** ⚠ (picked, unbuilt) | **15** | 13% |
| **POSSIBLY DROPPED** (no disposition found anywhere) | **12** | 10% |
| **CLOSED-VERIFIED** | **10** | 9% |
| **SKY-SIDE** | **7** | 6% |
| **FALSIFIED** | **2** | 2% |
| **FORKED** | **1** | 1% |
| **ROUTED** | **1** | 1% |
| **COULD NOT DETERMINE** | **0** | 0% |
| **TOTAL** | **117** | 100% |

**Two of the 7 BLOCKING rows are still open** (B-1 code, B-3 + B-6 wording/credentials → 3 rows if you count
Sky's). **Zero** findings were unresolvable — but 12 were never disposed by any document, which is the
finding of this exercise (§6).

---

## §2 THE BLOCKING TABLE — B-1 … B-7, true status at `6657d4f`

| # | Gap | SR alias(es) | TRUE STATUS | Evidence (verified) |
|---|---|---|---|---|
| **B-1** | UGC moderation absent (Apple 1.2) | **SR-001** (+SR-050 evidence) | 🔴 **BLOCKING-OPEN** — 1 of 4 legs has a mechanism, none has a user-facing control | (a) filter: **not addressed**, unspecced. (b) report: design decided (`DECISIONS §SKY-3g` Option-B encode-in-body), **unbuilt** — grep for `[REPORT]`/`reportAbuse` in `src/` = **0 hits**. (c) hide: mechanism `bf2b36d` `src/lib/hiddenContent.ts` — **verified 0 importers outside its own test**, so no affordance. (d) contact info: plausibly met. DB half only: ledger `sr001_admin_delete_comment_20260727` (C-8). `07 §4`: *"Any report that closes B-1 on the strength of W1 is wrong."* |
| **B-2** | Privacy policy not linked in-app (5.1.1(i)) | SR-002 | ✅ **FIXED** | `51041ec`; verified live: `PRIVACY_POLICY_LINK_LABEL` consumed in `AboutScreen.tsx:152`, `SignInScreen.tsx:275`, `SettingsScreen.tsx:35` + `src/lib/links.ts` |
| **B-3** | Privacy policy content drifted 6 ways | **— none** | 🔴 **SKY-SIDE, OPEN** | `04 §A-14` (line 240 records SR column literally as `—`). Wording only; nothing was authored for her anywhere in this audit (honesty fence held) |
| **B-4** | App icon has an alpha channel (ITMS-90717) | SR-011 | ✅ **FIXED — upload still unproven** | `0a6a38c` (icon 25540→17211 bytes + `appConfig.guard.test.ts`). `J2-6`: only an EAS build closes ITMS-90717 |
| **B-5** | iPad orientation config (ITMS-90474) | SR-012 | ✅ **FIXED** | `a2fc50c`; verified `app.json:18` `"supportsTablet": false` |
| **B-6** | Reviewer demo account is dead credentials (2.1(a)) | SR-017 | 🔴 **SKY-SIDE, OPEN** | `05 §3 ⑤`; migration is PROPOSE-ONLY and needs an Auth-dashboard step no agent may take |
| **B-7** | Comments dead in production for every cohort (PGRST201) | SR-092 | ✅ **FIXED** | `d327b7e`; verified `src/lib/comments.ts:28-29` `COMMENT_SELECT` = `users!flag_comments_user_id_fkey(display_name)`, used at `:101` **and** `:127` (both sites — `J2-3`) |

**Plus one blocking GATE that is neither B-* nor SR-*:** `DECISIONS §SKY-3d` **D-B6** — Help/About close-✕ on a
real device at AX5. ⛔ *"Phase 3 may NOT be marked complete … until Sky signs off."* If it CLIPS, **R-6/SR-099
upgrades from RECOMMENDED to BLOCKING.** Status: **UNVERIFIED — no build exists.**

---

## §3 THE RECOMMENDED TABLE — R-1 … R-15, true status at `6657d4f`

| # | Gap | SR alias(es) | TRUE STATUS | Evidence (verified) |
|---|---|---|---|---|
| **R-1** | Account-deletion Storage residue | SR-049 + SR-051/059/060/061/062 | ⚠ **DEFERRED·OPEN** — Sky picked "artifact only"; artifact **not written** | `§SKY-3h` picked it; `HANDOFF` ledger *"Class A … not started"*. Verified: `supabase/functions/` = `delete-account`, `notify-flag-status`, `send-push-notification` — **no Storage-sweep function**; `delete-account/index.ts` has **zero** `storage`/`flag-photos`/`avatar` references |
| **R-2** | Guest reviewer-path honesty cluster ×4 | SR-093/094/095/041 | ⚠ **DEFERRED·OPEN** — picked, unbuilt | `§SKY-3h` BUILD; `HANDOFF` Class A not started. Verified unchanged: `FlagDetailModal.tsx:639` `handleReopenSubmit` still silently returns · `StatusHistoryModal.tsx:180` still says *"History not yet enabled"* · `HomeScreen.tsx:140` `askedForLocation` one-shot intact |
| **R-3** | Server-side anon throttle is a NULL-collapse no-op | SR-007, SR-087 | 🟡 **SPLIT: SR-007 FALSIFIED · SR-087 FIXED** | SR-007: `§SKY-3` C-5 **SKIP** — three live BEFORE INSERT throttles exist incl. `enforce_global_anon_rate_limit` at **100/h**; applying C-5 would have *tightened* live 100→60. SR-087: ledger `a2_2_feedback_anon_throttle_20260727` |
| **R-4** | Read `flags_user_scoped` before trusting any RLS conclusion | SR-039 | ✅ **CLOSED — gate PASSED** | `§SKY` RLS pre-check 2026-07-26: `ALL`/`{PUBLIC}` but **owner-scoped** (`user_id = auth.uid()`) ⇒ 04b §F-1's CRITICAL "any signed-in user can DELETE any flag" hypothesis **FALSIFIED**. SR-039's own drift (§F-3 pg_dump regeneration) stays DEFERRED |
| **R-5** | The SQL null-safety artifact slate | SR-008/086/088/090 (+024, 083, 084, 085) | ✅ **MOSTLY FIXED** — 10 of 11 artifacts applied; 2 defects never got an artifact | Ledger `20260727075327`–`20260727075821`: C-2, Fork-2/OA+C-9(ii), C-10, C-3, C-4, C-6, C-7, C-8, C-9(i), C-11, W1. **C-5 skipped** (SR-007 falsified). **SR-083 (A1-5) and SR-085 (A1-7) are inside R-5's "7 defects" count but have NO artifact in 04b §C** — DEFERRED by omission |
| **R-6** | Sheet-overflow class | SR-099 (mechanism for SR-064) | ✅ **FIXED — pending the D-B6 device gate that can re-upgrade it** | `9235e3b`, **5 surfaces** (`J2-5` added `ui/Sheet` + FeedbackModal's KAV). Web-verified About ✕ −65→97, Help −53→97. ⛔ `§SKY-3d` |
| **R-7** | Password reset absent | SR-052 | ⛔ **DEFERRED — explicitly NOT picked** | `§SKY-3h`: *"R-7 password reset was NOT picked — deferred with reason, not dropped."* Verified: `resetPasswordForEmail` = **0 hits** repo-wide |
| **R-8** | Durable privacy manifest + honest purpose strings + dead dep | SR-003/004/005/016 | ✅ **FIXED** | `0b871cf` (verified `app.json:28` `privacyManifests`, `:140` `microphonePermission: false`) + `1e2d67d` (`expo-media-library` gone from `package.json`; `J2-8` — its two dead `jest.mock()` blocks had to go in the same commit) |
| **R-9** | The dismissal-spec mechanical pass | SR-063/065/066/067/069/070 (+068) | ✅ **MOSTLY FIXED** — G1/G2/G9 done, G5 3-of-4, G3 forked, G4 deferred | Escape ×32: `ca9b1ce` `da972ae` `b653603` `7b6cd49` `6d51254` `0a7a1bb` + census guard `4f7ad5e`. G2 `6d51254`. G9 `44a62e0`. G5 `1d8237c` `cf0aff9` `47a4810` `4e8e229` `4e653cc` `0e27df2` + 5 fix commits. G3 → `08_G3_GRABBER_ARBITER.md`. **`J2-1`: 03's G1 as written would have shipped zero behaviour with every guard green** |
| **R-10** | Points client-writable (leaderboard/tier forgery) | SR-048 | ⚠ **DEFERRED·OPEN — HIGH, and the routing was never executed** | 05 said it *"attaches as new context to Fork-2's option set"*. **Verified: grep of `fork-briefs/2026-07-16_AccessMap_Fork_Decision_Briefs.md` for SR-048 / "points writable" / "write-auth" returns ZERO hits.** No C-artifact in 04b §C either. See §7 |
| **R-11** | Crash reporting decision | SR-006 | 🟡 **HALF FIXED · half SKY-SIDE** | Comment half `b7a8398`. `J2-7`: *"R-11's crash reporter was **not** added despite Sky's ADD pick: it is a native module plus a DSN credential, and no agent handles credentials."* |
| **R-12** | Ship-command mismatch | SR-015 | ✅ **FIXED — was under-reported** | `40cccf1`; verified `package.json:22` chains `build:testflight` + `submit --profile production`. `07 §5`: the internal-distribution half was in **no** Phase-1 row |
| **R-13** | Web-cohort HIGH pair | SR-104/105 (+SR-100/106/107) | ⚠ **DEFERRED·OPEN** — the pair was picked, unbuilt; the 3 MEDs were not picked | `§SKY-3h` BUILD SR-104+105; `HANDOFF` Class A not started. Verified: `useScreenReader` in `src/lib/accessibility.ts` still calls `AccessibilityInfo.isScreenReaderEnabled()` with no web branch; `MapScreen.tsx:1495-1510` fit-flag pattern unchanged |
| **R-14** | Duplicate webhook triggers | SR-089 | ✅ **FALSIFIED** | `J3-5`: *"exactly one webhook trigger exists on `public.flags`, and there is no dashboard `supabase_functions.http_request` trigger, so SR-018's 'literal secret in `pg_trigger.tgargs`' has no live object on this table."* The *`updated_at`* duplicate is **confirmed and harmless** (identical bodies) |
| **R-15** | Dead-table disposition ×4 | SR-009/084/098/020 | ✅ **DECIDED — KEEP** | `§SKY`: *"R-15 dead tables: KEEP — flag_verifications reserved for C1 (documented)."* SR-009 additionally FIXED (C-2). SR-098's damage neutralised by `d327b7e`. SR-084's NULL-collapse left unfixed by design (*"same fix shape as §C-3 if ever revived"*) |

---

## §4 THE FULL SR TABLE — SR-001 … SR-117

Applied-SQL rows cite a **live migration ledger name**, not a repo file: `§SKY-3`/`J3-1` applied them via
`apply_migration`, so the repo carries only the drift-capture snapshots (`supabase/migrations/2026-07-27_drift_capture_*.sql`, 6 files, verified present).

| SR | One-line | Disposition | Evidence |
|---|---|---|---|
| 001 | UGC moderation absent — no report / block / filter / ToS (Apple 1.2) | **DEFERRED·OPEN** 🔴 | B-1 BLOCKING-OPEN; DB half ledger `sr001_admin_delete_comment_20260727`; 1.2(c) mechanism `bf2b36d` w/ 0 importers; 1.2(b) design `§SKY-3g`, unbuilt |
| 002 | Privacy policy URL never linked in-app | **FIXED** | `51041ec` |
| 003 | `ios/` gitignored ⇒ hand-written privacy manifest never ships | **FIXED** | `0b871cf` (`app.json:28`) |
| 004 | `NSPrivacyCollectedDataTypes` empty vs actual collection | **FIXED** | `0b871cf`; guards assert 7 collected types, Diagnostics/Usage absent |
| 005 | 4 boilerplate purpose strings regenerate on prebuild (incl. microphone) | **FIXED** | `0b871cf` (`app.json:140` `microphonePermission:false`) |
| 006 | No crash reporting; stale `App.tsx` comment claimed Sentry | **SKY-SIDE** | comment half `b7a8398`; `J2-7` native module + DSN credential |
| 007 | Server anon throttle is a NULL-collapse no-op | **FALSIFIED** | `§SKY-3` C-5 SKIP — 3 live throttles incl. global anon 100/h; banked `bfc1f66` |
| 008 | Points-trigger actor guard NULL trap (`<>` vs NULL) | **FIXED** | ledger `fork2_oa_actor_guard_null_safe_plus_status_history_20260727`; rollback `ad09a24` |
| 009 | `flag_verifications` INSERT policy NULL-collapse | **FIXED** | ledger `sr009_flag_verifications_null_safe_20260727`; rollback `40433e0` |
| 010 | Account deletion present end-to-end; gaps listed | **CLOSED-VERIFIED** | `01 §P`: present + FK-safe (13 FKs all CASCADE/SET NULL); gaps re-homed as SR-049/059/060/062 |
| 011 | App icon has an alpha channel (ITMS-90717) | **FIXED** | `0a6a38c`; upload proof still owed (`J2-6`) |
| 012 | portrait + `supportsTablet:true` + no `requireFullScreen` (ITMS-90474) | **FIXED** | `a2fc50c` |
| 013 | No dark splash variant | **DEFERRED** | `05 §5` code hygiene — *"none block submission"* |
| 014 | Android `adaptiveIcon` lacks `foregroundImage` | **DEFERRED** | `05 §5`; Android-only note |
| 015 | `deploy:testflight` targets a submit profile that doesn't exist | **FIXED** | `40cccf1` (`package.json:22`) |
| 016 | `expo-media-library` in deps, zero imports | **FIXED** | `1e2d67d` |
| 017 | Reviewer demo account = dead credentials | **SKY-SIDE** | B-6; `05 §3 ⑤` Auth-dashboard step |
| 018 | Push: entitlements / APNs / webhook-secret status check | **SKY-SIDE** | oracle leg FIXED (ledger `sr018_verify_webhook_secret_revoke_20260727`); `tgargs` leg **FALSIFIED** (`J3-5`); APNs + entitlements remain `05 §3 ⑬` |
| 019 | Two stale claims (TestFlight doc "requires sign-in"; `listFlags` docblock) | **DEFERRED** | `05 §5` hygiene. **Verified still stale:** `docs/TESTFLIGHT_ACTION_ITEMS.md:127` *"requires users to sign in before using any features"* · `src/lib/flags.ts:898` *"only authenticated users can read"* |
| 020 | `PUSH_NOTIF_TYPES_ENABLED:false` hides a dead settings surface | **DEFERRED** | R-15 → `§SKY` KEEP; the dead surface itself is a completeness row |
| 021 | Binary-launch evidence NONE this train | **SKY-SIDE** | `05 §6` 10-line smoke script; first proof = Sky's next EAS build. **Still true — no build exists** |
| 022 | Age-rating questionnaire unanswered | **SKY-SIDE** | `04:263` + `05 §3 ⑧`; sheet ready (§A-Sheet-B) |
| 023 | `ITSAppUsesNonExemptEncryption:false` sufficiency | **CLOSED-VERIFIED** | `04 §A-10` **PASS**, `04:93` B-13 PRESENT |
| 024 | `flag_photos` junction policies NULL-collapse for anon flags | **FIXED** | ledger `sr024_flag_photos_anon_explicit_20260727`; placeholder date resolved at Sky's instruction |
| 025 | `GUEST_SIGNIN_ENABLED` dead config | **CLOSED-VERIFIED** | `01:197` zero consumers; real gate is `App.tsx:146`. Extension found: `PUSH_NOTIFICATIONS_ENABLED` also dead |
| 026 | Sign in with Apple not required (4.8 N/A); no password reset | **CLOSED-VERIFIED** | `04 §A-8` N/A-PASS. Reset leg re-homed as SR-052 |
| 027 | 0/33 modal surfaces implement `onAccessibilityEscape` | **FIXED** | 32/32 live surfaces — 6 commits + guard `4f7ad5e`; census `06 §1` |
| 028 | Swipe-dismiss exists on exactly 1 surface | **CLOSED-VERIFIED** | refined to SR-069 (3 pageSheets); `06 §2` declares SWIPE `N/A` on 29/32 as a **positive assertion**, guards E+F |
| 029 | `accessibilityViewIsModal` missing on the 2 Name-this dialogs | **FIXED** | `6d51254` (G2); MapScreen had **zero** AVM before |
| 030 | Backdrop tap-to-close on only 4/33 surfaces | **CLOSED-VERIFIED** | `03:140`+`:162` — exactly 4 sites, 3 deliberately a11y-hidden, *"no change recommended"* |
| 031 | No in-app RM/RT affordance; C-lite undiscoverable long-press | **CLOSED-VERIFIED** | `01:198` — *"Discoverability is intentional, not a gap"* (GLASS.md on-device A/B) |
| 032 | ResourcesScreen: all 6 cards have `url` unset | **CLOSED-VERIFIED** | `01:199` — genuinely non-pressable info cards, **zero dead links**; downgraded to content-completeness TODO(Sky) |
| 033 | box-none root-overlay law comment-enforced only | **DEFERRED** | closed-verified at `512494a` (`01 §M`, 6 sites); coverage gap on `05 §5` engineering guards; device row D-B12 |
| 034 | 44pt floor has no automated guard | **DEFERRED** | `05 §5` engineering guards |
| 035 | Cold-start first-run path untested as a path | **SKY-SIDE** | `05 §6` script line 1 (airplane-mode cold launch) |
| 036 | Anon rate-limit AsyncStorage key unnamespaced | **DEFERRED** | `05 §5` hygiene; wiring confirmed `01 §M` |
| 037 | `recordAnonSubmit()` silent on write failure | **DEFERRED** | `05 §5` hygiene |
| 038 | No E2E harness (no Detox/Maestro) | **DEFERRED** | `05 §5` — *"the un-mocked-Supabase gap SR-092 exposed is the argument"* |
| 039 | `schema.sql` self-declared incomplete; repo can't replay live | **DEFERRED** | R-4 gate PASSED (`§SKY`) ⇒ §F-1's CRITICAL hypothesis falsified; §F-3 pg_dump regeneration on `05 §5` |
| 040 | "Clear search" unreachable to VoiceOver (nested Pressable flattening) | **POSSIBLY DROPPED** ⚠ | Raised `01:15` MED. Appears in 05 **only** as the range endpoint "SR-040…110" in §8. No row in §1–§7 |
| 041 | Home "Use my location" is a silent dead control after denial | **DEFERRED·OPEN** | R-2 member; `§SKY-3h` BUILD; unbuilt (`HomeScreen.tsx:140`) |
| 042 | Row SR labels speak abbreviated distance, not `speakDistance()` | **POSSIBLY DROPPED** ⚠ | `01:17`; `01 §H` device item 1 — `01 §H`'s device list was never folded into `05 §7` |
| 043 | Home count/CLOSEST computed over the page-1 (50-row) window | **DEFERRED** | `05 §5` — *"Latent today (prod = 9 flags)"* |
| 044 | Home never revalidates (no pull-to-refresh, no focus refetch) | **DEFERRED** | `05 §5` improvement slate |
| 045 | AddressSearchModal results FlatList never got the M13 `flexShrink` | **POSSIBLY DROPPED** ⚠ | `01:20`; `01 §H` device item 3, not in `05 §7` |
| 046 | Onboarding card index desync on rn-web momentum | **POSSIBLY DROPPED** ⚠ | `01:21`; `01 §H` device item 4, not in `05 §7` |
| 047 | Nominatim courtesy edges (debounce, UA stripped on web) | **CLOSED-VERIFIED** | `01:22` — *"Compliant in spirit; UA, 8 s timeout and abort plumbing all correct"* |
| 048 | `users.points`/`streak_days` client-writable ⇒ leaderboard forgery | **DEFERRED·OPEN** ⚠ **HIGH** | R-10. **05's routing was never executed** — fork brief has 0 SR-048 hits; no 04b §C artifact. See §7 |
| 049 | Account deletion never touches Storage — face photo public forever | **DEFERRED·OPEN** | R-1 picked artifact-only; **no artifact written**; `delete-account/index.ts` has 0 storage refs |
| 050 | Admin takedown structurally incomplete — photo stays public | **POSSIBLY DROPPED** ⚠ **HIGH** | `01:146`; explicitly *"(SR-001 evidence)"*. **Absent from 05 entirely.** `removeUploadedFlagPhotos` exists (`flags.ts:861`) and is still not wired into `deleteFlag`. See §6 |
| 051 | Delete-account dialog stays open with an enabled Delete on the pending path | **DEFERRED·OPEN** | R-1 alias; `05 §7` Session B device leg; code unbuilt |
| 052 | No password recovery; re-signup is an indistinguishable dead end | **DEFERRED** | `§SKY-3h`: *"R-7 password reset was NOT picked — deferred with reason, not dropped."* Verified 0 hits |
| 053 | Two conflicting streak systems (local visit vs server contribution) | **DEFERRED** | `05 §5` trust/product coherence (PROTECT-8 single-source) |
| 054 | Email field never disables autocorrect | **SKY-SIDE** | `05 §7` Session B device row + `05 §3 ④` Confirm-email dashboard read |
| 055 | Leaderboard initials use `slice(0,2)` — re-introduces F59 mojibake | **POSSIBLY DROPPED** ⚠ | `01:156`; on the **public** ranking. Absent from 05 |
| 056 | Profile effects key on the `user` object ⇒ hourly token refresh refetches | **POSSIBLY DROPPED** ⚠ | `01:157`; same class F55 already fixed in `App.tsx`. Absent from 05 |
| 057 | Two Profile preference failures silent on web (raw `Alert.alert` on rollback) | **POSSIBLY DROPPED** ⚠ | `01:158`. 05 §5 names SR-102/103 for this exact class but not SR-057 |
| 058 | `A11yLiveRegion` retains its last announcement forever | **DEFERRED** | `05 §5` a11y polish |
| 059 | `delete-account` asserts a `verify_jwt` precondition in no config.toml | **DEFERRED·OPEN** | R-1 cluster; artifact B-γ specced in `04 §B`, **not written** — verified `supabase/config.toml` does not exist |
| 060 | Deletion-cascade doc drift (omits `flag_comments`, `point_events`, …) | **DEFERRED·OPEN** | R-1 cluster; also `05 §5` hygiene pairing with SR-019 |
| 061 | Old avatars never reclaimed (`upsert:false`, no `.remove()`) | **DEFERRED·OPEN** | R-1 cluster; compounds SR-049 |
| 062 | "Get in touch with support" sentence has no address/link | **DEFERRED·OPEN** | R-1 cluster; dialog also covers the header Feedback control |
| 063 | `onAccessibilityEscape` absent on all 32 modals | **FIXED** | 32/32; `06 §1`; `J2-1` moved every handler to the containment node |
| 064 | Help close ✕ renders outside the viewport (y = −53) | **FIXED** | `9235e3b`; mechanism folded into SR-099 (class of 5 surfaces) |
| 065 | Both Name-this dialogs lack AVM | **FIXED** | `6d51254` (G2) |
| 066 | Focus-return-to-trigger exists only on the drawer (31 of 32 missing) | **FIXED (partial, counted)** | 3 adoptions `1d8237c` `cf0aff9` `47a4810` `4e8e229` `4e653cc` + guard J `0e27df2` + 5 fixes. Residue **3 adopted / 1 re-deferred with reason / 27 remainder** (`06 §3`, `09`) |
| 067 | Nearby: focus lands on `BODY` after Close (the only web-verified failure) | **FIXED** | `47a4810`; + `dfebc65` armed the screen-reader **auto-open** path that had no press |
| 068 | `ReportFlagModal.onRequestClose` unguarded mid-submit | **FIXED** | `44a62e0` (G9); verified live at `ReportFlagModal.tsx` `onRequestClose={() => { if (!submitting) onClose(); }}` |
| 069 | 3 pageSheets swipe, none shows a grabber | **FORKED** | `08_G3_GRABBER_ARBITER.md` — 4 options tabled, ink decided (`inkGlassMuted`, worst case 4.81/5.43). **No code by design** (`J2-12`) |
| 070 | No focus-on-open on the card dialogs | **DEFERRED** | `05 §5` (G4). Count corrected `06 §1`: 03's "17" is reproducibly **15** card-dialog-classed / **26** total |
| 071 | Bulk bar is not a Modal ⇒ Android back doesn't clear selection | **DEFERRED** | `05 §5` (G8 bulk-bar BackHandler) |
| 072 | LegendModal card-shell tap-swallower is the app's only unlabeled interactive element | **DEFERRED** | `05 §5` a11y polish (test gap confirmed) |
| 073 | Two raw `backdropFilter` sites bypass GlassSurface + `useReduceTransparency` | **DEFERRED** | `05 §5` a11y polish (RT-bypass shape) |
| 074 | `accessibilityActions` used nowhere ⇒ ~5 VO swipes per Tasks card | **DEFERRED** | `05 §5` — *"PROTECT-adjacent — Dani/Sky judgment"* |
| 075 | Three `SeverityDisc` sites pass no `maxFontSizeMultiplier` | **DEFERRED** | `05 §5` a11y polish |
| 076 | Four bulk-action labels rely on `adjustsFontSizeToFit` (unimplemented on rn-web) | **DEFERRED** | `05 §5` a11y polish |
| 077 | `ctaFillPressed` comment claims 7.5:1; computed **7.00:1** | **POSSIBLY DROPPED** ⚠ | `02:68` + a 2nd site added at `02:110`. **Verified BOTH still stale:** `src/theme.ts:252`, `src/theme/ThemeContext.tsx:188`. Absent from 05 |
| 078 | `tabBarAllowFontScaling:false` — the app's only total scaling suppression | **DEFERRED** | `05 §5`; bears on the "Larger Text" nutrition label (§A-6) |
| 079 | Settings never announces a state change | **DEFERRED** | `05 §5` a11y polish |
| 080 | Photo alt text is positional only ("Photo 2 of 3") | **DEFERRED** | `05 §5` — *"a data-model limit … not a coding miss"* |
| 081 | `SeverityBadge` `showLabel` pill can push its sibling title out | **DEFERRED** | `05 §5` a11y polish |
| 082 | `FlashBanner` is the only RM layer with no dedicated guard test | **DEFERRED** | `05 §5` engineering guards |
| 083 | `handle_flag_photo_added` owner guard inverts under NULL `auth.uid()` | **DEFERRED** | 04b A1-5 LOW — *"Unreachable via REST … reachable from the dashboard."* **No §C artifact was ever written for it** |
| 084 | `flag_edit_history` INSERT policy, same anon collapse | **DEFERRED** | R-15 → `§SKY` KEEP; 04b: *"Same fix shape as §C-3 if ever revived"* (dead table, 0 rows) |
| 085 | `handle_comment_vote_added` self-vote guard NULLs if parent vanishes | **DEFERRED** | 04b A1-7 NOTE — *"FK CASCADE makes this near-unreachable. Robustness nit, not a defect."* No §C artifact |
| 086 | `flags` UPDATE column lock omits `context_tags`, `id`, post-05-23 columns | **FIXED** | ledger `a2_1_nonowner_revert_context_tags_20260727`; the load-bearing `auth.uid() IS NULL` early-out **preserved** |
| 087 | `feedback` is a second wholly-unthrottled anon write surface | **FIXED** | ledger `a2_2_feedback_anon_throttle_20260727`; 30/h PROPOSED — Sky tunes |
| 088 | Status history doubly dead (lost INSERT + revoked base-table SELECT) | **FIXED** | ledgers `a4_1_status_history_view_grant_fix_20260727` + `fork2_oa_…_plus_status_history_20260727`; `user_id` deliberately absent from both grants (Jordan privacy #1) |
| 089 | Duplicate webhook triggers ⇒ two push notifications per status change | **FALSIFIED** | `J3-5` — exactly one webhook trigger; no dashboard `http_request` trigger. The `updated_at` duplicate is confirmed and harmless |
| 090 | `flags owner edit open` carries the mis-correlated self-binding subquery | **FIXED** | ledger `a4_3_owner_edit_subquery_alias_fix_20260727`; `f.id = flags.id` present, `flags_1.id = flags_1.id` gone |
| 091 | Two unpaired `adjustsFontSizeToFit` sites (no `minimumFontScale` floor) | **DEFERRED** | `05 §5` a11y polish; one-line fix each |
| 092 | Comments dead against prod for every cohort (PGRST201 / HTTP 300) | **FIXED** | `d327b7e`; live prod REST bare→300, hinted→200; constraint name read from `pg_constraint` |
| 093 | Guest triage un-gated ⇒ real RLS-denied write then a FALSE "This flag changed" | **DEFERRED·OPEN** | R-2; `§SKY-3h` BUILD; unbuilt |
| 094 | Guest reopen form submits into silence | **DEFERRED·OPEN** | R-2; verified `FlagDetailModal.tsx:639` unchanged |
| 095 | Guest status history says "not yet enabled" for a 401 | **DEFERRED·OPEN** | R-2; verified `StatusHistoryModal.tsx:180` unchanged |
| 096 | Mine-scope + zero own flags shows the "All caught up" celebration | **DEFERRED** | `05 §5` — breaks the fork's own F40/F41 law |
| 097 | Dead-style orphans across TasksScreen + 4 files | **DEFERRED** | `05 §5` hygiene (≈30 keys with SR-110) |
| 098 | `comment_votes` exists with zero consumers — the schema trigger of SR-092 | **DEFERRED** | R-15 → `§SKY` KEEP; ambiguity neutralised by `d327b7e` |
| 099 | The unresolved-percentage sheet-overflow CLASS (4→5 surfaces) | **FIXED** | `9235e3b`; ⛔ device gate `§SKY-3d` D-B6 can re-upgrade this to BLOCKING |
| 100 | Lazy-chunk boundary promises two recovery paths that don't work | **DEFERRED** | R-13 MED, **not** in `§SKY-3h`'s picked pair; native unaffected |
| 101 | Sign-out row renders for guests and fires a real confirm | **DEFERRED** | `05 §5` hygiene; copy leg **ROUTED→BP16** ("guest Sign-out row copy") |
| 102 | Export-my-data guest gate is raw `Alert.alert` ⇒ silent on web | **DEFERRED** | `05 §5` hygiene |
| 103 | Web push toggle failure is raw `Alert.alert` right after a confirm | **DEFERRED** | `05 §5` hygiene |
| 104 | Every web user treated as a screen-reader user (rn-web hardcodes `true`) | **DEFERRED·OPEN** | R-13 picked (`§SKY-3h`); verified `accessibility.ts useScreenReader` unchanged |
| 105 | T7 fit-to-flags intermittently never lands (flag consumed before the snap) | **DEFERRED·OPEN** | R-13 picked; verified `MapScreen.tsx:1495-1510` unchanged. `J-8` grades it HIGH web-cohort, not submission-blocking |
| 106 | Empty-filters recovery card composites over the filter panel and eats its taps | **DEFERRED** | R-13 MED, not in the picked pair |
| 107 | Coincident flags permanently cluster-locked on web (no spiderfy) | **DEFERRED** | R-13 MED, not picked; `05 §6` line 3 device counter-check |
| 108 | Recovery card builds no STATUS chip | **POSSIBLY DROPPED** ⚠ | `01:62` LOW. Absent from 05 (its MED siblings 106/107 made R-13; this did not) |
| 109 | Offline refresh surfaces the raw "Unknown error. Tap to retry." | **ROUTED → BP16** | `05 §4`: *"'Unknown error' refresh fallback copy (SR-109 mechanism stays in 01 §M)"* |
| 110 | 10 orphan StyleSheet keys + `HeatmapLayer.tsx` imported only by its own test | **DEFERRED** | `05 §5` hygiene |
| 111 | Entry surfaces are brand-dark in light mode (Sign-in / Onboarding) | **CLOSED-VERIFIED** | `§SKY`: *"SR-111 entry surface: RATIFIED as-is"* |
| 112 | Two different "primary blues" coexist in dark (`brand` vs `ctaFill`) | **DEFERRED·OPEN** ⚠ | Routed→Phase-2 arbiter by `02 §D-4`; `07 §3` records it **NOT RUN**; Phase 3's arbiter (`08`) was G3 grabbers, not this. Twice routed, never run |
| 113 | Disabled bulk trio dims unevenly in dark | **DEFERRED** | `05 §5` — WCAG-exempt (disabled); polish |
| 114 | Leaflet attribution strip stays light over the dark basemap | **DEFERRED** | `05 §5`; web engine only |
| 115 | `aria-label` also absent from RN's Modal allowlist ⇒ **33 modal labels dead** | **POSSIBLY DROPPED** ⚠ | Raised `07 §5`, *"Reported, not fixed … a copy decision."* **No disposition in HANDOFF, DECISIONS, 08 or 09.** Verified still on the Modal tag in `ReportFlagModal.tsx` |
| 116 | `ReportFlagModal` sets `accessibilityViewIsModal` on the Modal tag (dead) | **POSSIBLY DROPPED** ⚠ | Raised `07 §5`. Verified: still on the `<Modal>` tag; the live one is the child. No disposition anywhere |
| 117 | `flag_comments.user_id` live-nullable / `ON DELETE SET NULL` vs repo NOT NULL | **FIXED (code half)** | `b288ffc` (drift capture + a **second** drift nobody had found) + `5904657` (`string \| null` on Row shapes, 10 tests pinning the `==` ownership trap). **DDL half = a Sky fork; Option B flagged destructive** |

---

## §5 COULD NOT DETERMINE

**Empty.** Every one of the 117 resolved to a disposition backed by a SHA, a ledger name, an artifact path, or
a quoted reason. The 12 rows in §6 are not undeterminable — they are determinably **undisposed**, which is a
different and worse thing.

---

## §6 POSSIBLY DROPPED — raised, never disposed (12)

These were registered with severity and evidence, and then appear in **no** action view: not `05 §1–§7`, not
`06`/`07`, not `08`/`09`, not `DECISIONS`, not `HANDOFF`. None is fixed in code at `6657d4f` (each verified).

| SR | Sev | Why it matters | Where it was raised | Verified still open |
|---|---|---|---|---|
| **050** | **HIGH** | **Admin takedown can't remove the photo** — the likeliest objectionable payload. It is explicitly *"SR-001 evidence"*, i.e. it undercuts the very B-1 moderation leg still blocking submission. *"A 1.2 report mechanism built on top of this queue would still be unable to remove the reported image."* | `01:146` | `removeUploadedFlagPhotos` exists at `flags.ts:861`, still unwired into `deleteFlag` |
| **048** | **HIGH** | Points/streak forgery. **Not dropped as a finding** (it is R-10) — but 05's disposition *"attaches as new context to Fork-2's option set"* was **never executed**. Listed here because the routing is fictional | `01:144` / `05 R-10` | Fork brief grep for SR-048 / "points writable" / "write-auth" = **0 hits**; no 04b §C artifact |
| **115** | MED-HIGH | **33 modal accessibility labels are dead** app-wide. Reported in Phase 2 with an honest "it's a copy decision" — and then nothing routed it to BP16, which is where copy decisions go | `07 §5` | `aria-label` still on the `<Modal>` tag |
| **116** | MED | Dead `accessibilityViewIsModal` on `ReportFlagModal`'s Modal tag | `07 §5` | still on the Modal tag |
| **040** | MED | "Clear search" unreachable to VoiceOver, and **no other path clears a picked search centre in a session** | `01:15` | in 05 only as the range endpoint "SR-040…110" |
| **055** | MED | Public leaderboard re-introduces the F59 emoji-surrogate mojibake | `01:156` | absent from 05 |
| **056** | MED | Hourly token refresh spontaneously respinners Profile mid-use | `01:157` | absent from 05 |
| **057** | MED | Two Profile preference rollbacks are silent on web — 05 §5 names this exact class for SR-102/103 but omits SR-057 | `01:158` | absent from 05 |
| **042** | LOW-MED | Home row SR labels speak abbreviated distance | `01:17` | `01 §H` device list never folded into `05 §7` |
| **045** | LOW | AddressSearchModal results tail can clip unreachable at large type (M13's own bug class) | `01:20` | same — `01 §H` device rows lost |
| **046** | LOW | Onboarding dots/actions can desync from the visible card on web | `01:21` | same |
| **077** | LOW | `ctaFillPressed` documented 7.5:1, computed 7.00:1 — in files whose comments are treated as arbitrated record | `02:68`, `02:110` | **both** sites still stale (`theme.ts:252`, `ThemeContext.tsx:188`) |

**Systemic cause, stated plainly:** `01 §H`'s four-row device list (SR-040/042/045/046) has no destination in
`05 §7`, which consolidates §6's script, `01 §P`, `02 §D`, `03 §6`, `01 §T` and `01 §M` — **but not `01 §H`.**
And `07 §5`'s three new findings landed after 05 was written; SR-117 was picked up by `§SKY-3h`, SR-115 and
SR-116 never were.

---

## §7 WHERE A DOC'S CLAIM DID NOT SURVIVE VERIFICATION

1. **`05 §8`'s conservation claim is not true as written.** It asserts *"All SR-001…039 registry items dispose
   exactly once across 01–04"* — that part holds (verified: SR-010/023/025/026/028/030/031/032 all carry
   explicit closes in 01/03/04). But it says nothing about SR-040…110, and **12 of those are undisposed** (§6).
   The claimed *"close-out grep in HANDOFF is the machine check"* — HANDOFF contains no such grep.
2. **`05 R-10`'s disposition for SR-048 is fictional.** *"attaches as new context to Fork-2's option set
   (write-authorization axis)"* — the fork brief contains zero SR-048 content. The attachment never happened.
3. **SR-112 was routed twice and run zero times.** `02 §D-4` routed it to a Phase-2 arbiter; `07 §3` records
   **NOT RUN**; Phase 3 ran an arbiter, but for G3 grabbers (`08`). It is one hop from being dropped.
4. **`§SKY`'s "R-11 crash reporter: ADD" was not honoured** — correctly. `J2-7` states why (native module +
   DSN credential). The pick stands unfulfilled; only the false comment was fixed.
5. **`§SKY-3h`'s 1.2(c) "Hide affordance — COMMENTS ONLY" pick is unbuilt.** `src/lib/hiddenContent.ts` has
   **zero importers** outside its own test. 1.2(c) is PARTIAL, exactly as `§SKY-3h` warned it would be.
6. **`DISPUTE_ENABLED = true` changes no runtime behaviour.** Verified independently of the doc: `disputes.ts`
   has zero importers repo-wide. `§SKY-3b` says this honestly; recorded here because a reader skimming the
   commit log would reasonably conclude a dispute affordance shipped.
7. **`03`'s counts were wrong in three places** and were corrected in `06 §1`: G4's "17 card dialogs" → **15**
   card-dialog-classed / **26** total · G5's hook name (`useDrawerTrigger`, not `useTriggerHandle`) · "AVM
   present on 28" → **30** (it mixed surfaces with occurrences). `09` corrects a fourth: the "17 ref-less call
   sites" figure was **14** and *"had already travelled as fact"*.
8. **`04b §C-11`'s own VERIFY regex is unreliable** (`J3-4`) — it both false-positives on already-wrapped
   calls and false-negatives on `(auth.uid() = user_id)`. *"Anyone re-running §C-11's verify as printed will
   get a wrong answer."*
9. **B-3 is a BLOCKING row with no SR id.** `04:240` records its SR column literally as `—`. It survives only
   because 05 §1 lists it; nothing in the SR registry would surface it.
10. **All FIXED SHAs and file states in §2–§4 were confirmed** by `git show --stat` and by reading HEAD. No
    claimed fix was found missing. The applied-SQL rows could not be re-verified against the live DB from here
    (no read-only calls were made this session) — they rest on `§SKY-3`'s per-item "verified read-only"
    statements plus the six committed drift-capture snapshots, which do exist.

---

## §8 RECONCILIATION — does the set balance?

**Arithmetic: yes.** 26 FIXED + 43 DEFERRED + 15 DEFERRED·OPEN + 12 POSSIBLY DROPPED + 10 CLOSED-VERIFIED +
7 SKY-SIDE + 2 FALSIFIED + 1 FORKED + 1 ROUTED = **117 = 117**. Every SR id from 001 to 117 appears exactly
once in §4. No id is duplicated; no id is missing; nothing was invented to make it close.

**Aliasing: clean.** All 7 B-rows and all 15 R-rows resolve to SR ids already in the 117 — except **B-3**,
which has no SR alias by design (§7 item 9). No B-* or R-* row introduced a finding absent from the SR
registry, so there is no double-count.

**Substantively: no, it does not balance — in two specific places.**

1. **12 findings were raised and never disposed** (§6), including **two HIGH** rows. One of them (SR-050)
   is direct evidence for the blocker that is still blocking. That is the conservation hole.
2. **15 rows are DEFERRED·OPEN** — Sky picked them and they are not built. R-1, R-2, R-13 and the whole B-1
   abuse leg are in this bucket. `HANDOFF`'s ledger already says so (*"Class A … not started"*), so this is a
   consistency success, not a discovery — but it means **the submission-readiness question is not answerable
   yet**, and no row in this table should be read as saying otherwise.

**What is genuinely closed and provable:** 5 of 7 BLOCKING rows have code (B-2/B-4/B-5/B-7 fixed; B-1 partial),
10 of 11 SQL artifacts are applied with named ledger rows and recorded rollbacks, the dismissal standard covers
32/32 live surfaces, and 2 findings were proved wrong before anyone acted on them — including one (SR-007/C-5)
where acting would have **silently tightened a live production ceiling from 100/h to 60/h**.

**What no artefact in this repo can tell you:** whether the app launches. `SR-021` stands unchanged — binary
launch evidence this train is still **NONE**, and `§SKY-3d`'s D-B6 gate explicitly forbids marking Phase 3
complete until Sky checks Help/About on a device at AX5.
