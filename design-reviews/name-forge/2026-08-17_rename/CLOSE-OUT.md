# CLOSE-OUT — THE FLAGSTONE RENAME
**2026-08-17 · Phase A complete, all gates green · Phase B banked · branch-only, Sky merges.**

AccessMap now ships as **Flagstone** everywhere a person can see it, on branch `rename/flagstone` in `~/AccessMap`. `main` was never written to. 36 files changed, 112 insertions, 104 deletions.

Every flag report is a stone; laid down one by one they pave a path everyone walks.

---

## 1 · What moved, in one table

| Surface | What changed | Files |
|---|---|---|
| Home-screen label | `expo.name` → `Flagstone` (9 chars, renders whole) | `app.json` |
| OS permission dialogs | 3 iOS purpose strings, each mirrored in its Expo plugin config so `appConfig.guard` stays green | `app.json` |
| PWA / web identity | install name, short name, social cards, pre-JS loading splash | `app.json`, `public/manifest.json`, `public/index.html` |
| In-app brand | wordmark, VoiceOver label on the logo mark, onboarding, About, Settings, body copy | 22 files in `src/` |
| Text that leaves the app | share footer, feedback email subject + body footer, data-export header | `shareFlag.ts`, `feedback.ts`, `dataExport.ts` |
| Paired test assertions | 17 assertions moved with their strings, none skipped or deleted | 3 test files |
| Published web pages | live privacy policy, its older duplicate, the support page | `docs/privacy/index.html`, `docs/privacy-policy.html`, `docs/support.html` |
| Project docs | README, `CLAUDE.md`, `PROJECT_STATE.md` headers + provenance; a SUPERSEDED pointer on the old listing doc | 4 files |

Full per-file rationale in `02_phaseA_edits.md`. The bucketing that decided what *not* to touch is in `01_inventory.md`.

## 2 · What deliberately did NOT move
Bundle ID `com.accessmap.app` · EAS slug `accessmap` · URL scheme `accessmap://` (including inside the renamed share footer, so old links still resolve) · `privacyPolicyUrl` and `PRIVACY_POLICY_URL`, which a guard test pins to each other · the `@/*` alias, test IDs, storage keys · the repo folder `~/AccessMap` · roughly 60 `src/` comments that describe the project rather than quote a changed string · everything under `design-reviews/`, `qa-reports/`, and `security-audit/`, verified byte-for-byte unchanged.

## 3 · The gates
| Gate | Result |
|---|---|
| `npm run typecheck` | clean, no diagnostics |
| `npx jest --ci -w 3` | **204/204 suites · 2,971 passed · 32 todo · 0 failed** (matches the cold-clone baseline exactly) |
| `npm run lint` | **0 errors**, 74 pre-existing warnings (all `no-explicit-any` / `no-console` / `exhaustive-deps`, none on a changed line) |

Verbatim outputs in `02_phaseA_edits.md` §A6.

---

## 4 · ⚑ READ THIS BEFORE YOU MERGE

**The in-app Terms and Privacy Policy still say AccessMap, and that is deliberate.** They are pinned verbatim, in both directions, by `terms.guard.test.ts` and `privacy.guard.test.ts` to two ratification documents under `design-reviews/ship-ready/` that this run is forbidden to edit. Renaming a product inside ratified legal text is your call, not an agent's.

So if you merge this branch as it stands: the **web** privacy policy says Flagstone while the **in-app** policy and terms still say AccessMap. A user who reads both, or a store reviewer who checks the privacy URL against the app, would see the split.

**BQ-1 in `03_banked_questions.md` has the complete patch** — 9 string pairs across 3 files plus one test anchor, written out so one commit moves them together. Ratify it before merging and both surfaces land saying the same thing.

---

## 5 · Sky-manual list, numbered

