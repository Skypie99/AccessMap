# FINISH THE FLAGSTONE APP SIDE · RUN 2 [TOP AVAILABLE OPUS · MAX EFFORT · execution run · branch-only, Sky merges]

**⚑ FIRE THIS FILE, not `PROMPT_1_FINISH_APP_SIDE.md`.** That one is run 1, kept for the record. Every GO box below is already ticked by Sky. Do not ask her to tick anything; do not wait. Fire in a fresh session from `~/AccessMap`.

WHAT THIS IS: the Flagstone rename shipped Phase A on 2026-08-17 (branch `rename/flagstone`, report `design-reviews/name-forge/2026-08-17_rename/CLOSE-OUT.md`). Phase A deliberately stopped short of five things because each needed Sky's decision. She has now made all of them. This run does the work. Read `03_banked_questions.md` in that folder first: it is the source of truth for all five, and it carries the exact patch for leg 1.

---

## ⚑ WHAT CAME BEFORE — read this before you touch anything

**A first run of this prompt was fired by accident with every box unticked.** It behaved correctly, did only the two ungated non-destructive legs, and **finished cleanly**. Nothing was deleted, nothing was merged, and the ratified legal text was not touched.

**Run 1 is complete. Verified state as of handoff:**

```
rename/flagstone
  730d7f3  docs(rename): finish-app-side run report (ungated legs only)
  71fe0f5  fix(support): point Privacy Policy link at the live policy, not the stale duplicate
  3cd753d  docs(rename): three ready-to-fire follow-up prompts
  7102343  docs(rename): stamp the run log with the Phase A commit SHA
  abf4e73  refactor(brand): AccessMap ships as Flagstone — Phase A
main
  d2a0991  (untouched, still equals origin/main)
```
Working tree clean on tracked files. Branch unmerged, 5 commits ahead of `main`. Its report is `06_finish_app_side.md`.

**So: legs 4-step-1 and 5 are DONE. Legs 1, 2, 3 and the leg-4 deletion are yours.**

Still verify rather than trust this block, since time has passed. `git log --oneline -6` and `git status`. Then:
1. **Never discard run 1's work.** No `git checkout --`, no `git reset --hard`, no force. Stack on top.
2. **Do not overwrite `06_finish_app_side.md`.** It is run 1's record. This run writes `07_finish_app_side_run2.md`.
3. Anything already done is **done**. Record it as done-by-run-1 and move on.

### ⚠ One environment gotcha run 1 hit, so you do not lose time on it
`npm run lint` may crash immediately with `Cannot find native binding` from `unrs-resolver` (the native resolver behind `eslint-import-resolver-typescript`). That is **not a code problem**. `node_modules` was installed on macOS (`darwin-arm64`) and Cowork executes in a Linux `arm64` sandbox, so the platform-specific `.node` binary will not load.

**⚠ Do NOT use `--no-package-lock` for this.** Run 1 did, and it caused real collateral damage: ignoring the lockfile let npm upgrade `lucide-react-native` from the pinned 1.17.0 to 1.31.0, which moved the per-icon CJS files that `jest.config.js:38` maps to, and `StatusHistoryModal.test.tsx` then failed to run at all (`Could not locate module lucide-react-native/icons/history`). The tracked manifests stayed clean, so it was invisible until the next full suite on a different machine.

Install the binding **with the lockfile respected**:
```
npm i @unrs/resolver-binding-linux-arm64-gnu --no-save
```
`--no-save` keeps `package.json` unchanged. Then confirm `git status` shows `package.json` and `package-lock.json` still clean, and say so in the report. If the sandbox architecture differs, install the binding that matches it, same single flag. **Never commit a dependency-manifest change to work around this, and never let a workaround silently move a pinned dependency.**

If the suite reports anything other than 204/204, check for this drift before blaming the code: `node -p "require('./node_modules/lucide-react-native/package.json').version"` must read `1.17.0`. If it does not, `npm ci` restores the tree, and note it in the report.

**This run writes `07_finish_app_side_run2.md`,** with a leg table showing for each leg: done by run 1 / done by this run / skipped and why. Carry run 1's Support URL verdict forward into it, cited as run 1's.

---

★ HOUSE PROTOCOLS: UNATTENDED (questions bank, no mid-run stops) · one deliberate commit per leg, beginner-readable diffs, never a mass find-and-replace · OUTPUT: `07_finish_app_side_run2.md` in `~/AccessMap/design-reviews/name-forge/2026-08-17_rename/` (leg table first, then one section per leg, then the gate block) · REGISTER: warm, human, zero corporate slop, ZERO EM DASHES in anything user-facing.

