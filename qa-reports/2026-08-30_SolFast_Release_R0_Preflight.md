# Flagstone Release R0 Stable Preflight

## Audited Source

| Item | Verified value |
|---|---|
| Repository | `Skypie99/AccessMap` |
| Required source branch | `claude/ui-polish-fix4b-sheet-scroll-hardening-20260829` |
| Branch resolution after fetch | `2762a5447600e8de55be912ccb26e95456484945` |
| Audited detached source | `2762a5447600e8de55be912ccb26e95456484945` |
| Audit date | 2026-08-30 |
| Scope | Stable release/configuration truth only; no final release acceptance |

The source branch and audited checkout resolved to the required SHA exactly. No prebuild, CocoaPods, native build, EAS build/submit, deployment, App Store Connect mutation, GitHub-settings mutation, or product change was performed.

## Executive Summary

Two structural defects make the current GitHub TestFlight workflow unsafe for a final release:

1. **BLOCKER NOW:** `.github/workflows/eas-testflight-submit.yml` does not offer the `testflight` profile. Its default and three of its four choices (`preview`, `preview2`, `preview3`) are internal-distribution builds, yet every successful build proceeds to the App Store submit step.
2. **BLOCKER NOW:** the workflow submits `--latest`, which means “latest iOS build” rather than “the build created by this workflow run.” It does not bind source SHA, EAS build ID, and submitted build. A concurrent or intervening build can change the selected artifact. The two npm deploy scripts repeat this defect.

The stable source-controlled release configuration is otherwise coherent: Flagstone name, Expo project, bundle ID, URL scheme, iPhone-only declaration, old architecture, store-capable `testflight`/`production` profiles, When-In-Use-only location configuration, explicit camera/photo strings, microphone disabled, encryption declaration, populated privacy manifest, and source asset paths are present.

No source finding proves the generated archive, remote EAS build number, production environment values, signing state, App Store Connect record, TestFlight processing, or GitHub environment protection. Those remain **RECHECK FINAL SHA** or **EXTERNAL / HUMAN PROOF REQUIRED**, not inferred blockers.

The recommended future path is the GitHub TestFlight workflow **after** it is narrowed to the `testflight` store profile, bound to the exact accepted SHA, and changed from `--latest` to exact build correlation (preferably EAS build auto-submit coupling with recorded build/submission IDs, or an explicit captured build ID passed to `eas submit --id`).

## Canonical Release Source Map

| Topic | Authoritative file | Current value / behavior | Class | Final action |
|---|---|---|---|---|
| App/display name | `app.json` → `expo.name` | `Flagstone` | STABLE PASS — PRESERVE | Reconfirm only if `app.json` changes. |
| Expo slug | `app.json` → `expo.slug` | `accessmap` | STABLE PASS — PRESERVE | Preserve unless an intentional EAS-project migration occurs. |
| Expo project ID | `app.json` → `expo.extra.eas.projectId` | `a7149107-fb9b-4853-a053-648320c05cb6` | STABLE PASS — PRESERVE | Match the final EAS build record to this project. |
| iOS bundle ID | `app.json` → `expo.ios.bundleIdentifier` | `com.accessmap.app` | STABLE PASS — PRESERVE | Match the generated archive and App Store Connect record. |
| URL scheme | `app.json` → `expo.scheme` | `accessmap` | STABLE PASS — PRESERVE | Verify generated URL types in final native archive if deep links are release-critical. |
| User-visible version | `app.json` → `expo.version` | `4.1.1` | RECHECK FINAL SHA | Capture from final source and EAS/TestFlight records. |
| Source iOS build number | `app.json` → `expo.ios.buildNumber` | `15`; not authoritative for remote-managed EAS store builds | RECHECK FINAL SHA | Record source value, then capture the actual remote-assigned build number. |
| Tablet support | `app.json` → `expo.ios.supportsTablet` | `false` | STABLE PASS — PRESERVE | Confirm generated target remains iPhone-only. |
| Architecture flag | `app.json` → `expo.newArchEnabled` | `false` | STABLE PASS — PRESERVE | Do not enable without an intentional native-validation cycle. |
| TestFlight EAS profile | `eas.json` → `build.testflight` | Store distribution; production environment; Release; production `APP_ENV`; auto-increment | STABLE PASS — PRESERVE | Use this profile for the final TestFlight candidate. |
| Production EAS profile | `eas.json` → `build.production` | Store distribution; production environment; production `APP_ENV`; auto-increment | STABLE PASS — PRESERVE | Reserve for an intentional App Store production build. |
| Production environment selection | `eas.json` | Both store profiles set `environment: production` and `APP_ENV: production` | STABLE PASS — PRESERVE | Prove required named variables exist in the EAS production environment. |
| App Store Connect app ID | `eas.json` → `submit.production.ios.ascAppId` | `6774709116` | STABLE PASS — PRESERVE | Prove external record exists and matches the bundle ID. |
| Apple team | `app.json`; `eas.json` | `S78F8ZA8QU` | STABLE PASS — PRESERVE | Prove signing assets/ASC membership externally. |
| Submit identity | `eas.json` → `submit.production.ios.appleId` | Present; value intentionally not repeated in this report | STABLE PASS — PRESERVE | Verify authentication without exposing the value. |
| Build scripts | `package.json` | Separate `build:testflight` and `build:production` use the corresponding EAS profiles | STABLE PASS — PRESERVE | Safe for building only; capture the resulting build ID. |
| Deploy scripts | `package.json` | Build, then submit `--latest` | BLOCKER NOW | Do not use for final release until exact build binding replaces `--latest`. |

