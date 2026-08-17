# FINISH THE FLAGSTONE APP SIDE [TOP AVAILABLE OPUS · MAX EFFORT · execution run · branch-only, Sky merges]

USAGE: fire in a fresh session from `~/AccessMap`. This clears the one thing blocking the Flagstone merge, plus the four small leftovers, in a single run. **Tick the GO boxes in DECISIONS FOR SKY before firing** (edit `[ ]` to `[x]`). Any leg whose box is unticked is skipped and banked, and the run still finishes every other leg.

WHAT THIS IS: the Flagstone rename shipped Phase A on 2026-08-17 (branch `rename/flagstone`, report `design-reviews/name-forge/2026-08-17_rename/CLOSE-OUT.md`). It deliberately stopped short of five things because each needed Sky, not an agent. This run does them. Read `03_banked_questions.md` in that folder first: it is the source of truth for all five, and it carries the exact patch for leg 1.

★ HOUSE PROTOCOLS: UNATTENDED (questions bank, no mid-run stops) · one deliberate commit per leg, beginner-readable diffs, never a mass find-and-replace · OUTPUT: append `06_finish_app_side.md` to `~/AccessMap/design-reviews/name-forge/2026-08-17_rename/` (leg table first, then one section per leg, then the gate block) · REGISTER: warm, human, zero corporate slop, ZERO EM DASHES in anything user-facing.

★ WHERE TO WORK. Check first, do not assume:
- If `git log main..rename/flagstone` is NON-EMPTY, that branch is unmerged: **stack on it** (`git checkout rename/flagstone`, keep committing there) so one ff-merge still ships the whole rename together and there is never a live window where the web policy and the in-app policy disagree.
- If it is EMPTY, the rename is already merged: branch `rename/flagstone-finish` off `main` from a clean tree.
- Either way `main` is never checked out for writing. Sky merges.

★ NEVER TOUCH: bundle ID `com.accessmap.app` · EAS slug `accessmap` · URL scheme `accessmap://` (including inside the share footer) · `privacyPolicyUrl` in `app.json:5` and `PRIVACY_POLICY_URL` in `src/lib/links.ts:19`, which `privacyLink.guard.test.ts:88` pins equal to each other · the `@/*` alias, test IDs, storage keys · the repo folder path · the live Supabase project · App Store Connect · `qa-reports/**` and `security-audit/**` · everything in `design-reviews/` EXCEPT the two files leg 1 explicitly authorizes.

---

## LEG 1 · The merge blocker: rename the product inside the ratified Terms and Privacy text
**Gated on GO box 1. This is the only leg that matters for the merge.**

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

### The effective dates, per GO box 1b
Current values: `TERMS_EFFECTIVE = 'Effective 2026-07-27 · v1.0'` (`copy.ts:581`, mirrored at `14_…md:13`) and `PRIVACY_EFFECTIVE = 'Effective 2026-07-29 · v1.0'` (`copy.ts:694`, mirrored at `15_…md:10`). Both documents promise a new date at the top when the text changes, and the guards pin the dates too. Do exactly what box 1b says and nothing more.

### Then, in the same run
Sweep `docs/PRIVACY_POLICY.md` (14 hits) for the same name substitution, so the repo's own copy of the policy agrees with the two that ship. Wording untouched.

---

## LEG 2 · The OpenStreetMap User-Agent (BQ-2) — gated on GO box 2
`src/lib/geocode.ts:28` → `const USER_AGENT = 'Flagstone/1.0 (skylerhalisky@gmail.com)'`, and move `src/lib/__tests__/geocode.test.ts:171`'s `/^AccessMap\//` to `/^Flagstone\//`. Two lines. Nominatim's policy only asks for an identifier that reaches a human, which stays true.

## LEG 3 · The changelog entry (BQ-3) — gated on GO box 3
`src/components/ChangelogModal.tsx:52` → `'New "About Flagstone" page in Profile with version + maker note'`. It describes a page that still exists under a new title, and a user reading the changelog has no idea what AccessMap was.

## LEG 4 · The duplicate privacy page (BQ-4) — gated on GO box 4
⚠ **Order matters here, and the reason was found after the close-out was written.** `docs/support.html:231` contains `<a href="privacy-policy.html">Privacy Policy</a>`, so the live support page currently points at the **stale May 30 duplicate**, not at the live July 31 policy. So:
1. First repoint that link to the live policy: `href="privacy/"`.
2. Then delete `docs/privacy-policy.html`.
3. Then confirm nothing else in the repo references it. `docs/github-pages-setup.md` and `docs/PHASE6_STRATEGY.md` mention it, but both are documentation of history, not live links: leave their prose alone and note it.

If box 4 is unticked, still do step 1 on its own. A live support page linking to a stale policy with `[contact email]` placeholders still visible in it is worth fixing either way, and repointing a link deletes nothing.

## LEG 5 · Verify the Support URL (BQ-5), always runs, no box
`docs/github-pages-setup.md` documents `skypie911.github.io/accessmap/support`; the app's verified live host is `skypie99.github.io/AccessMap/…`. Fetch both candidate Support URLs read-only, report which one actually serves `docs/support.html`, and write the correct string into the report so the App Store Connect Support URL field can be filled with a fetched fact rather than a guess. Do not edit `github-pages-setup.md`'s documented URLs without Sky; just record the truth.

---

★ THE GATES (all three, outputs pasted verbatim into the report; all green or the run is not done):
```
npm run typecheck
npx jest --ci -w 3
npm run lint
```
Baseline to beat or match: **204 suites · 2,971 passed · 32 todo · 0 failed**, typecheck clean, lint **0 errors** (74 pre-existing warnings are fine, they are all `no-explicit-any` / `no-console` / `exhaustive-deps`). The terms and privacy guards are the real scoreboard for leg 1: if either goes red, the document and the const have drifted apart, so fix the pair rather than the test. Never skip, weaken, or delete a guard.

★ DECISIONS FOR SKY (tick before firing):
1. [ ] **GO leg 1: ratify the name swap in the Terms and Privacy text.** The wording is otherwise identical; only the product's name changes, and the mission sentence is not reworded. This box also authorizes editing the two `design-reviews/ship-ready/` documents for those substitutions only.
   - 1b. Effective dates: **[ ] keep** `2026-07-27` / `2026-07-29` as-is (a name change is not a change in terms), or **[ ] bump both to 2026-08-17 and v1.1**. Tick exactly one. If neither is ticked, keep them and bank the question.
2. [ ] GO leg 2: rename the OpenStreetMap User-Agent.
3. [ ] GO leg 3: rename the changelog entry.
4. [ ] GO leg 4: delete the duplicate `docs/privacy-policy.html` after repointing the support link.

★ FENCES: no merge, no push, no store submission, no purchase, no external send beyond read-only URL verification · no live database, no Supabase dashboard change · no credentials · `main` untouched · `qa-reports/` and `security-audit/` untouched · `design-reviews/` untouched except the two documents box 1 authorizes · nothing invented, banked questions for anything genuinely open. Report and STOP.