★ WHERE TO WORK. Check first, do not assume:
- If `git log main..rename/flagstone` is NON-EMPTY, that branch is unmerged: **stack on it** (`git checkout rename/flagstone`, keep committing there) so one ff-merge still ships the whole rename together and there is never a live window where the web policy and the in-app policy disagree.
- If it is EMPTY, the rename is already merged: branch `rename/flagstone-finish` off `main` from a clean tree.
- Either way `main` is never checked out for writing. Sky merges.

★ NEVER TOUCH: bundle ID `com.accessmap.app` · EAS slug `accessmap` · URL scheme `accessmap://` (including inside the share footer) · `privacyPolicyUrl` in `app.json:5` and `PRIVACY_POLICY_URL` in `src/lib/links.ts:19`, which `privacyLink.guard.test.ts:88` pins equal to each other · the `@/*` alias, test IDs, storage keys · the repo folder path · the live Supabase project · App Store Connect · `qa-reports/**` and `security-audit/**` · everything in `design-reviews/` EXCEPT the two files leg 1 explicitly authorizes.

---

## LEG 1 · The merge blocker: rename the product inside the ratified Terms and Privacy text
**GO box 1 is TICKED. This is the leg that matters. Do it.**

Today the in-app Terms and Privacy Policy still say AccessMap while the published web policy says Flagstone. Two guard tests pin that copy verbatim, in BOTH directions, to two ratification documents:

| Guard | Pinned document |
|---|---|
| `src/__tests__/terms.guard.test.ts` | `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` §1 |
| `src/__tests__/privacy.guard.test.ts` | `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md` |

**⚑ SKY'S EXPRESS AUTHORIZATION, the thing that unlocks this leg:** those two documents are live source of record, not archaeology, which is exactly why the guards read them. Editing them is normally forbidden. **For this leg only, and only for the name substitutions listed below, Sky authorizes editing both documents.** Nothing else in either file may change: not a word of wording, not a heading, not a paragraph order, not a `[V: …]` marker. If a change you are about to make is not literally `AccessMap` → `Flagstone`, stop and bank it.

### The nine pairs, applied identically in the document AND in `src/lib/copy.ts`
In `14_MODERATION_TEXTS_v1.md` §1 and `copy.ts` `TERMS_TITLE` (:573) / `TERMS_SECTIONS` (:596, :597, :617, :629):
1. `AccessMap Terms & Community Guidelines` → `Flagstone Terms & Community Guidelines`
2. `What AccessMap is.` → `What Flagstone is.`
3. `AccessMap is a community map of accessibility barriers. I'm Sky, and…` → `Flagstone is a community map…`
4. `…you're letting AccessMap show it in the app…` → `…you're letting Flagstone show it…`
5. `…AccessMap is made in Canada and operates under the laws of British Columbia.` → `…Flagstone is made in Canada…`

In `15_PRIVACY_POLICY_v1.md` and `copy.ts` `PRIVACY_TITLE` (:688) / `PRIVACY_SECTIONS` (:706, :710, :746):
6. `AccessMap Privacy Policy` → `Flagstone Privacy Policy`
7. `AccessMap is built and run by one person, Sky…` → `Flagstone is built and run…`
8. `AccessMap collects as little as it can…` → `Flagstone collects as little as it can…`
9. `AccessMap isn't designed for children…` → `Flagstone isn't designed for children…`

### Also in the same commit, or the guard passes vacuously
`src/__tests__/terms.guard.test.ts:74` reads `.find((l) => l.startsWith('AccessMap Terms'))`. Move that anchor to `'Flagstone Terms'`. Without it the `.find` returns `undefined` and the title assertion stops testing anything.

### The effective dates — Sky's decision is KEEP
**Leave both dates exactly as they are.** `TERMS_EFFECTIVE = 'Effective 2026-07-27 · v1.0'` (`copy.ts:581`, mirrored at `14_…md:13`) and `PRIVACY_EFFECTIVE = 'Effective 2026-07-29 · v1.0'` (`copy.ts:694`, mirrored at `15_…md:10`) do not move. Sky's reasoning, recorded here so no future run second-guesses it: a name change is not a change in terms. Do not bump to v1.1. Do not touch either date line in either file.

### Then, in the same run
Sweep `docs/PRIVACY_POLICY.md` (14 hits) for the same name substitution, so the repo's own copy of the policy agrees with the two that ship. Wording untouched.

---

