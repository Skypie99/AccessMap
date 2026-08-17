# 01 · INVENTORY — every "AccessMap" in the repo, bucketed
**Run:** THE FLAGSTONE RENAME · Phase A · 2026-08-17
**Branch:** `rename/flagstone` (off `main` = `origin/main` = `d2a0991`, clean tracked tree)
**Status:** banked BEFORE the first edit, as required by A1.

Reality was mapped from the repo, not from any doc. Nothing below is inherited from the prompt or from memory.

---

## 0 · The count, and a gap in the specified grep

The A1 command covers `*.ts *.tsx *.json *.md`. Run against this repo (excluding `node_modules`, `design-reviews`, `qa-reports`, `.git`, `_to_delete`):

| Location | Hits |
|---|---|
| `src/` | 102 |
| `docs/` (`.md` only) | 156 |
| `security-audit/2026-07-31/` | 43 |
| root `*.md` + `TASK_GRAPH.json` | 56 |
| `specs/ready/` | 33 |
| `app.json` | 10 |
| `supabase/` | 6 |
| `public/manifest.json` | 2 |
| **Total (ts/tsx/json/md)** | **408** |

**⚑ The grep as specified is blind to `.html`, and four HTML files carry the brand — three of them are LIVE, publicly served pages.** Adding `--include="*.html"` finds 34 more hits:

| File | Hits | Note |
|---|---|---|
| `docs/support.html` | 10 | published App Store support page |
| `docs/privacy/index.html` | 6 | **the live privacy policy** (fetch-verified, below) |
| `docs/privacy-policy.html` | 6 | older duplicate policy, also published |
| `public/index.html` | 9 | web build shell: social cards + loading splash |
| `qa-reports/assets/…` (2 files) | 3 | historical, excluded |

**True total: 442 hits.** Working set after the immutable buckets come out: **439**.

### Live-surface verification (fetched, not assumed)
`WebFetch https://skypie99.github.io/AccessMap/privacy/` → `<title>` = `Privacy Policy — AccessMap`, logo text `AccessMap`, `Last updated: July 31, 2026`, intro `"We collect only what's needed to make the map work."` That date + intro string match `docs/privacy/index.html` and **not** `docs/privacy-policy.html` (which says `May 30, 2026`). So the A4 source is `docs/privacy/index.html`, in this repo, on this branch — no gh-pages branch, no second repo. GitHub Pages serves `main` → `/docs` per `docs/github-pages-setup.md`.

---

## 1 · USER-VISIBLE BRAND — *changes*

### 1a · `app.json` — 9 of its 10 hits
| Line | Key | Why it changes |
|---|---|---|
| 3 | `expo.name` | the home-screen label under the icon |
| 23 | `NSLocationWhenInUseUsageDescription` | OS permission dialog |
| 24 | `NSCameraUsageDescription` | OS permission dialog |
| 25 | `NSPhotoLibraryUsageDescription` | OS permission dialog |
| 111 | `web.name` | PWA install name |
| 112 | `web.shortName` | PWA short name |
| 130 | `expo-location` `locationWhenInUsePermission` | must stay byte-identical to line 23 |
| 138 | `expo-image-picker` `photosPermission` | must stay byte-identical to line 25 |
| 139 | `expo-image-picker` `cameraPermission` | must stay byte-identical to line 24 |

The plugin/infoPlist pairing is enforced by `src/__tests__/appConfig.guard.test.ts:85-87` (`expect(loc.locationWhenInUsePermission).toBe(app.ios.infoPlist.NSLocationWhenInUseUsageDescription)` and siblings). Edit one without the other and that guard goes red — so all six move together.

### 1b · `public/manifest.json` — 2 hits
`name`, `short_name` — the PWA's installed identity. (`app.json`'s `web.*` block and this file are two separate declarations of the same thing; both exist today and both say AccessMap.)

### 1c · `public/index.html` — 5 of its 9 hits
Lines 16, 17, 23, 27 (`og:site_name`, `og:title`, `og:image:alt`, `twitter:title`) — what a shared link renders as. Line 208 `<p class="am-name">AccessMap</p>` — the pre-JS loading splash a real user sees on a slow connection.

