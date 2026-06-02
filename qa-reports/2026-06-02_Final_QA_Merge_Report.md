# Final QA Consolidation — AccessMap — 2026-06-02

**Engineer:** Gary (QA) · **Scope:** last QA gate before human testers · **Standard:** production-quality, nothing lost in the merge

---

## ✅ RESULT: MERGED TO MAIN (not escalated)

All readiness-bar criteria passed on the consolidation branch, and Sky pre-approved an auto-merge
this session. The integrated build is on `main`, tagged for one-step revert.

| | |
|---|---|
| **Pre-merge `main`** | `abdc25c` (security RLS HIGH fix) — this is your revert target |
| **Merge commit** | **`db7d1c6`** `merge(qa): final pre-tester consolidation — Peter perf + Alex a11y onto main` |
| **Revert tag** | **`qa-merge-2026-06-02`** (annotated, on the merge commit) |
| **Release-candidate branch** | `qa-merge/accessmap-2026-06-02` (`831d9ae`) — kept; worktree at `~/AccessMap-qa-merge` |
| **Type check** | ✅ green (worktree **and** real `main` checkout) |
| **Tests** | ✅ **1564 passed / 0 failed / 95 suites** (136 todo placeholders) |
| **Lint** | ✅ 0 errors (259 warnings — expected policy downgrades) |
| **Bundles** | ✅ iOS + Android both export clean (`expo export`) |
| **Live DB changes by this merge** | **None.** No migration/RLS/auth/index applied. |

### Why merged, not escalated
The task's literal recipe (merge Steve→Peter→Alex into main) assumed three fresh peer branches.
**Direct git verification proved that stale:** Steve's security work was **already in `main`** (all 10
commits, including the live-verified F1 RLS *correction* that is newer than his branch). His branch's
only delta was 3–4 a11y commits that landed on it by accident during shared-tree churn — duplicates of
Alex's authoritative versions. Re-merging it would have *re-introduced* a known-bad entanglement.
So (Sky-approved) I **skipped qa-steve** and integrated the two genuinely-unmerged branches — **Peter**
(perf) and **Alex** (a11y) — onto main. Every readiness item then passed with no open doubt.

---

## Per-agent verdict

### Steve — security / robustness · **VERDICT: already in main, branch correctly skipped**
- **What's in main (verified via `git cherry`):** fail-safe `RemoteImage` (10 call sites), per-tab
  error boundaries, MapScreen offline banner, create-time input validation (category/severity envelope
  + description normalize), and the F1 RLS non-owner-DELETE fix **plus its live-verified correction**.
- **Verification:** all present and intact in the merged tree (RemoteImage in 11 files; `flags.ts`
  still enforces `severity < 1 || severity > 5`; offline banner present). His stale `qa-steve` branch
  (`7560e85`) was **not merged** — its only unique content was duplicate a11y commits superseded by Alex.
  Alex's own report independently recommended exactly this. **Nothing lost.**

### Peter — performance · **VERDICT: PASS, integrated**
- **Code:** `MapScreen` hoists two identical inline icon-row styles into a shared `styles.iconLabelRow`
  (zero behavior change). Audit report + plan docs.
- **DB record:** `2026-06-01_perf_fk_covering_indexes.sql` *records* 7 FK covering indexes + a duplicate-
  index drop that a **prior session already applied to the live DB** (commit authored by Sky). **I applied
  nothing.**
- **Verification (read-only against prod):** all 7 indexes exist live, the canonical
  `flags_status_created_at_idx` is kept, and the duplicate `idx_flags_status_created_at_desc` is dropped —
  **the migration record is truthful, no drift.** Performance advisor shows **no `unindexed_foreign_keys`
  warnings** remain; the new indexes show only as INFO `unused_index` (expected at ~7 rows).

