# 06 · FINISH THE APP SIDE · Flagstone rename

**2026-08-17 · execution run · branch `rename/flagstone` (stacked, unmerged) · branch-only, Sky merges.**

Every GO box in DECISIONS FOR SKY was unticked when this run fired, on disk and in the fired prompt. The runbook is explicit that an unticked box means the leg is skipped and banked, and that the express authorization to edit the two ratified `ship-ready/` documents comes only from GO box 1. So this run did not tick any box, did not touch the ratified legal text or `src/lib/copy.ts` or the guards, and did not delete anything. It ran the two things that need no box (leg 4 step 1 and leg 5), then the three gates, and banked the rest with the ready patch preserved.

Where the work landed: I was already on `rename/flagstone`, and `git log main..rename/flagstone` had 3 commits, so the branch is unmerged. Per the runbook I stacked on it and kept committing there, so one fast-forward merge still ships the whole rename together. `main` was never checked out for writing.

---

## Leg table

| Leg | What it is | GO box (as fired) | This run |
|---|---|---|---|
| 1 | Rename the product inside the ratified Terms + Privacy text. The one merge blocker. | `[ ]` unticked | **Banked.** No edit to the ratified docs, `copy.ts`, or the guards. Ready patch preserved. |
| 1b | Effective dates: keep, or bump to 2026-08-17 / v1.1 | both `[ ]` unticked | **Kept as-is** (default per instruction), question banked. |
| 2 | OpenStreetMap User-Agent (BQ-2) | `[ ]` unticked | **Banked.** Two-line change written out below. |
| 3 | Changelog entry (BQ-3) | `[ ]` unticked | **Banked.** One-line change written out below. |
| 4 | Repoint support link, then delete the duplicate policy (BQ-4) | `[ ]` unticked | **Step 1 done** (link repointed). **Deletion banked.** |
| 5 | Verify the live Support URL (BQ-5) | no box, always runs | **Done.** Fetched truth recorded below. |

---

## Leg 1 · The merge blocker (BQ-1) · BANKED

GO box 1 was unticked, so nothing here was changed. This is the leg that matters for the merge, and it is the one thing that still needs Sky.

**What is true on the branch right now.** The published web privacy policy on the branch says Flagstone (the `docs/privacy/index.html` title now reads Flagstone, not AccessMap). The in-app Terms and Privacy Policy still say AccessMap, because `src/lib/copy.ts` was left untouched. The two guards stay green precisely because the const and its pinned document still agree with each other: both still say AccessMap. Green guards here do not mean the rename is finished. They mean the app text and the ratified source have not drifted apart yet.

**The consequence to see before merging.** If `rename/flagstone` is merged as it stands, the web policy says Flagstone while the in-app policy and terms say AccessMap. A user who reads both, or an App Store reviewer who checks the privacy URL against the app, sees the split. The clean path is to ratify leg 1 first so both surfaces land saying the same thing in a single merge, with no live window where they disagree.

**Why the agent will not do this without the box.** Renaming the product inside ratified legal text is a ratification act, not a mechanical sweep. The runbook makes GO box 1 the single source of authorization to edit the two `design-reviews/ship-ready/` documents, and that box is unticked. Absent the tick, both ratified documents and `copy.ts` remain byte-for-byte unchanged.

**The patch is ready and unchanged.** `03_banked_questions.md` §BQ-1 holds the complete patch: nine string pairs applied identically in the document and in `copy.ts`, plus the test anchor at `terms.guard.test.ts:74` that must move from `'AccessMap Terms'` to `'Flagstone Terms'` or the title assertion passes vacuously on `undefined`. All three files move in one commit or the guards go red. Nothing in that patch was applied; nothing in it was altered.