### 1d · Published web pages — 22 hits (A4)
`docs/privacy/index.html` (6) · `docs/privacy-policy.html` (6) · `docs/support.html` (10). Visible titles, logo divs, body prose, footers, copyright lines. **URLs and file paths do not move** — only the words on the page.

### 1e · `src/` in-app strings — 33 hits
Screen-reader labels count as user-visible.

| File:line | Surface |
|---|---|
| `src/screens/SignInScreen.tsx:171` | the wordmark on the sign-in screen |
| `src/components/HamburgerDrawer.tsx:335` | drawer brand heading |
| `src/components/LogoMark.tsx:38, 52` | `accessibilityLabel` on both mark variants — the brand as VoiceOver reads it |
| `src/screens/OnboardingModal.tsx:44, 149` | "Welcome to AccessMap" title + aria-label |
| `src/components/OnboardingCards.tsx:107, 293, 483` | same, cards variant + closing hint |
| `src/screens/AboutScreen.tsx:63, 81, 134` | aria-label, page heading, "built with Expo" paragraph |
| `src/screens/ProfileScreen.tsx:1575, 1675, 1680, 1682` | launch-tab hint, About row label/title/subtitle |
| `src/screens/SettingsScreen.tsx:581, 587` | changelog row subtitle, About row title |
| `src/screens/HowToHelpScreen.tsx:48, 141` | "Share AccessMap with neighbours…", "built by people like you" |
| `src/screens/ResourcesScreen.tsx:234` | "AccessMap is community-powered…" |
| `src/screens/ReportFlagModal.tsx:1176` | "AccessMap doesn't notify the city" |
| `src/components/FeedbackModal.tsx:249` | "what you wish AccessMap did" |
| `src/navigation/RootNavigator.tsx:263`, `src/screens/MapScreen.tsx:1801`, `src/screens/HomeScreen.tsx:352`, `src/screens/TasksScreen.tsx:902`, `src/components/ui/HeaderActions.tsx:65` | the same feedback `accessibilityHint`, five copies |
| `src/lib/shareFlag.ts:66` | the share footer: `Open in AccessMap: …` / `Reported via AccessMap.` |
| `src/lib/feedback.ts:26, 71, 126` | email subject base, "Sent from AccessMap on <os>", "Email AccessMap" button |
| `src/lib/dataExport.ts:98` | "AccessMap data export for <email>" |

### 1f · Tests that assert on the strings in 1e — move WITH them, never skipped
`src/lib/__tests__/shareFlag.test.ts` (12) · `src/lib/__tests__/feedback.test.ts` (3) · `src/lib/__tests__/dataExport.test.ts` (2). These are the paired assertions for the literals above.

### 1g · Comments that quote a literal this run changes — 11 touches
A3 says comments stay, and they do. The exception is narrow and mechanical: a comment that **quotes verbatim** a string being changed becomes a false statement about the code the moment the string moves. Those, and only those:

| File:line | The quote it carries |
|---|---|
| `src/lib/shareFlag.ts:16, 17` | reproduces the share footer |
| `src/screens/AboutScreen.tsx:38, 73` | the page title; "LogoMark bakes an 'AccessMap' label" |
| `src/screens/GuestProfile.tsx:45` | "Keeps LogoMark's own 'AccessMap'" label |
| `src/components/LogoMark.tsx:2` | names the mark it draws |
| `src/screens/ProfileScreen.tsx:263` | "the 'About AccessMap' row" |
| `src/components/ReportContentModal.tsx:223` | `"AccessMap feedback"` = `SUBJECT_BASE` |
| `src/lib/reports.ts:96` | `"AccessMap feedback: Bug"` |
| `src/lib/feedback.ts:13` | `"AccessMap feedback: Bug"` |
| `public/index.html:192, 198` | "the first beat reads as AccessMap"; brand-mark note |

Left alone deliberately: `src/components/ui/AppText.tsx:26` uses `AccessMap` as illustrative sample text in a usage example, not as a quote of a live string.

---

## 2 · IDENTIFIER / PLUMBING — *never changes*

Confirmed present and deliberately untouched:

| Thing | Value | Breaks if moved |
|---|---|---|
| iOS bundle ID | `com.accessmap.app` | app identity at Apple |
| Android package | `com.accessmap.app` | same |
| EAS slug | `accessmap` | orphans EAS project `a7149107-…` |
| URL scheme | `accessmap` | every deep link, incl. `accessmap://flag/<id>` in the share footer |
| `app.json:5` `privacyPolicyUrl` | `https://skypie99.github.io/AccessMap/privacy/` | pinned equal to `src/lib/links.ts:19` by `privacyLink.guard.test.ts:88` |
| `src/lib/links.ts:19` `PRIVACY_POLICY_URL` | same URL | same guard, other side |
| `src/__tests__/appConfig.guard.test.ts:20` | path `ios/AccessMap/PrivacyInfo.xcprivacy` | a real (gitignored) filesystem path |
| `public/index.html:222, 226` | `[AccessMap SW]` console prefixes | dev console only, not a user surface |
| repo folder | `~/AccessMap` | banked Q3, default stays |
| `@/*` alias, test IDs, storage keys | — | out of scope by fence |

Plus ~60 `src/` occurrences in **comments and JSDoc** that describe the project rather than quoting a changed literal (`src/theme.ts:2`, `src/lib/mapFilters.ts:49`, `src/lib/distance.ts:24`, `src/lib/directionsLink.ts:4,35`, `src/lib/fonts.ts:2`, `src/lib/hiddenContent.ts:12`, `src/lib/userReportStats.ts:53`, `src/lib/reportTemplates.ts:3`, `src/lib/reports.ts:96`, `src/lib/copy.ts:151`, `src/lib/feedback.ts:13`, `src/screens/HomeScreen.tsx:81`, `src/screens/ProfileScreen.tsx:263`, `src/screens/HowToHelpScreen.tsx:4`, `src/screens/AboutScreen.tsx:38`, `src/screens/ReportFlagModal.tsx:1347`, `src/components/CategoryIcon.tsx:2`, `src/components/ui/AppText.tsx:26`, `src/components/ReportContentModal.tsx:223`, and the test-file header comments). These stay. Sweeping them would be a 60-file diff with zero user-facing effect.

---

## 3 · HISTORICAL RECORD — *never changes*

Immutable by the run's own fence. History says AccessMap because that is what happened.

- `design-reviews/**` and `qa-reports/**` — excluded from the grep, byte-for-byte frozen. Includes this run's own parent bundle (`name-forge/2026-08-16/`).
- `security-audit/2026-07-31/**` — 43 hits, a dated audit bundle, same class.
- Dated / retrospective docs: `DECISIONS_LOG.md` (12), `docs/PHASE7_PLAN.md` (13), `docs/PHASE8_BRAINSTORM.md` (13), `docs/TESTFLIGHT_ACTION_ITEMS.md` (8), `docs/PHASE_TESTFLIGHT_FIX_PLAN.md` (6), `docs/PHASE6_STRATEGY.md` (5), `docs/RELEASE_NOTES_v0.2.0.md` (3), `docs/MASTER_FIX_LOG.md` (3), `docs/PHASE5_RELEASE_NOTES.md` (2), `docs/PHASE_COMPLETION_REPORT_2026-05-30.md` (1), `LEARNINGS.md` (3), `LEARNINGS_INDEX.md` (1), `CHANGELOG.md` (1).
- `.context-bundle.md` (9) — a generated artifact; regenerates on its own.

---

## 4 · PROJECT-DOC HEADER — *changes lightly* (A5)

| File | Hits | Edit |
|---|---|---|
| `README.md` | 1 | title + one provenance line |
| `CLAUDE.md` | 2 | first paragraph gets one rename sentence |
| `PROJECT_STATE.md` | 1 | header |
| `docs/APP_STORE_LISTING.md` | 7 | one pointer line to the new store sheet — it feeds App Store Connect, and a future agent pasting the old name from it is a real, cheap-to-prevent failure |