## Version / Build Provenance

1. **Which value controls the shipped iOS version?**
   - `app.json` `expo.version` controls the user-visible iOS marketing version (`CFBundleShortVersionString`) in this Expo/CNG project.
   - `package.json` `version` is not the shipped iOS version controller. It currently matches `app.json` at `4.1.1`, which is useful human coherence but not native provenance.
   - Class: **RECHECK FINAL SHA**.

2. **Which value controls the EAS iOS build number?**
   - `eas.json` sets `cli.appVersionSource: remote` and both store profiles set `autoIncrement: true`.
   - EAS remote state therefore owns the developer-facing build number used by a final EAS store build. `app.json` build number `15` is a local seed/reference, not proof of the final archive's build number.
   - Expo's current primary documentation confirms that remote version source stores `ios.buildNumber` on EAS servers and auto-increments it there: <https://docs.expo.dev/build-reference/app-versions/>.
   - Class: **EXTERNAL / HUMAN PROOF REQUIRED**.

3. **Can `package.json` and `app.json` drift without breaking build provenance?**
   - Yes. EAS/Expo can build using `app.json` even when `package.json.version` differs. Such drift does not necessarily break the binary, but it makes release notes, tags, tooling, and human provenance ambiguous.
   - They match at this audited SHA.
   - Class: **STABLE PASS — PRESERVE**.

4. **Does remote `appVersionSource` create a final verification requirement?**
   - Yes. Source alone cannot state the actual EAS/TestFlight build number. The final worker must capture it from the completed EAS build and correlate it to TestFlight.
   - Class: **RECHECK FINAL SHA**.

5. **Minimum post-build provenance record**

| Required fact | Proof source | Class |
|---|---|---|
| Final source SHA | GitHub workflow run `GITHUB_SHA` plus checked-out `git rev-parse HEAD` | RECHECK FINAL SHA |
| App version | Final `app.json`, EAS build metadata, and TestFlight build record | RECHECK FINAL SHA |
| Build number | EAS build metadata and processed TestFlight build | EXTERNAL / HUMAN PROOF REQUIRED |
| EAS build ID | EAS build result/details | EXTERNAL / HUMAN PROOF REQUIRED |
| Submitted TestFlight build | EAS submission record plus App Store Connect/TestFlight | EXTERNAL / HUMAN PROOF REQUIRED |

The current `docs/RELEASE_PLAYBOOK.md` claim that remote auto-increment edits and commits `app.json` is stale. With `appVersionSource: remote`, the authoritative build number lives on EAS servers.

## iOS Permissions / Privacy Source

| Field | File | Current declaration | Expected product use | Class | Final native proof |
|---|---|---|---|---|---|
| `NSLocationWhenInUseUsageDescription` | `app.json` `ios.infoPlist`; `expo-location` plugin | Present and byte-aligned in both locations | Nearby flags and report location | STABLE PASS — PRESERVE | Inspect final archive `Info.plist`; exercise first-use prompt. |
| Always-location descriptions | `app.json` | No Always key in `infoPlist`; both plugin Always variants are `false` | No background/Always location feature | STABLE PASS — PRESERVE | Confirm final archive lacks `NSLocationAlwaysUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription`. |
| `NSCameraUsageDescription` | `app.json` `ios.infoPlist`; image-picker plugin | Present and aligned | Capture barrier photos | STABLE PASS — PRESERVE | Inspect final `Info.plist`; exercise camera prompt. |
| `NSPhotoLibraryUsageDescription` | `app.json` `ios.infoPlist`; image-picker plugin | Present and aligned | Select report photos | STABLE PASS — PRESERVE | Inspect final `Info.plist`; exercise library prompt. |
| Microphone | `app.json` image-picker plugin | `microphonePermission: false`; no microphone purpose string in `infoPlist` | No audio capture feature | STABLE PASS — PRESERVE | Confirm final `Info.plist` has no microphone purpose key and archive has no unintended audio capability. |
| Encryption | `app.json` `ios.infoPlist` | `ITSAppUsesNonExemptEncryption: false` | Standard HTTPS/TLS only | STABLE PASS — PRESERVE | Confirm final `Info.plist` value and App Store export-compliance answer. |
| Tracking | `app.json` privacy manifest | `NSPrivacyTracking: false`; domains empty | No ads/analytics/tracking package is present | STABLE PASS — PRESERVE | Inspect final aggregated `PrivacyInfo.xcprivacy`; reconcile App Store privacy answers. |
| Collected data | `app.json` privacy manifest | Seven linked, non-tracking, app-functionality categories | Location, account/profile, photos, reports/comments, auth ID, push/device token | STABLE PASS — PRESERVE | Inspect final aggregated manifest and App Store privacy labels. |
| Required-reason APIs | `app.json` privacy manifest | UserDefaults `CA92.1`; file timestamp `C617.1`; disk space `E174.1`; boot time `35F9.1` | Framework/storage/file/cache operation | STABLE PASS — PRESERVE | Inspect archive aggregation and upload diagnostics. |

