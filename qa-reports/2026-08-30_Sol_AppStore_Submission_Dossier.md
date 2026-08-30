# Flagstone App Store Submission Dossier

Prepared 2026-08-30. This is a submission execution binder, not a release audit, product acceptance, legal opinion, or claim that Apple has accepted the app.

Status vocabulary used throughout:

- **STABLE NOW**: established by the preparatory source or current official documentation and not expected to change unless that evidence changes.
- **FINAL-SHA RECHECK**: must be checked against the exact accepted product SHA because product behaviour or copy can still change.
- **TESTFLIGHT-BUILD RECHECK**: must be proved on the exact processed build because source alone cannot establish native packaging or device behaviour.
- **APP-STORE-CONNECT HUMAN ENTRY**: must be entered or confirmed in App Store Connect (ASC).
- **EXTERNAL PROOF**: requires a live system, account, URL, provider, or device result that the repository cannot prove.
- **OWNER DECISION**: a genuine choice that cannot be inferred from facts. It is not a request for the owner to rediscover a fact.

## Audited Source

| Role | Reference | Use in this dossier |
|---|---|---|
| Preparatory source | `2762a5447600e8de55be912ccb26e95456484945` | Exact tree inspected. It is **not** the eventual release candidate. |
| R0 preflight | `ffe14b6b09e3596638914160aae0626d3162f207` on `codex/solfast-release-r0-preflight-20260830` | Historical release risk and evidence inputs only. |
| R1 execution contract | `e4164e35c0d6e7bcc3f47ae91ecf815709553efc` on `codex/solfast-release-r1-execution-contract-20260830` | Authority for accepted-SHA, EAS, TestFlight, and build/submission coupling. This dossier does not redesign it. |

Repository fetch was pruned before inspection and all three objects were resolved locally. The dossier branch was created directly from the preparatory source. No build, EAS action, simulator, Supabase mutation, App Store Connect mutation, or product change was performed.

Minimum current-source evidence inspected includes `app.json`, `eas.json`, `package.json`, `src/lib/links.ts`, authentication and guest entry, profile/display name, reports and comments, UGC filtering/report/hide/block controls, anonymous reporting, photo upload and EXIF handling, foreground location, notifications/push tokens, account-deletion request/status code, legal/support presentation, accessibility code/tests, and the R0/R1 reports.

## Executive Submission State

**Prepared state:** the later ASC session is mechanically pre-staged, but it is not yet submission-ready because the final accepted product SHA and exact processed TestFlight build do not exist.

| State | Result |
|---|---|
| Metadata copy | **GREEN / STABLE NOW**, subject to final UI-name and behaviour recheck. |
| Required URLs | URLs exist and return HTTP 200, but public copy drift is **RED: AS-BLOCK-001**. |
| Screenshots | Requirements and shot order are ready; actual images are **TESTFLIGHT-BUILD RECHECK**. |
| Privacy labels | Core app-owned categories are ready. Nominatim/Supabase/Expo retained network-log classification is **OWNER / PRIVACY FINAL DECISION REQUIRED** after provider confirmation; Customer Support exposes **AS-BLOCK-002** in the preparatory privacy manifest. |
| Age rating | Likely global **13+**, high confidence, driven by Social Media = Yes. Live UGC frequency needs final content check. |
| Accessibility labels | Evidence matrix is ready; declare nothing until Prompt C and final-device common-task proof are complete. |
| Reviewer account | Exact checklist and placeholders are ready; account health is **EXTERNAL PROOF**. |
| Release mechanics | R1 is the sole authority. Processed TestFlight is not App Review submission. |
| True product/submission blockers found | **AS-BLOCK-001** public legal/support/marketing copy drift; **AS-BLOCK-002** missing Customer Support in the preparatory privacy manifest. |
| Estimated final ASC time | **60–85 minutes** after the exact build processes, assuming both blockers and all external proof are green. |

### The current blockers

The canonical URLs returned HTTP 200 on 2026-08-30, but their live text is not one coherent statement of the current app:

- the public Privacy Policy says account contributions may remain with the name removed, while current in-app v1.1 says deletion permanently removes reports, associated content, feedback, points history, notification data, and uploaded photos;
- the public Terms are v1.0 dated 2026-07-27 while the in-app Terms are v1.1 dated 2026-08-27, and the public Terms say contributions may remain after deletion;
- the Support page gives a stale path, `Profile → Settings → Account → Delete Account`; the preparatory source places `Delete Account` directly near the bottom of the signed-in Profile;
- the marketing home page says sign-in is required to report, while current source visibly supports anonymous reporting; and
- the public Accessibility page declares several features supported and says physical-device testing is performed, while Prompt C has not yet produced final-build declaration proof.

The required Privacy and Support URLs cannot safely be submitted with mutually inconsistent behaviour claims. The smallest fix is to publish one owner-approved set of public Privacy, Terms, Support, marketing, and accessibility statements aligned to the exact final accepted behaviour. Do not rewrite policy text from this dossier.

Separately, the preparatory source's feedback form best-effort stores a support request in Supabase, but `app.json` has no Customer Support data type in its privacy manifest. Apple provides a specific Customer Support type, and the anonymous path prevents safely assuming the narrow optional-disclosure exception. **AS-BLOCK-002** is closed only when the accepted source and generated archive privacy report resolve that classification.

## Current Apple Sources

All Apple/Expo requirements below were retrieved **2026-08-30**. Re-research only if a linked page changes, ASC contradicts this dossier, or submission crosses a documented effective-date boundary.