### Alex — accessibility / UX · **VERDICT: PASS, integrated (the real body of unmerged work)**
- **12 commits, incl. 2 HIGH operability bugs** (a screen-reader user literally could not complete the task):
  - **HIGH#1** `1b53c9a` — Profile "Real-time" + Settings "Push" switches were inoperable by VoiceOver/
    TalkBack (role on a handler-less wrapper). Fixed: role + label + hint + **checked state moved onto the
    `<Switch>` itself**. Verified in source on `main`.
  - **HIGH#2** `1afbb15` — Admin moderation buttons unreachable under iOS VoiceOver (card was
    `accessible`, collapsing its subtree). Fixed: card no longer `accessible`; severity rendered as
    **"Severity N" text** (1.4.1); list given `role="list"`.
  - Plus 4 Medium + 4 Low: flag-detail AT announcements, leaderboard row grouping, sign-in mode-aware
    error + AA placeholder contrast, nearby-list heading role, decorative-emoji hiding, status-history
    reduced motion, address-search focus containment.
- **Verification:** typecheck green; every fix's signature present in the merged tree; her branch's
  own gate (typecheck + 1553 Jest) reproduced here.

---

## The one conflict hotspot — resolved by COMBINE, not clobber

**`src/screens/MapScreen.tsx` — Report FAB** was the only place two agents' edits physically interleaved:
Peter rewrote the FAB's inner `<View>` to `styles.iconLabelRow`, ~3 lines from where Alex made the FAB's
`accessibilityHint` conditional on `location`. Git's 3-way merge auto-resolved it, **and I hand-verified
the result** — the merged FAB carries **both**:
```
accessibilityHint={ location ? '…at your current location' : 'Dimmed until location is on. Use the
                    recenter button to turn on location, then report a flag here.' }   ← Alex
accessibilityState={{ disabled: !location }}                                            ← (kept)
<View style={styles.iconLabelRow}>                                                      ← Peter
```
No other file had a true conflict (every other overlap was in a different file/region and auto-merged
cleanly). **All three domains' work survives intact** — confirmed by grep + 11 new regression assertions.

---

## Verification results (full)
- **Type check:** `tsc --noEmit` → 0 errors (qa-merge worktree and post-merge `main`).
- **Tests:** `npm test` → **Test Suites: 95 passed / 95**, **Tests: 1564 passed, 0 failed** (136 todo).
  Baseline was 1553; +11 from new `src/__tests__/qaMergeConsolidation.test.ts` guarding the merge points.
  - *Note:* one interim run showed 5 `pushPermission` failures — traced to running `expo export`
    **concurrently** with the suite (Metro rewrote the worktree cache mid-run). Re-run cleanly: 7/7 in
    isolation and 1564/0 full. Not a regression.
- **Lint:** `eslint` (v9 pinned) → 0 errors, 259 warnings (intentional policy downgrades).
- **Build/bundle:** `expo export --platform ios` and `--platform android` → both succeeded.
- **Live DB (read-only):** indexes verified truthful (above); F1 RLS fix confirmed live; advisors clean
  of FK-index warnings. No change applied by this work.

---

## 🔧 FIX BEFORE TESTERS (prioritized — none blocked this merge)

**P0 — security follow-ups (route to Dana; DB-side, your approval to apply):**
1. **Rotate 2 hardcoded webhook secrets** in trigger/function defs (extractable via `pg_proc`) → move to Vault.
2. **Drop the duplicate `AFTER UPDATE OF status` trigger** — two run `handle_flag_status_change` → **double-points bug**.
3. **Apply F2 then F3** (propose-only migrations — see ordered list below; dry-run on a preview branch first).

**P1 — before App Store submission:**
4. **Rotate the reviewer test-account password** (`AccessMap2026!` is hardcoded in `2026-05-31_reviewer_test_account.sql`).
5. **Sky sign-off on anon precise lat/lng** exposure on the public map (Jordan pre-approved but is not legal counsel).
6. **Enable leaked-password protection** (Supabase dashboard, 1 click).

**P2 — performance polish (route to Shamus; non-blocking):**
7. Memoize `CommentBubble` (+ `useCallback` on `onDelete`) and `RealtimePulse` (`React.memo`).
8. Offline-queue soft cap (~50 drafts) + pruning.

**P3 — pre-existing DB tuning (advisor WARNs, not caused by this merge; Dana, post-tester ok):**
9. `auth_rls_initplan` — wrap `auth.<fn>()` as `(select auth.<fn>())` in RLS policies (flags, flag_photos, push_tokens, …).
10. `multiple_permissive_policies` — consolidate overlapping permissive policies (flags, feedback, users, …).