**Leg 1b, the effective dates.** Neither sub-box was ticked. Per the instruction ("If neither is ticked, keep them and bank the question"), the dates are kept as they are: `TERMS_EFFECTIVE = 'Effective 2026-07-27 · v1.0'` and `PRIVACY_EFFECTIVE = 'Effective 2026-07-29 · v1.0'`. The open question stays banked: a name change is arguably not a change in terms, but both documents' own "Changes" paragraphs promise a new date at the top when the text changes, and the guards pin the dates too. Your call at ratification time.

**To unlock:** re-fire this prompt with GO box 1 ticked (and exactly one of the 1b options), or tell me here to proceed with leg 1. The `docs/PRIVACY_POLICY.md` sweep (14 name hits) is part of leg 1 and was also left untouched, so the repo's own copy still says AccessMap until leg 1 runs.

## Leg 2 · OpenStreetMap User-Agent (BQ-2) · BANKED

GO box 2 unticked. Left as-is: `src/lib/geocode.ts:28` still reads `const USER_AGENT = 'AccessMap/1.0 (skylerhalisky@gmail.com)'`, and `src/lib/__tests__/geocode.test.ts:171` still asserts `/^AccessMap\//`.

Ready when you tick it (two lines, no risk): set the UA to `'Flagstone/1.0 (skylerhalisky@gmail.com)'` and move the test regex to `/^Flagstone\//`. Nominatim's policy only asks for an identifier that reaches a human, which stays true either way, so this is cosmetic honesty rather than a fix.

## Leg 3 · Changelog entry (BQ-3) · BANKED

GO box 3 unticked. Left as-is: `src/components/ChangelogModal.tsx:52` still reads `'New "About AccessMap" page in Profile with version + maker note'`.

Ready when you tick it: change `About AccessMap` to `About Flagstone`. The entry describes a page that still exists under its new title, and a user reading the changelog has no idea what AccessMap was. The archaeology stays in git.

## Leg 4 · Support link and the duplicate policy (BQ-4) · STEP 1 DONE, DELETION BANKED

**Step 1 ran, because it needs no box and it deletes nothing.** The live support page footer pointed at the stale May 30 duplicate, which still carries visible `[contact email]` placeholders. Repointing that link is worth doing on its own, exactly as the runbook says.

```diff
--- a/docs/support.html
+++ b/docs/support.html
@@ footer @@
-    <a href="privacy-policy.html">Privacy Policy</a>
+    <a href="privacy/">Privacy Policy</a>
```

`href="privacy/"` resolves to `docs/privacy/index.html`, the live July 31 policy, which is the same target the live policy page uses when it links back to support (`../support.html`). One line changed, nothing else.

**A read-only fact that makes the banked deletion safe later.** I grepped every served HTML page in `docs/` for `privacy-policy.html`. Before this edit, `docs/support.html` was the only served page linking to the stale duplicate. After this edit, no served page links to it. So when you tick GO box 4, deleting `docs/privacy-policy.html` will not break any live link.

**Deletion banked.** GO box 4 was unticked, so `docs/privacy-policy.html` was not deleted. The two remaining mentions of the file, in `docs/github-pages-setup.md` and `docs/PHASE6_STRATEGY.md`, are prose that documents history, not live links, so per the runbook their wording was left alone and is noted here.

## Leg 5 · Verify the live Support URL (BQ-5) · DONE

Fetched read-only, today, both candidate hosts:

| URL fetched | Result |
|---|---|
| `https://skypie99.github.io/AccessMap/support.html` | **Serves the support page** (HTTP 200, `title: Support`). |
| `https://skypie99.github.io/AccessMap/support` (extensionless) | **Also serves it** (GitHub Pages resolves the extensionless path). |
| `https://skypie911.github.io/accessmap/support` (as documented) | **Dead.** Empty response, no page. |
| `https://skypie911.github.io/accessmap/support.html` | **Dead.** Empty response, no page. |