All generated/native assertions are **RECHECK FINAL SHA** even where source configuration is a stable pass. This audit deliberately did not run prebuild.

## Privacy Manifest Sanity

| Category | Obvious source/product use | Sanity result | Class |
|---|---|---|---|
| Precise location | Map proximity, report coordinates, and public flag location | Declared and product-consistent | STABLE PASS — PRESERVE |
| Email address | Supabase email authentication | Declared and product-consistent | STABLE PASS — PRESERVE |
| Name | User display name/profile/leaderboard | Declared and product-consistent | STABLE PASS — PRESERVE |
| Photos/videos | Optional report photos and profile imagery | Declared and product-consistent | STABLE PASS — PRESERVE |
| Other user content | Report descriptions, comments, and content reports | Declared and product-consistent | STABLE PASS — PRESERVE |
| User ID | Supabase/auth row ownership and linked contributions | Declared and product-consistent | STABLE PASS — PRESERVE |
| Device ID | Push-token/device delivery registration | Plausibly and conservatively declared | STABLE PASS — PRESERVE |

No obviously unused declared category or obviously missing collected category was found in this narrow source sanity pass. No analytics, advertising, tracking, Sentry package/plugin, diagnostics collector, or usage-data collector is present in `package.json`, `app.json`, or active `src/` code. `NSPrivacyTracking: false` is consistent with that source.

The `testflight`/preview profiles retain `SENTRY_DISABLE_AUTO_UPLOAD: true`, while `production` omits it. This has no current release effect because Sentry is absent. If Sentry or another telemetry package appears before release, data categories, tracking, permissions, DSN/env state, and upload behavior become **RECHECK FINAL SHA**.

App Store Connect privacy labels and actual runtime/network behavior remain **EXTERNAL / HUMAN PROOF REQUIRED**.

## EAS Profile Truth

| Profile | Distribution | EAS environment | `APP_ENV` | Auto-increment | iOS config | Development client? | App-store suitable? | Class |
|---|---|---|---|---|---|---|---|---|
| `development` | internal | Not explicitly selected | development | Not set | physical device (`simulator: false`) | Yes | No | STABLE PASS — PRESERVE |
| `preview` | internal | Not explicitly selected | preview | true | physical device (`simulator: false`) | No | No | STABLE PASS — PRESERVE |
| `preview2` | internal via `extends: preview` | Not explicitly selected | preview2 | true inherited | physical device inherited | No | No | STABLE PASS — PRESERVE |
| `preview3` | internal via `extends: preview` | Not explicitly selected | preview3 | true inherited | physical device inherited | No | No | STABLE PASS — PRESERVE |
| `testflight` | store | production | production | true | Release; non-simulator | No | Yes | STABLE PASS — PRESERVE |
| `production` | store | production | production | true | non-simulator; store profile uses release signing/configuration | No | Yes | STABLE PASS — PRESERVE |