| Topic | Primary/current source | Applied Flagstone result |
|---|---|---|
| App Information | [Apple: App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/) | Name 2–30; subtitle ≤30; privacy URL and age rating required; content rights considered; standard EULA is available. |
| Version metadata and review info | [Apple: Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/) | Promo ≤170; description ≤4000; keywords ≤100 bytes; notes ≤4000 bytes; required contact; non-expiring demo login when needed; first version has no What's New. |
| Required/editable properties | [Apple: Required, localizable, and editable properties](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties/) | ASC account/app state must be checked at entry time. |
| Screenshots | [Apple: Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), [upload help](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/) | One 6.9-inch iPhone set is sufficient; 1–10 images; 6.5-inch set only if 6.9 is absent; iPad set only if app runs on iPad. |
| Age rating | [Apple: Age rating values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/), [set an age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/) | UGC, public comments, discovery/community feed, social-media capability, and all content frequencies must be answered. |
| September 2026 change | [Apple News, 2026-07-09](https://developer.apple.com/news/?id=tlur8uvi), [Introducing Time Allowances](https://developer.apple.com/news/?id=0d2gpmml) | Social-media questions are live now and required “beginning in September 2026.” Apple has not published an exact September calendar date. Complete them now. |
| Accessibility labels | [Apple: Overview of Accessibility Nutrition Labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/), [manage labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/manage-accessibility-nutrition-labels/) | A label means the feature can complete all common tasks, not that related source code exists. |
| Accessibility criteria | [VoiceOver](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voiceover-evaluation-criteria/), [Voice Control](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voice-control-evaluation-criteria/), [Larger Text](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/), [Dark Interface](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/dark-interface-evaluation-criteria/), [Differentiate Without Color Alone](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/differentiate-without-color-alone-evaluation-criteria/), [Sufficient Contrast](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/sufficient-contrast-evaluation-criteria/), [Reduced Motion](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/), [Captions](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/captions-evaluation-criteria/), [Audio Descriptions](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/audio-descriptions-evaluation-criteria/) | Final device proofs are specified below. |
| App Privacy | [Apple: App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) | “Collected,” “linked,” and “tracking” use Apple definitions; partners count; on-device-only data does not. |
| Privacy manifests | [Apple: Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests), [collected data types](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype) | Manifest and ASC use the same data-type definitions but are separate declarations; Customer Support is a specific type and must appear in the final archive report if not exempt. |
| Partner data ambiguity | [OSMF Privacy Policy](https://osmfoundation.org/wiki/Privacy_Policy) | Nominatim receives query/network data and OSMF describes retained IP, device/browser, request, and interaction logs. This is a provider fact, not an analytics SDK in Flagstone. |
| UGC and review access | [Apple App Review Guidelines, 1.2 and 2.1](https://developer.apple.com/app-store/review/guidelines/) | Filtering, reporting/timely response, blocking, published contact, functional backend, and full review access must be visible. |
| Account deletion | [Apple: Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/) | Full-account deletion must be easy to find; asynchronous/manual completion is allowed if timing/status and completion are communicated. |
| Export compliance | [Apple: Overview of export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/) | Ordinary encryption still needs a determination; exempt-only apps can set Info.plist to avoid repeated questions. |
| EU DSA | [Apple: Manage EU DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/) | Trader status must be declared even outside EU; trader contact data is verified and displayed for EU distribution. |
| Categories | [Apple: Categories and discoverability](https://developer.apple.com/app-store/categories/) | Navigation is the best primary fit; Utilities is a truthful optional secondary. |
| Submission UI | [Apple: Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/), [overview of submitting for review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review/) | Current flow is version page → Add for Review → draft submission → Submit for Review. |
| Review attachments | [Apple: Reply to App Review messages](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/reply-to-app-review-messages/) | Supporting files can be attached in review messaging; no attachment is needed initially unless ASC presents a useful field and the final UI cannot be explained in notes. |
| EAS/TestFlight boundary | [Expo: Submit to app stores](https://docs.expo.dev/deploy/submit-to-app-stores/), [iOS EAS Submit](https://docs.expo.dev/submit/ios/), [automate submissions](https://docs.expo.dev/build/automate-submissions/) | EAS uploads the binary to ASC/TestFlight. It does not enter listing data, select the production build, or submit App Review. |

No secondary source was needed for an Apple rule. The OSMF policy is the primary policy of an integrated service, used only to identify the privacy-label ambiguity in that service's data handling.

## Source-of-Truth Arbitration

| Item | Current source / external authority | Current value | Old conflicting claims | Verdict | Final action |
|---|---|---|---|---|---|
| Version | `app.json`, `package.json` | `4.1.1` at preparatory SHA | Older listing/checklists used earlier versions. | **FINAL-SHA RECHECK** | ASC marketing version must exactly match the selected final binary. |
| Build number | `app.json`; `eas.json`; R1 | Source fallback `15`; EAS remote version source and `autoIncrement` mean final number is external. | Old instructions treated a source/latest build number as authoritative. | **TESTFLIGHT-BUILD RECHECK** | Copy exact processed version/build from EAS and TestFlight; do not type `15` from source. |
| App name | `app.json` | `Flagstone` | Historical files say AccessMap. | **STABLE NOW** | Enter `Flagstone`; recheck final binary display name. |
| Bundle ID | `app.json` | `com.accessmap.app` | Rename material could imply bundle rename. | **STABLE NOW** | Never change for marketing rename; verify selected ASC app/build mapping. |
| Tablet | `app.json` | `supportsTablet: false` | July report found tablet support and iPad orientation/screenshot implications. | **SUPERSEDED / STABLE NOW** | Require iPhone screenshots only; verify final native supported-device metadata. |
| Privacy URL | `app.json`, `src/lib/links.ts`, live HTTP | `https://skypistudio.com/flagstone/privacy/` | Old GitHub Pages URL. | **CURRENT URL; AS-BLOCK-001 CONTENT DRIFT** | Publish aligned policy text, then recheck HTTP 200 and enter canonical URL. |
| Support URL | `src/lib/links.ts`, live HTTP | `https://skypistudio.com/flagstone/support/` | Old GitHub Pages URL; stale account-deletion path on current page. | **CURRENT URL; AS-BLOCK-001 CONTENT DRIFT** | Correct page/path claims, ensure contact email works, then enter. |
| Accessibility URL | `src/lib/links.ts`, live HTTP | `https://skypistudio.com/flagstone/accessibility/` | Historical assumption that source/tests were sufficient to declare labels. | **URL STABLE; CLAIMS NOT PROVED** | Do not enter ASC Accessibility URL or publish labels until Prompt C and final device proof align with page. |
| Terms URL | public site and `docs/terms.html`; app renders native copy | `https://skypistudio.com/flagstone/terms/` exists; no Terms URL constant in app. | Old docs used other locations. | **CANONICAL PUBLIC URL FOUND; AS-BLOCK-001 VERSION DRIFT** | Align v1.1/public text. ASC needs no Terms URL when standard EULA is used. |
| Screenshots | Apple current spec + `supportsTablet: false` | One 6.9-inch iPhone set, 1–10 images; no iPad set. | Old multiple-size/iPad assumptions. | **STABLE NOW, RESEARCHED 2026-08-30** | Capture 3 fast or 6 strong images from accepted presentation state. |
| Old EAS instructions | R1 authority | Exact accepted SHA, fixed `testflight`, pinned CLI, coupled auto-submit, no `--latest`. | Historical local deploy/latest commands. | **SUPERSEDED** | Follow R1 only. This report does not repeat an executable build command as a submission shortcut. |
| TestFlight assumption | Apple/Expo/R1 | Processed TestFlight means binary uploaded/processed, not App Review submitted. | Old “deploy appstore” or upload-equals-release language. | **SUPERSEDED / STABLE NOW** | Select exact build in version page, Add for Review, then Submit for Review. |
| Moderation blockers | Current filtering, reporting, hide/block and admin/takedown source | Visible mechanisms exist. | July B1/B7 said moderation/comments were missing/broken. | **SUPERSEDED, FINAL-SHA RECHECK** | Prove the visible final flows; do not re-audit architecture or promise more. |
| Privacy-policy drift | Current in-app v1.1 vs live public pages | Material deletion/retention/version drift remains live. | July found earlier drift; later source fixed only the in-app side. | **CURRENT: AS-BLOCK-001** | Align public pages to accepted behaviour before App Review. |
| App icon | `assets/brand/app-icon.png` read-only inspection | 1024×1024, TrueColor, no alpha channel. | July B4 found alpha. | **SUPERSEDED / STABLE NOW** | Final native asset validation remains a build proof; do not resurrect B4 from history. |
| Always location | `app.json`, location source | Foreground/When-In-Use only; Always strings set false. | Old Always-location finding. | **SUPERSEDED / FINAL-SHA RECHECK** | Confirm final Info.plist and device permission prompt contain no Always request. |
| Sentry/analytics | `package.json`, lockfile, `src/lib/analytics.ts` | No Sentry/analytics/crash SDK; release analytics adapter sends nothing. | Historical Sentry/analytics claims. | **SUPERSEDED / FINAL-SHA RECHECK** | Inspect final dependency tree/binary; keep partner operational logs separate. |
| Push tokens | `expo-notifications`, `src/lib/pushNotifications.ts` | Opt-in Expo push token stored in `push_tokens` linked to `user_id`. | Older tables omitted or treated token as on-device. | **CURRENT** | Disclose Device ID, linked, App Functionality, no tracking. |
| Customer-support privacy type | Feedback modal/store + Apple definitions + `app.json` | Feedback body/category/optional reply email/platform/optional user ID can be retained; manifest has no Customer Support entry. | July label tables grouped feedback into Other User Content or relied on the optional-form intuition. | **CURRENT: AS-BLOCK-002** | Resolve in accepted source; verify exact archive's generated privacy report before TestFlight gate closes. |
| Reviewer credentials | Repository intentionally contains no valid credentials | Unknown until externally verified. | July found exposed/dead credentials. | **EXTERNAL PROOF** | Use ASC-only placeholders; never commit credentials. |
| D8 photo privacy | `src/lib/flags.ts`; R1 | Fail-closed strip/sanitize/verify code exists; real-device stored-object proof remains open. | Historical claims inferred proof from code/tests. | **TESTFLIGHT-BUILD RECHECK / EXTERNAL PROOF** | Final-SHA real-device photo → stored object metadata inspection → owner/privacy sign-off. |
| Age rating | Current Apple definitions + feed/discovery/comments | Likely global 13+; regional ratings vary. | Older 4+/12+/17+ assumptions predate 2026 social-media questions. | **CURRENT, HIGH CONFIDENCE** | Answer Social Media Yes and all other categories honestly; check calculated result. |
| Accessibility labels | Apple common-task standard; Prompt C pending | No declaration ready yet. | Old reports/page call features “supported.” | **TESTFLIGHT-BUILD RECHECK** | Declare only features proved across all common tasks on the exact build. |

## App Store Connect Master Field Sheet

| ASC section | Field | Required / optional | Current Apple limit / rule | Recommended Flagstone value | Source of value | Ready now? | Final recheck? | Human action |
|---|---|---|---|---|---|---|---|---|
| App Information | Name | Required | 2–30 characters | `Flagstone` | `app.json` | Yes | Final SHA/binary | Paste and confirm 9 chars. |
| App Information | Subtitle | Optional metadata, strongly recommended | ≤30 characters | `Map accessibility barriers` | Conservative copy below | Yes | Final positioning | Paste; 26 chars. |
| App Information | Primary language | Required record setting | Default metadata language | `English (Canada)` | Canadian spelling, BC operator, English-only app | Recommended | ASC state | Select unless existing record is deliberately another English locale. |
| App Information | Primary category | Required | Must best describe core experience | `Navigation` | Map/travel-to-place use + Apple definition | Yes | Final scope | Select Navigation. |
| App Information | Secondary category | Optional | One secondary allowed | `Utilities` | Task/problem-solving secondary fit | Yes | Owner may omit | Select Utilities; do not select Social Networking merely to alter discovery. |
| App Information | Content Rights | Required when ASC asks for third-party content | Necessary rights/permission for content shown/accessed | `Yes, app contains/accesses third-party content; I have the necessary rights` | OSM map data/tiles and user content; in-app licence grant | Prepared | External rights proof | Confirm OSM attribution/licence and rights to seeded/photos content, then answer. |
| App Information | Age Rating | Required | Complete current questionnaire; calculated per region | Answers in Age Rating section; expected global 13+ | Apple 2026 definitions + current features | Prepared | Final live content + ASC result | Enter answer sheet and record calculated global/regional results. |
| App Privacy | Privacy Policy URL | Required for iOS | Publicly accessible URL, managed from the App Privacy page | `https://skypistudio.com/flagstone/privacy/` | `app.json`, live 200 | URL yes | **AS-BLOCK-001** | On App Privacy, enter only after public policy aligns to final behaviour. |
| App Information | License Agreement | Optional custom; Apple standard applies by default | Standard EULA unless custom plain-text EULA supplied | `Apple Standard EULA` | No current custom EULA authority | Yes | ASC state | Leave standard EULA; in-app Terms remain community/service terms, not an ASC custom EULA. |
| Version Information | Copyright | Required | Year + exclusive-rights owner; Apple adds © | `[2026 RIGHTS-HOLDER LEGAL NAME]` | Cannot infer legal rights holder from brand | No | Owner decision | On the iOS version page, enter the exact individual/entity that owns exclusive rights. |
| App Accessibility | Accessibility URL | Optional | Additional accessibility information | `https://skypistudio.com/flagstone/accessibility/` **only after proof/page alignment** | `src/lib/links.ts`, live page | No | Prompt C + final build | Leave blank until the claims match proved declarations. |
| App Information | Age Suitability URL | Optional | Dedicated age-suitability site | `None` | No dedicated source or need | Yes | None | Leave blank. |
| Version Information | Promotional Text | Optional | ≤170 characters; editable without new version | Copy block below | Current features | Yes | Final SHA | Paste 118-char candidate. |
| Version Information | Description | Required | ≤4000 characters; plain text | Copy block below | Current source | Yes | Final SHA | Paste 1,115-char candidate. |
| Version Information | Keywords | Required | ≤100 bytes; each keyword >2 chars; no app/company/competitor names | Copy block below | Feature/category evidence | Yes | Locale and byte count | Paste 94-byte ASCII set. |
| Version Information | Support URL | Required | Must lead to actual contact information as applicable | `https://skypistudio.com/flagstone/support/` | `src/lib/links.ts`, live 200 | URL yes | **AS-BLOCK-001** | Correct stale content/path; verify support email; then enter. |
| Version Information | Marketing URL | Optional | Full URL for more app information | `None for V1` | Home page is live but currently contradicts anonymous reporting | Yes | AS-BLOCK-001 if later used | Leave blank for fastest safe submission; add after page is aligned. |
| Version Information | Version Number | Required/matched to build | Must match binary marketing version | `[SELECTED BUILD VERSION; preparatory source is 4.1.1]` | Final EAS/TestFlight record | No | Exact build | Never assume source 4.1.1; copy selected processed value. |
| Version Information | What's New | Unavailable for first version; required later | ≤4000 characters | `N/A for first public version`; fallback copy below if ASC treats as update | Apple rule | Yes | ASC app history | Do not hunt for this field if it is absent. |
| Version Information | App screenshots | Required | 1–10; accepted dimensions; no alpha | Fast 3 or strong 6, 6.9-inch portrait | Apple current spec | Plan only | Exact build | Upload in order after capture/QA. |
| Version Information | App previews | Optional | Up to 3 per localization/device; processing can take up to 24h | `None for V1` | Apple rule; time target | Yes | None | Omit. Screenshots are sufficient. |
| Version Information | Routing App Coverage File | Conditional for an Apple Maps routing app | GeoJSON MultiPolygon coverage file | `Not applicable` | Flagstone displays access reports; it is not an Apple Maps routing-app extension and does not provide point-to-point routing | Yes | Final scope/ASC UI | Do not upload. Stop only if the final product adds routing-app integration or ASC unexpectedly requires it. |
| App Review Information | Contact name | Required | Organization contact, not public | `[SKY ENTER CONTACT NAME IN ASC]` | Personal data unavailable | No | ASC | Enter directly in ASC. |
| App Review Information | Contact phone | Required | International format, `+` and country code | `[SKY ENTER PHONE IN ASC]` | Personal data unavailable | No | Live reachable number | Enter directly in ASC; test receiving calls. |
| App Review Information | Contact email | Required | Reachable review contact | `[SKY ENTER REVIEW CONTACT EMAIL IN ASC]` | Do not assume public support mailbox is review contact | No | Live mailbox | Enter directly in ASC. |
| App Review Information | Sign-in required? | Conditional | Demo credentials required if login is required for use | `Yes — full review uses credentials; guest browse/report also exists` | Guest browse/report; comments/account flows gated | Prepared | Final build | Select Yes and supply a demo account so Apple has full access; explain the guest path in Notes. |
| App Review Information | Demo account | Conditional/full-access expectation | Non-expiring username/password | `[SKY ENTER REVIEWER ACCOUNT IN ASC]` | External account only | No | Live login | Enter credentials in ASC fields only. Never commit them. |
| App Review Information | Notes | Optional but strongly recommended | ≤4000 bytes | Reviewer walkthrough below | Current UI paths | Yes | Final candidate | Recheck labels/paths, replace placeholders, paste. |
| App Review Information | Attachment | Optional/available in relevant review surfaces | Supporting documents/screenshots can be attached | `None initially` | Walkthrough should suffice | Yes | ASC UI | Attach only if a final unusual flow cannot be explained in notes; post-review messaging also supports files. |
| Release Options | Version release | Required choice | Manual, Automatic, or Automatic no earlier than | `Manual` | First-launch control and Apple rule | Yes | Owner can override | Select manual so approval does not silently become public release. |
| Release Options | Phased release | Optional for version updates; 7 days | Applies to updates, not first release | `Off / not applicable for V1` | Apple rule | Yes | ASC presentation | Leave off. |
| Pricing and Availability | Price | Required state | Price schedule / free tier | `Free` | No IAP/payment dependency in source; product positioning | Prepared | ASC state/owner | Confirm Free. Do not add monetization. |
| Pricing and Availability | Distribution | Required | Public/private/unlisted choices depend on app | `Public App Store` | Submission goal | Prepared | ASC | Confirm public distribution. |
| Pricing and Availability | Territories | Required | Choose storefront availability; country rules can add obligations | `All intended non-EU territories; EU per owner decision` | DSA decision below | Partial | Owner + ASC | Apply the selected EU option and review any country-specific warnings. |
| Business / Compliance | EU DSA status | Required declaration even when not distributing in EU | Trader self-assessment; verified public contact for EU traders | `[OWNER SELECT OPTION A OR B]` | Apple DSA + owner legal/business facts | No | Submission time | Complete Business compliance and app-level status before final review. |

## Metadata Copy Pack

Counts are Unicode character counts; the keyword set is ASCII, so its character and UTF-8 byte counts are both 94.

### App name

- **Character limit:** 30 (minimum 2)
- **Character count:** 9
- **Ready to paste:** YES

```text
Flagstone
```

### Subtitle

- **Character limit:** 30
- **Character count:** 26
- **Ready to paste:** YES

```text
Map accessibility barriers
```

### Promotional Text

- **Character limit:** 170
- **Character count:** 118
- **Ready to paste:** YES, FINAL-SHA RECHECK

```text
Find accessibility barriers on a community map, understand their impact, and add a report without creating an account.
```

### App Description

- **Character limit:** 4,000
- **Character count:** 1,115
- **Ready to paste:** YES, FINAL-SHA RECHECK

```text
Flagstone is a community map for finding and reporting accessibility barriers.

EXPLORE BEFORE YOU ARRIVE
Browse mapped barriers and open a report to see its category, severity, description, status, and available photos. Search and filters help you focus on the places and barrier types that matter to you.

REPORT WHAT YOU FIND
Add a barrier from the map with a location, category, severity, and optional description. You can submit a report without creating an account. Signed-in contributors can also add photos.

FOLLOW COMMUNITY UPDATES
Signed-in members can comment on reports, watch barriers, and help keep status information useful. In-app controls let people report content and block or hide abusive contributors.

USE LOCATION ON YOUR TERMS
Location access is optional for browsing. If you grant foreground location access, Flagstone can show nearby barriers and help place a report. The app does not request background location access.

PRIVACY AND SUPPORT
Flagstone has no advertising or tracking. Privacy, Terms & Community Guidelines, support, and accessibility information are available from the app.
```

### Keywords

- **Limit:** 100 UTF-8 bytes
- **Count:** 94 bytes
- **Ready to paste:** YES

```text
wheelchair,mobility,ramp,curb,sidewalk,crossing,washroom,inclusive,community,navigation,access
```

The set does not duplicate `Flagstone`, `map`, `accessibility`, or `barriers` from the name/subtitle; it uses no competitor trademarks and does not imply anonymous/privacy guarantees.

### What's New

- **Character limit:** 4,000
- **First-version rule:** field is not available for the first App Store version.
- **Ready to paste:** N/A for the expected first public version.
- **Fallback count:** 129, only if ASC shows the record is an update.

```text
First public release of Flagstone, with the accessibility barrier map, report details, community reporting, and account controls.
```

## App Reviewer Walkthrough

### Candidate App Review Notes

**Limit:** 4,000 bytes. **Count:** 2,200 Unicode characters / 2,234 UTF-8 bytes. **Ready to paste:** YES after every label/path below is verified on the exact final candidate and placeholders are resolved. **NEVER COMMIT REVIEWER CREDENTIALS.**

```text
Flagstone is a community map of accessibility barriers. The backend services needed for review are enabled.

GUEST PATH
1. On the opening sign-in screen, tap “Browse without an account.”
2. Open the Home tab to browse the accessibility map. Tap any visible marker to open its barrier detail, including category, severity, status, description, and any available photos.
3. To exercise guest reporting, close the detail, centre the map on the intended location, tap the + button at the lower right, complete the “Report anonymously” form, and tap “Submit anonymously.” An account is not required for this flow.

REVIEW ACCOUNT
Use the non-expiring credentials entered in the App Review Information username and password fields. From a guest session, open Profile and tap “Sign in.” After sign-in, open a barrier detail and use the Comments section to exercise a login-gated feature.

UGC CONTROLS
In a barrier detail, use “Report this barrier” near the bottom. On another user’s comment, the comment actions expose Report and Hide; an identifiable author also exposes Block. Blocking/hiding is intentionally device-local in this version. Prohibited terms are checked when user content is submitted.

ACCOUNT DELETION
For a signed-in account, open Profile, scroll to the bottom, and tap “Delete Account.” Confirmation permanently starts an asynchronous full-account deletion request and signs the account out. The app retains an on-device receipt and exposes deletion status/completion. Please do not complete deletion with the primary reviewer account. If end-to-end deletion is required, use the separate disposable credentials listed below only after we have supplied them.

LEGAL, ACCESSIBILITY, AND SUPPORT
Open the menu, then Settings. “Privacy Policy” and “Terms & Community Guidelines” open in-app. Settings > About Flagstone contains the public Accessibility and Support links.

Location permission is optional for browsing and may be denied. Flagstone requests foreground location only. Push notifications are optional and are not needed for review.

DISPOSABLE DELETION TEST EMAIL: [ENTER IN ASC NOTES ONLY IF VERIFIED]
DISPOSABLE DELETION TEST PASSWORD: [ENTER IN ASC NOTES ONLY IF VERIFIED]
```

### Final-candidate recheck points

- **FINAL-CANDIDATE RECHECK:** anonymous reporting remains enabled, the opening button still says `Browse without an account`, the tab is still `Home`, and report buttons retain the quoted labels.
- **FINAL-CANDIDATE RECHECK:** Prompt B may refine account-deletion recovery/status wording and paths. Reword the notes to the accepted source, never the preparatory source.
- **TESTFLIGHT-BUILD RECHECK:** guest and reviewer-account walkthroughs complete without unavailable backend/error state.
- **APP-STORE-CONNECT HUMAN ENTRY:** main credentials go only in the username/password fields; disposable credentials, if used, go only in Notes.

## Privacy Nutrition Label Evidence

### Apple classification rules applied

- Data is **collected** when transmitted off device and retained beyond what is necessary to service the request in real time. App functionality still counts.
- A category is **linked** unless direct identifiers are removed before collection and re-linkage is prevented. “Anonymous” in product copy is not enough by itself.
- **Tracking** means linking app data with third-party data for targeted advertising/ad measurement, or sharing with a data broker. No such use is evidenced here.
- App-level answers must cover all collection paths. If signed-in content is linked and anonymous content is unlinked, the category is still disclosed as linked at the app level.
- Data handled only on device, such as current-position centring, address recents, watched flags, hides, and blocks, is not collected merely because it exists locally.
- The developer is responsible for integrated partners' practices. No analytics or crash SDK ships, but that does not erase Nominatim/Supabase/Expo operational data.
- Apple's narrow optional-disclosure exception for infrequent feedback/customer-service requests is not used here: the form also makes a best-effort Supabase insert, anonymous users have no displayed account identity, and the repository cannot prove that every element of Apple's exception is met. The conservative executable answer is to disclose Customer Support.

### Proposed ASC answer sheet

| Apple data category | Collected? | Linked to user? | Used for tracking? | Purpose | Current source evidence | Confidence | Final recheck |
|---|---|---|---|---|---|---|---|
| Precise Location | Yes | Yes | No | App Functionality | Report rows include exact `lat`/`lng`; signed-in reports link to `user_id`; anonymous reports use null user ID. Current device location for centring is on-device, but submitted barrier location is stored/public. | High | Final report schema/flow and live policy. |
| Coarse Location | **OWNER / PRIVACY FINAL DECISION REQUIRED** | If selected, conservatively Yes | No | App Functionality; possibly Analytics for provider operations | Flagstone does not deliberately send a separate coarse location. OSMF says API/service network logs include IP and CDN mechanisms may produce broad location; Supabase/Expo production log retention is not provable from repo. | Medium/ambiguous | Provider/config confirmation described below. |
| Email Address | Yes | Yes | No | App Functionality | Supabase auth; password reset; in-app privacy; feedback/review account paths. Email is not public. | High | Final auth provider/config and policy. |
| Name | Yes | Yes | No | App Functionality | Optional profile display name and public attribution. | High | Final profile schema/flow. |
| Other Contact Info | No | N/A | No | N/A | No user phone/postal-address collection in app source. Reviewer/business contact data entered in ASC is not app collection. | High | Final source dependencies. |
| Photos or Videos | Yes | Yes | No | App Functionality | Signed-in flag photos and avatars upload to Supabase Storage; anonymous report path uploads no photos. | High | Final upload/retention/deletion and D8. |
| Other User Content | Yes | Yes | No | App Functionality | Report descriptions, comments, content-report narratives and alt text; signed-in paths link to user. | High | Final UGC/report schema and live policy. |
| Customer Support | Yes | Yes | No | App Functionality | The feedback modal sends the body, category, optional reply email, platform and optional `user_id` to the `feedback` table on a best-effort path, while also opening a mail composer. Signed-in submissions are linked; guest submissions can be unlinked. | High | Final feedback path and generated privacy manifest. |
| Search History | **OWNER / PRIVACY FINAL DECISION REQUIRED** | If selected, conservatively Yes | No | App Functionality; provider Analytics may apply | Address query is sent to Nominatim. OSMF states its services produce request/interaction logs and queries may be analysed for missing addresses. | High that provider receives it; medium on exact ASC linkage/purpose | Confirm OSMF practice still applies to endpoint and choose conservative entry. |
| User ID | Yes | Yes | No | App Functionality | Supabase auth UUID links profile, reports, comments, feedback, points and push token. | High | Final database/config. |
| Device ID | Yes | Yes | No | App Functionality | Opt-in Expo push token is stored in `push_tokens` with `user_id`; token is an identifier under the label taxonomy. | High | Exact build must ship notifications; test opt-in/out. |
| Product Interaction | No for Flagstone-owned telemetry; **provider decision bundle** | N/A unless provider logs are selected | No | If selected: Analytics/App Functionality | `src/lib/analytics.ts` is a non-shipping release stub and no analytics SDK is present. OSMF separately describes service interaction logs. | High for no SDK; medium for provider category | Provider decision. |
| Other Usage Data | No for Flagstone-owned telemetry; **provider decision bundle** | N/A unless provider logs are selected | No | If selected: Analytics/App Functionality | No release usage telemetry. Nominatim request metadata may fit Apple’s usage taxonomy depending on the final privacy-owner interpretation. | High for no SDK; medium for provider category | Provider decision. |
| Crash Data | No | N/A | No | N/A | No Sentry/crash-reporting SDK or production crash upload path in dependencies/source. | High | Final dependency/binary inspection. |
| Performance Data | No | N/A | No | N/A | No production performance telemetry path or SDK found. | High | Final dependency/binary inspection. |
| Other Diagnostic Data | No for app-owned telemetry; **provider decision bundle** | N/A unless selected | No | If selected: App Functionality/Security | No app diagnostic upload. Provider auth/network/service logs cannot be established from repository. | Medium-high | Provider/config confirmation. |
| Other Data | No | N/A | No | N/A | No otherwise-unclassified collection evidenced after mapping content, identifiers and provider ambiguity. | Medium-high | Final source/provider review. |

**Tracking:** answer **No**. No ads, ad measurement, data broker, ATT use, or third-party tracking SDK is evidenced. This must be rechecked against the final dependency tree and production provider configuration.

**Analytics/crash SDK determination:** no analytics SDK and no crash-reporting SDK actually ship at the preparatory SHA. `src/lib/analytics.ts` strips sensitive keys and only logs in development; release calls do not transmit. Nominatim operational/usage logging is partner collection, not proof that Flagstone ships an analytics SDK.

**Anonymous report linkage:** the anonymous insert uses no account and `user_id` is null. On source evidence alone, that specific report row is designed to be unlinked. Apple labels operate at the category/app level, however: Precise Location and Other User Content also have signed-in pathways linked to accounts, so those categories remain “linked to user.” IP/request logs at Supabase/Nominatim could also defeat a blanket “anonymous reports are never linked” claim unless the owner has provider evidence that they are deidentified before collection and cannot be re-linked.

**Photo EXIF/GPS:** the source implements a fail-closed re-encode, metadata-segment sanitizer, verification, and refuses upload when it cannot verify stripping. That is source evidence, not live proof. D8 still requires a final-candidate real-device photo and stored-object inspection. The App Privacy Precise Location answer remains Yes regardless, because the selected barrier coordinate is intentionally stored. EXIF handling changes the accuracy of policy/product claims, not that category answer.

### OWNER / PRIVACY FINAL DECISION REQUIRED

The repository cannot determine how long production Supabase, Expo push, OpenStreetMap tile, and Nominatim request logs are retained or which Apple category ASC will expect for retained IP/request metadata. OSMF's current policy explicitly says its services/APIs collect IP address, browser/device type, OS, request time/pages and interaction records, and that Nominatim queries may be analysed. Before submission, the privacy owner must confirm current production endpoints/provider terms and choose either: (a) the conservative label addition of Search History plus any applicable Coarse Location/Other Usage Data/Diagnostics, linked, no tracking, with App Functionality and provider Analytics purposes as appropriate; or (b) document why collection meets Apple’s real-time/optional-disclosure exceptions. Do not choose “No” merely because Flagstone has no analytics SDK. Estimated human time: 10–20 minutes if the provider evidence is already assembled; stop and obtain privacy counsel/owner sign-off if not.

## Privacy Manifest Cross-Check

`app.json` declares no tracking and lists linked, non-tracking, App Functionality collection for Precise Location, Email Address, Name, Photos or Videos, Other User Content, User ID, and Device ID. A privacy manifest is not the ASC App Privacy label and does not automatically prove the label.

| Manifest category | Proposed ASC category | Consistent? | Why | Final action |
|---|---|---|---|---|
| Precise Location | Precise Location: collected, linked, no tracking, App Functionality | Yes | Signed-in report coordinates are linked; anonymous rows do not remove the app-level linked pathway. | Recheck final manifest and report schema. |
| Email Address | Email Address: collected, linked, no tracking, App Functionality | Yes | Auth email is account-linked. | Recheck auth provider/config. |
| Name | Name: collected, linked, no tracking, App Functionality | Yes | Display name/profile attribution. | Recheck final profile. |
| Photos or Videos | Photos or Videos: collected, linked, no tracking, App Functionality | Yes | Upload requires sign-in at current source. | D8 and deletion proof. |
| Other User Content | Other User Content: collected, linked, no tracking, App Functionality | Yes for reports/comments; incomplete for support feedback | Signed-in descriptions, comments and content-report narratives link to a user. The feedback form is more specifically Apple's Customer Support type. | Recheck final flows and keep support feedback out of the rationale for this row. |
| No Customer Support entry | Customer Support: collected, linked, no tracking, App Functionality | **No — meaningful final-manifest gap** | `NSPrivacyCollectedDataTypeCustomerSupport` exists, while the current feedback path can retain a support request and optional contact email in Supabase. The current generic Other User Content row does not use the most specific Apple type. | **FINAL-SHA RECHECK:** final native/config owner must add or otherwise resolve Customer Support before the accepted SHA; verify the generated archive privacy report. |
| User ID | User ID: collected, linked, no tracking, App Functionality | Yes | Supabase user UUID. | Recheck final schema. |
| Device ID | Device ID: collected, linked, no tracking, App Functionality | Yes | Push token stored with user ID. | Confirm exact build includes notifications and opt-out deletes token. |
| Tracking false / no tracking domains | Tracking: No | Yes | No ad/tracking evidence. | Final dependency/provider check. |
| No Search History entry | Search History: privacy-owner decision | **Potential gap, not automatic proof of contradiction** | Direct Nominatim queries and provider logs are outside the current manifest categories. Manifest and ASC label obligations differ, but selecting Search History in ASC should trigger a final manifest review. | Privacy owner decides label, then final-native manifest owner reviews whether the manifest must change. |
| No Coarse Location/Usage/Diagnostics entries | Provider decision bundle | **Potential gap, not automatic proof of contradiction** | IP/request logging is provider/config-dependent and not represented. | Resolve provider evidence before freezing final SHA and labels. |

Only the last two rows are meaningful unresolved cross-checks. Absence of Crash/Performance categories is consistent with no shipping SDK. Do not inflate the mismatch list from historical manifests.

## Age Rating Answer Sheet

Apple's current questionnaire uses presence/Yes-No for controls and capabilities, and frequency for content. Enter what the exact final app and live content contain. The answers below deliberately do not game the result lower.

| Question / category | Recommended answer | Why | Source evidence | Confidence | Owner decision? |
|---|---|---|---|---|---|
| Parental Controls | No | No parent/guardian restriction tools. | Source-wide feature inspection. | High | No |
| Age Assurance | No | No Declared Age Range API, ID check, age estimation, or verification. | Dependencies/auth/source. | High | No |
| Unrestricted Web Access | No | Fixed legal/support links and address/map services are not a freely navigable browser. | `src/lib/links.ts`, native legal sheets, external URL helpers. | High | No |
| User-Generated Content | Yes | Users broadly publish report descriptions, photos and comments. | `ReportFlagModal`, `FlagDetailModal`, flags/comments schema. | High | No |
| Social Media | Yes | Community/discovery surfaces, comments, verification/status interaction and leaderboard visibly spread/interact with UGC. Apple says category choice does not change this. | Home/Tasks/Profile/community flows; Apple 2026 definition. | High | No |
| Social Media Disabled for Users Under 13 | No | No age assurance/gating exists. “Not designed for under 13” is not the required technical gate. | Current auth and privacy copy. | High | No |
| Messaging and Chat | Yes | Apple explicitly includes public posting; Flagstone has public comments even without direct/private messages. | `FlagDetailModal`, comments source; Apple definition. | High | No |
| Location | Not a current age-rating question / N/A | Foreground location and map coordinates affect privacy/permissions, not any descriptor in Apple's current age-rating categories. Do not invent an answer field; answer only if ASC introduces one. | `app.json`, location source; current Apple category list. | High | No |
| Advertising | No | No paid promotion or ad SDK. | Dependencies/source/policy. | High | No |
| Profanity or Crude Humor | Infrequent | Prohibited terms are filtered, but public UGC can still expose occasional language outside an exact list. This conservative answer does not lower the already-13+ result. | `src/moderation/blockedTerms.ts`, public UGC. | Medium-high | Final live-content fact, not owner choice |
| Horror/Fear Themes | None | No designed or seeded horror content evidenced. | Product/source. | High | Final live-content scan |
| Alcohol, Tobacco, or Drug Use/References | None | No designed content evidenced. | Product/source. | High | Final live-content scan |
| Medical or Treatment Information | None | Barrier/access information is not diagnosis or treatment guidance. | Product/source; Apple definition. | High | No |
| Health or Wellness Topics | None | No self-care, exercise, diet or wellness recommendations. Accessibility information alone is not this descriptor. | Product/source; Apple definition. | High | No |
| Mature or Suggestive Themes | None | No designed mature themes evidenced. | Product/source. | High | Final live-content scan |
| Sexual Content or Nudity | None | Prohibited by Terms/filter; none evidenced. | Terms/filter/source. | High | Final live-content/photo scan |
| Graphic Sexual Content and Nudity | None | Prohibited and none evidenced. | Terms/filter/source. | High | Final live-content/photo scan |
| Cartoon or Fantasy Violence | None | No such product content. | Product/source. | High | Final live-content scan |
| Realistic Violence | None | No such product content. | Product/source. | High | Final live-content/photo scan |
| Prolonged Graphic/Sadistic Realistic Violence | None | No such product content; this would make an app unpublishable. | Product/source. | High | Final live-content/photo scan |
| Guns or Other Weapons | None | No designed content evidenced. | Product/source. | High | Final live-content/photo scan |
| Gambling | No | No real-money/in-game-currency wagering. | Dependencies/product. | High | No |
| Simulated Gambling | None | No wagering simulation. | Product/source. | High | No |
| Contests | Infrequent | The persistent contribution points/leaderboard lets users rank against one another. It has no prize or time-limited event, but Apple's definition includes competing for rankings, so Infrequent is the conservative answer. | Profile points/reputation/leaderboard source; Apple definition. | Medium | No; confirm exact ASC wording |
| Loot Boxes | No | No randomized purchasable items. | Product/dependencies. | High | No |
| Made for Kids | No / Not Applicable | App is not designed for children and current policy says it is not directed under 13. | In-app privacy copy. | High | No |
| Higher age override | Not Applicable | No source-backed higher minimum beyond the calculated rating. If final Terms impose one, Apple requires an override to it. | Current Terms/privacy. | Medium-high | Final Terms fact |
| Age Suitability URL | None | No dedicated current page. | Public site review. | High | No |

**Expected result:** **13+ global, high confidence**, because Social Media = Yes independently establishes a 13+ minimum on current Apple platforms. Expect regional differences, including **16+ in Australia**, **A16 in Brazil**, **15+ in Korea**, and **16+ in Vietnam** when distributed there, based on Apple's current tables. ASC is the authority for the calculated set; save screenshots/text of the calculated result.

**September 2026:** the exact effective date is **not published**. Apple's July 9 notice says the questions are available now and required “beginning in September 2026.” Because submission is being prepared on 2026-08-30 and may occur in September, complete the live questions now. Do not spend time trying to infer an unpublished day.

## Accessibility Nutrition Labels

Apple currently exposes nine feature declarations for iPhone: VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion, Captions, and Audio Descriptions. A declaration requires users to complete **all common tasks**, including first launch, sign-in, settings, and primary workflows. Source presence, automated tests, a public “supported” page, or one successful screen is insufficient.

Prompt C has not completed. Therefore **no accessibility feature is pre-declared by this dossier**.

| Feature | Classification now | Exact final proof required | ASC action |
|---|---|---|---|
| VoiceOver | **DECLARE ONLY AFTER FINAL DEVICE PROOF** | Exact TestFlight build, physical iPhone; complete opening/guest entry, map alternative/list discovery, barrier detail, anonymous report, sign-in, comment, content report/hide/block, Profile, Settings/legal/support, and deletion-entry/status paths. Verify labels/roles/values/hints, reading/focus order, modal containment/return, announcements/errors, rotor/headings, and no unreachable action. | Select only if every common task passes. |
| Voice Control | **DECLARE ONLY AFTER FINAL DEVICE PROOF** | Exact build; Voice Control on; complete the same tasks with voice. Visible names must match spoken control names, Show Names/Numbers works, and swipe/secondary actions have an operable path. | Public page currently says “under evaluation”; do not select without full proof. |
| Larger Text | **DECLARE ONLY AFTER FINAL DEVICE PROOF** | Exact build at the largest iOS accessibility Dynamic Type category (Accessibility XXXL), portrait; all common tasks remain readable/operable with no clipped, overlapped, off-screen, or unreachable controls/content. Also verify keyboard/error states. | Select only on a complete device matrix pass. |
| Dark Interface | **DECLARE ONLY AFTER FINAL DEVICE PROOF** | Exact build follows system dark appearance or explicit app setting throughout every common task, including native prompts/modals and error/loading/empty states; no unreadable or light-only surface. | Select only after light/dark device pass. |
| Differentiate Without Color Alone | **DECLARE ONLY AFTER FINAL DEVICE PROOF** | Verify severity, status, selection, validation, map markers, filters, links, success/error, and charts/badges use text, shape, icon, underline, or other non-colour signal in all common tasks. Test colour filters/simulation. | Select only after visual/device evidence. |
| Sufficient Contrast | **DECLARE ONLY AFTER FINAL DEVICE PROOF** | Light and dark common-task pass; test Bold Text, Increase Contrast and Reduce Transparency where relevant. Record contrast measurements for text/controls/focus/state boundaries and ensure disabled-state meaning remains clear. | Select only if Apple criteria pass across common tasks. |
| Reduced Motion | **DECLARE ONLY AFTER FINAL DEVICE PROOF** | Exact build with iOS Reduce Motion on; sheet, tab, map-camera, loading, progress and feedback animations must be removed/reduced without losing state or task completion. No necessary meaning may depend on motion. | Select only after device observation; source reduce-motion branches are not enough. |
| Captions | **NOT APPLICABLE / DO NOT DECLARE** | Confirm final common tasks contain no essential prerecorded audio/video. Static photos/map do not create a captions claim. | Leave unselected. |
| Audio Descriptions | **NOT APPLICABLE / DO NOT DECLARE** | Confirm final common tasks contain no essential video requiring description. | Leave unselected. |

If at least one feature passes, ASC path is **Apps → Flagstone → App Accessibility → add iPhone support → select only proved features → publish**. If none pass, answer the current ASC setup truthfully; do not use the public accessibility page as evidence. **Accessibility URL:** leave blank until AS-BLOCK-001/Prompt C align its claims with the final proof.

Retain evidence as a compact matrix: exact version/build, device/iOS, feature setting, task, result, issue ID or video/screenshot reference, tester, and timestamp. Accessibility labels are mutable but must be re-evaluated with updates.

## Screenshot Requirements

Current source verifies `ios.supportsTablet: false`. This is an iPhone-only submission for screenshot purposes. Final native packaging must confirm Apple still sees no iPad support.

| Device / display class | Required? | Accepted pixel dimensions | Minimum screenshots | Maximum screenshots | Can ASC scale from another size? | Final capture recommendation |
|---|---|---|---:|---:|---|---|
| iPhone 6.9-inch | **Yes** | Portrait `1260×2736`, `1290×2796`, or `1320×2868`; landscape inverses | 1 | 10 | This highest supplied class scales down to smaller iPhone classes. | Capture portrait at `1320×2868` on a current 6.9-inch target, preferably iPhone 17 Pro Max, from the accepted build/presentation state. |
| iPhone 6.5-inch | No when 6.9 supplied | Portrait `1284×2778` or `1242×2688`; landscape inverses | 1 if used as required fallback | 10 | Required only when no 6.9-inch screenshot is supplied. | Do not capture a separate set. |
| Smaller iPhone classes | No separate set | Apple lists accepted native sizes | N/A | N/A | ASC uses scaled screenshots from the higher accepted class. | Inspect scaled preview in Media Manager; custom captures only if scaling visibly harms the layout. |
| iPad 13-inch / other iPad | **No**, provided final build remains iPhone-only | 13-inch portrait `2064×2752` or `2048×2732` if app ran on iPad | N/A | N/A | iPad scaling applies only within iPad classes. | Do not spend time on iPad screenshots. Stop if ASC asks for them and inspect final supported-device metadata. |

File formats are `.jpeg`, `.jpg`, or `.png`; screenshots cannot have alpha/transparency. App previews are optional, up to three per localization/device size, precede screenshots, and can take up to 24 hours to process. **Omit previews for V1.**

Legal minimum is one screenshot. Operational recommendation is **three** for the minimum competent set and **six** for the strong set.

## Screenshot Shot List

All shots must be captured from the exact accepted TestFlight/release candidate or a demonstrably identical accepted presentation state. Never use a stale build, fabricated error-free state, or mock data that the submitted app cannot display.

### A. Minimum Fast Submission Set: 3 screenshots

| Order | Screen | User story | What must be visible | What must not be visible | Short caption candidate | Final-SHA dependency | Account state | Location state |
|---:|---|---|---|---|---|---|---|---|
| 1 | Map overview / Home | See where accessibility barriers have been reported | Recognizable map, several non-overlapping markers, category/severity/status legend or useful map controls, clean first-launch state | Permission prompts, cluster overload, empty/broken tiles, exact home/private location, debug/admin UI | `See accessibility barriers nearby` | Map chrome, marker vocabulary, seeded data | Guest | Fixed safe demo area; permission already resolved |
| 2 | Barrier detail | Understand a barrier before arriving | Category, severity number/word, status, useful description, location context, one safe photo only if strong | Faces, licence plates, personal names, abusive text, loading/error, clipped content | `Understand each barrier before you arrive` | Final detail copy/layout and content | Guest | Same demo area |
| 3 | Anonymous report form | Contribute without an account | `Report anonymously`, identity banner, location/category/severity/description fields in a credible completed-but-not-submitted state | Keyboard, permission prompt, real personal location, validation errors, Submit spinner, private photo | `Report a barrier in a few clear steps` | Anonymous flow remains supported | Guest | Fixed map coordinate already selected |

### B. Strong First-Launch Set: 6 screenshots

Use the first three above, then add:

| Order | Screen | User story | What must be visible | What must not be visible | Short caption candidate | Final-SHA dependency | Account state | Location state |
|---:|---|---|---|---|---|---|---|---|
| 4 | Nearby/discovery list or Tasks | Move from map scanning to a useful prioritized list | Multiple safe records, distances only if real fixed location backs them, filter/sort context, no empty state | Misleading “nearby” claim without location, backend error, duplicate/test items | `Find the barriers that matter to you` | Final navigation/list quality | Guest preferred | Fixed safe coordinate; truthful distances |
| 5 | Community detail/comments or recent activity | See community context and follow-up | Clean comments/activity with nonpersonal display names, status history or useful community signals | Moderation menus left open, blocked/profane/private content, timestamps suggesting stale test data | `Learn from community updates` | Prompt/product final state; comments/backend | Signed in | Same area |
| 6 | Profile contributions | See the value of a free account | Safe reviewer profile, contribution stats, reports/watched/updates controls, coherent visual state | Reviewer email, real avatar, private feedback, admin badge, account deletion confirmation | `Keep track of what you’ve mapped` | Final Profile/Prompt C presentation | Signed in | Not material |

If either shot 5 or 6 is visually weak, replace it with the strongest final accessibility/help context or a filtered map/list state. Do not make optional community polish a submission blocker. Captions are candidates, not claims; final compositing must fit the accepted pixels with no alpha.

## Screenshot Capture Runbook

1. **Prerequisites (3–5 min):** exact accepted build installed; final seed data stable; reviewer account verified; AS-BLOCK-001 fixed; choose one safe, dense demo area with no personal address. Prepare all shot targets in the same account before capture.
2. **Device (1 min):** current 6.9-inch iPhone target producing an accepted size, recommended iPhone 17 Pro Max portrait at `1320×2868`. If the actual device produces another accepted 6.9 size, use it consistently.
3. **Presentation (2 min):** Light appearance for the marketing set unless final Dark is materially stronger; default Dynamic Type; standard contrast; Reduce Motion may be on for capture speed but UI must look normal. Accessibility declaration testing is separate.
4. **Status hygiene (2 min):** charge/battery/network stable; no low-power/VPN/recording indicator; Do Not Disturb/Focus on; dismiss keyboard, banners, permission prompts, TestFlight feedback prompts, toasts and update badges. Keep time/carrier/status bar consistent if visible.
5. **Location (2 min):** set the approved demo coordinate before launch. Grant foreground location only if needed. Never capture Sky’s actual location or a sensitive address. Verify distance/nearby labels are truthful.
6. **Seed/account (2 min):** use nonpersonal names/content/photos with rights. No faces, licence plates, email addresses, real feedback, moderation queue, or destructive account state. Ensure the primary screenshot record will remain available through review.
7. **Navigation order (6–10 min):** capture `01 Map` → tap prepared marker and capture `02 Detail` → close, tap `+`, fill without submitting and capture `03 Report` → close → open Nearby/Tasks for `04` → sign in once → reopen prepared detail/comments for `05` → Profile for `06`. This minimizes location resets and login churn.
8. **Naming:** `01-map-overview_iphone-6.9_en-CA.png`, `02-barrier-detail_iphone-6.9_en-CA.png`, `03-anonymous-report_iphone-6.9_en-CA.png`, etc. Preserve raw originals separately from captioned exports.
9. **QA (3–5 min):** exact pixel size, opaque RGB, no alpha, no spelling/clipping, no private content, caption matches visible behaviour, same app build/state, and Media Manager scaled preview remains legible.

Anonymous shots: 1–4. Login required: 5–6. Minimum set capture should take about **12–20 minutes** after fixtures are ready; the strong set about **20–35 minutes**, excluding optional graphic compositing.

## Review Account Checklist

**NEVER COMMIT REVIEWER CREDENTIALS. Enter them only in ASC.**

- [ ] Main reviewer account exists in the production backend used by the exact TestFlight build.
- [ ] Email/password work from a signed-out fresh launch on the exact build.
- [ ] Password is non-expiring for the review window; no forced email OTP, magic-link-only path, stale verification, rate limit, or lock.
- [ ] Account has no admin privileges and no sensitive/personal content.
- [ ] Profile display name/avatar are neutral and review-safe.
- [ ] At least one login-gated flow works: open a report and load/post a harmless review comment (or another exact flow named in final notes).
- [ ] Report/content controls load against the production backend.
- [ ] Account is not near anonymous/auth/content rate limits and has no pending deletion request.
- [ ] Any expected seed report/comment remains available and is not owned by the only account when an “other user” action is needed.
- [ ] Main account can navigate to `Profile → Delete Account`, but reviewer notes ask Apple not to confirm deletion on it.
- [ ] If end-to-end deletion needs review, create/verify a **separate replenishable disposable account** immediately before submission and place its credentials only in Notes. Confirm the owner can safely replace it if Apple deletes it.
- [ ] Do not make a fake claim that deletion succeeded. Test disposable deletion through request, sign-out, receipt/status and completion using the exact final backend, then replenish it for Apple.
- [ ] Contact phone/email in ASC are monitored for the full review window.

Safe fixture strategy: one persistent main reviewer account for comments/content controls plus one disposable deletion account only if the deletion flow has been proved and can be recreated. If no safe disposable account can be supplied, let the reviewer inspect the main account’s deletion entry/confirmation and state in Notes that confirmation permanently deletes it; offer a replacement promptly through App Review messaging. Do not invent a backend bypass.

## UGC Review Pack

This is not a moderation architecture audit. It maps Apple's visible Guideline 1.2 expectations to the existing final-candidate proof surface.

| Apple requirement | Visible Flagstone control / flow | Where reviewer finds it | Final proof required |
|---|---|---|---|
| Filtering / objectionable-content prevention | Prohibited-term checks reject user descriptions/comments/content where wired; Terms define prohibited content. | Submit an otherwise harmless blocked-term test only in a disposable fixture, or provide screen recording if needed. Terms in Settings. | **FINAL-SHA RECHECK:** verify all public text/photo entry points use actual final prevention. Do not claim image moderation not implemented. |
| Report offensive content + timely response | `Report this barrier`; per-comment Report opens reason/category modal and submits to moderation/feedback path. | Barrier detail bottom; actions on another user's comment. | Exact final build sends a report, displays success, and owner can see actionable record in current moderation path. Do not place an unproved SLA in review notes. |
| Block abusive users | Block on an identifiable other user's comment; future comments from that author are filtered on that device. | Sign in, open report comments, open another user's comment actions. | **FINAL-SHA RECHECK:** action visible, persists across relaunch on same device, and hides current/future comments from that author. Be explicit that it is device-local. |
| Hide abusive/anonymous item | Hide per comment when no identifiable author can be blocked or when user wants item-level removal. | Same comment actions; hidden-comments management in Settings if present. | Hide works, persists, can be managed/unhidden if final UI offers it. |
| Published contact information | Support email and feedback entry points. | Settings → About Flagstone → Support; Feedback button/menu. | AS-BLOCK-001 support page aligned and email reachable. |
| Terms/community standards acceptance | Sign-up footer presents Terms & Community Guidelines and Privacy Policy at account creation; native Terms remain in Settings. | Create Account screen and Settings. | Final build: links visible at rest on supported screen/Dynamic Type and accepted text matches public page. |
| Moderation/takedown pathway | User report records plus owner/admin queue and delete/takedown source. | User-visible report result; backend/admin proof is external, not shown to ordinary reviewer. | Exact production report appears in actionable queue; takedown removes row and associated public photo as applicable. |

July findings that said report/block/hide controls or comment flows were absent are **SUPERSEDED** by current source. Their final visibility/function remains **FINAL-SHA / TESTFLIGHT-BUILD RECHECK**, not “Apple accepted.” The current block is scoped to identifiable comment authors; anonymous comments are item-hidden, and flag authors are not publicly exposed. Do not promise system-wide account suspension from the user-facing Block control.

## Account Deletion Review Pack

| Item | Current preparatory truth | Required final proof/action |
|---|---|---|
| Location | Signed-in **Profile**, scroll near bottom, `Delete Account`. It is not the public Support page's stale `Profile → Settings → Account` path. | **PROMPT-B FINAL RECHECK** exact path/label. |
| Reviewer sees | Destructive confirmation; starting request; local sign-out after durable request; secure receipt/status recovery UI; completion status. | Exact build with a disposable account. Capture request ID/receipt evidence without secrets. |
| What app communicates | Current source says deletion is permanent, asynchronous, cannot be undone, and status/completion can be checked. Current in-app Privacy says it removes profile, reports/content, contributions, feedback, points, notification data and photos. | Align public policies/help, final UI and actual backend behaviour. |
| Immediate or asynchronous | **Asynchronous.** `deleteAccount` records a durable request and signs out; worker performs data/storage/auth deletion later. | **PROMPT-B FINAL RECHECK** plus live worker/status proof. |
| Receipt/status | Device-held receipt allows status checks; signed-out/sign-in UI can announce completion. | Prove on exact final iPhone; verify receipt recovery after restart and no sensitive receipt in screenshots/logs. |
| Backend success | Not proven by source. Function and worker source presence is not deployment or completion proof. | External production proof with disposable account and backend evidence. |
| Review note | Main reviewer account should not be destroyed; use a separate disposable account if end-to-end proof is needed. | Verify/replenish immediately before submission; enter credentials in ASC only. |

Apple permits asynchronous/manual deletion, but requires informing the user how long it will take and confirming completion. Current source communicates asynchronous status but does not establish a completion-time promise. Prompt B must decide final truthful language based on deployed worker behaviour. Do not reintroduce the public page's unsupported “within 30 days” or historical anonymization claims without owner/legal and live-backend evidence.

## Export Compliance

### Current likely determination

- Network traffic uses ordinary HTTPS/TLS through Expo/React Native/Supabase/Nominatim.
- Dependencies include `expo-crypto` and `expo-secure-store`, but no source evidence of proprietary/non-standard encryption, an encrypted communications product, user-facing crypto, VPN, or custom cryptographic protocol was found.
- `app.json` sets `ios.config.usesNonExemptEncryption: false`, which Expo maps to `ITSAppUsesNonExemptEncryption = NO` in the native Info.plist.

**Likely result:** the app uses only exempt encryption and should require **no export-compliance document**, provided the exact final binary contains no new non-exempt/custom crypto. `false` does not mean “the app never uses TLS”; it means it does not use **non-exempt** encryption.

### Likely ASC sequence

1. Select the exact processed build.
2. Confirm ASC reads `ITSAppUsesNonExemptEncryption = NO` and does not request documentation.
3. If ASC still asks whether the app uses encryption, do not blindly answer “No.” Answer the live branching questions consistently with: **standard/exempt HTTPS/TLS and Apple/system or published standard security libraries only; no proprietary/non-standard algorithms; no export document expected**.
4. If ASC asks about encryption implemented outside Apple's operating system or country availability and the final binary facts are unclear, stop for **EXTERNAL / OWNER CONFIRMATION**. Do not improvise legal advice.
5. Retain a screenshot of the completed build compliance state.

**Final stop condition:** a new crypto/VPN/security feature, proprietary algorithm, file/content encryption function, or ASC request for documentation not explained by the source. Refer the exact binary/dependency facts to the owner or export counsel.

## EU / Availability

Apple requires a DSA trader-status declaration even if the app is not distributed in the EU. For apps distributed in any of the EU's 27 territories, trader contact information (address, phone, email) must be verified and displayed on the product page. Apple cannot decide whether Sky is a trader. A non-trader product page tells EU consumers that consumer rights from applicable consumer-protection law do not apply to contracts with the developer.

### Option A: Distribute in the EU

- **Human action:** ASC **Business → Agreements → Compliance → Digital Services Act**, complete account declaration, then set the app-level status/availability.
- **If trader:** provide and verify a public-facing address, phone and email; upload identity/business and address evidence ASC requests. An individual may need a safe public business address/PO box that Apple accepts.
- **If non-trader:** complete the self-assessment/declaration and accept the displayed consumer-rights consequence.
- **Evidence:** verified DSA status in Business, app-level setting, and EU storefronts selected.
- **Human time:** 5–10 minutes if a verified non-trader declaration is plainly correct; **20–45 minutes plus Apple verification time** if trader documents/contact verification are needed.

### Option B: Exclude EU for V1

- **Human action:** still complete the required DSA status declaration; in Pricing and Availability/App Availability choose specific territories and deselect all EU-27 storefronts.
- **Evidence:** app availability list contains no EU territory; app-level DSA state does not claim EU trader distribution.
- **Human time:** **5–10 minutes**.

**Recommendation:** choose Option B for the fastest first submission unless Sky already has an owner-approved trader/non-trader assessment and, if a trader, acceptable public contact details plus verification documents. This is an **OWNER DECISION**, not a conclusion that a free/no-ad app is automatically non-trader.

## Categories / Keywords

### Category recommendation

- **Primary: Navigation.** Apple's definition covers apps that provide information helping a user travel to a physical location, including walking assistance and maps. Flagstone's core map answers whether a route/place has reported accessibility barriers.
- **Secondary: Utilities.** Apple's definition covers solving a problem or completing a task; reporting/filtering access barriers fits as a secondary utility.
- **Do not choose Social Networking solely for discoverability.** The app may still answer Social Media = Yes in the age questionnaire because that descriptor is capability-based and independent of category.
- **Do not choose Health & Fitness or Medical.** The app does not provide treatment, diagnosis, exercise or wellness guidance; those categories would also trigger irrelevant regulated-medical declarations in covered regions.

### Final keyword set

```text
wheelchair,mobility,ramp,curb,sidewalk,crossing,washroom,inclusive,community,navigation,access
```

**Count: 94/100 UTF-8 bytes.** Every token is longer than two characters. It does not duplicate the app name/company or exact name/subtitle words, use competitor trademarks, or make a privacy/accessibility guarantee.

## TestFlight vs App Review Boundary

R1 remains the release-mechanics authority. Its accepted-SHA architecture, GitHub approval environment, D8 gate, fixed EAS profile, pinned CLI, build/submit coupling and evidence receipt must not be redesigned or bypassed from this dossier.

| State | What is proved | What is not proved |
|---|---|---|
| EAS build complete | EAS produced a store-signed binary under the recorded build/profile execution. | It is not necessarily uploaded, processed, device-tested, selected for an App Store version, reviewed, or public. |
| EAS linked submission complete | That exact EAS build was uploaded to the configured ASC app by the coupled submission. | No store metadata, screenshot, privacy/age/accessibility answer, reviewer account, App Review submission, approval, or public release. |
| TestFlight processed | Apple processed a version/build that can be inspected/tested; EAS/TestFlight identity can be matched. | TestFlight processing is not production App Review. Internal or external beta review is distinct from production review. |
| Add for Review | ASC placed the version in a draft submission/Ready for Review state. | The draft has not been sent to Apple until `Submit for Review`. |
| Submit for Review | The selected app version and draft items were sent to App Review. | Apple has not accepted it and it is not public. |
| Accepted/approved | Apple accepted the submitted version; with Manual release it reaches Pending Developer Release. | It is not publicly available until the owner releases it and storefront propagation completes. |
| Ready for Distribution/public | The owner released an approved version and Apple made it available in selected storefronts. | Availability in every territory/device must still be observed; approval alone does not prove storefront propagation. |

### TESTFLIGHT BUILD READY WHEN

- the exact final 40-character product SHA is accepted;
- R1's source and external GitHub approval gates pass;
- D8 final-device EXIF/GPS proof authorizes the final run;
- AS-BLOCK-002 is resolved in the accepted source and generated Xcode privacy report;
- one fixed TestFlight-profile, linked EAS build/submission completes with no `--latest` rediscovery;
- EAS build ID, submission ID, version and build number are recorded; and
- the exact matching version/build finishes processing in TestFlight and installs/launches on device.

### APP REVIEW SUBMISSION READY WHEN

- the exact processed build passes the final product/device smoke and walkthrough;
- AS-BLOCK-001 and AS-BLOCK-002 are closed; required URLs are live/truthful and the exact archive privacy report matches the intended labels;
- metadata, screenshots, age rating, App Privacy, accessibility declarations, content rights, export compliance, pricing/availability and DSA are complete;
- reviewer and optional deletion-fixture accounts work;
- agreements/roles allow submission;
- the exact processed build is selected on the iOS version page; and
- the version has been added to a draft submission and final stop-condition review is green.

### PUBLIC RELEASE READY WHEN

- Apple has accepted the exact submission;
- any review messages/conditions are resolved;
- availability, legal/compliance and agreements are still valid;
- release owner explicitly chooses `Release This Version` under the recommended Manual option; and
- selected storefront availability is observed after propagation.

## Final Human Submission Runbook

Assumption: actual screenshots, final accessibility evidence, privacy-provider decision, reviewer credentials, and both blocker fixes are already prepared. Target **60–85 minutes** after the exact TestFlight build processes.

| Step | ASC location | Action | Copy/paste value or reference | Dependency | Est. human minutes | Stop condition |
|---:|---|---|---|---|---:|---|
| 1 | Apps → Flagstone → TestFlight / build record; EAS/GitHub in parallel | Match exact accepted SHA receipt to EAS build/submission ID and processed ASC version/build; install/launch final build. | R1 evidence receipt; never select “latest” by time. | Processed build | 4–6 | Any SHA, bundle, version/build, EAS link or processing mismatch. |
| 2 | General → App Information | Enter/confirm name, subtitle, primary language, categories, Content Rights and standard EULA. | Master Field Sheet / Copy-Paste Pack | Content-rights proof | 4–6 | Rights unproved; bundle/app record mismatch; unexpected routing/medical field appears. |
| 3 | General → App Information → Age Ratings | Complete the current multi-step questionnaire; save and record calculated global/regional results. | Age Rating Answer Sheet | Final live-content scan | 4–7 | Calculated result contradicts expected answers; new question cannot be answered from evidence. |
| 4 | App Privacy | Enter/verify the canonical Privacy Policy URL; confirm data collection; enter each category/linkage/tracking/purpose; publish/save the label. | Privacy Nutrition Label Evidence / Copy-Paste Pack | AS-BLOCK-001; AS-BLOCK-002; provider decision bundle | 9–16 | Policy URL stale/non-200; generated privacy report differs; provider ambiguity unresolved; tracking appears. |
| 5 | App Accessibility | Add iPhone support and select only final-proved features, or truthfully indicate none. Enter Accessibility URL only if page aligned. | Accessibility evidence matrix | Prompt C + exact-build proofs | 3–8 | Any selected feature lacks all-common-task evidence. |
| 6 | Pricing and Availability; Business → Compliance as needed | Confirm Free/public distribution; apply EU Option A or B; complete DSA declaration and territories. | EU / Availability section | Owner EU/DSA decision | 5–15 | DSA required data/verification incomplete; unintended territories/medical permits appear. |
| 7 | iOS version page → Version Information | Paste promotional text, description, keywords, Support URL and copyright; leave Marketing URL blank; confirm first-version What's New and routing coverage are absent. | Metadata Copy Pack | AS-BLOCK-001; rights holder; final SHA | 4–6 | Character/byte validation fails; UI/product labels changed materially; ASC requires an unexplained routing file. |
| 8 | iOS version page → iOS Previews and Screenshots | Upload 3 fast or 6 strong opaque 6.9-inch images in order; inspect Media Manager scaling. | Screenshot requirements/shot list | Exact-build captures | 5–10 | ASC asks for iPad; wrong pixels/alpha/private data/stale UI; scaled preview clipped. |
| 9 | iOS version page → Build | Select exact processed version/build; complete build export-compliance prompt. | R1 receipt; Export Compliance section | Steps 1 and final binary | 3–5 | Selected build differs; export docs requested unexpectedly; compliance warning. |
| 10 | iOS version page → App Review Information | Enter contact name/phone/email, main reviewer credentials, reviewer notes, optional disposable deletion credentials. | Review Notes and placeholders | Verified accounts/contact | 4–7 | Login fails/fresh session locked; credential entered in repo/public field; contact unreachable. |
| 11 | iOS version page → Version Release Settings | Select Manual; leave phased release off/not applicable. | `Manual`; `Phased release off` | Owner has not explicitly overridden | 1 | ASC presents an unexpected automatic setting that cannot be confirmed. |
| 12 | App/version checklist and agreements | Reopen required sections once: URLs, privacy, age, accessibility, price/territories, screenshots, exact build, review info, agreements. Run candidate walkthrough. | RAG board + External Proof Queue | All prior steps | 5–8 | Any red/unknown/placeholder remains; backend or legal page unavailable. |
| 13 | iOS version page, top right | Click **Add for Review** and create/add to the intended draft submission. | Exact iOS version only; no unrelated items. | Version complete | 2–3 | Wrong draft/platform/item, validation error, or build changes. |
| 14 | Sidebar → App Review → Draft Submission | Inspect the item list and click **Submit for Review** once. Save submission timestamp/status. | One iOS app version | Final authorization | 2–3 | Any mismatch, new compliance prompt, or owner has not authorized submission. |

The submitter should open at most four working tabs: this dossier, ASC, the R1 evidence receipt/EAS record, and the final screenshot folder. Finish each ASC section completely before moving on. Do not re-search policy during this session unless ASC contradicts the dossier.

## Owner Decision Queue

| Decision | Options | Recommendation | Why | Latest time | Owner time |
|---|---|---|---|---|---:|
| EU distribution and DSA status | A: EU + correct trader/non-trader declaration; B: exclude EU V1 and still declare status | **B unless verified EU compliance is already ready** | Avoids exposing an unprepared address or waiting on trader verification while preserving a later EU launch. | Before Pricing/Availability is saved | 5–15 min, excluding verification |
| Copyright rights holder | `2026 [individual legal name]` or `2026 [entity legal name]` | Use the exact person/entity that owns exclusive rights, not a brand assumption | ASC requires a rights owner; repository cannot establish legal ownership. | Before Add for Review | 1–3 min |
| Partner-log privacy classification | Conservative label additions vs documented Apple optional/non-collection rationale | Conservatively add Search History and any provider-log categories the privacy owner confirms | OSMF documents retained query/network records; no-SDK does not answer partner collection. | Before App Privacy is published | 10–20 min |

No other owner choice is required for the prepared recommendation. Primary language, category, manual release, no app preview, no Marketing URL, standard EULA, Free price, and iPhone-only screenshot set are resolved recommendations unless the underlying product goal changes.

## External Proof Queue

| Proof | Where | When | Expected evidence | Time estimate |
|---|---|---|---|---:|
| Exact accepted SHA → processed build identity | GitHub approval/run, EAS build/submission, TestFlight | After final source acceptance/build | Full SHA, run ID, EAS build/submission IDs, version/build, processing timestamp all match R1 receipt | 5–10 min |
| Final legal/support URLs | Public web + final app | After AS-BLOCK-001, again before submission | HTTP 200; Privacy/Terms/Support/marketing/accessibility wording agrees with accepted behaviour and paths; contact email works | 5–10 min |
| Generated privacy report | Xcode Organizer/archive output for exact build | After AS-BLOCK-002 and final TestFlight archive | Customer Support plus every final app/SDK data type, linkage, purpose and tracking status agrees with the final ASC sheet; no unexpected SDK collection | 3–8 min |
| D8 photo metadata | Physical iPhone, exact build, stored Supabase object | Before R1 final build gate is authorized | Known EXIF/GPS photo uploaded; stored bytes show no GPS/EXIF/IPTC/XMP metadata; owner/privacy sign-off | 10–20 min |
| Reviewer accounts | Exact TestFlight build + production backend | Day of submission | Fresh login succeeds; gated features work; main account stable; optional disposable deletion account replenishable | 5–10 min |
| Account deletion | Exact build + production worker/status/backend | Before final Notes | Disposable request, sign-out, receipt/status recovery and completed full deletion observed; public text matches timing/result | 10–20 min plus worker time |
| Accessibility declarations | Physical iPhone/exact build | After Prompt C and before ASC labels | Feature-by-task evidence matrix for every selected label; failures remove declaration | 20–60 min outside ASC session |
| Final screenshots | Exact accepted presentation state | After final build UI acceptance | 3 or 6 opaque accepted-dimension files; private/content/scale QA passed | 12–35 min outside upload time |
| ASC account/compliance readiness | ASC Business, Agreements, App Info, Pricing | Submission day | Correct roles; agreements active; app/bundle mapping; Content Rights; DSA; territories; no unexpected compliance hold | 5–15 min |

## True Submission Blockers

| ID | Apple requirement | Current evidence | Why it blocks submission | Smallest required action | Must happen before |
|---|---|---|---|---|---|
| AS-BLOCK-001 | Required Privacy/Support URLs must truthfully describe data/account behaviour; metadata and review information must be accurate | Live 200 pages on 2026-08-30 conflict with current in-app v1.1 deletion, anonymous reporting, path/version and unproved accessibility claims | Submitting contradictory required public pages would create an inaccurate privacy/account-deletion/support representation and an avoidable 5.1.1/reviewer failure | Publish one owner-approved set aligned to the exact final behaviour; verify HTTP/content and in-app links. This dossier must not author legal policy. | **APP REVIEW** |
| AS-BLOCK-002 | Final privacy manifest and ASC answers must accurately use Apple's data-type definitions | The app's feedback path best-effort inserts the message, category, optional contact email, platform and optional user ID into Supabase; `app.json` has Other User Content but no `NSPrivacyCollectedDataTypeCustomerSupport` | Apple defines Customer Support separately, and the guest path prevents relying safely on the narrow optional-disclosure exception. Shipping the preparatory manifest would make the native privacy declaration incomplete. | In the accepted source, classify Customer Support as collected/linked/no tracking/App Functionality; generate the archive privacy report and cross-check it to ASC. If the privacy owner instead invokes Apple's exception, document how every criterion is met. | **TESTFLIGHT** |

No other product blocker is proven at the preparatory SHA. Final SHA, exact build, D8, accounts, screenshots and ASC agreements are intentional gates/evidence, not resurrected historical product blockers.

## Staleness Rule

- Behaviour-dependent content must be rechecked against **the exact final accepted product SHA**.
- Native packaging, permissions, icon/manifest, performance and device behaviour must be rechecked against **the exact final TestFlight build**.
- Roles, agreements, app record, build selection, forms, DSA, price and territories must be checked **in App Store Connect at submission time**.
- Policy requirements in this report carry **RESEARCHED 2026-08-30**.
- Do not re-research a stable Apple rule a few hours later unless the Apple page changed, ASC contradicts it, or submission crosses a documented effective-date boundary.
- Apple gave no exact September 2026 social-media-question date; answering the live questions now is the durable resolution.

## Do Not Redo

| Investigation already done | Durable result | Reopen only when |
|---|---|---|
| Canonical URL hunt | `/flagstone/privacy/`, `/support/`, `/accessibility/`, `/terms/` are canonical current URLs and returned 200 | Domain/path changes or final source points elsewhere; content still needs AS-BLOCK-001 closure |
| Bundle identifier source | `com.accessmap.app` from `app.json` | Final source or ASC mapping differs, which is a stop condition |
| App name/source version | Flagstone; preparatory version 4.1.1 | Exact final SHA/build changes version/name |
| iPhone-only setting | `supportsTablet: false`; no iPad screenshot set | Final native build/ASC unexpectedly reports iPad support |
| Current screenshot rules | One 6.9-inch set, 1–10, opaque, ASC scales smaller sizes | Apple spec page changes or ASC rejects accepted pixels |
| Metadata limits | Name 30, subtitle 30, promo 170, description 4000, keywords 100 bytes, notes 4000 bytes | Apple reference/ASC changes |
| Privacy source map | Core categories and Nominatim/provider ambiguity are mapped above | Final dependencies/data flow/provider configuration changes |
| Age-rating rationale | Social Media Yes yields expected global 13+; all current categories answered | Product social/UGC/leaderboard/content changes or Apple questionnaire changes |
| Category recommendation | Navigation primary, Utilities secondary | Core purpose changes |
| TestFlight/App Review boundary | EAS/TestFlight upload is not App Review or public release | Apple/Expo official workflow changes or R1 is superseded |
| Historical July blockers | Moderation, iPad, icon alpha, Always location and Sentry claims are superseded where identified | Current final source/build produces new evidence; never copy old status blindly |

## Red / Amber / Green Submission Board

| Board | Item | Current state | Next event |
|---|---|---|---|
| GREEN | App name/bundle/category recommendation | Source-backed | Final SHA/build identity check |
| GREEN | Metadata copy and verified limits | Within current limits | Paste after final SHA recheck |
| GREEN | iPhone-only screenshot requirement | One 6.9-inch class | Confirm final native support |
| GREEN | Core privacy categories/tracking false | Source-backed | Final dependency/provider check |
| GREEN | Expected age-rating rationale | 13+ high confidence | Enter live form and record result |
| GREEN | EAS/TestFlight/App Review boundary | R1 + official docs | Follow runbook only |
| AMBER | Exact final SHA and build | Not yet created/processed | Complete R1 path and identity proof |
| AMBER | Final screenshots | Shot list ready, assets not captured | Capture 3 or 6 from accepted state |
| AMBER | Reviewer/main deletion accounts | Checklist ready, health unproved | Verify day of submission |
| AMBER | Accessibility labels | Evidence matrix ready, none declarable | Prompt C + final device proof |
| AMBER | D8 EXIF/GPS | Source fail-closed; device proof pending | Final real-device stored-object test |
| AMBER | Privacy provider-log categories | Core sheet ready, partner bundle unresolved | Privacy-owner/provider confirmation |
| AMBER | Export compliance | Exempt-only likely | Exact build/ASC confirmation |
| RED | Public legal/support/marketing/accessibility drift | AS-BLOCK-001 | Publish aligned pages before review |
| RED | Customer Support privacy-manifest type absent | AS-BLOCK-002 | Resolve in accepted source; verify archive privacy report |
| OWNER DECISION | EU/DSA/territories | Options prepared | Choose before Pricing/Availability |
| OWNER DECISION | Copyright legal rights holder | Placeholder only | Enter exact rights holder |
| EXTERNAL PROOF | ASC agreements/roles/app state | Repository cannot prove | Verify submission day |
| EXTERNAL PROOF | Account deletion deployment/completion | Source present, live success unproved | Disposable final-build test |

## App Store Connect Copy/Paste Pack

This is the one-scroll pack. Replace every bracketed placeholder and complete every marked proof before clicking Add for Review.

### APP NAME

```text
Flagstone
```

### SUBTITLE

```text
Map accessibility barriers
```

### PROMOTIONAL TEXT

```text
Find accessibility barriers on a community map, understand their impact, and add a report without creating an account.
```

### DESCRIPTION

```text
Flagstone is a community map for finding and reporting accessibility barriers.

EXPLORE BEFORE YOU ARRIVE
Browse mapped barriers and open a report to see its category, severity, description, status, and available photos. Search and filters help you focus on the places and barrier types that matter to you.

REPORT WHAT YOU FIND
Add a barrier from the map with a location, category, severity, and optional description. You can submit a report without creating an account. Signed-in contributors can also add photos.

FOLLOW COMMUNITY UPDATES
Signed-in members can comment on reports, watch barriers, and help keep status information useful. In-app controls let people report content and block or hide abusive contributors.

USE LOCATION ON YOUR TERMS
Location access is optional for browsing. If you grant foreground location access, Flagstone can show nearby barriers and help place a report. The app does not request background location access.

PRIVACY AND SUPPORT
Flagstone has no advertising or tracking. Privacy, Terms & Community Guidelines, support, and accessibility information are available from the app.
```

### KEYWORDS

```text
wheelchair,mobility,ramp,curb,sidewalk,crossing,washroom,inclusive,community,navigation,access
```

### SUPPORT URL

```text
https://skypistudio.com/flagstone/support/
```

**BLOCKED UNTIL AS-BLOCK-001 CONTENT ALIGNMENT.**

### PRIVACY POLICY URL

```text
https://skypistudio.com/flagstone/privacy/
```

**BLOCKED UNTIL AS-BLOCK-001 CONTENT ALIGNMENT.**

### MARKETING URL / NONE

```text
NONE FOR V1
```

### COPYRIGHT

```text
2026 [RIGHTS-HOLDER LEGAL NAME]
```

### PRIMARY CATEGORY

```text
Navigation
```

### SECONDARY CATEGORY

```text
Utilities
```

### CONTENT RIGHTS

```text
Yes — the app contains, shows, or accesses third-party content, and the owner confirms the necessary rights or permissions.
```

**EXTERNAL PROOF:** OSM attribution/licensing and all seeded/user media rights.

### AGE RATING ANSWERS

```text
Parental Controls: No
Age Assurance: No
Unrestricted Web Access: No
User-Generated Content: Yes
Social Media: Yes
Social Media Disabled for Users Under 13: No
Messaging and Chat: Yes
Advertising: No
Profanity or Crude Humor: Infrequent
Horror/Fear Themes: None
Alcohol, Tobacco, or Drug Use/References: None
Medical or Treatment Information: None
Health or Wellness Topics: None
Mature or Suggestive Themes: None
Sexual Content or Nudity: None
Graphic Sexual Content and Nudity: None
Cartoon or Fantasy Violence: None
Realistic Violence: None
Prolonged Graphic or Sadistic Realistic Violence: None
Guns or Other Weapons: None
Gambling: No
Simulated Gambling: None
Contests: Infrequent
Loot Boxes: No
Made for Kids / Override: Not Applicable
Age Suitability URL: None
Expected global result: 13+
```

### PRIVACY LABEL ANSWERS

```text
Data Collected: Yes
Tracking: No

Precise Location — Collected: Yes; Linked: Yes; Tracking: No; Purpose: App Functionality
Email Address — Collected: Yes; Linked: Yes; Tracking: No; Purpose: App Functionality
Name — Collected: Yes; Linked: Yes; Tracking: No; Purpose: App Functionality
Photos or Videos — Collected: Yes; Linked: Yes; Tracking: No; Purpose: App Functionality
Other User Content — Collected: Yes; Linked: Yes; Tracking: No; Purpose: App Functionality
Customer Support — Collected: Yes; Linked: Yes; Tracking: No; Purpose: App Functionality
User ID — Collected: Yes; Linked: Yes; Tracking: No; Purpose: App Functionality
Device ID — Collected: Yes; Linked: Yes; Tracking: No; Purpose: App Functionality

Other Contact Info — Not Collected
Crash Data — Not Collected
Performance Data — Not Collected
Other Data — Not Collected

UNRESOLVED PROVIDER BUNDLE — OWNER / PRIVACY FINAL DECISION REQUIRED:
Search History; Coarse Location; Product Interaction; Other Usage Data; Other Diagnostic Data.
Confirm Nominatim/Supabase/Expo retained request/IP/log practices. If selected, use No Tracking and the confirmed App Functionality/Analytics purposes; conservatively mark Linked unless evidence proves de-identification before collection and no re-linkage.
```

**AS-BLOCK-002:** do not publish this label or submit the final binary until Customer Support is also present in the accepted source's generated privacy report (or the privacy owner has documented how every Apple optional-disclosure criterion is met).

### ACCESSIBILITY DECLARATIONS — PENDING FINAL PROOF

```text
VoiceOver — PENDING EXACT-BUILD COMMON-TASK DEVICE PROOF
Voice Control — PENDING EXACT-BUILD COMMON-TASK DEVICE PROOF
Larger Text — PENDING ACCESSIBILITY XXXL COMMON-TASK DEVICE PROOF
Dark Interface — PENDING LIGHT/DARK COMMON-TASK DEVICE PROOF
Differentiate Without Color Alone — PENDING FINAL VISUAL/DEVICE PROOF
Sufficient Contrast — PENDING FINAL MEASUREMENT/DEVICE PROOF
Reduced Motion — PENDING REDUCE MOTION COMMON-TASK DEVICE PROOF
Captions — NOT APPLICABLE; DO NOT DECLARE
Audio Descriptions — NOT APPLICABLE; DO NOT DECLARE
Accessibility URL — LEAVE BLANK UNTIL CLAIMS AND PROOF ALIGN
```

### APP REVIEW NOTES

```text
Flagstone is a community map of accessibility barriers. The backend services needed for review are enabled.

GUEST PATH
1. On the opening sign-in screen, tap “Browse without an account.”
2. Open the Home tab to browse the accessibility map. Tap any visible marker to open its barrier detail, including category, severity, status, description, and any available photos.
3. To exercise guest reporting, close the detail, centre the map on the intended location, tap the + button at the lower right, complete the “Report anonymously” form, and tap “Submit anonymously.” An account is not required for this flow.

REVIEW ACCOUNT
Use the non-expiring credentials entered in the App Review Information username and password fields. From a guest session, open Profile and tap “Sign in.” After sign-in, open a barrier detail and use the Comments section to exercise a login-gated feature.

UGC CONTROLS
In a barrier detail, use “Report this barrier” near the bottom. On another user’s comment, the comment actions expose Report and Hide; an identifiable author also exposes Block. Blocking/hiding is intentionally device-local in this version. Prohibited terms are checked when user content is submitted.

ACCOUNT DELETION
For a signed-in account, open Profile, scroll to the bottom, and tap “Delete Account.” Confirmation permanently starts an asynchronous full-account deletion request and signs the account out. The app retains an on-device receipt and exposes deletion status/completion. Please do not complete deletion with the primary reviewer account. If end-to-end deletion is required, use the separate disposable credentials listed below only after we have supplied them.

LEGAL, ACCESSIBILITY, AND SUPPORT
Open the menu, then Settings. “Privacy Policy” and “Terms & Community Guidelines” open in-app. Settings > About Flagstone contains the public Accessibility and Support links.

Location permission is optional for browsing and may be denied. Flagstone requests foreground location only. Push notifications are optional and are not needed for review.

DISPOSABLE DELETION TEST EMAIL: [ENTER IN ASC NOTES ONLY IF VERIFIED]
DISPOSABLE DELETION TEST PASSWORD: [ENTER IN ASC NOTES ONLY IF VERIFIED]
```

### REVIEWER CREDENTIAL PLACEHOLDERS

```text
SIGN-IN REQUIRED: YES — guest path exists, but credentials are required for full-feature review
REVIEWER EMAIL: [ENTER IN APP STORE CONNECT ONLY]
REVIEWER PASSWORD: [ENTER IN APP STORE CONNECT ONLY]
REVIEW CONTACT NAME: [ENTER IN APP STORE CONNECT ONLY]
REVIEW CONTACT EMAIL: [ENTER IN APP STORE CONNECT ONLY]
REVIEW CONTACT PHONE: [ENTER IN APP STORE CONNECT ONLY, INTERNATIONAL FORMAT]
```

**NEVER COMMIT REVIEWER CREDENTIALS.**

### EXPORT COMPLIANCE

```text
Final binary uses standard/exempt HTTPS/TLS and system/published-standard security libraries only; no proprietary or non-standard encryption is evidenced. ITSAppUsesNonExemptEncryption = NO is expected. No export document expected, subject to exact-build/ASC confirmation.
```

### EU / AVAILABILITY

```text
[OWNER SELECT]
OPTION A — EU included; complete and verify correct trader/non-trader status and, if trader, public address/phone/email.
OPTION B — EU excluded for V1; still declare DSA status and deselect all EU-27 territories.

Price: Free
Distribution: Public App Store
```

### RELEASE OPTION

```text
Version Release: Manual
Phased Release: Off / Not Applicable for first public version
App Previews: None
```

### SCREENSHOT ORDER

```text
Required device/display class: iPhone 6.9-inch only
Recommended output: portrait 1320×2868, opaque PNG/JPEG

FAST SET (3)
1. Map overview — “See accessibility barriers nearby”
2. Barrier detail — “Understand each barrier before you arrive”
3. Anonymous report — “Report a barrier in a few clear steps”

STRONG SET (6)
4. Nearby/discovery or Tasks — “Find the barriers that matter to you”
5. Community detail/comments — “Learn from community updates”
6. Profile contributions — “Keep track of what you’ve mapped”
```

## Future Retrieval

Branch: `codex/sol-appstore-submission-dossier-20260830`

Report: `qa-reports/2026-08-30_Sol_AppStore_Submission_Dossier.md`

Retrieve without relying on a local checkout:

```bash
git fetch origin --prune
git show origin/codex/sol-appstore-submission-dossier-20260830:qa-reports/2026-08-30_Sol_AppStore_Submission_Dossier.md
```

At use time, record the exact remote branch SHA, the exact accepted product SHA, and the exact TestFlight version/build in the release evidence. This report's preparatory SHA must never be substituted for the eventual release candidate.
