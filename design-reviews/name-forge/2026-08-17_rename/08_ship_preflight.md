# 08 · THE FLAGSTONE SHIP PREFLIGHT
**2026-08-17. Verification run, read-mostly. Nothing was submitted, built, pushed, purchased, or sent. No Supabase or database access. No credential read or printed. `main` was never written to.**

This run checks everything that can be checked from the repo and the public web, catches what would otherwise blow up at 11pm mid-submission, and hands you one sheet to follow. The three things it deliberately does not do are the three an agent is not allowed to do: the Supabase dashboard, the EAS build, and App Store Connect. Those are yours, and they are written out for you at the bottom with every value filled in.

Verified against `main` = `origin/main` = `91d98b9` at run time.

---

## The one-screen answer

The rename landed clean. Every gate that can be trusted from here is green. The app, the in-app legal copy, and two of the three web surfaces all say Flagstone. The one web surface that still shows the old name is a cache, not a mistake, and it clears itself.

None of what still blocks submission has anything to do with the rename. It is the same short list that was true before: rotate the reviewer password, clean the junk off the live map, decide the one-line filter on anonymous reports, and fix one contradictory sentence in the Terms. Everything else is polish.

---

## Phase 1 · Did the merge actually land?

Yes. Verified, not assumed.

- **Local `main` and `origin/main` are the same commit.** Both sit at `91d98b97a11025e455a38d09e27a0f4aa8779e44`, "docs(rename): ship-preflight prompt for the post-merge steps". `git rev-list --left-right --count main...origin/main` returns `0  0`: nothing to push, nothing to pull.
- **The rename is in `main`.** The last commits include the full `refactor(brand)` sweep and `41b49e3 chore(web): remove the stale duplicate privacy page (leg 4)`.
- **`git log main..rename/flagstone` is empty**, and `rename/flagstone` is an ancestor of `main`: the branch is fully merged with nothing left behind.
- **Working tree is clean on tracked files** (`git status --porcelain --untracked-files=no` returns nothing).
- **No dependency drift.** `lucide-react-native` reads `1.17.0`, exactly as required. The drift that bit once has not come back.

### The three gates, re-run on `main`

| Gate | Result | Notes |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | **clean, exit 0** | ran in ~11s, no diagnostics |
| `npx jest --ci -w 3` | **204 suites passed / 204 total · 2,971 passed · 32 todo · 0 failed** | matches the expected numbers exactly (3,003 total) |
| `npm run lint` | **could not be trusted from here, run it on your Mac** | see below |

**On lint, read this before you worry.** Lint did not fail on your code. It aborted before it could judge a single rule, with `Cannot find native binding` inside `unrs-resolver`, a dependency that ships a compiled binary built for macOS. This preflight runs in a Linux sandbox, so that one binary cannot load here. `tsc` and `jest` are pure JavaScript, which is why they ran fine. The eslint binary itself is present and healthy. On your Mac, where the native binding matches, this gate reads `0 errors` and `74 pre-existing warnings`, as the rename close-out already recorded. Run `npm run lint` once on your machine to confirm and you are done with Phase 1.

---

## Phase 2 · Did the live web surfaces flip to Flagstone?

Three of four are exactly where they should be. The fourth is a cache.

| Surface | What it serves right now | Verdict |
|---|---|---|
| `skypie99.github.io/AccessMap/privacy/` | title "Privacy Policy - Flagstone", logo "Flagstone", footer "© 2026 Flagstone" | **Flipped. Correct.** |
| `accessmap.skypistudio.com` (Vercel web app) | title, social-card title, site name, and pre-JS splash all read "Flagstone" | **Flipped. Correct.** |
| `skypie99.github.io/AccessMap/privacy-policy` and `.../privacy-policy.html` | no content served | **Gone, as intended.** The deleted duplicate is not reachable. |
| `skypie99.github.io/AccessMap/support.html` | title "Support - AccessMap", "About AccessMap", footer "© 2026 AccessMap" | **Still shows the old name. This is a cache, see diagnosis.** |