## LEG 2 · The OpenStreetMap User-Agent (BQ-2) — **GO box 2 TICKED**
`src/lib/geocode.ts:28` → `const USER_AGENT = 'Flagstone/1.0 (skylerhalisky@gmail.com)'`, and move `src/lib/__tests__/geocode.test.ts:171`'s `/^AccessMap\//` to `/^Flagstone\//`. Two lines. Nominatim's policy only asks for an identifier that reaches a human, which stays true.

## LEG 3 · The changelog entry (BQ-3) — **GO box 3 TICKED**
`src/components/ChangelogModal.tsx:52` → `'New "About Flagstone" page in Profile with version + maker note'`. It describes a page that still exists under a new title, and a user reading the changelog has no idea what AccessMap was.

## LEG 4 · The duplicate privacy page (BQ-4) — **GO box 4 TICKED**
**Step 1 is already done by run 1** at commit `71fe0f5`: `docs/support.html` now reads `<a href="privacy/">Privacy Policy</a>`, pointing the live support page at the live July 31 policy instead of the stale May 30 duplicate. Verify that line still reads `privacy/`, record it as done-by-run-1, and do not redo it.

**Run 1 also de-risked the deletion for you.** It grepped every served HTML page in `docs/` for `privacy-policy.html` and confirmed that after its repoint, **no served page links to the duplicate.** So:
1. Delete `docs/privacy-policy.html`.
2. Re-confirm that grep yourself before deleting, since this is the one destructive act in the run. If any served page still links to it, stop and bank instead of deleting.
3. `docs/github-pages-setup.md` and `docs/PHASE6_STRATEGY.md` mention the file in prose that documents history, not as live links. Leave their wording alone and note it in the report.

## LEG 5 · Verify the Support URL (BQ-5) — **DONE by run 1, do not re-fetch**
Run 1 fetched all four candidates read-only and settled it:

| URL | Result |
|---|---|
| `https://skypie99.github.io/AccessMap/support.html` | **live, HTTP 200** |
| `https://skypie99.github.io/AccessMap/support` | live (extensionless also resolves) |
| `https://skypie911.github.io/accessmap/support` | **dead** |
| `https://skypie911.github.io/accessmap/support.html` | **dead** |

**The answer for the App Store Connect Support URL field: `https://skypie99.github.io/AccessMap/support.html`.** The URL documented in `docs/github-pages-setup.md` is wrong on two counts: the username is `skypie99`, not `skypie911`, and the repo path is `AccessMap`, not `accessmap`.

Carry that verdict into this run's report, cited as run 1's finding. Do not re-fetch, and do not edit the documented URLs in `github-pages-setup.md` without Sky: that stays banked.

---

★ THE GATES (all three, outputs pasted verbatim into the report; all green or the run is not done):
```
npm run typecheck
npx jest --ci -w 3
npm run lint
```
Baseline to beat or match: **204 suites · 2,971 passed · 32 todo · 0 failed**, typecheck clean, lint **0 errors** (74 pre-existing warnings are fine, they are all `no-explicit-any` / `no-console` / `exhaustive-deps`). The terms and privacy guards are the real scoreboard for leg 1: if either goes red, the document and the const have drifted apart, so fix the pair rather than the test. **Never skip, weaken, or delete a guard to make a rename pass.**

★ DECISIONS FOR SKY — ALL TICKED, no action needed, proceed:
1. [x] **GO leg 1: ratify the name swap in the Terms and Privacy text.** The wording is otherwise identical; only the product's name changes, and the mission sentence is not reworded. This box also authorizes editing the two `design-reviews/ship-ready/` documents for those substitutions only.
   - 1b. Effective dates: **[x] keep** `2026-07-27` / `2026-07-29` as-is (a name change is not a change in terms) · **[ ] bump both to 2026-08-17 and v1.1** ← deliberately NOT chosen.
2. [x] GO leg 2: rename the OpenStreetMap User-Agent.
3. [x] GO leg 3: rename the changelog entry.
4. [x] GO leg 4: delete the duplicate `docs/privacy-policy.html` after repointing the support link.

★ WHEN YOU FINISH, tell Sky in plain language: which legs this run did, which run 1 had already done, the three gate results, and the single sentence she needs most — **whether the branch is now safe to merge**, meaning the in-app Terms and Privacy and the published web policy all say Flagstone together.

★ FENCES: no merge, no push, no store submission, no purchase, no external send beyond read-only URL verification · no live database, no Supabase dashboard change · no credentials · `main` untouched · `qa-reports/` and `security-audit/` untouched · `design-reviews/` untouched except the two documents box 1 authorizes and this run's own report · never discard another run's work · nothing invented, banked questions for anything genuinely open. Report and STOP.
