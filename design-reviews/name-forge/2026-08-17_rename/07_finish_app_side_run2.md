# 07 · FINISH THE APP SIDE · RUN 2 · Flagstone rename

**2026-08-17 · execution run · branch `rename/flagstone` (stacked, unmerged) · branch-only, Sky merges.**

This is the run that clears the merge blocker. Every GO box was ticked when it fired, so the four gated legs run 1 had banked are now done: the ratified Terms and Privacy text says Flagstone (leg 1), the OpenStreetMap User-Agent says Flagstone (leg 2), the changelog entry names the page's current title (leg 3), and the stale duplicate privacy page is gone (leg 4). Run 1's two ungated results (leg 4 step 1 and the leg 5 Support URL verdict) are carried forward here, cited as run 1's.

Where the work landed: I was already on `rename/flagstone`, and `git log main..rename/flagstone` was non-empty (6 commits from run 1), so per the runbook I stacked on it and kept committing there. One fast-forward merge still ships the whole rename together, with no live window where the web policy and the in-app policy disagree. `main` was never checked out for writing and still equals `origin/main` (`d2a0991`).

One deliberate commit per leg, four new commits this run, on top of run 1's six.

---

## Leg table

| Leg | What it is | Done by run 1 | Done by this run (run 2) | Left / banked |
|---|---|---|---|---|
| 1 | Rename the product inside the ratified Terms + Privacy text. The merge blocker. | Banked (box was unticked) | **Done**: 9 name pairs in both `ship-ready/` docs and `copy.ts`, guard anchor moved, dates kept, `docs/PRIVACY_POLICY.md` swept. Commit `d6bede7`. | One unlisted occurrence in the Terms "Community-provided information" body, banked below with a ready one-line patch. |
| 1b | Effective dates: keep, or bump to 2026-08-17 / v1.1 | Kept as-is (default) | **Kept as-is** per your tick: `2026-07-27` / `2026-07-29`, both v1.0. A name change is not a change in terms. | Nothing open. |
| 2 | OpenStreetMap User-Agent (BQ-2) | Banked | **Done**: `Flagstone/1.0`, test regex moved. Commit `c561833`. | Test title residual noted below (cosmetic). |
| 3 | Changelog entry (BQ-3) | Banked | **Done**: "About Flagstone". Commit `a183702`. | Nothing open. |
| 4 | Repoint support link, then delete the duplicate policy (BQ-4) | **Step 1 done** (support link repointed, commit `71fe0f5`) | **Deletion done**: re-confirmed no served page links to it, then removed `docs/privacy-policy.html`. Commit `41b49e3`. | Prose mentions in two `.md` files left alone, as instructed. |
| 5 | Verify the live Support URL (BQ-5) | **Done** (fetched read-only) | Carried forward, not re-fetched. | Documented URLs in `github-pages-setup.md` still stale, banked as run 1 left it. |

---

## Leg 1 · The merge blocker · DONE

Nine name-only substitutions, applied identically in Sky's document and in `src/lib/copy.ts`, so the two guards (`terms.guard.test.ts`, `privacy.guard.test.ts`) that compare them character for character stay green. All of it moved in one commit, `d6bede7`.

**Terms** (`14_MODERATION_TEXTS_v1.md` §1 + `TERMS_TITLE` / `TERMS_SECTIONS`): the title line, "What Flagstone is.", the "Flagstone is a community map" opener, "you're letting Flagstone show it in the app", and "Flagstone is made in Canada and operates under the laws of British Columbia."

**Privacy** (`15_PRIVACY_POLICY_v1.md` policy text + `PRIVACY_TITLE` / `PRIVACY_SECTIONS`): the title, "Flagstone is built and run by one person", "Flagstone collects as little as it can", and "Flagstone isn't designed for children".

**The guard anchor moved with it.** `terms.guard.test.ts:74` read `.find((l) => l.startsWith('AccessMap Terms'))`. Once the title says Flagstone, that finder returns `undefined` and the title assertion passes vacuously on nothing, so the anchor moved to `'Flagstone Terms'`. The title assertion is testing again.

**Effective dates untouched, per your 1b tick.** `TERMS_EFFECTIVE` stays `Effective 2026-07-27 · v1.0` and `PRIVACY_EFFECTIVE` stays `Effective 2026-07-29 · v1.0`. No date line moved and no `[V: ...]` marker moved. A name change is not a change in terms.