Targeted source search found no active code reading `APP_ENV`; it currently labels builds but does not switch backend/config behavior. The actual backend is injected through `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; `src/lib/supabase.ts` fails immediately if either is missing. No hard-coded staging/test backend URL was found in production code.

Neither store profile can inherit `developmentClient: true`; they are independent profiles. Store signing, production EAS environment values, and remote version state remain **EXTERNAL / HUMAN PROOF REQUIRED**.

Because the internal preview profiles also enable `autoIncrement` while the project uses remote version state, non-release builds can advance the remote iOS counter. That is not a blocker; it is another reason the final build number must be captured from the completed EAS build rather than predicted from `app.json`. Class: **EXTERNAL / HUMAN PROOF REQUIRED**.

## TestFlight Workflow Provenance

Current trace:

1. `workflow_dispatch` is manual and offers `preview`, `preview2`, `preview3`, `production`; default is `preview`. It does **not** offer `testflight`.
2. The operator-selected GitHub ref becomes the workflow run ref/SHA. `actions/checkout@v4` has no override and checks out the run's selected ref.
3. The workflow does not assert that checked-out SHA equals an approved release SHA and does not write a provenance record.
4. Typecheck and Jest run.
5. EAS builds the selected profile and waits under normal CLI behavior.
6. The submit step always runs after a successful build and executes `eas submit --platform ios --profile production --latest --non-interactive`.
7. `--profile production` chooses the **submit profile** (credentials/app identifiers); it does not bind selection to the `production` build profile.
8. `--latest` selects the latest iOS build known to the EAS project. Expo's CLI reference provides `--id` for exact selection and describes `--latest` only as “Submit the latest build for specified platform”: <https://docs.expo.dev/eas/cli/>.

Answers to the required challenges:

1. **Does `--latest` provably submit the build created by this workflow run?** No. Class: **BLOCKER NOW**.
2. **Could an older/newer unrelated build become latest?** Yes. A concurrent/intervening build can become latest; an internal-profile run may also leave the eligible-selection behavior dependent on EAS rather than this workflow's build ID. Class: **BLOCKER NOW**.
3. **What happens by input?**
   - `preview`, `preview2`, `preview3`: build an internal-distribution IPA, then reach the submit step. That IPA is not App Store-signed. The step may fail on that artifact or select some other latest build; neither outcome is release-safe. Class: **BLOCKER NOW**.
   - `production`: builds a store artifact, then submits whichever iOS build is latest at submit time. It is still unbound. Class: **BLOCKER NOW**.
4. **Can a non-store/internal build reach submit?** Yes, by three explicitly allowed inputs and the default. Class: **BLOCKER NOW**.
5. **Does the workflow bind source SHA → build ID → submitted build?** No. GitHub records a run SHA and EAS records build metadata, but the workflow neither asserts/captures the mapping nor selects submission by ID. Class: **BLOCKER NOW**.
6. **Release classification:** the workflow must not be used for final release until corrected. This is not merely a final-SHA uncertainty; it is a stable structural defect. Class: **BLOCKER NOW**.
7. **Smallest safe correction pattern:** restrict the workflow to `testflight`, assert/record the approved checkout SHA, and replace the detached submit step with exact EAS correlation. The smallest native coupling is `eas build ... --profile testflight --auto-submit-with-profile production`, which Expo documents as passing that completed build directly to EAS Submit: <https://docs.expo.dev/build/automate-submissions/>. Record the emitted EAS build and submission IDs. An equally explicit alternative is to capture the build ID and submit `eas submit --id <that-id> --profile production`; never rediscover it with `--latest`.

## Release Approval Gate

| Question | Evidence | Class | Final proof |
|---|---|---|---|
| Workflow references `release-approval` | `environment: release-approval` in the only release job | STABLE PASS — PRESERVE | Keep the job-level reference. |
| Environment exists | Not source-controlled | EXTERNAL / HUMAN PROOF REQUIRED | Repository Settings → Environments → `release-approval`; capture screen/state. |
| Required reviewer configured | Not source-controlled | EXTERNAL / HUMAN PROOF REQUIRED | In that environment, prove protection rule lists the intended reviewer and that a test run pauses for approval. |
| Secrets are scoped/available | Names referenced only; values/state not source-controlled | EXTERNAL / HUMAN PROOF REQUIRED | Confirm required names exist and a dry/non-release credential check succeeds without logging values. |

The shortest persuasive proof is: show the environment page with the reviewer rule, then dispatch a harmless run that visibly enters “Waiting for approval” before any build step. Do not infer reviewer protection from comments in the YAML.

## Development Build Workflow

`.github/workflows/eas-build.yml` is dispatch-only, has no push/tag trigger, exposes only `development`, `preview`, `preview2`, and `preview3`, runs typecheck/tests, and contains a redundant production guard. A production choice is not present.

When `EAS_TOKEN` is absent, the EAS build step is skipped and the workflow emits an informational message; the job can still be green. That is potentially confusing for development evidence but cannot make this workflow submit or produce a production release.

Conclusion: it cannot accidentally become the current production submission path. Class: **STABLE PASS — PRESERVE**.

## NPM Release Scripts

| Script | Behavior | Assessment | Class |
|---|---|---|---|
| `build:testflight` | EAS store build with `testflight` profile | Safe build entrypoint; does not itself submit | STABLE PASS — PRESERVE |
| `build:production` | EAS store build with `production` profile | Safe build entrypoint; does not itself submit | STABLE PASS — PRESERVE |
| `deploy:testflight` | Builds `testflight`, then submits `production --latest` | Risky for final release; no exact build binding | BLOCKER NOW |
| `deploy:appstore` | Builds `production`, then submits `production --latest` | Risky for final release; no exact build binding | BLOCKER NOW |

The existing `releaseScripts.guard.test.ts` proves that deploy scripts use a real submit profile and chain a store-distribution build. It does not prove build/submission identity and therefore does not close the `--latest` race.

## Dev / Debug Leakage

| File/result | Behavior | Can reach production profile? | Class |
|---|---|---|---|
| `eas.json` `developmentClient` | True only in `development`; store profiles do not extend it | No by current profile graph | STABLE PASS — PRESERVE |
| `APP_ENV` | Set per profile; no active source reader found | Value is present, but currently no behavior switches on it | STABLE PASS — PRESERVE |
| Supabase URL/key | Read only from `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`; missing values throw | Yes, injected externally | EXTERNAL / HUMAN PROOF REQUIRED |
| `localhost` / `127.0.0.1` | Found in Jest setup/tests, Lighthouse config, docs, and historical comments; no production backend constant | No source route found | STABLE PASS — PRESERVE |
| Expo Go assumptions | Documentation/test material only; no production profile dependency found | No | STABLE PASS — PRESERVE |
| Sentry flag difference | `testflight` disables auto-upload; `production` does not; Sentry package/plugin/runtime is absent | No current effect | STABLE PASS — PRESERVE |
| Placeholder release IDs | Android service-account path remains a TODO, but this audit/release path is iOS | No iOS effect | STABLE PASS — PRESERVE |

Final worker must re-run the targeted scan if `app.json`, `eas.json`, `package.json`, native plugins, or environment-loading code changes. Class: **RECHECK FINAL SHA**.

## Assets / Legal References

| Reference | Source | Source reference valid | File exists | External proof | Class |
|---|---|---|---|---|---|
| App icon | `app.json` → `./assets/brand/app-icon.png` | Yes | Yes; 1024×1024/no-alpha invariant is guarded in `appConfig.guard.test.ts` | Archive/App Store processing still required | STABLE PASS — PRESERVE |
| Splash image | `app.json` → same app icon | Yes | Yes | Final launch appearance not assessed | STABLE PASS — PRESERVE |
| Web favicon | `app.json` → `./assets/favicon.png` | Yes | Yes | Web quality not assessed | STABLE PASS — PRESERVE |
| Privacy policy | `app.json`; `src/lib/links.ts` | Both point to `https://skypistudio.com/flagstone/privacy/` | N/A | HTTP content and App Store metadata | EXTERNAL / HUMAN PROOF REQUIRED |
| Support | `src/lib/links.ts` | `https://skypistudio.com/flagstone/support/` | N/A | HTTP content and App Store Support URL | EXTERNAL / HUMAN PROOF REQUIRED |
| Accessibility statement | `src/lib/links.ts` | `https://skypistudio.com/flagstone/accessibility/` | N/A | HTTP content | EXTERNAL / HUMAN PROOF REQUIRED |
| Terms | `src/screens/TermsScreen.tsx`; `src/lib/copy.ts` | In-app terms are source-controlled; no canonical external terms URL is referenced | In-app source exists | App Store EULA/metadata choice if applicable | UNKNOWN |
| Support identity | `src/lib/feedback.ts`; legal copy | `support@skypistudio.com` | N/A | Mail delivery/ownership | EXTERNAL / HUMAN PROOF REQUIRED |

