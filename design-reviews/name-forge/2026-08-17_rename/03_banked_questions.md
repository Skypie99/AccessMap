# 03 · BANKED QUESTIONS — Flagstone rename, Phase A
Six. Nothing here was decided by the agent. BQ-1 is the only one that should block a merge.

---

## ⚑ BQ-1 · The in-app Terms and Privacy Policy still say AccessMap, and only Sky can change that

**What is true right now.** `src/lib/copy.ts` holds 11 brand hits of user-visible legal copy: `TERMS_TITLE` (:573), four `TERMS_SECTIONS` bodies (:596, :597, :617, :629), `PRIVACY_TITLE` (:688), and four `PRIVACY_SECTIONS` bodies (:706, :710, :746). All of it is untouched by this run.

**Why it is untouched.** Two guard tests compare that copy, character for character and in both directions, against two documents this run is forbidden to edit:

| Guard | Pinned to |
|---|---|
| `src/__tests__/terms.guard.test.ts` | `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` §1 |
| `src/__tests__/privacy.guard.test.ts` | `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md` |

Both documents end with a "Ratification block (paste into DECISIONS.md §SKY after Sky's edits/approval)". The guards exist so that only Sky's ratified words ship. Renaming the product inside ratified legal text is a ratification act, not a mechanical sweep, so the agent stopped.

**The consequence you must see before merging.** A4 did rename the *published* privacy page, because that page carries no guard. Merge this branch as it stands and the web policy at `skypie99.github.io/AccessMap/privacy/` says Flagstone while the policy inside the app still says AccessMap. That split is visible to any user who reads both, and to an App Store reviewer who checks the privacy URL against the app.

**The fix, ready to apply.** Nine string pairs across three files. Both documents and `copy.ts` must move together in one commit, or the guards go red.

### In `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` §1 and `src/lib/copy.ts` (matched pairs)
| Old | New |
|---|---|
| `AccessMap Terms & Community Guidelines` | `Flagstone Terms & Community Guidelines` |
| `What AccessMap is.` | `What Flagstone is.` |
| `AccessMap is a community map of accessibility barriers. I'm Sky, and…` | `Flagstone is a community map of accessibility barriers. I'm Sky, and…` |
| `…you're letting AccessMap show it in the app…` | `…you're letting Flagstone show it in the app…` |
| `…AccessMap is made in Canada and operates under the laws of British Columbia.` | `…Flagstone is made in Canada and operates under the laws of British Columbia.` |

### In `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md` and `src/lib/copy.ts` (matched pairs)
| Old | New |
|---|---|
| `AccessMap Privacy Policy` | `Flagstone Privacy Policy` |
| `AccessMap is built and run by one person, Sky…` | `Flagstone is built and run by one person, Sky…` |
| `AccessMap collects as little as it can…` | `Flagstone collects as little as it can…` |
| `AccessMap isn't designed for children…` | `Flagstone isn't designed for children…` |

### Also in the same commit
`src/__tests__/terms.guard.test.ts:74` reads `.find((l) => l.startsWith('AccessMap Terms'))`. That anchor moves to `'Flagstone Terms'` or the assertion finds nothing and passes vacuously on `undefined`.

**Three questions inside this one, for Sky:**
1. Ratify the name swap in the terms and privacy text? (The wording is otherwise identical. The mission sentence is not reworded; only the product's name changes.)
2. Does `TERMS_EFFECTIVE` / `PRIVACY_EFFECTIVE` get a new date? Both documents' own "Changes" paragraphs promise a new date at the top when the text changes. A name change is arguably not a change in terms, but the promise is literal, and the guards pin the dates too.
3. Editing a `design-reviews/ship-ready/` document is the one exception to "history is immutable" that this patch requires. Those two files are live source of record, not archaeology, which is exactly why the guards read them. Sky confirms that exception, not an agent.

---

## BQ-2 · `src/lib/geocode.ts:28` — the OpenStreetMap User-Agent
`const USER_AGENT = 'AccessMap/1.0 (skylerhalisky@gmail.com)'`, asserted by `geocode.test.ts:171` as `/^AccessMap\//`.

Left as-is. It is how the app introduces itself to Nominatim under their UA policy: no user ever sees it, and nothing breaks either way. It is neither brand nor plumbing, so it went here instead of into a sed.

**Recommendation: change it to `Flagstone/1.0 (skylerhalisky@gmail.com)`** and move the test regex with it. Nominatim only needs a real identifier that reaches a human; that stays true. The reason to bother is that OSM's own policy is about being contactable and identifiable, and an operator who looks up the UA should find the app that exists. Two lines, no risk.

## BQ-3 · `src/components/ChangelogModal.tsx:52` — a changelog entry naming the old page title
`'New "About AccessMap" page in Profile with version + maker note'`. User-visible, and also a historical record of a shipped release.

Left as-is. **Recommendation: change it to `About Flagstone`.** The entry describes a page that still exists under a new title, and a user reading the changelog has no idea what AccessMap was. Changelogs are for users, not for archaeology; the archaeology is in git.

## BQ-4 · Two published privacy policies
`docs/privacy/index.html` (Last updated July 31, 2026) is the live one at the URL the app ships. `docs/privacy-policy.html` (Last updated May 30, 2026) is an older duplicate that GitHub Pages also serves, and it still contains unfilled `[contact email]` placeholders. Both had their brand renamed in A4.

**Question: should the May 30 duplicate be deleted?** Serving two policies with different dates and a visible placeholder is a real risk if a reviewer or user finds the wrong one. Not this run's call, and deleting a published page is not a rename.

## BQ-5 · `docs/github-pages-setup.md` documents URLs that are not the live ones
It says `skypie911.github.io/accessmap/privacy-policy` and `.../support`. The app and the verified live page use `skypie99.github.io/AccessMap/privacy/`. Pre-existing drift, unrelated to the rename, recorded and not fixed.

**Why it matters now:** the Support URL on the store sheet comes from this chain, and it is the one URL in the sheet that has not been fetch-verified. Worth one browser check before the Connect forms get filled.

## BQ-6 · The keyword field lost a token the old name was paying for
Dossier 02 excluded `access` and `map` from the keyword string with the stated reason: "already indexed from the name." That reason held for **AccessMap** and does not hold for **Flagstone**.

Re-checked against the recommended subtitle `Map accessibility barriers`: `map`, `accessibility`, and `barriers` are still indexed from the subtitle. The single token the rename actually drops is **`access`**.

The field has 6 characters spare (94 of 100). `access` is 6 characters, and a comma makes 7, so it does not fit as-is. The honest options:

| Option | String | Chars |
|---|---|---|
| Leave it (what the sheet shows) | current 94-char string | 94 |
| Drop `deaf`, add `access` | `wheelchair,disability,mobility,ramp,curb,sidewalk,crossing,slope,washroom,blind,access,anonymous` | 96 |
| Drop `disability` (dossier 02 itself notes generic "disability" queries drift to benefits apps), add `access` | `wheelchair,mobility,ramp,curb,sidewalk,crossing,slope,washroom,blind,deaf,access,anonymous` | 90 |

**Recommendation: the third.** It is the only one that adds the lost token without giving up a real audience, and dossier 02 already argued that `disability` is the weakest earner in the string. Sky's call, and it is trivially editable later without a new binary.
