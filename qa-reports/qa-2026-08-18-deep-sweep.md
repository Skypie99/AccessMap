# QA Run — Flagstone (AccessMap) — 2026-08-18 deep sweep

## Summary

Full-project sweep ahead of App Store submission: three parallel audits (screens/UX/accessibility · lib/security/performance · App Store readiness), then a fix pass on branch `qa/auto-2026-08-18`. **9 commits, 21 files, +225/−76.** Typecheck green before and after; the full Jest suite (207 suites / 3,061 tests) green before and after — including the three guard tests that correctly caught and arbitrated my changes. The a11y layer is in exceptional shape (top-decile for React Native); what remained was concentrated in web-silent failure alerts, two dark-mode CTA fills, a points-flash lie on reopen, and a handful of App Store compliance seams. The genuinely blocking items are listed under **Submission blockers** — three of them are yours to pull the trigger on, and none is more than a few minutes.

## Changes made (committed to branch `qa/auto-2026-08-18`)

1. **`13b2919` fix(web): failure alerts use notify()** — Medium · FlagDetailModal, TasksScreen, ProfileScreen, MapScreen. `Alert.alert` is a silent no-op on react-native-web, so twelve "your action didn't happen" messages (comment post/delete, flag delete, bulk triage, watch gate, status update, load-more, filter/preset/preference saves, open-maps) vanished for web users. All now route through the web-safe `notify()` from `src/lib/confirm.ts` — the project's own error-tier policy. Multi-button choosers and native-only branches keep `Alert.alert` by design.

2. **`29a7de9` fix(a11y): dark-mode CTA contrast** — Medium · Onboarding "Next"/"Open the Map" buttons filled with `color.brand` (~3.4:1 under white text in dark mode, the exact fail your repo already documents); now `ctaFill`. Leaderboard retry press-state was `errorPressed` (red flash on a blue button) — now `ctaFillPressed`.

3. **`5ada468` fix(a11y): four screen-reader/AX-size items** — Low · Leaderboard ordinals ("21th" → "21st" for every rank past 20, visible and spoken); heat-badge digit capped at 1.2× font scale + hidden from the a11y tree (mirrors its cluster twin — it overflowed and double-announced at AX sizes); Leaderboard empty-state Trophy marked decorative; lightbox close button now clears Dynamic-Island insets; comment delete button says "Delete your comment" (it only renders on your own bubble — it used to say "Delete Anonymous's comment"). One test pin updated to the new label.

4. **`61bb34c` fix(lib): cache NaN guard, retry rejection, stale docs** — Medium · flagsStore: a corrupt `cachedAt` parsed to NaN, every staleness comparison went false, and a corrupt cache entry would be served as *fresh forever* — now rejected. The offline-retry banner's button no longer produces an unhandled promise rejection. Stale load-bearing comments in `flags.ts`/`admin.ts` claiming "delete is broken for every real user" corrected — **I verified against the live DB that the `is_admin` SELECT grant is live and the update policy pins `is_admin`** (no self-promotion path; details under Verified-safe below). shareFlag docblock URL updated to the flagstone subdomain.

5. **`376ed76` fix(points): reopen no longer flashes "Verified! +3 points"** — High · Community-threshold reopen (resolved→open) reported itself to callers as a `'verify'`, so Tasks flashed points the trigger never awards — and the else-branch would have evicted the just-reopened flag from the list. `DetailAction` gains an explicit `'reopen'`; Tasks patches the row back in and flashes a plain "Flag reopened".

6. **`4097986` feat(ux): pull-to-refresh on Leaderboard + Home** — Low · Tasks and Profile already had it; Leaderboard could only reload by closing/reopening, Home only via the error banner. Both wired to their existing load/refresh functions — no new fetch paths.