Historical references to `https://skypie99.github.io/AccessMap/privacy/` are not current release truth.

## Stale Documentation Reconciliation

### `APP_STORE_TODO.md`

| Claim | Current source / verified truth | Status |
|---|---|---|
| Audited `main` was `9964f8f` and only user work remained | This audit is at `2762a544...`; extensive later code/config exists | STALE |
| Reviewer email/password are plaintext in `docs/APP_STORE_REVIEWER_NOTES.md` | Both fields are redacted placeholders and guarded by `noCredentialsInTree.guard.test.ts` | SUPERSEDED |
| Anonymous reports bypass the blocked-term filter | `createAnonFlag` calls `containsBlockedTerm` | SUPERSEDED |
| Terms say deletion is in Settings | Current legal copy says Profile | SUPERSEDED |
| `app.json` is `3.0.0`, `package.json` is `0.2.0` | Both are `4.1.1` | STALE |
| No binary-launch evidence has ever existed | Repository history docs record installed EAS preview build `2e91ae9b` with sign-in/map checks | SUPERSEDED |
| Local simulator builds are broken by fmt/Xcode | Source now includes `./plugins/withFmtXcode26Fix`; source alone cannot prove current simulator status | NEEDS EXTERNAL PROOF |
| Current privacy URL is GitHub Pages | Canonical source URL is `https://skypistudio.com/flagstone/privacy/` | STALE |
| Admin renders for nobody due missing `is_admin` SELECT | Managed migration `20260818211920...` adds the column grant and documents production parity | SUPERSEDED |
| First EAS/TestFlight build is the next hinge | A preview build is historical source truth; current final store/TestFlight availability is not source-proven | NEEDS EXTERNAL PROOF |
| App Store forms/reviewer credentials remain | Source cannot prove App Store UI/reviewer credential state | NEEDS EXTERNAL PROOF |

### `RELEASE_READINESS.md`

| Claim | Current source / verified truth | Status |
|---|---|---|
| Version is `1.0.0` | `app.json` and `package.json` are `4.1.1` | STALE |
| EAS Build runs on every push | `eas-build.yml` is dispatch-only | STALE |
| Only development/preview/production profiles exist | Six build profiles exist, including `testflight`, `preview2`, `preview3` | STALE |
| Create EAS account/app record and populate TODO identifiers | Real project, team, bundle, and ASC identifiers are present in source | SUPERSEDED |
| Add four named GitHub secrets including `APPLE_TEAM_ID` | Release workflow references `EXPO_APPLE_TEAM_ID`; secret validity is external | STALE |
| Push any commit to test the development EAS build | No push trigger exists | STALE |
| `npm run deploy:testflight` is the daily release path | It submits `--latest` and is not release-safe | STALE |
| Historical branch must not merge pending credential smoke test | Historical branch/process statement, not current release state | STALE |
| Credentials/setup are complete or incomplete | Source only shows identifiers and secret names, not validity | NEEDS EXTERNAL PROOF |

### Additional release guide conflict

`docs/RELEASE_PLAYBOOK.md` calls itself authoritative but instructs `--latest`, states the old version `0.2.0`, and incorrectly describes remote auto-increment as editing/committing `app.json`. Do not follow its build-selection or build-number provenance statements. Class: **STALE DOCUMENTATION — DO NOT FOLLOW**.

## D8 Historical Gate

Current source establishes:

- `src/lib/flags.ts` implements fail-closed metadata re-encoding/sanitization and post-strip verification.
- Tests cover EXIF-bearing JPEG/PNG and fail-closed upload behavior.
- `docs/TESTFLIGHT_ACTION_ITEMS.md` says D8 implementation exists but real-device verification should back the release confirmation.
- `docs/ROADMAP.md` still has the EXIF GPS leak device test unchecked.
- `PROJECT_STATE.md` is explicitly an archived snapshot and does not provide a current D8 closure record, despite the workflow error message requiring confirmation there.

Therefore:

| Question | Answer | Class |
|---|---|---|
| Is D8 still an active source-code blocker? | The original missing/fail-open implementation is superseded by current fail-closed source and tests | STABLE PASS — PRESERVE |
| Is D8 fully release-closed? | Source cannot prove final-device upload/storage output | EXTERNAL / HUMAN PROOF REQUIRED |
| Is the workflow guard current? | Its wording and `PROJECT_STATE.md` dependency are stale; it accepts an unrecorded typed `yes` | STALE DOCUMENTATION — DO NOT FOLLOW |
| Would final production depend on typing `yes`? | Yes; source cannot justify satisfying it until final-candidate device evidence exists | EXTERNAL / HUMAN PROOF REQUIRED |

Before changing, removing, or satisfying the gate: on a build from the final SHA, upload an EXIF/GPS-bearing photo on a real iPhone, retrieve the stored object, prove metadata/GPS are absent, record the EAS build ID/version/build number/SHA, and obtain privacy/release-owner sign-off. Then replace the free-text historical assertion with a durable evidence reference or remove it only under the release change contract.

## App Store Connect External Proof

### Source-configured

| Identifier | Source value | Class |
|---|---|---|
| Bundle ID | `com.accessmap.app` | STABLE PASS — PRESERVE |
| ASC app ID | `6774709116` | STABLE PASS — PRESERVE |
| Apple team | `S78F8ZA8QU` | STABLE PASS — PRESERVE |
| Submit profile | `submit.production.ios` exists | STABLE PASS — PRESERVE |
| Apple submit identity | Present; not repeated here | STABLE PASS — PRESERVE |

### Not provable from source