**The repo's own draft copy swept.** `docs/PRIVACY_POLICY.md` is an unguarded draft (the 2026-05-29 Jordan draft) that is not what ships, but its brand should agree with what does. It had 15 brand occurrences across 14 lines, not the 14 the runbook estimated (line 172 carries two), and every one is plain brand prose. None sits inside a URL, a path, or the `accessmap://` scheme, which I confirmed by grep before touching it, so the sweep is a scoped single-file rename, not the repo-wide find-and-replace the house rules forbid. Wording is untouched.

### ⚑ One occurrence is left on purpose, and it needs your call

The Terms "Community-provided information" paragraph still reads:

> "...Please don't make **AccessMap** your only source when your safety is on the line."

It lives at `src/lib/copy.ts:601` and, identically, at `14_MODERATION_TEXTS_v1.md:17`. It is a real sixth "AccessMap" in the Terms, but it is **not** one of the nine pairs your authorization enumerated, and the authorization was explicit that only the listed substitutions may touch these ratified documents. So it was left exactly as ratified. Because the document and the const still agree there, the guard stays green: nothing is broken, and the tests are not lying.

The effect: the in-app Terms now say Flagstone in five of six places, with this one sentence still saying AccessMap. It is guard-safe to ship as-is, but it is not a spotless rename. If you want the Terms to say Flagstone with zero residue, this is the ready follow-up, and it is the same shape as leg 1: change the one string in both files together, in one commit.

```
# in src/lib/copy.ts:601  AND  design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md:17
- Please don't make AccessMap your only source when your safety is on the line.
+ Please don't make Flagstone your only source when your safety is on the line.
```

Say the word and I will apply it exactly like the other nine.

## Leg 2 · OpenStreetMap User-Agent · DONE

`src/lib/geocode.ts:28` now reads `const USER_AGENT = 'Flagstone/1.0 (skylerhalisky@gmail.com)'`, and `src/lib/__tests__/geocode.test.ts:171` asserts `/^Flagstone\//`. Two lines, exactly as scoped. Commit `c561833`, geocode suite green (15 tests). No user ever sees this string; Nominatim's policy only asks for an identifier that reaches a human, which stays true, so this is honesty in the logs rather than a fix.

One cosmetic residual, left because the runbook scoped this leg to two lines: the test's own title on `geocode.test.ts:161` still reads "sends the AccessMap User-Agent per Nominatim policy". It is an internal test name, not a shipped string and not an assertion, so it changes nothing. Flag it if you want it swept.

## Leg 3 · Changelog entry · DONE

`src/components/ChangelogModal.tsx:52` now reads `'New "About Flagstone" page in Profile with version + maker note'`. Commit `a183702`. It describes a page that still exists under its Phase A title, and a user reading the changelog has no idea what AccessMap was, so the changelog names the current title and the old name stays in git history. Nothing pins the old string (grep confirmed), and the changelog and shared-modal suites are green.

## Leg 4 · The duplicate privacy page · DELETION DONE

**Step 1 was run 1's**, at commit `71fe0f5`: it repointed the support page's Privacy Policy link off the stale duplicate and onto the live July 31 policy. I re-confirmed that line still reads `<a href="privacy/">Privacy Policy</a>` at `docs/support.html:231`. Verified, done by run 1, not redone.

**The deletion is this run's**, and it is the one destructive act, so I re-ran the safety check myself before doing it. Every served `.html` page under `docs/` (`support.html`, `privacy/index.html`, and the duplicate itself) was grepped for `privacy-policy.html`, and **no served page links to it**. Only two markdown files mention it, `docs/github-pages-setup.md` and `docs/PHASE6_STRATEGY.md`, and both do so in prose that documents history rather than as live links, so their wording is left alone. With no live link pointing at it, `docs/privacy-policy.html` (the older May 30 policy, still carrying `[contact email]` placeholders) was removed. Commit `41b49e3`, 366 lines gone. Served pages are now the live policy and the support page, and nothing else.

A note on the mechanics, so it is on the record: this session's workspace mounts the repo with file deletion disabled by default (every `rm` returns "Operation not permitted"). Deleting the file required enabling deletion for the AccessMap folder first. Nothing else was deleted.

## Leg 5 · The live Support URL · DONE BY RUN 1, carried forward

Not re-fetched this run. Run 1 fetched all four candidates read-only and settled it:

| URL | Run 1's result |
|---|---|
| `https://skypie99.github.io/AccessMap/support.html` | live, HTTP 200, title "Support" |
| `https://skypie99.github.io/AccessMap/support` | live (extensionless also resolves) |
| `https://skypie911.github.io/accessmap/support` | dead |
| `https://skypie911.github.io/accessmap/support.html` | dead |