7. **`24083e7` fix(app-store): three review-compliance gaps** — High ·
   - **Apple 1.2 (UGC):** "By creating an account you agree to the Terms & Community Guidelines" now sits on the sign-in screen with the in-app Terms sheet a tap away (it was only reachable post-signup).
   - **Apple 5.1.1(i):** both privacy surfaces (in-app + hosted `docs/privacy/index.html`) now disclose that address-search text goes to OpenStreetMap Nominatim — your reviewer notes already admitted it; the policies didn't (your audit's S11). *The hosted page updates when main is pushed to GitHub Pages.*
   - **Reviewer notes accuracy:** the notes claimed comment reporting "works without an account," but comments are signed-in-only by live RLS — a reviewer following that line verbatim would hit a dead end (that's how 1.2 demos fail). Reworded to steer them to the test account.

8. **`48bea69` feat(ux): password show/hide + honest guest comments + 4px drift** — Medium · Sign-in gets the standard eye toggle (44pt target, existing arbitrated ink) — no more typing a password blind. Guests were told "No comments yet" when RLS simply returns them zero rows (the thread may be full!) — they now see "Sign in to see and add comments." Home separator realigned to its own documented math (52→48).

9. **`466252d` fix(guards): reconcile guard tests** — the three guards that tripped were each handled on their merits:
   - **Report pill reverted to `color.brand`** — the brandInkAA guard carries your ratified judgment N-13 (15/700 is WCAG *large* text; brand passes at large-text thresholds). My audit's call to change it was wrong; the guard won, and a do-not-fix comment now sits on the style.
   - blockedContent pin updated (comment branch now matches its two notify() siblings; the invariant the guard protects is unchanged).
   - Ratified policy doc `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md` gains the same Nominatim sentence (the privacy guard requires doc ↔ app verbatim equality). **Marked AGENT-PROPOSED — ratify or reword it, and the same sentence everywhere follows.**

## Submission blockers (yours — none applied automatically)

1. **Seed the reviewer's map (Apple 2.1/4.2 — the big one).** Production has zero open/verified flags: the reviewer would meet an empty app. Your prepared, double-paste-guarded seed SQL is at `supabase/migrations/2026-08-18_seed_reviewer_flags.sql`. Apply it in the Supabase SQL editor (or tell me and I'll run it — it's your production content, so it's your call). Never run the companion purge file standalone.
2. **Verify EAS production env vars (launch-crash if wrong).** `src/lib/supabase.ts` throws at module scope if the two `EXPO_PUBLIC_SUPABASE_*` vars are missing. Run: `eas env:list --environment production` and confirm both are set before building.
3. **Reviewer credentials — ✅ DONE today.** Rotated, sign-in tested by you, entered in App Store Connect (account: gardenbeds2020@gmail.com). The old placeholder-based notes file already pointed at ASC correctly.
4. **Screenshots** still need regenerating with Flagstone branding before submission (store metadata itself is ratified at `design-reviews/name-forge/2026-08-17_rename/05_store_metadata_flagstone.md`).

## Proposals (NOT applied — need your review)

