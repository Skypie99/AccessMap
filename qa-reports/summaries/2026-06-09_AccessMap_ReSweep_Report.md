# AccessMap Re-Sweep Audit — 2026-06-09

**Branch:** `audit/accessmap-resweep-2026-06-09` (17 commits off `main @ 3c0420d` — main untouched)
**Review:** `git diff main..audit/accessmap-resweep-2026-06-09`
**Gates:** typecheck 0 errors · 96 suites / **1,585 passed** (baseline 1,568; +17 locking tests) · lint **0 errors / 169 warnings = exact baseline**
**Method:** 16 adversarial hunt units (6 over the post-audit diff, 10 fresh lenses over the whole app) + every finding refuted by 1–2 independent adversarial agents before counting + a fresh-context second sweep over this run's own diff. ~140 agents total.

---

## DECISIONS FOR SKY

1. **EXIF verify-gate rewrite needs your sign-off (F29, fixed on branch).** The old gate scanned ALL bytes for JPEG markers — meaningless on PNG, where compressed data false-positives ~1×/64 KB, so **virtually every photo-sized PNG (screenshots!) was rejected with a fake "privacy check failed" error on iPhone**. The new gate is structural: JPEG segments are walked properly, PNG is checked for the real `eXIf` chunk (a check the old gate couldn't do — this is privacy-STRENGTHENING), and unknown/malformed bytes still fail closed. The re-encode strip remains the actual privacy guarantee, untouched. Because this changes privacy-gate code, please review `57ba56d` (or have Jordan look) before merging.
2. **Notification-preference toggles are decorative (HIGH, propose-only — not fixed).** The four toggles on the now-reachable Notification Preferences screen write to AsyncStorage, but **nothing in the push delivery pipeline reads them** — while the screen claims "changes take effect immediately." Options: (a) wire them (needs the proposed `notification_preferences` migration + edge-function change), or (b) hide/relabel the screen until then. Both need your call.
3. **Offline sign-out is impossible with current supabase-js (surfaced, not solved).** Verified in the installed library: every sign-out variant — including `scope:'local'` — POSTs to the server before clearing the session. An offline "Sign out" used to fail **silently** (caches cleared, session alive); it now tells the user honestly. A true offline sign-out needs auth-machinery surgery (manual session-storage removal + synthetic SIGNED_OUT) — your call whether to want that.
4. **Proposed DB migration (file only, NOT applied):** `supabase/migrations/2026-06-09_status_transition_guard_PROPOSED.sql` — a server-side legal-transition trigger. The app now does compare-and-set status updates (F53), but a hand-rolled REST client can still write `resolved → verified`, silently reverting resolutions. Rollback included.
5. **Public Storage orphans (propose-only):** photos upload before the flag row inserts; a failed insert (or a fail-closed throw mid multi-photo loop) leaves **publicly readable photos in the bucket** that the user believes were discarded, and retries add duplicates. Needs a cleanup policy decision (best-effort `storage.remove()` in the failure path, and/or re-use uploaded URLs on retry).
6. **Report FAB uses a stale one-shot GPS fix (propose-only, location-touching):** a flag can pin where the user *was* while the blue dot shows where they *are*. Fix = re-read location on FAB press; location handling is privacy-load-bearing, so not changed without your nod.
7. **Smaller judgment calls:** offline-cache fallback can repaint over newer optimistic state (SWR precedence choice); duplicate filter-preset names allowed while Saved Places rejects them (consistency choice). Prior parked backend items (points-value drift 10/3/15/7 vs docs, duplicate live trigger, RLS hardening, webhook rotation) are unchanged and still pending.

---

## What this run covered vs the 2026-06-07 audit

The last audit (27 fixes, 8 refuted FPs) swept races, dead flows, leaks, and crash/privacy/data-loss. This run deliberately did NOT re-walk those. It covered:

1. **The diff itself** (`cbf9a3b..3c0420d`): every fix commit adversarially re-tested (units A–F) — the fixes were treated as the newest risk surface.
2. **Under-weighted defect classes** (units HU1–HU10): state-machine completeness per screen, input/data edges, lifecycle (sign-out mid-flow, token refresh, backgrounding, deep links), optimistic-vs-server-truth coherence, and the full Supabase error-path UX matrix — with the web platform's silent `Alert.alert` as a recurring lens.
3. **Re-verification:** all **8 previously-refuted false positives still hold** on current code (checked one by one with citations). The 27 prior fixes were not re-reported; several gaps *in* those fixes were found and are listed below.
4. **Found before the workflows even ran:** the baseline test suite was **flaky on untouched main** (5 tests, ~2 in 10 runs) — root-caused to an order-dependent `virtual: true` mock and fixed first (F28), so every later gate was trustworthy.

## Funnel results (honest numbers)

- 66 candidate findings → adversarial refutation (1 refuter for med/low, 2 + adjudicator for high/critical) → **4 killed**, 62 confirmed → **57 distinct after merging cross-unit duplicates** (two units independently found the PNG gate bug; three found the watched-list swallow).
- **43 findings FIXED** on the branch (F28–F65, 17 commits, each gated green).
- **15 verified-but-not-fixed** (5 medium + 10 low) — listed below with fix shapes; none are data-loss or privacy-exposure.
- **9 propose-only** items routed to DECISIONS above.
- Second sweep over this run's own diff: 12 candidates → 10 confirmed (incl. one HIGH — my own F50 fallback didn't work as written) → all fixed in `1045c44`; the sweep also explicitly verified the tileCache epoch logic, the realtime teardown chain, the EXIF walkers' bounds math, and each locking test's power.