**Diagnosis of the support page, because "still says AccessMap" deserves a real answer, not a shrug.** The source is not the problem. `docs/support.html` on `main` already says Flagstone everywhere: the title, the logo line, the "About Flagstone" heading, the footer, all of it, landed by commits `71fe0f5` and `abf4e73`, both merged. And `main` equals `origin/main`, so it is pushed. So this is not "not pushed" and not "the rename missed it." It is GitHub Pages serving a cached copy of a URL that existed before the rename. The new `privacy/` path had no prior cache, so it served fresh Flagstone the instant it went live. `support.html` is an old URL with the old copy still warm in the CDN, so it serves stale until the cache expires or Pages rebuilds. It will clear on its own. Re-fetch it right before you fill in the Support URL at Connect, and if it is somehow still stale, a trivial edit-and-push to any file under `docs/` forces Pages to rebuild.

**Two small things on the support page worth five minutes while you are in there** (both pre-existing, neither caused by the rename):

- The fresh `docs/support.html` still has an unfilled `[contact email]` placeholder in three places, and a GitHub link that uses `skypie911` where your username is `skypie99`. The Support URL goes in front of an Apple reviewer, so it is worth filling in.
- The live cached copy still links its "Privacy Policy" to the old deleted page. The fresh source already points it at `privacy/`, so that broken link disappears the moment the cache clears. Nothing to do beyond letting it refresh.

---

## Phase 3 · The App Store Connect sheet, values filled in

Paste these in the order the Connect forms ask for them. Every count below was re-measured directly from the source in this run, so where a count here differs from the older sheet, trust this one. All strings are plain ASCII, so these counts are exact.

**1. Name** (limit 30)
```
Flagstone
```
**9 characters.** Renders whole under the icon. Clear on both storefronts as of the 2026-08-16 probes.

**2. Subtitle** (limit 30)
```
Map accessibility barriers
```
**26 characters.** Under Flagstone this is now the only place the word "map" is indexed, so it earns its keep more than before, not less.

**3. Keywords** (limit 100) - **your one-word decision, BQ-6**

The old name gave you the token `access` for free, because "AccessMap" was indexed from the name. Flagstone does not, so `access` is the single token the rename actually drops. (The subtitle still carries `map`, `accessibility`, and `barriers`, so those are not lost.) The field has room, so here is the honest choice, recommended first:

- **Recommended (90 chars): drop `disability`, add `access`.** Dossier 02 itself argued `disability` is the weakest earner in the string, since generic "disability" queries drift to benefits apps. This is the only option that wins back the lost token without giving up a real audience.
  ```
  wheelchair,mobility,ramp,curb,sidewalk,crossing,slope,washroom,blind,deaf,access,anonymous
  ```
- **Option B (94 chars): leave it as the sheet shows, no `access`.**
  ```
  wheelchair,disability,mobility,ramp,curb,sidewalk,crossing,slope,washroom,blind,deaf,anonymous
  ```
- **Option C (96 chars): drop `deaf`, add `access`.**
  ```
  wheelchair,disability,mobility,ramp,curb,sidewalk,crossing,slope,washroom,blind,access,anonymous
  ```

No spaces after the commas, on purpose: Apple counts them against your budget. This is trivially editable later without a new binary, so it is not worth losing sleep over. Pick one and move on.