**The value for the App Store Connect Support URL field is `https://skypie99.github.io/AccessMap/support.html`** (run 1's finding). The URL documented in `docs/github-pages-setup.md` is wrong on two counts: the username is `skypie99`, not `skypie911`, and the repo path is `AccessMap`, not `accessmap`. Correcting that documented URL stays banked as BQ-5 for you, unchanged from run 1.

---

## The gates

All three run against the branch with all four legs applied. Baseline to match: 204 suites, 2,971 passed, 32 todo, 0 failed; typecheck clean; lint 0 errors with 74 pre-existing warnings. Every gate matched it.

**Gate 1 · `npm run typecheck` (`tsc --noEmit`)**
```
> accessmap@0.2.0 typecheck
> tsc --noEmit

(no diagnostics emitted)
typecheck exit: 0
```

**Gate 2 · `npx jest --ci -w 3`**
```
Test Suites: 204 passed, 204 total
Tests:       32 todo, 2971 passed, 3003 total
Snapshots:   0 total
Time:        52.257 s
Ran all test suites.
jest exit: 0
```
Matches the baseline exactly. The terms and privacy guards are green, and for this run that is the correct reading: the const and its pinned document now both say Flagstone, so they still agree.

**Gate 3 · `npm run lint` (`eslint src`)**
```
✖ 74 problems (0 errors, 74 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
lint exit: 0
```
The 74 warnings are the pre-existing set (`no-explicit-any`, `no-console`, `react-hooks/exhaustive-deps`, one `no-unused-vars`), none of them on a line this run changed.

**The environment note, carried from run 1.** `eslint-import-resolver-typescript` needs a platform-specific native binding, and this run executes in a Linux `arm64` (`aarch64`) sandbox while `node_modules` was installed on macOS. Run 1's fix (`@unrs/resolver-binding-linux-arm64-gnu`, installed with `--no-save --no-package-lock`) had already written that binding into the untracked `node_modules`, and it was still present this session, so lint ran to completion without any new install. `package.json` and the tracked `package-lock.json` are byte-for-byte clean in `git status`, confirmed after the gates. No dependency manifest was touched.

---

## What changed on disk, and what was committed

Four commits on `rename/flagstone`, one per leg, stacked on run 1's six:

1. `d6bede7` leg 1: the ratified Terms and Privacy text now says Flagstone (`copy.ts`, `14_...md`, `15_...md`, `terms.guard.test.ts`, `docs/PRIVACY_POLICY.md`).
2. `c561833` leg 2: the OpenStreetMap User-Agent (`geocode.ts`, `geocode.test.ts`).
3. `a183702` leg 3: the changelog entry (`ChangelogModal.tsx`).
4. `41b49e3` leg 4: delete the stale duplicate privacy page (`docs/privacy-policy.html`).

Staging was by explicit path only, never `git add -A`, because the working tree carries a large amount of pre-existing untracked clutter (device-tune, r2-audit, store-dossier, and more) that is not part of this run and was left exactly as found. The tracked tree is clean after each commit.

---

## Merge-safety verdict

**The specific split that blocked the merge is closed.** BQ-1 was that the published web privacy policy said Flagstone while the in-app privacy policy still said AccessMap. After leg 1, the in-app Privacy Policy says Flagstone in all four of its brand lines, and the web policy at `docs/privacy/index.html` says Flagstone in all six of its (title included). They now agree. The in-app Terms, which are in-app only and have no web counterpart, say Flagstone in five of six places.

**So: the branch is safe to merge.** The web and in-app privacy policies say Flagstone together, all four legs are in, both guards are green, and typecheck, jest, and lint all match the baseline. `main` is untouched, so a single fast-forward ships the whole rename at once.

**The one thing to decide, which does not block the merge:** the Terms "Community-provided information" sentence still says "AccessMap" (the banked item above). It is guard-green and it has no conflicting web surface, so it is safe to ship as-is, but if you want the Terms to read Flagstone with zero residue, approve the one-line follow-up and I will land it the same way. Your call, before or after the merge.

## Fences honored

No merge, no push, no store submission, no purchase. No external send beyond nothing new this run (run 1 did the read-only Support URL fetches; this run did not re-fetch). No live database or Supabase change, no credentials touched. `main` untouched. `qa-reports/` and `security-audit/` untouched. Everything under `design-reviews/` untouched except the two `ship-ready/` documents your GO box 1 explicitly authorized for the nine name substitutions, and this run's own report. Bundle ID `com.accessmap.app`, EAS slug `accessmap`, the `accessmap://` scheme, `privacyPolicyUrl` / `PRIVACY_POLICY_URL`, the `@/*` alias, test IDs, storage keys, and the repo folder path were all left alone. Nothing was invented; the one genuinely open item is banked above with a ready patch.