## Highlights of what was found & fixed (full list in commit messages)

| ID | Sev | What a user experienced | Commit |
|----|-----|------------------------|--------|
| F29/30 | HIGH | iPhone screenshot (PNG) attachments deterministically rejected with a fake privacy error; HEIC uploads stored as mislabeled bytes | 57ba56d |
| F31 | HIGH | Map tiles (location-revealing) could resurrect in storage AFTER sign-out | 8aeebe3 |
| F49 | HIGH | Push opt-OUT could silently fail server-side — pushes kept arriving while the toggle showed off | 2ba3d0c |
| F50/63 | HIGH | Offline sign-out failed silently — user believed they were signed out; session alive | 2ba3d0c + 1045c44 |
| F53/54 | MED | Acting on a stale flag silently reverted someone else's resolution + false "+points" flash | 4932753 |
| F32 | MED | Fast double-flick of the realtime toggle left it ON with realtime silently dead | a852121 |
| F36 | MED | Slow comment post on flag A then opening flag B showed A's thread under B | 4aafac6 |
| F37/38 | MED | Reopen vote discarded by the server still burned the device's one vote + fake "request noted"; network errors masqueraded as success | 40657d6 |
| F46–48 | MED | On web: failed report submits, sign-ups, and sign-in errors were COMPLETELY silent (`Alert.alert` is a no-op there); push toggle hung forever | 3739b45 |
| F39–42 | MED | Tasks claimed "All caught up — nice work!" when the load failed or pages remained; selection counted deleted flags | bfc257b |
| F55 | MED | False "+N points while you were away!" toast fired mid-session every token refresh (~hourly) | 7d77b19 |
| F57 | MED | Photo-link failure after a successful report claimed the submit failed → retry created a duplicate public flag | 7d77b19 |
| F28 | MED | The test suite itself was flaky on clean main (CI trust) | a0deeb4 |

Plus: offline pagination gap (F33), seq-guard gap left by F12 (F34), watched-list writes that lied about success (F43–45), account-deletion ghost session (F51), OS-permission reconcile (F52), edit-save not propagating to cards/map (F58), emoji mojibake in initials (F59), mailto encoded-length loss (F60), and more.

## Verified, NOT fixed this run (honest backlog — none privacy/data-loss)

**Medium:** (1) comments: failed background refetch replaces the loaded thread with an error and no same-flag retry; (2) the share message never includes the `accessmap://flag/{id}` link the changelog promises; (3) deep link to a flag outside loaded page-1 (or filtered out) focuses an empty spot — should `fetchFlagById` + merge; (4) MapScreen saved-filter-set Delete/Make-default menu is button-Alert-based → silent no-op on web (incl. a dead-end at the 5-set cap); (5) raw transport/server text still reaches alerts app-wide — `errors.ts` needs a known-code mapping layer.
**Low:** unbounded comment fetch/render; "Copy coordinates" dead on Firefox desktop; web map-popup `<img>` lacks an error fallback; report form stays editable during in-flight submit; Profile milestone bar names badges the catalog doesn't have; Tasks vs Nearby search semantics diverge; ReportFlagModal/ProfileScreen web pickers leak blob URLs (F25 parity); warm deep link while signed out is dropped; re-tapping the same flag link doesn't re-fire; web address bar shows `/flag/undefined`.

## Remaining-risk statement for testers

- **Mobile (TestFlight):** the riskiest fresh code is the EXIF verifier (F29) and the CAS status flow (F53). Manual checks worth doing: attach a **PNG screenshot** and a **HEIC photo** to a report (both should now upload, stored as proper PNG/JPEG); two devices triaging the same flag (loser should get a friendly "flag changed" notice, never silently revert); flick the realtime toggle rapidly; sign out in airplane mode (should get an honest failure message).
- **Web:** failure paths now speak via `window.alert` — exercise a failed submit and sign-up. Known remaining web gaps are in the not-fixed list (saved-set menu, copy-coordinates, popup image fallback).
- **Trigger-awarded points** vs flash copy still has the parked 10/3/15/7-vs-docs drift (cosmetic).
- The deep-link feature remains share-incomplete (no producer of links) — known, unfixed, listed above.

## Re-verify summary

Every fix commit gated on typecheck + full suite; final state: **typecheck 0 · 1,585 passed / 0 failed (96 suites) · lint 0 errors / 169 warnings (= baseline) · branch clean · main untouched.** All 8 prior-audit refutations re-confirmed. The flaky baseline suite is fixed and was re-run green 10+ times across the session.