**Database / SQL (paste into Supabase SQL editor when you're ready):**

- **P1 · High — anon-flag actor award is silently zero.** The trigger guard `auth.uid() <> new.user_id` evaluates NULL for anonymous flags, so verifying/resolving an anon flag awards 0 points while the UI flashes "+3/+7". One-word fix in the trigger: use `IS DISTINCT FROM` instead of `<>`. Exact edit: in `handle_flag_status_change`, change `auth.uid() <> new.user_id` → `auth.uid() IS DISTINCT FROM new.user_id`, then re-create the function. I can hand you the full CREATE OR REPLACE on request.
- **P2 · Med — points are farmable.** The proposed transition guard (`supabase/migrations/2026-06-09_status_transition_guard_PROPOSED.sql`) was never applied: verify→resolve→reopen loops re-award +25/cycle, and self-verify is permitted. Apply the guard + consider one-award-per-flag dedup.
- **P3 · Med — schema.sql has drifted from live.** Re-running it would resurrect the broad `flags update own` policy (live uses the tighter owner-edit-while-open policy) and would bootstrap a fresh DB without the email column-grant hardening. Until reconciled, treat "idempotent — safe to re-run" as false; I suggest a banner comment at the top of schema.sql at minimum.
- **P4 · Low — flag-photos bucket caps.** No `file_size_limit` / `allowed_mime_types` on the bucket; the 10 MB/image-only rules are client-side only. Dashboard: Storage → flag-photos → Edit bucket → set 10 MB + image/jpeg,image/png,image/webp.
- **P5 · Decision — guest comment visibility.** Comments are signed-in-only (S10). If you *want* guests reading threads (many civic apps do), add an anon SELECT policy; the UI copy I shipped is honest either way.

**App / infra:**

- **P6 · High — password reset flow (S14).** No "Forgot password?" anywhere; a locked-out user (or reviewer) has no path back. Needs `resetPasswordForEmail` + a redirect/deep-link decision, i.e. an auth-config change I don't make unattended. Happy to build it with you next session.
- **P7 · Med — moderation loop (S13/1.2).** Abuse reports land in `feedback` as `[REPORT]` rows nothing reads, vs. the Terms' 24-hour promise. Cheapest honest fix: a daily scheduled check that emails you new reports (I can set this up on request).
- **P8 · Low — location permanently denied → dead end (S8).** Add a `Linking.openSettings()` escape hatch on the Report flow's permission-denied state. Small, but touches a fenced flow, so I left it for a supervised pass.
- **P9 · Low — tileCache hot-path writes + Android 6 MB reality (known).** Batch `lastAccessed` writes now; the real fix stays the planned expo-file-system migration.
- **P10 · Low — preference-tier inconsistency.** `useNotificationPreferences` warns-and-ignores where `realtimePrefs` throws for the same class of write; pick one tier.
- **P11 · Info — cold-launch can render blank up to ~30 s** for returning users with expired sessions (no splash hold). Can't hit a reviewer's fresh install; known S12.

## Verified-safe today (so nobody re-audits these)

- `is_admin` privilege escalation: **closed.** Live `users update own row` policy's WITH CHECK pins `is_admin` to its current value; the column-level UPDATE grant is inert. (Checked directly against production.)
- Reviewer seed SQL contains no reference to the old reviewer email — this morning's account change (reviewer@accessmap.com → gardenbeds2020@gmail.com) breaks nothing.
- Privacy policy URL is live, Flagstone-branded, and accurate about EXIF stripping; icon is 1024² no-alpha; permission strings, privacy manifest, account deletion, UGC report/block/filter, guest browse — all verified present and consistent.
- No secrets anywhere in `src/`; PKCE + cache purge on sign-out; EXIF strip is fail-closed as documented.

## Verification

- Typecheck before: **pass** · after: **pass**
- Tests before: **3,061 pass / 207 suites** · after: **3,061 pass / 207 suites** (2 pins updated to new contracts, all guards green)
- ESLint: **not runnable in my sandbox** (macOS-native binary in your node_modules; deliberately did NOT reinstall). Please run `npm run lint` once on your machine before merging — expected clean.
- Commits: **9** · Files: **21** · **+225 / −76**
- Working tree note: your untracked `design-reviews/`+`_to_delete/` files were left untouched; I only ever staged files I edited.

## How to review

```
git diff main..qa/auto-2026-08-18        # everything
git log main..qa/auto-2026-08-18 --oneline
# merge:   git checkout main && git merge qa/auto-2026-08-18
# discard: git branch -D qa/auto-2026-08-18
```

After merging: push main so GitHub Pages picks up the privacy-page Nominatim clause.

## Addendum — 2026-08-19, Sky-approved live changes

Sky asked for the top proposals to be implemented the same night. Done, with findings:

- **P1 (anon actor award): already live.** The production trigger already carries `auth.uid() IS DISTINCT FROM new.user_id` plus a null-actor guard — verified directly. schema.sql's copy still had the old `<>` form; now synced (commit `58e59bd`). No DB change needed.
- **P2 (transition guard): APPLIED to production** — with one amendment the June proposal needed: `resolved → rejected` stays legal **for admins**, because AdminScreen's dismiss acts on the recent-200 list, which includes resolved flags. Applying the proposal verbatim would have broken that shipped flow. Self-tested against production: 3 legal transitions allowed, 2 illegal blocked (`resolved→verified`, non-admin `resolved→rejected`), test row + history fully cleaned up (0 leftovers, 0 point events). Migration recorded at `supabase/migrations/2026-08-19_flag_status_transition_guard_APPLIED.sql`; the PROPOSED file is marked superseded. **Residual risk documented in the migration header:** `increment_reopen_request` still has no per-user server dedup, so a scripted caller can cycle statuses via that RPC; the guard narrows the farming surface but rate-limiting the RPC remains open (P12).
- **P3 (schema.sql drift): banner added** — loud do-not-rerun-against-live warning at the top of schema.sql, plus the trigger-body sync above.
- **Sentry DSN: deleted from EAS** — all three `EXPO_PUBLIC_SENTRY_DSN` rows (development/preview/production) removed on expo.dev, so the privacy policy's "no crash reporting" is now structurally true, not just currently true. If Sentry is ever wanted, the DSN can be re-issued from the Sentry project settings — but the privacy policy, App Store privacy labels, and privacy manifest must all be updated first.
- **Key rotation Q:** answered — Supabase anon keys don't expire and don't need routine rotation; safety rides on RLS, which is verified hardened.

## Notes / questions for you

1. **Ratify or reword the Nominatim sentence** (it's in three places, kept verbatim-equal by the privacy guard; marked AGENT-PROPOSED in the ratified doc).
2. **Want me to run the reviewer seed SQL against production?** It's written and guarded; I only held back because seeding live content is a product call.
3. The lesson from the Report-pill revert: your guard tests are pulling real weight — they overruled a plausible-looking audit finding with a ratified judgment. Worth keeping that pattern going for future copy/contrast decisions.
