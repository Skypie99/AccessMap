# THE FLAGSTONE SHIP PREFLIGHT [TOP AVAILABLE OPUS · MAX EFFORT · verification run · read-mostly, Sky ships]

USAGE: fire in a fresh session from `~/AccessMap`, **after** the rename branch is merged and pushed. No GO boxes. It changes almost nothing; it checks everything and hands back one checklist.

**⚑ READ THIS FIRST, so nothing is promised that cannot be delivered.** The three steps left in the Flagstone ship chain are the three an agent is not permitted to do: the Supabase dashboard is a live surface, EAS builds cannot be run by an agent, and App Store Connect is Sky's account. This run therefore does the honest half: it verifies everything that CAN be verified, catches what would otherwise fail at 11pm mid-submission, and produces a numbered do-it-yourself sheet with every value already filled in. It never submits, never builds, never touches Supabase.

★ HOUSE PROTOCOLS: UNATTENDED · OUTPUT: `~/AccessMap/design-reviews/name-forge/2026-08-17_rename/08_ship_preflight.md` · REGISTER: warm, human, zero corporate slop, ZERO EM DASHES in anything user-facing or marketing.

★ NEVER: submit to any store · run or trigger an EAS build · touch the Supabase dashboard, database, or auth config · purchase anything · post anywhere · handle credentials · write to `main`. If a check needs one of those, report it as a Sky step with exact instructions instead of doing it.

---

## PHASE 1 · Did the merge actually land?
Verify, do not assume. Report each as a fact with the command output:
1. `git log --oneline -1 main` and `git log --oneline -1 origin/main`. Are they equal? Is the rename in them?
2. `git log main..rename/flagstone` should be EMPTY if the merge happened.
3. Working tree clean on tracked files?
4. Re-run the three gates ON MAIN and paste them verbatim: `npm run typecheck` · `npx jest --ci -w 3` · `npm run lint`. Expected: typecheck clean · **204 suites / 2,971 passed / 32 todo / 0 failed** · lint **0 errors** (74 pre-existing warnings).
   - If the suite count is anything other than 204/204, check for dependency drift BEFORE blaming code: `node -p "require('./node_modules/lucide-react-native/package.json').version"` must read `1.17.0`. If it does not, `npm ci` restores it. This exact drift already bit once.

## PHASE 2 · Did the live web surfaces flip to Flagstone?
GitHub Pages serves `main`, so after a merge and push these should change. Fetch each read-only and report what the page actually says now:
1. `https://skypie99.github.io/AccessMap/privacy/` — the title and the logo line. Should read Flagstone.
2. `https://skypie99.github.io/AccessMap/support.html` — same.
3. `https://skypie99.github.io/AccessMap/privacy-policy` — this page was DELETED in the rename. Confirm it now 404s, and note it: the support page's Privacy Policy link was repointed to `privacy/`, so nothing should still reach it.
4. `https://accessmap.skypistudio.com` — the live web app. Does the loading splash and the social-card title say Flagstone? (This one is a Vercel deploy, not Pages, so it may lag or need a redeploy. Report which.)
If any still says AccessMap, say so plainly and diagnose why (not pushed? Pages cache? Vercel not redeployed?) rather than assuming propagation delay.

## PHASE 3 · The App Store Connect sheet, values filled in
Read `05_store_metadata_flagstone.md` and reproduce it as a **numbered paste sheet**, in the order the Connect forms actually ask, with every value final and no "verify this" left in it. Include: Name · Subtitle · Keywords · Description · Promotional text · What's New · Privacy Policy URL · Support URL.

Two things to resolve rather than restate:
- **BQ-6, the keyword field.** The old name gave the token `access` for free and Flagstone does not. Dossier 02's exclusion note is now stale. Present the three costed options from `03_banked_questions.md` with their exact character counts, put the recommended one first, and mark it clearly as Sky's one-word decision.
- **Character counts.** Re-measure every field yourself and print the count beside it. Name must fit, subtitle must be ≤30, keywords ≤100.

## PHASE 4 · What still blocks submission that has nothing to do with the rename
This is the part most likely to save a wasted evening. The rename was one link in a longer chain. Read `APP_STORE_TODO.md` and `design-reviews/store-dossier/2026-08-05/` (start `CLOSE-OUT.md` and `BANKED_QUESTIONS.md`), then report the CURRENT, VERIFIED state of each known blocker. Check the repo and the docs; do not repeat a claim without checking it.
1. **The reviewer password in git history.** A reviewer credential was committed at an early SHA and needs rotating in Supabase Auth before review. Confirm whether it is still the live one **without printing the credential anywhere.**
2. **Junk production data.** The store dossier called this every persona's quit moment and the screenshot blocker (a severity-5 "Giant cockroach" flag, a dog-photo flag). Report whether it is still live, read-only, and what the cleanup + seeding step actually involves. Do NOT modify any data.
3. **The `createAnonFlag` moderation-filter bypass.** Spec at `specs/ready/anon-submit-moderation-filter.md`. Report its current state and whether it is still open.
4. **Any other open Q from the dossier's banked questions** that gates submission.
For each: what it is, in plain language · is it still open · what exactly Sky has to do · does it block submission or just polish.

## PHASE 5 · The sheet Sky actually follows
Close with `08_ship_preflight.md` ending in ONE numbered list, in dependency order, written for a person who is tired. Each step says who does it and roughly how long. It must cover, at minimum:

1. **Supabase auth email templates** (Sky, dashboard, ~10 min). Authentication → Emails. Every enabled template: Confirm signup, Invite user, Magic Link, Change email address, Reset password. Replace visible `AccessMap` with `Flagstone` in **both the body and the Subject line**, which is edited separately and is the one people miss. Leave every `{{ .ConfirmationURL }}` / `{{ .Token }}` variable untouched. Do NOT change URL Configuration: redirect URLs and Site URL are plumbing tied to `accessmap.skypistudio.com` and the `accessmap://` scheme. Send one test of each.
2. **The EAS build** (Sky, agents cannot run EAS). Give the exact command from the repo's own docs, verified against `eas.json` profiles rather than remembered: build with the `testflight` profile, then submit separately. Note that `preview` is an internal-link profile and NOT TestFlight.
3. **The device check** (Sky, ~5 min). The short list worth actually looking at: does the home-screen icon read **Flagstone** · do the location, camera, and photo permission dialogs say Flagstone · does the sign-in wordmark, the drawer, and About say Flagstone · does a shared flag say "Open in Flagstone" · does the feedback email arrive with a Flagstone subject.
4. **App Store Connect** (Sky, account holder). The Phase 3 sheet, in form order.
5. **Anything Phase 4 surfaced**, slotted where it belongs in the order.

★ FENCES: no submission, no build, no purchase, no external send beyond read-only page fetches · no Supabase or live-database access of any kind · no credentials read, printed, or committed · `main` is never written to; if the run needs to record something, it writes only its own report file under `design-reviews/name-forge/2026-08-17_rename/` on a branch · nothing invented: every live claim fetched, every repo claim checked, everything else banked as a question. Report and STOP.