### 5a · App Store Connect (nothing was submitted; paste sheet only)
The sheet is `05_store_metadata_flagstone.md`.
1. App Information → **Name**: `Flagstone`
2. **Subtitle**: `Map accessibility barriers` (26 of 30 chars)
3. **Keywords**: the 94-char string on the sheet. Read **BQ-6** first: dossier 02 excluded `access` and `map` because they were "already indexed from the name", which was true of AccessMap and is not true of Flagstone. The subtitle still carries `map`; the token actually lost is `access`. A one-word fix and its char counts are in BQ-6.
4. **Description**: the sheet's block. Its first line is the ratified mission sentence, so it should match whatever you decide in BQ-1.
5. **Promotional text** (141 chars) and **What's New** (92 chars): both name-free, unchanged.
6. **Privacy Policy URL**: `https://skypie99.github.io/AccessMap/privacy/` — live, verified today, path deliberately unchanged.
7. **Support URL**: verify this one in a browser before pasting. See BQ-5: `docs/github-pages-setup.md` documents a different host and path than the app actually uses.

### 5b · Supabase auth email templates (live surface, dashboard only)
This run did not read or alter them, and there is no copy in the repo, so no invented replacement text is offered. Do a find-and-replace, not a rewrite: **the wording is yours, only the name changes.**
1. Supabase dashboard → your project → **Authentication → Emails** (Email Templates).
2. For each enabled template — Confirm signup, Invite user, Magic Link, Change email address, Reset password — open it and replace every visible `AccessMap` with `Flagstone`. Leave every `{{ .ConfirmationURL }}`, `{{ .Token }}`, and other `{{ … }}` variable exactly as is.
3. Check the **Subject** line of each template as well as the body; subjects are edited separately and are easy to miss.
4. Send yourself one test of each edited template before the first store submission.
5. Nothing else in Authentication needs to change for the rename. In particular, do not touch **URL Configuration**: the redirect URLs and Site URL are plumbing tied to `accessmap.skypistudio.com` and the `accessmap://` scheme.

### 5c · Optional, not blocking
6. **Domain**: `flagstone.com` / `.ca` / `.app` are all taken. Shipping does not need one. If you want a variant like `flagstoneapp.com`, that is a manual hunt and purchase.
7. **Icon and wordmark refresh** (a flag-and-stone mark) as a separate design run. Default LATER; it never blocks this rename.
8. **Screenshots**: the capture factory picks up the new home-screen label on its next run. Not re-run here.
9. **BQ-4**: `docs/privacy-policy.html` is an older duplicate policy (May 30) that GitHub Pages also serves and still contains `[contact email]` placeholders. Worth deleting; deleting a published page is not a rename, so it was left.

### 5d · Phase B, when you want it
Both GO boxes were unticked, so no career surface was touched. `04_phaseB_banked.md` holds the follow-up plus today's reconnaissance, including one thing you will want to know: **`RESUME_SOURCE.md` is not in `~/career-arsenal/`** — the only copy, along with the resume HTML and PDF, lives in an ephemeral Claude session-outputs folder. Worth relocating before it becomes the document every application depends on.

---

## 6 · Banked questions, one line each
| # | Question | Blocking? |
|---|---|---|
| BQ-1 | Ratify the Flagstone name inside the ratified Terms + Privacy text (patch ready) | **yes, before merge** |
| BQ-2 | Rename the OpenStreetMap User-Agent? Recommend yes, 2 lines | no |
| BQ-3 | Rename the old page title inside a user-facing changelog entry? Recommend yes | no |
| BQ-4 | Delete the older duplicate privacy page? | no |
| BQ-5 | `github-pages-setup.md` documents URLs that are not the live ones | no, but check before Connect |
| BQ-6 | Keyword field lost the `access` token the old name paid for; 3 options costed | no |
| Q3 (prompt) | Repo folder stays `~/AccessMap`? Default kept, yes | no |
| Q4 (prompt) | Icon/wordmark refresh as its own run? Default LATER | no |

## 7 · RESUME state
Phase A is complete and self-contained; nothing is mid-edit. A successor should not re-run Phase A. To continue: ratify BQ-1, or fire Phase B per `04_phaseB_banked.md`.

**Nothing was merged, pushed, submitted, purchased, or sent.**