**The truth for the App Store Connect Support URL field:** use `https://skypie99.github.io/AccessMap/support.html`. It is live and it matches the host and path convention of the already-verified Privacy Policy URL `https://skypie99.github.io/AccessMap/privacy/`. The URL that `docs/github-pages-setup.md` documents (`skypie911.github.io/accessmap/...`) is wrong on two counts: the username is `skypie99`, not `skypie911`, and the repo path is `AccessMap`, not `accessmap`.

One thing to know so it does not surprise you: the page that host serves today still reads AccessMap, because it is serving `main` and `rename/flagstone` is not merged yet. The URL and path are correct and stable; once you merge the rename, the same URL serves the Flagstone version. Per the runbook I did not edit the documented URLs in `github-pages-setup.md`; that stays banked as BQ-5 for you to correct when you want.

---

## The gates

All three run against the branch with leg 4 step 1 applied. Baseline to match: 204 suites, 2,971 passed, 32 todo, 0 failed; typecheck clean; lint 0 errors.

**Gate 1 · `npm run typecheck` (`tsc --noEmit`)**
```
> accessmap@0.2.0 typecheck
> tsc --noEmit

(no diagnostics emitted)
exit code: 0
```

**Gate 2 · `npx jest --ci -w 3`**
```
Test Suites: 204 passed, 204 total
Tests:       32 todo, 2971 passed, 3003 total
Snapshots:   0 total
Time:        99.233 s
Ran all test suites.
exit code: 0
```
Matches the cold-clone baseline exactly. The terms and privacy guards are green, which for leg 1 is the correct reading: the const and its pinned document still agree, because both were left saying AccessMap.

**Gate 3 · `npm run lint` (`eslint src`)**
```
✖ 74 problems (0 errors, 74 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
exit code: 0
```
The 74 warnings are the pre-existing set (`no-explicit-any`, `no-console`, `react-hooks/exhaustive-deps`), none on a changed line. My change is in `docs/`, which eslint does not lint.

**One honest caveat on gate 3.** On its first run, lint crashed before evaluating any code with `Cannot find native binding` from `unrs-resolver`, the native resolver behind `eslint-import-resolver-typescript`. That is an environment mismatch, not a code problem: `node_modules` was installed on macOS (`darwin-arm64`), and this run executed in a Linux `arm64` sandbox, so the platform-specific `.node` binary would not load. I added the matching `@unrs/resolver-binding-linux-arm64-gnu@1.12.2` with `--no-save --no-package-lock`, which writes only into `node_modules` (untracked) and leaves `package.json` and the tracked `package-lock.json` unchanged. Lint then ran to completion with the baseline result above. Nothing about this touched your source or your dependency manifests.

---

## What changed on disk, and what was committed

Two commits on `rename/flagstone`, nothing else:

1. `docs/support.html`, the one-line link repoint (leg 4 step 1).
2. this report, `06_finish_app_side.md`.

Staging was done by explicit path only, never `git add -A`, because the working tree carries a large amount of pre-existing untracked clutter (device-tune, r2-audit, store-dossier, and more) that is not part of this run and was left exactly as found.

## Fences honored

No merge, no push, no store submission, no purchase. The only external calls were the read-only Support URL fetches in leg 5. `main` was untouched. `qa-reports/` and `security-audit/` were untouched. Everything under `design-reviews/` was untouched except this new report, because GO box 1, the only box that authorizes editing the two ratified documents, was unticked. Bundle ID, EAS slug, the `accessmap://` scheme, `privacyPolicyUrl` / `PRIVACY_POLICY_URL`, the `@/*` alias, test IDs, storage keys, and the repo folder path were all left alone.

## To finish the app side

The merge is still blocked by one thing, leg 1. To clear it, re-fire this prompt with GO box 1 ticked and exactly one 1b option, or tell me here to proceed with leg 1. Ticking boxes 2, 3, and 4 in the same re-fire clears the three small leftovers and the duplicate-policy deletion in the same run. Until then, `rename/flagstone` can still be merged if you accept the web-versus-in-app name split described in leg 1, but the clean order is leg 1 first.