Deliberately left alone as engineering archaeology, not product branding: `ARCHITECTURE.md` (5), `DESIGN.md` (3), `GLASS.md` (1), `FEATURES.md` (2), `GOVERNANCE.md` (1), `TASK_GRAPH.json` (1), `RELEASE_READINESS.md` (2), the three `QA_PLAN_*.md` (4), `docs/CONTRIBUTING.md` (5), `docs/DATABASE.md` (2), `docs/PATTERNS.md` (2), `docs/ROADMAP.md` (1), `docs/RELEASE_RUNBOOK.md` (13), `docs/RELEASE_PLAYBOOK.md` (3), `docs/EAS_SETUP.md` (7), `docs/SECURITY_INCIDENT_RESPONSE.md` (19), `docs/SUPABASE_SECURITY.md` (3), `docs/runbooks/on-call-runbook.md` (3), `docs/BETA_TESTING_GUIDE.md` (6), `docs/BROWSER_COMPATIBILITY.md` (1), `docs/ONBOARDING_CONTENT.md` (2), `docs/DESIGN_SYSTEM_STATUS.md` (2), `docs/PUSH_NOTIFICATION_STRATEGY.md` (3), `docs/adr/README.md` (1), `docs/innovation/**` (7), `docs/TESTFLIGHT_LAUNCH.md` (1), `docs/github-pages-setup.md`, `specs/ready/**` (33), `supabase/functions/**/README.md` (6), `APP_STORE_TODO.md` (7, untracked).

---

## 5 · DOES NOT FIT A BUCKET → banked, not sed'd

A1's rule: an ambiguous hit becomes a question, not an edit. Five did.

### ⚑ BQ-1 — the in-app Terms and Privacy Policy are ratification-fenced (the big one)
`src/lib/copy.ts` holds `TERMS_TITLE` (:573), `TERMS_SECTIONS` (:596-629), `PRIVACY_TITLE` (:688), `PRIVACY_SECTIONS` (:706-746) — 11 brand hits of plainly user-visible legal copy.

Two guard tests pin that copy **verbatim, in both directions**, to two documents that this run is forbidden to touch:
- `src/__tests__/terms.guard.test.ts` → `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` §1
- `src/__tests__/privacy.guard.test.ts` → `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md`

Both documents end in a "Ratification block (paste into DECISIONS.md §SKY after Sky's edits/approval)". The guards exist precisely so that *only Sky's ratified words ship*.

So three of this run's own rules collide here, and only on this copy: rename user-visible brand · keep `design-reviews/` byte-for-byte · leave all three gates green. Any two can be satisfied, never all three.

**Resolved by not deciding it.** Renaming the product inside ratified legal text is a ratification act, not a mechanical sweep. `copy.ts` and both pinned documents are **untouched** in Phase A; the guards stay green; the fence holds. The exact paired patch is written out in `03_banked_questions.md` so Sky ratifies once and one commit moves both files together.

**Consequence Sky must see before merging:** A4 does rename the *published* privacy page (`docs/privacy/index.html`), because that page is not fenced. Merge this branch as-is and the web policy says Flagstone while the in-app policy still says AccessMap. Ratify BQ-1 before merge and both land together. Flagged again in CLOSE-OUT.

### BQ-2 — `src/lib/geocode.ts:28` `USER_AGENT = 'AccessMap/1.0 (…)'`
How the app introduces itself to OpenStreetMap's Nominatim, per their UA policy. No user ever sees it; nothing breaks either way; `geocode.test.ts:171` asserts `/^AccessMap\//`. Not brand, not quite plumbing. Left as-is; recommendation in the questions file.

### BQ-3 — `src/components/ChangelogModal.tsx:52`
`'New "About AccessMap" page in Profile with version + maker note'` — a user-visible changelog entry that is also a historical record of a past release. Left as-is; recommendation in the questions file.

### BQ-4 — `docs/privacy-policy.html` vs `docs/privacy/index.html`
Two published privacy policies with different "Last updated" dates (May 30 vs July 31). Brand is renamed on both in A4, but one of them probably should not exist at all. Not this run's call.

### BQ-5 — `docs/github-pages-setup.md` documents URLs that are not the live ones
It says `skypie911.github.io/accessmap/privacy-policy`; the app and the verified live page use `skypie99.github.io/AccessMap/privacy/`. Pre-existing drift, unrelated to the rename, and it feeds the App Store Connect step. Recorded, not fixed.

---

## 6 · Edit order for the rest of Phase A
A2 `app.json` (6 strings, paired) → A2b `public/manifest.json` + `public/index.html` → A3 `src/` strings + their paired tests → A4 the three published pages → A5 the four docs → A6 gates → A7 store sheet.