---

## 📦 Ordered migration application list (for Sky/Dana)

**Already applied to live + verified — do NOT re-apply (idempotent if you do):**
- `2026-06-01_flags_policy_consolidation.sql` (F1) — non-owner DELETE fix, live-verified.
- `2026-06-01_perf_fk_covering_indexes.sql` (Peter) — 7 indexes + duplicate drop, verified truthful vs prod.

**Still propose-only — apply IN THIS ORDER after a preview-branch dry-run (verified not-yet-applied):**
1. **`2026-06-01_function_exec_and_search_path_hardening.sql` (F2, MED).** Completes `search_path` pinning
   on `notify_flag_status_webhook` + `enforce_flag_status_only_for_non_owner` (the other 2 are already
   pinned) and revokes broad EXECUTE. ⚠️ **After applying, smoke-test that `notify_flag_status_webhook`
   still fires** (status-change webhook) — the file has the curl test in its header.
2. **`2026-06-01_flag_photos_insert_guard.sql` (F3, MED).** Tightens the `flag_photos` INSERT policy
   (currently `WITH CHECK (true)` — confirmed live) to block arbitrary external image URLs. Well-isolated
   (`flag_photos` has 0 rows, no triggers). Smoke test in header.

*(All three "HARD GATE" rules held: no migration/RLS/auth/index/schema change was applied to the live DB
by this work, no data deleted, no paid dependency added, no new location/disability-data collection.)*

---

## 👀 How to review

```bash
# See exactly what landed on main (the whole consolidation):
git diff abdc25c..db7d1c6          # or: git diff abdc25c..main
git show db7d1c6 --stat            # the merge commit

# The release-candidate branch (same content, pre-main-merge):
git log --oneline abdc25c..qa-merge/accessmap-2026-06-02

# REVERT in one step if anything surfaces in testing (main is local-only, not pushed):
git revert -m 1 db7d1c6            # safe: keeps history
#   — or —
git reset --hard abdc25c          # nukes the merge entirely (local only)
```
Migrations to apply: **F2 then F3** (above). F1 + Peter's indexes are already live.

### Real-device checklist before the build goes to testers (iOS + Android)
Run each on **both** a real iPhone (VoiceOver) and Android (TalkBack):
- [ ] **Profile → "Real-time updates" switch:** focus, double-tap → it **flips** and announces on/off (HIGH#1).
- [ ] **Settings → "Push notifications" switch:** same — double-tap toggles + announces (HIGH#1).
- [ ] **Admin tab:** swipe a flag card → reach + activate **"Remove"** and **"Dismiss"** as separate
      buttons; severity reads as a **number** (HIGH#2).
- [ ] **Map → Report FAB:** with location OFF, the FAB announces the **"Dimmed until location is on…"**
      hint; with location ON, it opens the report form (the merge combine point).
- [ ] **Flag detail:** post then delete a comment, submit a reopen request → each is **spoken** (Medium).
- [ ] **Leaderboard:** each row announces rank + name + points + "you" on your row (Medium).
- [ ] **Sign-up failure:** title reads "Couldn't create your account" (not "sign you in"); placeholders
      legible (Low).
- [ ] **Reduced Motion ON:** RealtimePulse dot is solid (not pulsing); status-history modal doesn't slide.
- [ ] **Smoke both platforms:** sign in → map loads → drop a flag (photo) → verify/resolve → points update;
      offline banner appears when network is off; no blank screens (per-tab error boundaries).

---

## Decisions / judgment calls logged for Sky
1. **Skipped `qa-steve`** (already in main; re-merge would duplicate/clobber Alex's authoritative a11y). *You approved.*
2. **Auto-merged to `main` + tagged** under the task's explicit grant (overrides the usual "only Sky merges"
   default; `main` is local-only, not pushed). *You approved.*
3. **Peter's live indexes** were applied in a **prior** session (HARD-GATE-adjacent fact). I only merged the
   *record* file and verified prod matches read-only — surfaced here, nothing re-applied.
4. **Report delivered as a Gmail draft (not sent)** + saved here, per the Morgan-only / no-autonomous-send
   rule. Send it yourself when ready.

— Gary