**4. Description** (limit 4,000; this block is roughly 1,915 characters, comfortably under)
```
Flagstone is a community map of accessibility barriers. See the steps, broken sidewalks, and blocked paths other people have flagged, and add the ones you find, so the next person knows before they arrive.

EVERY BARRIER, RATED FOR REAL IMPACT
Every flag carries a severity from 1, inconvenient but usable, to 5, impassable and needing a detour. "Not accessible" stops being a guess. Six plain categories cover the streetscape: no ramp, broken sidewalk, blocked path, missing signal, steep grade, and other.

REPORT IN UNDER A MINUTE, NO ACCOUNT NEEDED
Saw a barrier? Pick a category, rate how bad it is, add a note if you want, done. You can report completely anonymously; your identity is not stored. Signed-in reporters can attach photos, and location data is stripped from every photo before it is uploaded.

CHECKED BY THE COMMUNITY, TENDED BY A PERSON
Reports start as Open. Community members verify them on the spot, or mark them resolved once the barrier is fixed, so the map reflects what is actually there. Anything reported as inappropriate is reviewed by a real person within 24 hours.

PRIVATE BY DESIGN
No ads. No analytics. No tracking. Location is used only while the app is open, to centre the map and place your reports, and browsing works with location off. The full plain-language privacy policy is right inside the app.

AN ACCESSIBILITY APP THAT WORKS LIKE ONE
Designed against WCAG 2.2 AA: screen-reader labels on every control, colour always paired with numbers and words, large touch targets, dark mode, and a map legend that explains every pin in plain language.

WHO MAKES THIS
I'm Sky, and I built it and run it on my own so that disabled people get better information about the places they move through. The first barriers are mapped in Kelowna, British Columbia. Every city's map starts with one neighbour who flags one thing, and the barrier data belongs to the people who report it.
```
The first line is your ratified mission sentence. Good news the older sheet could not promise: the in-app Terms now also say "Flagstone is a community map of accessibility barriers", so the store description and the app agree on day one (see Phase 4, BQ-1 is closed). Spelling is Canadian to match the app; if your primary storefront locale is English (U.S.), you may want a US-spelling variant, but that is a preference, not a fix.

**5. Promotional text** (limit 170; editable later without a new binary)
```
Every barrier on the map is rated 1 to 5 for real impact, and you can flag one in under a minute without an account. Checked by neighbours.
```
**139 characters.** (The older sheet said 141; the true count is 139. Either way it fits with room to spare.)

**6. What's New** (not required for a first release; drafted for your first update)
```
First public release: the barrier map, severity ratings, anonymous reporting, and the legend.
```
**93 characters.** (The older sheet said 92; the true count is 93.)

**7. Privacy Policy URL**
```
https://skypie99.github.io/AccessMap/privacy/
```
Live, serving the Flagstone policy, verified today. The path keeps "AccessMap" on purpose: a guard test pins it, and a user sees the page title, not the path.

**8. Support URL**
```
https://skypie99.github.io/AccessMap/support.html
```
Reachable today (HTTP 200), but as Phase 2 explains it is still serving the cached AccessMap copy. Re-fetch it in a browser and confirm it reads Flagstone before you paste it. Do not use the URL printed in `docs/github-pages-setup.md`; that file documents a dead host (`skypie911` and a lowercase repo path) and is wrong.

A reassurance for the pitfalls: no competitor names, no "best" or "free" or "#1", no pricing words, and zero em dashes anywhere in the strings above.

---

## Phase 4 · What still blocks submission (none of it about the rename)

The rename was one link in a longer chain. Here is the current, verified state of the rest. Where a thing lives in Supabase or the live database, this run did not touch it (by fence), so it is reported from the record and marked for you to confirm.

### 1. The reviewer credential  ·  blocks submission  ·  ~5 to 10 minutes, yours
An App Review demo account (`reviewer@accessmap.com`) exists in production. Its original password was committed in plaintext to a public repo months ago, which means it lives in that repo's history permanently. Two things are true right now, and they are different:

- **The working-tree file is already clean.** `docs/APP_STORE_REVIEWER_NOTES.md` now uses `[PROVIDED IN APP STORE CONNECT REVIEW NOTES]` placeholders for both the email and the password. I confirmed this without printing anything. So there is no live secret sitting in the current tree.
- **The history exposure is permanent, and whether the live password has actually been rotated is only knowable in the Supabase dashboard, which this run does not open.** The to-do that tracks the rotation is still unchecked, and the account's last recorded sign-in is 2026-08-03, so treat it as not-yet-rotated until you confirm otherwise.