- App Store Connect record exists, is accessible, and maps `6774709116` to `com.accessmap.app` and Flagstone.
- Agreements, tax, banking, developer membership, certificates, profiles, and App Store credentials are valid.
- GitHub secrets referenced by the workflow are present and usable: `EAS_TOKEN`, `EXPO_APPLE_ID`, `EXPO_APPLE_PASSWORD`, `EXPO_APPLE_TEAM_ID` (and `APPLE_TEAM_ID` only for the development workflow).
- EAS production environment contains valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` without logging their values.
- App privacy, age rating, export compliance, support/privacy URLs, review notes, reviewer credentials, screenshots, accessibility declarations, and other required forms are complete.
- `release-approval` exists with a required reviewer.
- The exact submitted build is processed and visible in TestFlight.

All items in this subsection are **EXTERNAL / HUMAN PROOF REQUIRED**.

## Findings

| ID | Severity | Class | File / field | Source evidence | Release impact | Smallest future action | Final-SHA dependent | External proof required |
|---|---|---|---|---|---|---|---|---|
| R0-REL-001 | P0 | BLOCKER NOW | `.github/workflows/eas-testflight-submit.yml` submit command | Unconditional `eas submit ... --latest`; no captured build ID | Can submit a build other than the one created/approved by the run | Replace `--latest` with EAS build→submit coupling or exact `--id`; record build/submission IDs | NO | NO |
| R0-REL-002 | P0 | BLOCKER NOW | Same workflow `profile` input | Default `preview`; choices omit `testflight` and include three internal profiles; all reach submit | Named TestFlight path cannot build the intended TestFlight profile and can attempt to submit internal artifacts | Restrict to `testflight` (or split deliberate production path) before submission | NO | NO |
| R0-REL-003 | P1 | BLOCKER NOW | `package.json` deploy scripts | Both build then `eas submit ... --latest` | Same artifact-selection race outside GitHub workflow | Do not use; replace latest with exact correlation | NO | NO |
| R0-REL-004 | P1 | EXTERNAL / HUMAN PROOF REQUIRED | GitHub `release-approval` | YAML reference exists; environment/reviewer state is not source-controlled | Run may have no meaningful human approval protection | Prove environment, reviewer rule, and actual pending-approval behavior | NO | YES |
| R0-REL-005 | P1 | EXTERNAL / HUMAN PROOF REQUIRED | D8 release gate | Fail-closed source/tests exist; real-device final-archive proof and current closure record do not | Free-text `yes` can become ceremony without evidence | Capture final-SHA EXIF/GPS storage proof and bind gate/sign-off to it | YES | YES |
| R0-REL-006 | P1 | EXTERNAL / HUMAN PROOF REQUIRED | EAS/Apple external state | Remote build version, environment values, signing, ASC record/forms not in source | Build can fail, launch without required backend config, or fail processing | Run the compact external proof checklist without exposing values | YES | YES |
| R0-REL-007 | P1 | STALE DOCUMENTATION — DO NOT FOLLOW | `docs/RELEASE_PLAYBOOK.md` | Uses `--latest`; old version; wrong remote-version provenance | “Authoritative” guide can recreate the proven workflow defect | Supersede in future release-doc work; do not use for R0 execution | NO | NO |
| R0-REL-008 | P2 | STALE DOCUMENTATION — DO NOT FOLLOW | `APP_STORE_TODO.md`, `RELEASE_READINESS.md` | Numerous version, trigger, URL, credential, first-build, filter, terms, and admin claims conflict with current source | Wastes final worker time and can route them to wrong URLs/commands | Use this report/current source; reconcile docs separately after release-path decisions | NO | PARTIAL |
| R0-REL-009 | P2 | RECHECK FINAL SHA | Generated Info.plist/privacy manifest/entitlements | Source config is coherent, but no prebuild/archive was generated | Archive can differ through plugin/native aggregation | Inspect final archive and processed build | YES | YES |
| R0-REL-010 | P2 | RECHECK FINAL SHA | Sentry/telemetry configuration | Production omits disable flag, but Sentry is absent now | Harmless now; changes if telemetry returns | Re-run package/plugin/privacy scan at final SHA | YES | NO |

## Stable Passes — Preserve

- App name `Flagstone`, bundle ID `com.accessmap.app`, scheme `accessmap`, EAS project ID, Apple team ID, and ASC app ID are present in canonical source.
- `app.json` and `package.json` currently agree on version `4.1.1`.
- `supportsTablet: false` and `newArchEnabled: false` are explicit.
- `testflight` and `production` are store-distribution profiles with production environment/`APP_ENV`, auto-increment, and non-simulator iOS configuration; `testflight` explicitly uses Release.
- Development workflow is manual, excludes production, and has typecheck/test gates.
- Location is When-In-Use only; Always variants are disabled.
- Camera/photo purpose strings are explicit; microphone is disabled.
- Encryption and privacy-manifest source declarations are populated and guarded.
- App icon/splash/favicon references resolve to tracked files; app icon invariants have a source guard.
- Reviewer note credentials are redacted in the repository.
- Current in-app privacy/support references use `skypistudio.com`, not the old GitHub Pages URL.

## Final-SHA Recheck List

Maximum-value checklist for the final accepted release SHA:

1. Record the exact accepted 40-character SHA, selected workflow ref, clean tree, and `git rev-parse HEAD` equality.
2. Record final `app.json` version, `package.json` mirror, bundle ID, scheme, EAS project ID, team ID, and ASC app ID.
3. Confirm the release job uses only the intended store profile (`testflight` for TestFlight) and `environment: production` / `APP_ENV: production`.
4. Prove EAS production has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` without revealing values.
5. Capture the remote-assigned iOS build number and EAS build ID.
6. Prove EAS build metadata names the exact final Git commit SHA, app version, build number, profile, and project.
7. Inspect generated archive `Info.plist`: When-In-Use/camera/photo present; Always/microphone absent; encryption false.
8. Inspect the final aggregated `PrivacyInfo.xcprivacy` for tracking, seven data categories, and required-reason declarations.
9. Inspect final entitlements/capabilities/signing, including production APNs entitlement where expected and no development-client configuration.
10. Confirm `newArchEnabled: false`, iPhone-only targeting, Release configuration, and no simulator artifact.
11. Re-run the targeted dev/debug/localhost/staging/Sentry/plugin scan against the final SHA.
12. Bind submission to the exact EAS build ID; do not use `--latest`.
13. Capture the EAS submission ID and prove its build ID/version/build number match the approved build.
14. Prove the same version/build appears processed in App Store Connect/TestFlight and retain the build URL/screenshots/log identifiers.
15. HTTP-check canonical privacy/support/accessibility URLs and complete App Store metadata, review credentials, approval gate, and D8 real-device proof.

## Recommended Final Release Path

**Recommendation: A. GitHub TestFlight workflow, after narrow release-path correction.**

Why:

- It is source-controlled and reproducible.
- It already has manual dispatch, CI gates, job-level GitHub environment approval, and least-privilege intent.
- It can expose the exact GitHub run SHA and retain durable logs.
- Fixing one path is safer than relying on local shell state and the risky npm deploy wrappers.

Required fixes before use:

1. Replace profile choices with the intended `testflight` profile for TestFlight; split any later App Store production path rather than mixing internal/store profiles.
2. Assert and record the accepted checkout SHA before dependency install/build.
3. Replace `--latest` with exact build correlation. Prefer EAS `--auto-submit-with-profile production` on the same build command and capture the emitted build/submission IDs, or explicitly capture the build ID and pass it to `eas submit --id`.
4. Replace or remove the unbound D8 free-text gate only after final-SHA real-device evidence is durable and approved.
5. Ensure failure to authenticate/build/submit is a hard workflow failure; never silently treat a skipped release operation as success.

Required human proof:

- `release-approval` exists, requires the intended reviewer, and pauses a test run.
- EAS production variables, Apple/EAS credentials, signing, App Store record/forms, and legal URLs are valid.
- D8 real-device stored-photo proof is attached to the final candidate.

Exact provenance gates:

- Approved SHA = checked-out SHA = EAS build commit SHA.
- EAS build ID is recorded before submission.
- Submitted build ID is the same EAS build ID, not a fresh “latest” lookup.
- EAS version/build equals the processed TestFlight version/build.
- GitHub run, EAS build, EAS submission, and TestFlight record are cross-linked in the handoff.