What you do: in Supabase Auth, set a new password on the reviewer account, log in once to prove the new pair works, and put that new pair only into the App Store Connect review-notes field. Never back into a repo file. Skip the git-history rewrite; the old string is public forever and force-pushing a public repo fixes nothing. This one act closes both your only live security exposure and the Apple 2.1(a) "dead demo account" rejection at once.

(Smaller, same area: the live reviewer profile does not match its own notes, points and flag count are lower than the notes claim. That is a "make the notes match reality, or seed to match" decision, not a hard blocker.)

### 2. Junk production data  ·  effectively blocks submission  ·  ~30 to 60 minutes, yours
The live map still carries joke and test flags, most memorably a severity-5 "Giant cockroach blocking all traffic" flag marked Verified, plus a dog-photo flag and four bare description-less test flags. Every persona's quit moment in the dossier is some version of seeing that. It also undercuts the moderation story a reviewer checks under Guideline 1.2, and, most concretely, it is what your App Store screenshots would show. The dossier's one firm addition to your plan: treat cleaning and seeding as a submission step, not housekeeping.

This lives in the production Supabase database, which this run does not touch, so I cannot confirm today's exact contents, only that no cleanup is recorded as done. Treat it as open. What you do: using your moderation authority, remove the junk flags and seed five to ten real Kelowna barriers so the map looks like itself. Do this before screenshots.

### 3. The `createAnonFlag` moderation-filter bypass  ·  recommended before submit, judgment call  ·  small, an agent can land it once you decide
Verified still open today. The blocked-term filter (`containsBlockedTerm`) runs on the normal report path (`src/lib/flags.ts:1196`) and on the edit path (`:1270`), but `createAnonFlag` (`:1732`) inserts straight to the database with no filter call. Since anonymous reporting is your headline feature, that is exactly the path a reviewer will poke. The spec is banked at `specs/ready/anon-submit-moderation-filter.md`. What you do: decide whether to add the one-line filter call for v1. The standing recommendation is yes; "we chose an imperfect filter" is a defensible position, "one function forgot to call the other" is not. If you say yes, it is a one-line change plus its test, then re-run the gates. That is code an agent can do; the decision is yours.

### 4. One false sentence in the Terms  ·  borderline blocker  ·  ~15 minutes, yours to ratify
Still open. `src/lib/copy.ts:621` says you can delete your account "in Settings." The control is on Profile, and both your privacy text (`:742`) and your live web policy already say Profile. So two published documents contradict each other in the copy Apple reads under Guideline 1.2. A ready-to-paste fix is banked at `design-reviews/a11y-qa/2026-07-31/COWORK-PROMPT_terms-deletion-fix.md`. It touches guard-pinned legal copy, so it is a ratify-and-commit, not a silent sweep.

### Closed since the dossiers were written, verified here
- **BQ-1, the in-app brand split, is closed.** The dossiers warn that the in-app Terms and Privacy still say AccessMap and must be ratified before merge. On the merged `main` they do not: `src/lib/copy.ts` now reads 0 "AccessMap" and 11 "Flagstone", and the guard tests that pin that copy to the ratified markdown pass (that is part of the 204 green suites). So the web policy and the in-app policy now agree. Nothing to do here.
- **The name collision that started all this (store dossier Q1)** is answered by the rename itself: Flagstone had zero matches on either storefront as of the 2026-08-16 probes.

### Smaller things worth knowing, not gating
- **Age rating / the social-media question (Q2).** You have to answer Apple's user-generated-content question at Connect. The drafted answer is plan-for-13+, which is fine for a public browsable map with comments. Just a form field to answer honestly, ~5 minutes.
- **The Admin tab renders for nobody.** `src/lib/admin.ts:27` selects `is_admin`, which is not selectable by the `authenticated` role, so the takedown screen renders for no account. It fails closed, nothing is exposed, but "show me how you remove content" has no UI answer today. A 15-minute grant check in Supabase settles whether this is still true. I cannot check it from here.
- **The Sentry mismatch.** Your live privacy policy says you use Sentry for crash logs and keep them 30 days, but `src/lib/sentry.ts` is a four-line no-op stub. So the policy over-discloses, and no crash reporting actually ships, which means a reviewer-side crash would be invisible to you. Decide before submit: re-add Sentry, or soften that policy line.
- **Version drift.** `app.json` is `3.0.0`, `package.json` is `0.2.0`. Cosmetic, but set them the same before you build so the provenance reads sanely. `app.json` is the one that ships.

---

## Phase 5 · The sheet you actually follow

In order. Do the tonight block first; after that, step 1 through step 6 are a chain, each one waits on the one before it. Times are rough.

**0. Tonight, at your desk, about 25 minutes (you).** The unblockers, so the chain can run clean tomorrow.
   - a. Rotate the reviewer password in Supabase Auth, log in once to prove it, and hold the new pair for step 5. (~5 min)
   - b. Decide the anonymous-report filter (Phase 4, item 3): yes or no. If yes, have the one-liner landed and the gates re-run before the build. (~5 min to decide)
   - c. Ratify the Terms "Settings" to "Profile" fix (the banked prompt) so your two policies stop contradicting each other. (~15 min)
   - d. Set `app.json` and `package.json` to the same version number. (~3 min)

**1. Supabase auth email templates, dashboard only, about 10 minutes (you, agents cannot touch this).** Authentication then Emails. For every enabled template (Confirm signup, Invite user, Magic Link, Change email address, Reset password): replace the visible `AccessMap` with `Flagstone` in both the body and the Subject line. The Subject is edited separately and is the one people miss. Leave every `{{ .ConfirmationURL }}`, `{{ .Token }}`, and other `{{ ... }}` variable exactly as is. Do not touch URL Configuration: the redirect URLs and Site URL are plumbing tied to `accessmap.skypistudio.com` and the `accessmap://` scheme, and changing them breaks sign-in. Send yourself one test of each edited template.

**2. Clear the stage, then it is screenshot-ready, about 30 to 60 minutes (you).** Using your moderation tools, remove the junk flags (the cockroach, the dog photo, the four bare test flags) and seed five to ten real Kelowna barriers. This is your screenshot content, so it comes before screenshots.

**3. The EAS build, a couple of minutes to fire plus build time (you, agents cannot run EAS).** From the repo's own docs, verified against `eas.json`:
   ```
   eas build --platform ios --profile testflight --non-interactive
   ```
   Use the `testflight` profile: in `eas.json` it is the `distribution: store` build. The `preview` profile is an internal-link build and is NOT TestFlight. Once the build finishes and you have smoke-tested it, submit separately:
   ```
   eas submit --platform ios --profile production --latest
   ```

**4. The device check, about 5 minutes (you).** On the TestFlight build, look at exactly these, all of which are Flagstone in the merged code, so you are confirming the binary matches: the home-screen icon reads Flagstone; the location, camera, and photo permission dialogs say Flagstone; the sign-in wordmark, the drawer, and About say Flagstone; a shared flag says "Open in Flagstone"; and a feedback email arrives with a Flagstone subject. While you are at it, re-fetch the Support URL and confirm the Pages cache has cleared to Flagstone.

**5. App Store Connect, account holder only, about 90 minutes (you).** Paste the Phase 3 sheet in form order: Name, Subtitle, Keywords (your BQ-6 pick), Description, Promotional text, What's New (only needed for your first update, not the first release), Privacy Policy URL, Support URL. Then the forms that are not metadata: the privacy nutrition labels, the age rating (answer the social/UGC question, plan-for-13+), the EU trader declaration or deselect the EU, and the review notes, which get the new reviewer credentials from step 0a plus a "Browse without an account" line.

**6. Submit, about 10 minutes (you).**

If you have a spare 15 minutes somewhere in there, the Admin-tab grant check and the Sentry policy line (Phase 4, "smaller things") are the two that most reward it. Neither gates the submission.

---

*Read-only run. Live web pages were fetched read-only; the repo was read and its gates re-run; this report is the only file written, on branch `docs/ship-preflight-2026-08-17`, never on `main`. No submission, no build, no purchase, no Supabase access, no credential printed.*