What not to use:

- Do not use `npm run deploy:testflight` or `npm run deploy:appstore` while they contain `--latest`.
- Do not use the development EAS workflow for release.
- Do not build TestFlight from `preview`, `preview2`, or `preview3`.
- Do not follow `docs/RELEASE_PLAYBOOK.md` or old checklist commands for artifact selection/version provenance.
- Do not use any submission command that rediscovers the artifact by “latest.”

## External / Human Proof Required

- GitHub `release-approval` environment and reviewer protection.
- Required GitHub secret names present/valid; no values disclosed.
- EAS project ownership, production environment variables, remote build number, and build metadata.
- Apple team membership, agreements, certificates, profiles, submit authentication, tax/banking where applicable.
- App Store Connect record/bundle mapping and all required forms/metadata.
- Current reviewer account credentials work and are present only in App Store Connect review notes.
- Generated native `Info.plist`, privacy manifest, entitlements, signing, and APNs capability.
- Real-device D8 EXIF/GPS proof against the final build.
- Canonical legal/support URLs return correct live content.
- Exact build appears and processes in TestFlight with version/build matching the approved EAS build.

## Do Not Redo

Unless the named authoritative source file changes, the final phase should not broadly re-investigate:

- Where app/display name, slug, project ID, bundle ID, scheme, tablet support, architecture flag, version, and source build number live (`app.json`).
- The source shape of When-In-Use-only location, disabled Always-location variants, camera/photo strings, disabled microphone, encryption declaration, and privacy manifest (`app.json`).
- Existence and high-level purpose of the six EAS build profiles (`eas.json`).
- Manual-only/non-production structure of `.github/workflows/eas-build.yml`.
- App icon/splash/favicon source paths and tracked file existence.
- Current canonical in-app privacy/support/accessibility URLs (`src/lib/links.ts`) and support email (`src/lib/feedback.ts`).
- The fact that package version does not control the iOS marketing version.
- The fact that remote EAS state controls the final store build number.
- The `--latest` provenance defect; verify it was corrected rather than re-deriving why it is unsafe.

## R0 Release Input

### BLOCKERS NOW:

- GitHub TestFlight workflow omits `testflight`, defaults to internal `preview`, permits three internal profiles, and always reaches submit.
- GitHub TestFlight workflow submits `--latest` and does not bind SHA → EAS build ID → submitted build.
- Both npm deploy scripts repeat the unbound `--latest` defect.

### FIX BEFORE FINAL RELEASE:

- Narrow GitHub release path to `testflight` and exact accepted SHA.
- Couple build and submit directly or pass an exact captured build ID; record build/submission IDs.
- Bind D8 approval to final-SHA evidence.
- Make release operation failures hard failures.

### STABLE PASSES:

- Canonical iOS identity/config, store profiles, When-In-Use-only permissions, camera/photo strings, disabled microphone/Always location, encryption, privacy manifest, iPhone-only/old-architecture flags, manual dev workflow, and asset references are present.

### STALE DOC CLAIMS — IGNORE:

- Old versions (`0.2.0`, `1.0.0`, `3.0.0`), auto-build-on-push, old GitHub Pages privacy URL, plaintext current reviewer credentials, anonymous-filter gap, Terms deletion-location error, admin-always-broken claim, no-binary-ever claim, app-record TODO, and any instruction to submit `--latest`.

### RECHECK FINAL SHA:

- Exact SHA/ref/clean tree; app version; source config; profile; production env selection; generated `Info.plist`; generated privacy manifest; entitlements/capabilities; no dev client/debug/staging/telemetry leakage; EAS build metadata; legal references.

### EXTERNAL/HUMAN PROOF:

- Remote build number; EAS production variables; EAS build/submission IDs; Apple signing/credentials/record/forms; GitHub approval reviewer; reviewer account; D8 device proof; live URLs; processed TestFlight build.

### RECOMMENDED RELEASE PATH:

- Corrected GitHub TestFlight workflow.

### PROVENANCE REQUIREMENTS:

- Approved SHA = checkout SHA = EAS build SHA.
- Exact EAS build ID selected for submission.
- EAS submission ID maps to that build.
- Version/build match in EAS and TestFlight.
- GitHub run, EAS build, submission, and TestFlight record cross-linked.

### DO NOT REDO:

- Stable source-map, permission/config location, profile existence, dev-workflow structure, asset path, and bundle/project identifier investigations listed above.

### DO NOT TOUCH:

- Product source, config, workflows, tests, package files, native projects, deployments, Supabase, GitHub settings, App Store Connect, secrets, signing, or EAS state during this preparatory task.

### SOURCE STALENESS RULE:

This report audited:

`2762a5447600e8de55be912ccb26e95456484945`

It is preparatory evidence.

Any finding whose source file changes before release must be revalidated.

Every item marked **RECHECK FINAL SHA** must be proven again against the exact accepted release candidate.

## Future Retrieval

```bash
git fetch origin
git show origin/codex/solfast-release-r0-preflight-20260830:qa-reports/2026-08-30_SolFast_Release_R0_Preflight.md
```
