# Flagstone Final Sprint Test Economy V2

## Executive Decision

Flagstone evidence expires when an actual dependency of the proof changes, not merely when the repository SHA changes. The minimum complete path is:

1. finish Prompt A with blob-equivalence inheritance, one integrated-candidate human Legend pull, ActivityFeed traversal, focused guards, and an exact base-versus-candidate red-baseline receipt;
2. execute Prompt B's B2/B2-R contract with one hosted backend change/proof session, one grouped client pass, one exact-candidate CI gate, and one exact-JS iOS acceptance session;
3. execute Prompt C only after B, preserving byte-identical shared accessibility infrastructure and buying new screen-specific Dynamic Type, focus, VoiceOver, and human evidence only where the final source requires it;
4. integrate A + B + C + R1, purchase broad regression and coverage confidence once on the exact final product SHA, and run the focused R1 aggregate guard;
5. close D8 on a physical iPhone against that exact final source and backend before the canonical workflow, because implemented R1 fails closed before it creates an EAS build;
6. run one canonical R1 TestFlight build/auto-submission in the normal case; and
7. perform one short physical TestFlight sitting, then complete external App Store proof.

The requested simple ordering `FINAL PRODUCT SHA -> TESTFLIGHT -> PHYSICAL IPHONE` is not sufficient by itself. R1 commit `32584d34e7591f59ac9011e8ce5ae67158920d80` checks `d8_closed=yes` before build. The coherent ordering is:

```text
FINAL PRODUCT SHA
-> physical final-SHA D8 proof through a provenance-tied compatible shell
-> canonical TestFlight workflow
-> narrow exact-TestFlight physical confirmation
-> App Review
```

If policy still requires a not-yet-created EAS build ID in the pre-dispatch D8 receipt, that is a circular stop condition. This report does not invent a bypass.

Normal-case expensive work remaining:

| Work | Normal case |
|---|---:|
| Broad Jest executions, including coverage and the mandatory R1 workflow run | 5 |
| Coverage-enabled executions | 2 |
| Simulator acceptance sessions | 3 |
| Fresh local `xcodebuild` | 0, if the final fingerprint and installed-shell receipt pass |
| Canonical TestFlight builds | 1 |
| Physical iPhone sessions | 2: pre-dispatch D8, then post-TestFlight |
| Hosted backend mutation/proof sessions | 1 |

The broad-Jest count is five when Prompt A still needs both sides of the same-command comparison: base + candidate, Prompt B required CI, final-product required CI, and the unavoidable plain full Jest inside R1's TestFlight workflow. It drops to four only if one Prompt-A side already has a durable same-command normalized receipt. The two coverage executions are Prompt B required CI and final-product CI. Do not add a separate local coverage run beside either CI run.

No product defect was sought or adjudicated. No test, product, migration, backend, simulator, build, EAS, or App Store mutation occurred.

## Audited Inputs

`git fetch origin --prune` completed before inspection. Every named commit exists locally as a commit object.

| Input | SHA | Verification / authority |
|---|---|---|
| Stable comparison root / FIX4B | `2762a5447600e8de55be912ccb26e95456484945` | Exists; report branch starts exactly here. It is not called the final candidate. |
| MyReports/MyWatched | `e040aa0e06bd0fa02830dcead7e64fcb45a14e1c` | Exists; direct child of stable root. |
| ActivityFeed prerequisite | `3c7b2ab2f45b9f6a15929fce3367ba1b514065e8` | Exists; direct child of stable root. |
| ActivityFeed accepted follow-up | `9ebeb0fa64bd2699b5ea16a0e2926cfcfca7609e` | Exists; direct child of `3c7b2a...`. |
| Legend FIX4E | `e31e2e0c13253099e778af9db121537b1abe47f5` | Exists; direct child of stable root. Superseded for Legend behavior by published FIX4F. |
| Legend FIX4F follow-up | `780cb7d1ab65450414abc0bfd134b2a323d00142` | Branch `claude/ui-polish-fix4f-legend-pull-final-20260830` appeared on the final fresh fetch and resolves exactly here. Direct child of FIX4E; changes only `LegendModal.tsx` and the existing FIX4E guard. It is not the unpublished combined Prompt-A candidate. |
| B0 | `0d93a7293e75b4efe27873a1e2b0ca3acfe3e078` | One report file. Reconnaissance only. |
| B0-X | `c5dc5e1913d1f6cfdae93994948017c34c4cb066` | One report file. Runtime/backend provenance only. |
| B1 | `83a789604176db0aab06ae3ce652e543dde6be03` | One report file. Superseded as final architecture authority by B2/B2-R. |
| B2 | `bd8ec619fdfaf862f1d568f80094242a324d610f` | One report file. Final Prompt-B architecture authority. |
| B2-R | `2f7b47fd5ee3fcfedc7ec73637305e4187a24083` | One report file. Final receipt-safety scope authority. |
| C1 | `0c5b53f85435c8b0f0d4f71c5fa4f9e24382703b` | One report file. Shared/screen accessibility findings only. |
| C2A | `94d86239fed85e9e9135522e5271af813d6dfc90` | One report file. Stable shared accessibility infrastructure only. |
| R0 | `ffe14b6b09e3596638914160aae0626d3162f207` | One report file. Stable release/configuration evidence. |
| R1 design | `e4164e35c0d6e7bcc3f47ae91ecf815709553efc` | One report file. Design authority only. |
| R1 implementation | `32584d34e7591f59ac9011e8ce5ae67158920d80` | Exactly three changed files. Source implementation is done. |
| Simulator authority | `5feedc0b3e4972197ee1b309778eb6431079867c` | Branch `claude/ios-simulator-rulebook-20260829` resolves exactly to this SHA. |

The named simulator branch did not drift. The target report branch did not exist remotely before this audit. FIX4F was absent at the initial fetch but appeared at the final pre-publication fetch, so this report records its exact narrow lineage instead of retaining the now-false assumption that FIX4E is current.

Prompt-A evidence is commit-body evidence, not independent CI. GitHub exposed no Actions workflow runs for the Prompt-A evidence commits or R1 implementation; the only combined status on R1 was an unrelated successful Vercel status. Commit-body claims are therefore durable self-reported receipts and are labeled accordingly.

The current Prompt-A integration candidate is unpublished and was not inspected. Every procedure below treats its SHA as an input the local owner must resolve and verify.

## Actual Test System

### Commands and gates

| Command | Actual definition | Purpose | Cost distinction |
|---|---|---|---|
| `npm test` | `jest` | Broad Jest regression without coverage. | Medium at current scale. |
| focused Jest | `node_modules/.bin/jest --runTestsByPath ...` | Changed invariant and direct dependencies only. | Cheap to medium by suite family. |
| `npm run test:ci` | `jest --ci --coverage` | Broad regression plus collection and 80% global threshold. | Expensive relative to Jest. Not equivalent to `npm test`. |
| `npm run typecheck` | `tsc --noEmit` | Whole TypeScript program. | Medium. |
| `npm run lint` | `eslint src --ext .ts,.tsx` | Whole active `src` lint. | Medium. |
| `npm run format:check` | `prettier --check src` | Formatting only. | Medium and not a release gate. |
| `git diff --check` | Git whitespace/error check | Cheap changed-diff hygiene. | Trivial. |

`jest.config.js` uses `jest-expo`, RNGH setup plus `jest.setup.js`, a 15-second test timeout, and ignores `node_modules`, `.expo`, `.claude`, and `__tests__/support`. It collects coverage from `src/**/*.{ts,tsx}` while excluding screens, components, hooks, navigation, the `src/theme/**` directory, `src/types/**`, platform adapters, and named integration modules. The top-level `src/theme.ts` is not excluded by that directory pattern. It enforces 80% for branches, functions, lines, and statements.

`.github/workflows/ci.yml` runs on pull requests to `main` and pushes to `main`. Its test job runs `npm run test:ci -- --passWithNoTests --forceExit --watchAll=false`, so coverage is a real integration gate. The TestFlight workflow runs plain `npm test -- --passWithNoTests --forceExit`, not coverage. Formatting is deliberately not a CI gate because the repository-wide check has a documented permanently-red history and conflicts with exact-source guards.

The stable tree contains 270 Jest-candidate files plus one ignored support helper, 64 named guard files, 76 managed migrations, and 4 SQL proof files under `supabase/tests`. The only source-controlled hosted SQL workflow is the branch-specific MOD1R proof. There is no general CI job that proves every migration or hosted schema.

### Structural family inventory

| Family | Examples | Proves | Does not prove | Cost | Common invalidators |
|---|---|---|---|---|---|
| Pure deterministic units | `src/lib/__tests__/distance.test.ts`, `relativeTime.test.ts` | Function logic and edge cases. | Native UI, REST, RLS, environment. | CHEAP | Function/import/test/helper blobs, runtime assumptions. |
| Mocked data/client contracts | `flags.supabase.test.ts`, `photos.test.ts`, `accountDeletionReceipt.test.ts` | Builder projection, mapping, state/error handling under mocks. | Deployed schema, grants, REST cache, SecureStore/device behavior. | MEDIUM | Helper, query constant, mapper, mocks, shared error types. |
| RN component/screen tests | `MyReportsModal.test.tsx`, `ReportFlagModal.test.tsx`, `SignInScreen.test.tsx` | Render/state/action wiring in Jest. | Native gesture recognition, VoiceOver, real UIKit focus, actual camera/location. | MEDIUM | Component, primitives, hooks/providers, fixtures, Jest setup. |
| Navigation integration | `RootNavigator.pushEducation.integration.test.tsx`, `linking.test.ts` | JS composition, route/link wiring. | OS lifecycle, real deep-link launch, post-dismiss native focus. | MEDIUM | Navigator, screens, linking config, providers. |
| Static source/config guards | `sheetScrollFix4b.guard.test.ts`, `appConfig.guard.test.ts`, `releaseScripts.guard.test.ts` | Exact imports, source shapes, config invariants, forbidden patterns. | Runtime behavior; a regex guard can be green while a gesture is unusable. | CHEAP | Guard blob and every file it reads, including dynamic `fs` paths. |
| Broad Jest regression | All Jest suites | Cross-family JS regression and aggregate composition. | Hosted backend, native binary, human usability, signing. | MEDIUM | Shared/core changes, config/setup/dependency changes, integration merge. |
| Coverage gate | `test:ci` | Broad regression plus configured 80% counted-source threshold. | More runtime truth than the same tests; native/backend/human behavior. | EXPENSIVE | Counted lib code/tests, coverage config, integration source. |
| SQL replay/pgTAP | `supabase/tests/*.test.sql`, MOD1R baseline/proof | PostgreSQL objects and rules in the database actually used for the run. | Linked production identity unless recorded; client/runtime/UI. | EXPENSIVE | Migration/object/test blobs, PostgreSQL version/state/role. |
| Hosted REST/security proof | B0-X/B2 role and projection matrices | Deployed catalog, ACL/RLS, PostgREST projection/cache behavior. | Client rendering and future hosted state. | VERY EXPENSIVE | Project, ledger, object/grant/policy/function deploy, client projection. |
| Exact-JS dev-shell acceptance | Simulator contract + exact candidate | Candidate JS through compatible native bridges. | Release packaging, signing, Release-mode bundle, TestFlight identity. | EXPENSIVE | Candidate JS fingerprint, shell provenance/native fingerprint, Metro/env/backend/device. |
| Fresh native Simulator binary | `xcodebuild` + `simctl` receipt | Generated native shell and candidate installed from an exact source/build recipe. | Store signing/processing and physical-device-only behavior. | VERY EXPENSIVE | Any native fingerprint/toolchain/recipe change. |
| TestFlight / physical / external | R1 run, iPhone sitting, App Store Connect | Store distribution and real-device/platform facts. | Unexercised business invariants. | VERY EXPENSIVE | Exact binary/build/run, device, backend, Apple state. |

Current durable timing evidence is inconsistent across environments: recent broad noncoverage reports record roughly 17 to 31 seconds for about 250 to 262 suites, while one constrained run recorded 918.674 seconds. Historical same-suite evidence shows coverage can add material cost, but there is no responsible current coverage duration measurement. The simulator authority records a clean local native build at roughly 50+ minutes on the 8 GB Air. Cost bands, not invented minute promises, control the strategy.

## Evidence Ladder

| Tier | Name | Proves | Cannot prove | Normal cost | Required after | Reusable across SHAs? | Invalidated by | Next tier |
|---|---|---|---|---|---|---|---|---|
| E0 | Identity, ancestry, diff, blob proof | Exact commits, changed paths, byte/semantic equivalence, clean tree. | Behavior. | TRIVIAL | Every candidate/integration. | Yes, by fingerprint. | Missing object, changed fingerprint blob/projection, dirty/unknown source. | E1 |
| E1 | Focused guards/unit/component tests | Changed invariant and direct JS composition under the test model. | Broad regression, native, hosted state, human feel. | MEDIUM | Every source/test/config change with an applicable test. | Yes if test and proof dependencies match. | Production/test/helper/config/fixture dependency change. | E2/E3 |
| E2 | Static program gates | Type compatibility, lint, changed-diff hygiene; formatting when explicitly owed. | Runtime behavior and backend/native truth. | MEDIUM | TS/JS/config integration; final gates. | Usually rerun on aggregate program; individual results can inherit only with dependency closure. | Program/config/dependency composition change. | E3 |
| E3 | Broad Jest regression / coverage variant | Repository-wide JS regression; coverage variant also proves threshold. | Hosted database, native binary, human interaction. | MEDIUM (broad); EXPENSIVE (coverage) | Shared/core/dependency/config changes, B required CI, final product, R1 workflow. | Rarely as a final aggregate gate; reusable for unchanged exact tree/config. | Any relevant source/test/config change after run. | E4/E5 |
| E4 | Hosted backend/REST/security proof | Exact linked project's ledger, objects, grants/RLS, role projections, cache/API behavior. | Client/native rendering and future external state. | VERY EXPENSIVE | Migration/grant/RLS/function/projection changes or stale external state. | Yes across unrelated UI SHAs. | Relevant deployment/object/grant/policy/function/client contract/project change. | E5 |
| E5 | Exact-JS compatible-shell behavior | Exact candidate JS, fixtures, and backend through a proven compatible shell. | Fresh native generation, Release packaging, signing, TestFlight. | EXPENSIVE | Gesture/visual/runtime client behavior after focused gates. | Yes for untouched fingerprints; composition may need cheap smoke. | JS/shared/config/fixture/backend/shell/Metro/env change. | E6/E7 |
| E6 | Fresh native Simulator binary | Generated native app from exact source/toolchain installed and launched. | Store distribution/signing, physical hardware. | VERY EXPENSIVE | Native fingerprint difference or ambiguity; native-specific acceptance. | Only for exact build/native fingerprint. | Native/config/toolchain/build recipe/source change. | E7 |
| E7 | Exact TestFlight binary | Store profile, signing/provisioning, packaging, remote build number, Apple upload/processing, R1 chain. | Human usability and every untested feature. | VERY EXPENSIVE | One final accepted SHA after all cheaper gates. | No across binaries/runs. | Any new build or source/backend release change. | E8 |
| E8 | Human/physical-device acceptance | Gesture quality, VoiceOver/Dynamic Type usability, camera/location/push, final release behavior. | App Review decision and external forms. | VERY EXPENSIVE | Human-only or physical-only risk; final candidate and TestFlight. | Only when complete source/binary/device/backend/fixture fingerprint survives. | Any dependency/device condition change material to the check. | E9 |
| E9 | External platform/App Review proof | App Store Connect record/forms, reviewer account, submission, Apple processing/review/availability. | Internal source correctness not exercised by the platform. | VERY EXPENSIVE | After E7/E8 pass. | Only for the exact platform record/build/submission. | New build, metadata/privacy/account change, Apple response. | Stop/release |

Always start at E0. Move upward only when the cheaper tier cannot prove the invariant.

## Proof Fingerprint Model

An **evidence fingerprint** is the minimum set of source blobs or semantic projections, external identities, runtime fixtures, device/toolchain conditions, and proof-method assumptions whose equality is necessary for an earlier proof to remain valid. A total commit SHA is provenance, not the expiry key.

Every ledger row must name:

- the invariant;
- exact production/shared/test dependency blobs or semantic projections;
- external state identity and freshness assumptions;
- runtime fixture and role assumptions;
- native shell or exact binary identity where applicable;
- human/device conditions where applicable; and
- the invalidation trigger.

### Required fingerprints

| Proof | Source dependencies | Non-source dependencies | May change without invalidation | Immediate invalidators |
|---|---|---|---|---|
| Legend behavior | `src/screens/LegendModal.tsx`; `SheetPull.tsx`; relevant theme/accessibility primitives; Legend/SheetPull guards; RN/RNGH/runtime bundle projections; for integration, the opener/backdrop composition. | Exact candidate bundle, compatible shell/native fingerprint, Dynamic Type setting, viewport, role/content, one controller. | Unrelated screens, backend migrations not used by Legend, reports/docs/R1 workflow. | Any post-FIX4F Legend/shared gesture/layout/guard/runtime dependency change; unknown shell/fixture; different human scenario. FIX4F already invalidates FIX4E's Legend fingerprint. |
| ActivityFeed behavior | `ActivityFeedModal.tsx`; SectionList bridge; `Sheet`/`SheetPull`; error/copy/watched/activity helpers; all guards that read ActivityFeed; RN/RNGH/Metro/Babel runtime projections. | Real overflowing activity fixture, backend projection, Dynamic Type, shell, Metro, role. | Legend/MyReports-only edits; unrelated schema. | Component/bridge/primitives/helper/projection/fixture/backend/shell change. The accepted follow-up did not conclusively prove real-content scrolling or pull-to-refresh. |
| MyReports/MyWatched behavior | Both modal blobs; `Sheet`/`SheetPull`; filter/data helpers used by each; FIX4B/FIX4C guards; RN/RNGH runtime projections. | Relevant report/watch rows or explicit empty fixture, exact bundle/shell, size setting. | Activity/Legend-only edits; unrelated backend objects. | Either modal, shared primitive, helper/projection, guard, fixture/backend, shell/native change. MyWatched empty-state live proof does not become MyReports live proof merely because the mechanism matches. |
| Prompt-B client proof | B2/B2-R's eight production files: `flags.ts`, `HomeScreen.tsx`, `copy.ts`, `location.ts`, `MapScreen.tsx`, `photos.ts`, `FlagDetailModal.tsx`, `SignInScreen.tsx`; their imports/providers/primitives; B2-PN03 through PN08 tests and retained receipt/confirm tests. | Exact B2 backend deployment, roles/accounts/fixtures, shell/Metro/device, safe receipt fixture. | R1/report/docs; backend objects outside the B contract. | Any listed/shared dependency, client projection, backend contract/identity, fixture, or shell change. |
| Prompt-B hosted backend proof | Exact managed migration and SQL proof blobs; deployed migration ledger; definitions of three columns, guards/triggers/functions; exact grants/RLS; PostgREST schema/cache; project ref; client projections. | Project `kldlwszpfkdmsjrjhjym`, role/session identities, timestamps, safe fixture and before/after legacy evidence. | UI/layout/copy not participating in projections; R1. | Relevant ledger/deploy, schema/type/nullability, grant/RLS, trigger/function, PostgREST cache, project, role, or client projection change. |
| Prompt-C accessibility proof | Exact shared primitive/helper blobs for the invariant plus exact screen/navigation consumer; matching a11y guards/tests. | OS, VoiceOver/Dynamic Type/reduced-motion/theme settings, content strings/data, device/simulator, human observer. | Unrelated screens whose shared dependencies are unchanged. | Shared primitive/helper or target screen change; different text/content fit; OS/device condition change relevant to behavior. |
| R1 source-contract proof | Exact workflow and release guard blobs; semantic `package.json.scripts`; semantic `eas.json` `{build.testflight, submit.production}`. | None for source proof. | Product UI, migrations, non-script package metadata whose runtime/native projections remain equal. | Workflow/guard change, script path reintroduced, EAS profile mapping change. Aggregate focused guard still reruns. |
| Final TestFlight provenance | Entire accepted final Git tree; R1 source fingerprint; release-profile/config/native fingerprint; app version; GitHub run event/ref/SHA/input/checkout; pinned CLI. | EAS project/env/credentials, build ID and `gitCommitHash`, submission ID, Apple team/app/bundle, TestFlight version/build/processing. | Nothing source- or run-relevant. | Any source/build/run/profile/env/credential/artifact change or ambiguous mapping. New binary means new proof. |
| Physical D8 proof | Final-SHA photo capture/selection, EXIF-stripping, upload, object-key/storage, report code; dependency/native/config fingerprint. | Exact physical iPhone/OS, permission state, backend project/bucket/object, captured input file, stored object bytes/metadata, account, timestamp, reviewer sign-off. | Unrelated UI/backend objects. | Photo pipeline/dependency/config/backend/storage policy/project/device/OS/fixture change, or inability to bind the proof to final source. |

## Blob-Equivalence Inheritance

### Four objective statuses

| Status | Objective rule | Required action |
|---|---|---|
| `REUSE` | Every fingerprint dependency is byte/semantically identical; external state and fixtures are unchanged and known; proof was not binary/run/whole-SHA-specific. | Record equivalence commands and inherit the row. |
| `CHEAP REVALIDATION` | The fingerprint survives, but release-critical composition, an aggregate source guard, or a cheap smoke can catch integration mistakes not represented by one historic leaf proof. | Run only the focused aggregate guard/smoke. |
| `FULL RERUN` | One or more proof dependencies changed, but the invariant and proof method remain valid. | Supersede the old row and execute the complete scenario for the changed surface. |
| `INVALID / NEW PROOF REQUIRED` | Invariant/method changed; external identity is unknown; fingerprint/provenance is missing; or an exact-binary/platform claim targets a new binary/run. | Do not inherit. Establish a new fingerprint and proof. |

### Reusable Git commands

```bash
BASE='replace-with-accepted-proof-sha'
CAND='replace-with-candidate-sha'
git rev-parse "$BASE^{commit}" "$CAND^{commit}"

# Exact fingerprint path comparison. Missing/deleted paths also fail.
FP=(path/one path/two path/three)
git diff --name-status "$BASE" "$CAND" -- "${FP[@]}"
git diff --exit-code "$BASE" "$CAND" -- "${FP[@]}"

# One blob at either ref.
git rev-parse "$BASE:path/one"
git rev-parse "$CAND:path/one"
git show "$CAND:path/one" | git hash-object --stdin

# Aggregate ordered manifest digest.
for REF in "$BASE" "$CAND"; do
  git ls-tree -r "$REF" -- "${FP[@]}" | sort | git hash-object --stdin
done
```

JSON semantics must be canonicalized before hashing. Key order alone is not a semantic change. Use a recursive key sorter, then `git hash-object --stdin`.

```bash
REF='replace-with-sha'
git show "$REF:package.json" | node -e '
let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
  const z=v=>Array.isArray(v)?v.map(z):v&&typeof v==="object"
    ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,z(v[k])])):v;
  console.log(JSON.stringify(z(JSON.parse(s).scripts)));
})' | git hash-object --stdin
```

Published FIX4F is the concrete supersession case: `780cb7d1...` changes exactly `src/screens/LegendModal.tsx` and `src/__tests__/legendScrollFix4e.guard.test.ts` from FIX4E, so FIX4E's Legend rows are `SUPERSEDED`. Its commit records focused source proof and human scroll/pull proof at large and accessibility-extra-extra-extra-large. When FIX4F enters the combined candidate with every Legend fingerprint dependency identical, reuse that leaf proof and run only the required integrated-candidate pull as `CHEAP REVALIDATION`; a later Legend/shared/runtime dependency change requires `FULL RERUN`. MyReports, MyWatched, and ActivityFeed rows remain untouched when their fingerprints survive. FIX4F's native digest is identical, so it does not itself require `xcodebuild`.

## Native Fingerprint

The repo uses Expo Continuous Native Generation. `ios/` is ignored; there are no tracked `ios/`, Podfile, Info.plist, entitlement, standalone privacy-manifest, or native-project files at the stable root. The source-controlled iOS shell inputs are:

1. an iOS/prebuild projection of `app.json`: `name`, `slug`, `owner`, `icon`, `splash`, `version`, `orientation`, `scheme`, `userInterfaceStyle`, `newArchEnabled`, `jsEngine`, `runtimeVersion`, `updates`, `ios`, `plugins`, `notification`, `assetBundlePatterns`, `experiments`, `platforms`, `primaryColor`, `backgroundColor`, and `extra.eas`;
2. a runtime/install projection of `package.json`: `dependencies`, `optionalDependencies`, `peerDependencies`, `overrides`, `resolutions`, `engines`, and `packageManager`;
3. `package-lock.json`;
4. `.npmrc`;
5. every local config plugin referenced by `app.json`, currently `plugins/withFmtXcode26Fix.js`;
6. every referenced native icon/splash asset, currently `assets/brand/app-icon.png`; and
7. any future tracked native project/config file.

`eas.json` is a release-build fingerprint input, not a local dev-shell input. `babel.config.js`, `babel-plugins/`, and `metro.config.js` are exact-JS bundle fingerprint inputs, not native-shell inputs. Web-only assets are excluded. A new/unclassified app-config key, plugin, asset, or lock change is `AMBIGUOUS` until re-derived.

The following current-repo-specific read-only function creates a deterministic Git-blob-style digest. It deliberately returns `AMBIGUOUS` instead of silently missing a future local plugin/asset, `app.config.*`, tracked `ios/`, Podfile, Info.plist, entitlement, or privacy manifest. Re-derive the input graph when that happens.

```bash
native_fp() {
  ref=$(git rev-parse "$1^{commit}") || return 1
  local_refs=$(
    git show "$ref:app.json" | node -e '
      let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
        const e=JSON.parse(s).expo||{},ks=["name","slug","owner","icon","splash","version","orientation","scheme","userInterfaceStyle","newArchEnabled","jsEngine","runtimeVersion","updates","ios","plugins","notification","assetBundlePatterns","experiments","platforms","primaryColor","backgroundColor"],o={};
        for(const k of ks)if(k in e)o[k]=e[k]; if(e.extra&&e.extra.eas)o.extra={eas:e.extra.eas};
        const found=new Set();
        const walk=v=>{if(typeof v==="string"&&v.startsWith("./"))found.add(v);else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==="object")Object.values(v).forEach(walk)};
        walk(o); console.log([...found].sort().join("\n"));
      })'
  ) || return 1
  expected_local_refs=$(printf '%s\n' \
    './assets/brand/app-icon.png' \
    './plugins/withFmtXcode26Fix')
  if [ "$local_refs" != "$expected_local_refs" ]; then
    printf 'AMBIGUOUS: app.json local native refs changed; re-derive native_fp\n' >&2
    return 2
  fi
  tracked_native=$(
    git ls-tree -r --name-only "$ref" \
      | grep -E '^(ios/|app\.config\.|Podfile$)|(^|/)(Info\.plist|[^/]+\.entitlements|PrivacyInfo\.xcprivacy)$' \
      || true
  )
  if [ -n "$tracked_native" ]; then
    printf 'AMBIGUOUS: tracked native/config files appeared; re-derive native_fp\n' >&2
    printf '%s\n' "$tracked_native" >&2
    return 2
  fi
  {
    printf 'tracked-blobs\n'
    git ls-tree -r "$ref" -- \
      .npmrc package-lock.json \
      plugins/withFmtXcode26Fix.js assets/brand/app-icon.png
    printf 'package-runtime-projection\n'
    git show "$ref:package.json" | node -e '
      let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
        const p=JSON.parse(s),ks=["dependencies","optionalDependencies","peerDependencies","overrides","resolutions","engines","packageManager"],o={};
        for(const k of ks)if(k in p)o[k]=p[k];
        const z=v=>Array.isArray(v)?v.map(z):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,z(v[k])])):v;
        console.log(JSON.stringify(z(o)));
      })'
    printf 'app-ios-projection\n'
    git show "$ref:app.json" | node -e '
      let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
        const e=JSON.parse(s).expo||{},ks=["name","slug","owner","icon","splash","version","orientation","scheme","userInterfaceStyle","newArchEnabled","jsEngine","runtimeVersion","updates","ios","plugins","notification","assetBundlePatterns","experiments","platforms","primaryColor","backgroundColor"],o={};
        for(const k of ks)if(k in e)o[k]=e[k]; if(e.extra&&e.extra.eas)o.extra={eas:e.extra.eas};
        const z=v=>Array.isArray(v)?v.map(z):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,z(v[k])])):v;
        console.log(JSON.stringify(z(o)));
      })'
  } | git hash-object --stdin
}

KNOWN_SHELL_SHA='2690d440fbd8e62059c9f93601638778a09853d3'
CANDIDATE_SHA='replace-with-40-character-candidate-sha'
KNOWN=$(native_fp "$KNOWN_SHELL_SHA")
CANDIDATE=$(native_fp "$CANDIDATE_SHA")
printf 'known=%s\ncandidate=%s\n' "$KNOWN" "$CANDIDATE"
```

Read-only execution during this audit produced the same digest, `f2b9a1327604dc1eaf4e0e9f278ea8baecd848cf`, for the documented shell source `2690d440fbd8e62059c9f93601638778a09853d3`, stable root `2762a544...`, FIX4F `780cb7d1...`, and R1 implementation `32584d34...`. R1 changed scripts only. This establishes source-level compatibility among named inputs, not compatibility for the unpublished Prompt-A integration and not provenance for whichever app is currently installed.

Classification:

- `IDENTICAL`: shell may be reused only when its own installed-build receipt and external toolchain/recipe assumptions also match.
- `DIFFERENT IN NATIVE-AFFECTING INPUT`: fresh native build required.
- `AMBIGUOUS`: stop and prove the change is JS-only or build fresh. Never use “probably compatible.”

The Xcode 27 deployment-target adjustment is applied in generated, untracked Podfile output and is not representable by the source digest. A shell receipt must separately record toolchain and build-recipe identity. Compatible-shell proof is not release-binary provenance.

## Backend Fingerprint

Hosted evidence is valid only for an exact backend fingerprint:

```text
linked project ref
+ hosted migration ledger tip and relevant entries
+ exact relevant catalog types/nullability/defaults
+ functions/RPCs/triggers and definitions
+ grants and RLS policies by role
+ PostgREST schema-cache/API state
+ deployed Edge-function version where relevant
+ exact client projection/request contract
+ role/session/fixture identity
+ evidence timestamp
```

For Prompt B, the expected project identity from B0-X/B2 is `kldlwszpfkdmsjrjhjym`. B0-X observed 69 ledger entries ending at `20260819214410 photo_alt_text` and absence of the five disputed media fields on 2026-08-30. This is historical runtime provenance, not permission to skip B-0 fresh preflight.

A hosted proof expires when any relevant migration deploys; a relevant column/object/function/trigger/grant/policy changes; an Edge function affecting the contract deploys; PostgREST state is unknown; the linked project/role/fixture changes; or the client projection being proven changes. An unrelated UI, report, R1, or copy edit does not invalidate it.

For unchanged backend evidence, record project identity, ledger tip, relevant object-definition hashes, ACL/RLS outputs, exact request projection/role, and time. A relevant backend deploy is not “cheap revalidation” merely because SQL source looks similar; it requires E4 hosted proof. A catalog-correct but API-stale result permits one approved cache reload only under B2's conditions, followed by the exact probe. Blind reload loops are forbidden.

## Change Surface Matrix

Legend: `R` required; `C` conditional on the stated surface; `I` may inherit by a complete fingerprint; `-` not normally owed. E8 means a human/physical proof only where the changed invariant needs it.

| Change surface | E0 | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | Why |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Report only | R | - | - | - | - | - | - | - | - | Diff/integrity only. |
| Test only | R | R | C | C | - | - | - | - | - | Prove test validity; broad only if shared setup/coverage behavior changes. |
| Copy only | R | R | R | C | - | C | - | I | C | Focused copy guard; live/human only for fit, announcement, or semantics. |
| Pure TS logic | R | R | R | C | - | - | - | I | - | Unit proof; broad if shared/core. |
| Data helper | R | R | R | R | C | C | - | I | - | Shared consumers and real projection may require E4/E5. |
| Single screen JS/TS | R | R | R | C | - | R | C | I | C | Focused behavior; fresh shell only if native fingerprint changes. |
| Gesture / scroll UI | R | R | R | C | - | R | C | I | R | Static guards cannot prove movement/feel. |
| Shared UI primitive | R | R | R | R | - | R | C | I | R | Composition risk across many consumers. |
| Accessibility semantics | R | R | R | C | - | R | C | I | R | Automation can assert props; human proves focus/VoiceOver/usability. |
| Multi-surface UI integration | R | R | R | R | C | R | C | I | R | Aggregate ownership and navigation/state composition. |
| Backend query projection | R | R | R | R | R | C | - | I | - | Mock plus exact hosted role/API proof. |
| Migration | R | R | - | - | R | C | - | I | C | Replay/deploy/security, then client only if behavior consumes it. |
| Grant / RLS / security | R | R | - | - | R | C | - | I | C | Exact positive/negative role matrix; independent review. |
| Edge function | R | R | C | C | R | C | - | I | C | Function/deploy/runtime contract; physical only if hardware path. |
| `app.json` / Expo config | R | R | C | C | - | C | R for iOS projection | R | C | Generated native config and final archive must match. |
| `eas.json` | R | R | - | - | - | - | - | R | C | Local shell unaffected; actual EAS profile/run proves it. |
| Package dependency | R | R | R | R | C | R | C/R | R | C | Native/autolink uncertainty forces E6; pure-JS proof can avoid it. |
| Package lock | R | R | R | R | C | R | C/R | R | C | Resolution changes are fail-closed until classified. |
| GitHub release workflow | R | R | C | C | - | - | - | R | C | Static guard first; real event/approval/EAS/Apple state only at E7+. |
| Final product integration | R | R | R | R | R if backend | R | C | - | R | Purchase one aggregate source/runtime/accessibility gate. |
| Final release candidate | R | R | R | R | R | I/R | C | R | R | All remaining release invariants converge here. |

## Jest / Coverage Rule

### Focused Jest required when

- production logic, component, screen, guard-read source, or test changes;
- a prior proof dependency changes;
- integrating R1, always run `releaseScripts.guard.test.ts` against the aggregate files;
- Prompt A, run the integrated sheet/Legend guard set below;
- Prompt B, run all eight B2 pre-native contract groups including B2-R's four SignInScreen behavior groups; or
- Prompt C, run target-screen and shared-a11y tests/guards for changed source.

Do not add coverage to a focused command. The configured global collection universe makes focused coverage both slower and potentially misleading.

### Broad Jest required when

- the change touches shared primitives, auth/navigation/core stores/data helpers, Jest setup/config, Babel, package dependencies/lock, or conflict-resolution composition;
- Prompt A's repository-wide red baseline must be classified by exact base versus exact candidate;
- Prompt B reaches B-4, because B2 requires full regression and required CI on that exact candidate;
- the exact final A+B+C+R1 SHA reaches the one-time product gate; and
- the canonical R1 workflow runs, because its source currently mandates plain `npm test`.

### Broad Jest not required when

- the change is report-only;
- a narrow copy/screen/test-only edit has complete focused proof, does not hit shared/core surfaces, and the final broad gate remains scheduled;
- backend/migration-only work has its SQL/hosted proof and no client source changed;
- R1's three files are inspected in isolation and its focused guard passes; or
- an unrelated SHA changes outside a proof fingerprint.

### Coverage required when

- required PR/main CI runs for the Prompt-B exact candidate;
- required PR/main CI runs for the final product SHA; or
- counted library source, coverage tests, or coverage config changes and an earlier predictive run is explicitly needed.

Coverage is not required after every narrow edit, in EAS/TestFlight dispatch, or merely to improve regression confidence. `npm run test:ci` already performs the broad suite; do not also run plain broad Jest beside the same CI gate unless diagnosing a coverage-only failure.

### Planned remaining broad runs

| Stage | Broad command | Coverage? |
|---|---|---:|
| Prompt A base | Same normalized baseline command | No |
| Prompt A candidate | Same normalized baseline command | No |
| Prompt B exact candidate required CI | `test:ci` in CI; satisfies broad regression there | Yes |
| Final product SHA required CI | `test:ci` in CI | Yes |
| Canonical TestFlight workflow | Source-mandated plain `npm test` | No |

Normal: five broad executions, two with coverage. Best case: four broad executions if one Prompt-A side already has a durable, normalized, same-command receipt. Prompt C receives no separate broad run unless its actual change surface triggers the rule; its final aggregate confidence is purchased at the final product SHA.

## Prompt-A Baseline Protocol

This is the fastest exact local protocol for today's unpublished integration. It installs dependencies once only when test toolchain blobs match, runs base and candidate sequentially, captures exit status and exact failure records, and does not modify product source.

Prerequisites: a clean committed candidate SHA and enough temporary disk space. The protocol uses the repo's Node runtime and requires no additional JSON utility. If package/test toolchain files differ, stop sharing `node_modules` and establish matched installs before comparison.

```bash
set -u
export LC_ALL=C
BASE=2762a5447600e8de55be912ccb26e95456484945
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
test -z "$(git status --porcelain)" || { echo 'STOP: candidate tree is dirty'; exit 1; }
CANDIDATE=$(git rev-parse HEAD)
test "$CANDIDATE" != "$BASE" || { echo 'STOP: candidate equals base'; exit 1; }

git diff --exit-code "$BASE" "$CANDIDATE" -- \
  package.json package-lock.json jest.config.js jest.setup.js \
  babel.config.js tsconfig.json || {
  echo 'STOP: test environment changed; use matched installs and investigate'
  exit 1
}

QA_TMP=$(mktemp -d "${TMPDIR:-/tmp}/flagstone-a-baseline.XXXXXX")
BASE_WT="$QA_TMP/base"
RECEIPT="$QA_TMP/receipt"
mkdir -p "$RECEIPT"
git status --porcelain > "$RECEIPT/candidate-status.before.txt"
test ! -s "$RECEIPT/candidate-status.before.txt" || {
  echo 'STOP: candidate tree became dirty before setup'; exit 1;
}
{
  for ref in "$BASE" "$CANDIDATE"; do
    printf '[%s]\n' "$ref"
    git ls-tree "$ref" -- package.json package-lock.json \
      jest.config.js jest.setup.js babel.config.js tsconfig.json
  done
} > "$RECEIPT/test-toolchain-blobs.txt"

[ -x node_modules/.bin/jest ] || npm ci --legacy-peer-deps
git status --porcelain > "$RECEIPT/candidate-status.after-install.txt"
test ! -s "$RECEIPT/candidate-status.after-install.txt" || {
  echo 'STOP: dependency setup changed tracked candidate files'; exit 1;
}
git worktree add --detach "$BASE_WT" "$BASE"
ln -s "$ROOT/node_modules" "$BASE_WT/node_modules"

printf 'base=%s\ncandidate=%s\nnode=%s\nnpm=%s\nLC_ALL=%s\n' \
  "$BASE" "$CANDIDATE" "$(node --version)" "$(npm --version)" "$LC_ALL" \
  > "$RECEIPT/environment.txt"
printf '%s\n' \
  'CI=1 TZ=UTC node_modules/.bin/jest --ci --watchman=false -w 3 --json --outputFile=<side>.raw.json' \
  > "$RECEIPT/command.txt"

set +e
(cd "$BASE_WT" && CI=1 TZ=UTC node_modules/.bin/jest \
  --ci --watchman=false -w 3 --json \
  --outputFile="$RECEIPT/base.raw.json") \
  >"$RECEIPT/base.log" 2>&1
BASE_STATUS=$?
(cd "$ROOT" && CI=1 TZ=UTC node_modules/.bin/jest \
  --ci --watchman=false -w 3 --json \
  --outputFile="$RECEIPT/candidate.raw.json") \
  >"$RECEIPT/candidate.log" 2>&1
CANDIDATE_STATUS=$?
set -e
printf '%s\n' "$BASE_STATUS" > "$RECEIPT/base.exit"
printf '%s\n' "$CANDIDATE_STATUS" > "$RECEIPT/candidate.exit"
if [ ! -s "$RECEIPT/base.raw.json" ] || \
   [ ! -s "$RECEIPT/candidate.raw.json" ]; then
  printf 'STOP: Jest did not produce both raw JSON files; classify as environmental or infrastructure failure\n'
  printf 'Receipt: %s\n' "$RECEIPT"
  exit 1
fi

normalize_failures() {
  local input=$1 root=$2
  INPUT_JSON="$input" ROOT_PATH="$root" node <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.env.INPUT_JSON, 'utf8'));
const root = `${process.env.ROOT_PATH}/`;
const deroot = value => String(value || '').split(root).join('<ROOT>/');
const out = [];
for (const suite of data.testResults || []) {
  const suitePath = String(suite.name || '');
  const relativeSuite = suitePath.startsWith(root)
    ? suitePath.slice(root.length)
    : suitePath;
  const failed = (suite.assertionResults || []).filter(a => a.status === 'failed');
  if (failed.length) {
    for (const assertion of failed) {
      out.push({
        suite: relativeSuite,
        test_id: assertion.fullName || assertion.title || '<unnamed>',
        failure: deroot((assertion.failureMessages || []).join('\n')),
      });
    }
  } else if (suite.status === 'failed') {
    out.push({
      suite: relativeSuite,
      test_id: '<suite-level>',
      failure: deroot(suite.message || suite.failureMessage || ''),
    });
  }
}
out.sort((a, b) =>
  a.suite.localeCompare(b.suite) ||
  a.test_id.localeCompare(b.test_id) ||
  a.failure.localeCompare(b.failure));
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
NODE
}

normalize_failures "$RECEIPT/base.raw.json" "$BASE_WT" \
  > "$RECEIPT/base.failures.json"
normalize_failures "$RECEIPT/candidate.raw.json" "$ROOT" \
  > "$RECEIPT/candidate.failures.json"
diff -u "$RECEIPT/base.failures.json" \
  "$RECEIPT/candidate.failures.json" | tee "$RECEIPT/failure-set.diff"
git diff --name-only "$BASE" "$CANDIDATE" | sort \
  > "$RECEIPT/touched-paths.txt"
shasum -a 256 "$RECEIPT/base.failures.json" \
  "$RECEIPT/candidate.failures.json" > "$RECEIPT/failure-hashes.txt"
if [ "$BASE_STATUS" -eq "$CANDIDATE_STATUS" ] && \
   [ "$BASE_STATUS" -ne 0 ] && \
   cmp -s "$RECEIPT/base.failures.json" "$RECEIPT/candidate.failures.json"; then
  printf 'MATCHING NONZERO EXITS AND FAILURE SETS; dependency adjudication still required\n' \
    > "$RECEIPT/preliminary-decision.txt"
else
  printf 'NO BASELINE EXCEPTION: exit status or normalized failure set differs\n' \
    > "$RECEIPT/preliminary-decision.txt"
fi

git diff --name-only --diff-filter=ACMR "$BASE" "$CANDIDATE" \
  | grep -E '\.(js|jsx|ts|tsx)$' \
  | while IFS= read -r p; do [ -f "$p" ] && printf '%s\0' "$p"; done \
  > "$RECEIPT/changed-js.nul" || true
if [ -s "$RECEIPT/changed-js.nul" ]; then
  xargs -0 node_modules/.bin/jest --watchman=false --listTests \
    --findRelatedTests < "$RECEIPT/changed-js.nul" \
    | sed "s#^$ROOT/##" | sort > "$RECEIPT/related-tests.txt"
else
  : > "$RECEIPT/related-tests.txt"
fi
INPUT_JSON="$RECEIPT/candidate.failures.json" node -e '
const fs=require("fs");
const rows=JSON.parse(fs.readFileSync(process.env.INPUT_JSON,"utf8"));
for(const suite of [...new Set(rows.map(row=>row.suite))].sort()) console.log(suite);
' > "$RECEIPT/failing-suites.txt"
comm -12 "$RECEIPT/failing-suites.txt" "$RECEIPT/touched-paths.txt" \
  > "$RECEIPT/direct-intersection.txt"
comm -12 "$RECEIPT/failing-suites.txt" "$RECEIPT/related-tests.txt" \
  > "$RECEIPT/related-intersection.txt"

printf 'Receipt: %s\n' "$RECEIPT"
```

For `fs`/regex guards, Jest's related-test graph is insufficient: inspect every failing suite's `readFileSync`/path targets and record whether any touched path is dynamically read.

Do not delete the receipt until its adjudication is stored durably. Remove the temporary worktree later with `git worktree remove "$BASE_WT"` only after validating the exact path.

## Baseline Exception Standard

A baseline exception is not “these look unrelated.” It requires:

- full 40-character base and candidate SHAs;
- clean-tree proof;
- canonical same command, differing only by working directory/output path;
- same Node/npm and byte-identical package lock/Jest setup/config;
- base and candidate exit statuses;
- normalized suite names, full test IDs, and exact expected-versus-received/failure text;
- base and candidate failure-set digests;
- direct touched-path intersection;
- Jest transitive related-test intersection;
- dynamic `fs`/source-guard read intersection;
- unchanged blobs for failing suites and dependencies;
- deterministic/flake classification; and
- exactly one allowed conclusion.

`BASELINE EXCEPTION ACCEPTED` requires matching nonzero Jest assertion exit statuses (normally `1`), both failure sets to be nonempty and byte-identical, equivalent messages, no direct/transitive/dynamic dependency relationship, unchanged failing-suite/dependency blobs, and deterministic evidence. A different exit status, including an infrastructure/configuration code on only one side, blocks the exception. Pass-count equality is not sufficient because the candidate may legitimately add passing tests.

Decision:

| Evidence | Conclusion |
|---|---|
| New failing suite/test | `BLOCK CANDIDATE` |
| Same test but different text/expected/received | `UNKNOWN - ESCALATE` until investigated |
| Matching nonzero exits, identical failures, and complete no-dependency proof | `BASELINE EXCEPTION ACCEPTED` for Prompt-A integration only |
| Bounded flake evidence | `FLAKE - CONFIRM` |
| Missing/ambiguous evidence | `UNKNOWN - ESCALATE` |

A Prompt-A baseline exception does not authorize TestFlight while the repository remains red. Implemented R1 runs fail-closed full Jest. The final product SHA must be green or the canonical dispatch blocks.

### Copy/paste receipt

```text
PROMPT A BASELINE EXCEPTION RECEIPT

BASE SHA:
CANDIDATE SHA:
CLEAN TREE:
COMMAND:
ENVIRONMENT (Node/npm, CI/TZ, package-lock/Jest config blobs):
BASE EXIT:
CANDIDATE EXIT:
BASE FAIL SET + SHA-256:
CANDIDATE FAIL SET + SHA-256:
MESSAGE EQUIVALENCE: IDENTICAL | CHANGED
TOUCHED PATH INTERSECTION:
TRANSITIVE DEPENDENCY RELATIONSHIP:
DYNAMIC FS/GUARD READ RELATIONSHIP:
FAILING SUITE/DEPENDENCY BLOB EQUIVALENCE:
CLASSIFICATION: DETERMINISTIC | TIMEOUT/LOAD | ORDER-DEPENDENT | ENVIRONMENTAL | UNKNOWN
BOUNDED RETRY RECEIPT, IF ANY:
CONCLUSION: BLOCK CANDIDATE | BASELINE EXCEPTION ACCEPTED | FLAKE - CONFIRM | UNKNOWN - ESCALATE
ADJUDICATOR / TIMESTAMP:
```

## Flake Policy

Never rerun until green.

| Class | Evidence | Bounded action | Release meaning |
|---|---|---|---|
| DETERMINISTIC | Same assertion/failure reproduces under the same targeted mode. | One targeted confirmation only. | Candidate blocks unless exact-base exception proves identical and unrelated. |
| TIMEOUT / LOAD | Explicit timeout/worker-exit signature; one targeted quiet retry passes. | Preserve first failure and one retry receipt. | `FLAKE - CONFIRM`; unexplained release-critical flake still blocks/escalates. |
| ORDER-DEPENDENT | Broad fails, targeted passes; order/state leakage suspected. | One diagnostic serial/order-preserving run may identify it. | A pass is not acceptance; root-cause or baseline exception required. |
| ENVIRONMENTAL | Jest never initializes, Watchman/crawler/host failure. | One retry with a known deterministic mitigation. The baseline protocol already uses `--watchman=false`. | Assertions that actually ran are not environmental. |
| UNKNOWN | No bounded explanation after one confirmation. | Stop. | `UNKNOWN - ESCALATE` / block. |

The repo's 15-second timeout and historical flake reports inform classification only. They do not authorize labeling a current failure flaky. A release-critical test can block even if a later retry passes.

## Evidence Ledger

| Evidence ID | Invariant | Proof type | Source SHA | Fingerprint | External state identity | Status | Valid until | Invalidated by | Cheap revalidation? | Expensive? | Next consumer |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A-FIX4B-GUARDS | ScrollView/FlatList dead-ref source shape is pinned | E1 self-reported focused/full source receipt | `2762a544...` | 13 production blobs + 2 guard blobs + shared primitives | None | PASS | Fingerprint changes | Any listed/guard/shared change | Yes | No | Prompt A integration |
| A-FIX4B-LIVE | Proven representative ScrollView/FlatList movement | E5 self-reported real iOS | `2762a544...` | Sampled components + shared gesture/native/fixture | iOS 26.5 documented shell/session | PARTIAL | Fingerprint/external assumption changes | Component/shared/shell/fixture change | Sometimes | Yes | Prompt A/final |
| A-MRMW-GUARDS | MyReports/MyWatched stateBody and FlatList wiring | E1 self-reported | `e040aa0...` | two modals + two guards + Sheet/SheetPull/RNGH | None | PASS | Fingerprint changes | Listed/shared change | Yes | No | Prompt A |
| A-MRMW-LIVE | MyWatched empty-state scroll; MyReports same mechanism | E5 self-reported | `e040aa0...` | exact modal/shared/shell/fixture | MyWatched empty fixture; MyReports backend unavailable | PARTIAL | Fingerprint/fixture changes | Any dependency or claim expansion | Yes for source, no for missing live scenario | Yes | Prompt A/final |
| A-ACT-GUARD | SectionList bridge and error-header source contract | E1 self-reported | `9ebeb0f...` lineage | ActivityFeed + all reading guards + primitives | None | PASS | Fingerprint changes | Listed/shared/guard change | Yes | No | Prompt A |
| A-ACT-ERROR-SCROLL | XXXL error banner scroll and Retry | E5 self-reported | `9ebeb0f...` | ActivityFeed/error/bridge/primitives/shell | FEATURE_UNAVAILABLE error fixture | PASS | Fingerprint/fixture changes | Listed or fixture/shell change | Yes | Yes | Prompt A/final |
| A-ACT-CONTENT-PTR | Real overflowing Activity content and pull-to-refresh | E5/human | `9ebeb0f...` target | Same plus real rows/refresh fixture | Required backend fixture | NOT VERIFIED | New proof exists | N/A | No | Yes | Prompt A |
| A-LEGEND-FIX4E | Full XXXL content movement to footnote | E1 + E5 self-reported | `e31e2e0...` | Legend + Legend/SheetPull guards + primitives/native/runtime | iOS 26.5 content-size fixture | SUPERSEDED | FIX4F `780cb7d1...` | FIX4F changed Legend + guard | No | Yes | Lineage only |
| A-LEGEND-FIX4F | Full scroll and top pull at large/XXXL | E1 + human E5 self-reported | `780cb7d1...` | Legend + extended FIX4E guard + byte-identical SheetPull/shared/native/runtime | iOS 26.5 Simulator, human gestures | PASS | Fingerprint/external assumptions change | Legend/shared/native/runtime/fixture change | Source yes | Yes | Prompt A integration |
| A-LEGEND-INTEGRATED-PULL | Pull-to-dismiss in final Prompt-A composition | Human E5 cheap revalidation | TBD unpublished candidate | FIX4F fingerprint + opener/backdrop/composition + exact bundle/shell | Final Prompt-A Simulator session | NOT VERIFIED | One final pull receipt | Any Legend/composition dependency change | No | No once session is active | Prompt A |
| A-REPO-BASELINE | Prompt-A red failures are pre-existing and unrelated | E3 same-command comparison | unpublished candidate | Test toolchain + fail sets + dependency graph | Same host/env | NOT VERIFIED | Formal receipt | Any missing/equivocal field | No | Yes | Prompt A |
| B0X-RUNTIME | Historic hosted schema/failure provenance | E4 report | `c5dc5e1...` | project/ledger/catalog/ACL/API at capture time | `kldl...`, 2026-08-30 | STALE | B-0 recheck | Any current runtime difference/unknown | No | Yes | Prompt B B-0 |
| B2-ARCH | Minimum Prompt-B dependency-closed contract | Architecture report | `bd8ec61...` + `2f7b47f...` | Exact reports and final A source assumptions | None | PASS | Input semantics change | Final-A/runtime/source contradiction | Focused re-adjudication only | No | Prompt B |
| C2A-SHARED | Shared announce/focus infrastructure is sound at base | Source audit | `94d8623...` | `announce`, accessibility helpers, live region, App mount | Audited platforms only | PASS | Blob/consumer/platform change | Shared/helper/root change | Yes | No | Prompt C |
| C1-SCREEN | Sheet dismissal, focus return, Dynamic Type screen requirements | Source audit + required live | `0c5b53f...` | target screens + primitives + content | Future exact C candidate | PARTIAL | Final screen proof | Screen/shared/content/platform change | Source yes | Yes | Prompt C |
| R1-SOURCE | Exact-SHA workflow source contract exists | E0/source inspection | `32584d34...` | workflow + guard + package scripts + EAS projection | No Actions CI receipt | PARTIAL | Aggregate guard passes | Any R1 dependency change | Yes, required | No | Final SHA |
| FINAL-PRODUCT | A+B+C+R1 exact candidate | E0-E6/E8 | TBD | Entire final ledger/fingerprints | Frozen backend/shell/device | NOT VERIFIED | Gate receipt | Any post-gate change | No | Yes | D8/TestFlight |
| D8-FINAL-SHA | Stored-object EXIF/GPS safety on physical device | E8/E4 | TBD | final photo pipeline/native/backend/device | Physical iPhone + exact stored object | BLOCKED | Pre-dispatch receipt | Any dependency change | No | Yes | R1 dispatch |
| TESTFLIGHT-R1 | Exact accepted SHA to exact processed TestFlight build | E7/E9 | TBD | final source/R1/profile/run/artifact | GitHub/EAS/Apple records | NOT VERIFIED | New build/source | Any new build or ambiguity | No | Yes | Physical/App Review |

## Supersession Rules

Every proof row has explicit lineage. A later proof can:

1. **replace** the same invariant and fingerprint scope, setting the older row to `SUPERSEDED` and pointing to the new evidence ID;
2. **narrow** a claim, leaving unaffected rows active;
3. **extend** a proof with a new row while retaining the earlier source/runtime row; or
4. **invalidate** only the dependency-intersecting rows.

Example:

```text
A-LEGEND-FIX4E (`e31e2e0...`)
-> FIX4F `780cb7d1...` changes LegendModal + existing guard
-> A-LEGEND-FIX4E status SUPERSEDED for Legend behavior
-> A-LEGEND-FIX4F is the current leaf proof
-> A-LEGEND-INTEGRATED-PULL remains a cheap composition revalidation

A-MRMW-* and A-ACT-* remain unchanged if their fingerprints are identical.
```

Never write “the previous report is still mostly valid.” Name the surviving and superseded ledger IDs.

## Simulator Fast Path

```text
EXACT CANDIDATE SHA + CLEAN TREE?
  no -> STOP
  yes
    -> INSTALLED SHELL RECEIPT EXISTS?
       source SHA, native digest, bundle ID, build/install mode, recipe/toolchain,
       and the currently installed app bound by a fresh recorded install or
       installed product digest + exact UDID/runtime/install identity
       no -> AMBIGUOUS: establish receipt or fresh build
       yes
         -> candidate native_fp == shell native_fp?
            no -> FRESH NATIVE BUILD
            yes
              -> bundle ID com.accessmap.app and Metro-capable dev client?
                 no -> FRESH NATIVE BUILD
                 yes
                   -> authorized .env exists without disclosure?
                   -> one Metro from exact worktree, recorded cwd/PID/port?
                   -> Metro restarted after env change and fresh bundle observed?
                   -> exact UDID/runtime and one simulator owner?
                      all yes -> E5 EXACT-JS ACCEPTANCE PERMITTED
                      any no/unknown -> STOP, ESTABLISH FACT
```

The authority records Xcode 27.0 build `27A5252f`, iOS 26.5 simulator UDID `F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC`, and bundle ID `com.accessmap.app`. Debug + Metro is verified. Release Simulator build remains unverified. A pre-existing installed app is not candidate proof. Compatible-shell proof, exact-JS behavioral proof, fresh native-binary proof, and TestFlight provenance are four different claims.

## Fresh Native Build Rule

Always run E0 native-fingerprint comparison first.

| Change | Fresh `xcodebuild` | Why | Cheaper proof first |
|---|---|---|---|
| Pure JS/TS | NO | Compatible shell can execute new JS. | Diff, focused tests/typecheck, E5. |
| Tests | NO | No runtime/native output. | Focused Jest. |
| Copy | NO | JS/layout only unless app config. | Guard/static, E5/human for fit. |
| Migration | NO | Native shell unchanged; hosted schema is proved separately. | Migration replay and E4. |
| Backend only | NO | No source-controlled iOS shell input changed. | Hosted E4 fingerprint/proof. |
| GitHub workflow only | NO | Release mechanics only. | Focused source guard; actual workflow later. |
| `eas.json` | NO for local shell | EAS release profile, not CNG shell input. | Release guard; E7 later. |
| Package dependency | DEPENDS | Native/autolink/plugin root or unknown requires build. | Runtime projection + native package classification. |
| Package lock | DEPENDS | Identical is safe; native/runtime resolution or ambiguity is not. | Exact lock/native-closure proof. |
| `app.json` | DEPENDS | Only a proven web/Android-only delta avoids iOS rebuild. | Canonical iOS projection diff. |
| Expo plugin config | YES | Generates native project/config. | E0 exact projection. |
| Referenced `plugins/` | YES | Changes generated Podfile/project/config. | E0 blob diff. |
| Unreferenced plugin file | NO | Not in generation graph. | Prove plugins list does not reference it. |
| Permission string | YES | Generated Info.plist. | Config guard. |
| Privacy manifest | YES | Generated native manifest. | App-config guard. |
| Bundle identifier | YES | Installed/signing identity. | Config diff. |
| Scheme | YES | Generated URL types. | Config diff. |
| Native module | YES | Bridge/autolink binary changes. | Package/native graph. |
| Podfile | YES | Native build graph. | Exact diff; repo currently has only generated ignored Podfile. |
| Info.plist | YES | Native target metadata. | Exact diff. |
| Entitlement | YES | Signing/capability behavior. | Exact diff. |
| Deployment target | YES | Compiler/target compatibility. | Exact diff. |
| Tracked `ios` project/source | YES | Direct native source/build change. | Exact diff. |

Normal-case remaining local fresh `xcodebuild`: zero, provided the unpublished Prompt-A/final candidate fingerprint equals the known shell fingerprint and the installed shell has a durable receipt. An unknown installed shell is not a zero-build result.

## TestFlight Rule

Only the actual GitHub R1 execution plus EAS and Apple/TestFlight records can jointly prove the end-to-end release chain. Within that joint receipt:

- the exact GitHub event/checkout reached R1;
- the pinned CLI ran the fixed `testflight`/`production` coupling;
- store-distribution Release packaging completed;
- signing and provisioning were accepted;
- the production EAS environment was used;
- the remote iOS build number;
- the EAS build ID and linked submission ID;
- Apple upload succeeded;
- the same version/build processed and became available in TestFlight; and
- the installed TestFlight binary is the processed artifact.

TestFlight must not be used to discover unit failures, broken projections, missing grants/migrations, basic screen layout, ordinary scroll reachability, obvious Dynamic Type clipping, copy errors, missing buttons, or dev-shell runtime defects. Those belong to E1-E6.

Normal target: one canonical build. A second build is authorized only when:

- the first build or linked submission conclusively failed and cannot resume/reuse its exact artifact;
- signing, packaging, production env, or release-only bundling produced a real defect;
- the processed TestFlight binary fails the narrow release smoke;
- Apple rejects a binary defect that requires source/config change; or
- an accepted source/backend change after build materially invalidates it.

Do not create a second build for uncertainty, missing screenshots, metadata/forms, a transient status that can be inspected, or a failure cheaper tiers should have caught. Stop, preserve the first run's IDs, fix/reaccept, then authorize the next exact SHA.

## Human Boundary

| Check | Cheapest authoritative lane | Boundary |
|---|---|---|
| Scroll movement | Automation can record offsets/before-after screenshots; human confirms natural gesture and reachability. | HUMAN ON SIMULATOR for final feel. |
| Grabber / pull dismissal | Human on Simulator or device. | Synthetic drag success alone is insufficient. |
| VoiceOver order/focus/announcements | Human, preferably physical iPhone for final. | Source props/tests do not prove spoken flow. |
| Dynamic Type reachability | Automation sets size; human inspects/traverses. | Use Simulator for breadth, physical for final core path. |
| Camera | Physical iPhone. | Simulator/library substitution is not camera proof. |
| Photo EXIF/GPS | Physical capture plus hosted stored-object inspection. | Human/security sign-off and exact backend object. |
| Real location | Physical iPhone. | Simulator coordinates do not prove permission/GPS behavior. |
| Push receipt | Physical iPhone plus external delivery service. | Required if push is a release claim/gate. |
| Review account | External platform setup plus human sign-in. | Never expose credentials in evidence. |
| Screenshots | Human final curation from exact candidate/TestFlight. | Automation may capture, not judge store quality. |
| App Store forms/privacy | External platform + human/legal/product judgment. | Source can only supply facts. |

Do not spend automation time pretending to prove tactile quality, spoken comprehension, real camera/location, or App Review judgment.

## Concurrency Rule

```text
CLOUD READ-ONLY -> parallel safe
SEPARATE JS WORKTREES -> parallel safe only when files do not overlap
SAME PRODUCT SURFACE -> one writer
SIMULATOR -> one owner
METRO FOR AUTHORITATIVE ACCEPTANCE -> one owner
NATIVE BUILD -> one owner
MUTABLE BACKEND -> serialized by authority
EAS RELEASE -> one canonical run
```

## Prompt A Contract

### A. Evidence inherited by blob equivalence

- FIX4B source/guard mechanisms for byte-identical sibling sheets.
- MyReports/MyWatched guard proof when both modals, guards, Sheet/SheetPull, relevant helpers, RNGH/runtime/native fingerprint are identical.
- ActivityFeed source/guard and error-banner scroll proof when its component, all guards that dynamically read it, primitives, helper/copy, fixture, backend, and shell assumptions match.
- FIX4F source/live leaf proof when `LegendModal`, its extended guard, SheetPull/shared/runtime/native, and fixture assumptions match exactly.

### B. Stale evidence

- FIX4E Legend evidence is already `SUPERSEDED` by published FIX4F; any post-FIX4F Legend production/test/shared change supersedes only the current Legend rows.
- The unpublished combined candidate has no inherited repository-wide green claim.
- MyReports live movement remains partial; a same-mechanism inference is not a direct live swipe.
- ActivityFeed real overflowing content traversal and pull-to-refresh remain unverified.

### C. Required human Legend pull

At the final candidate and top scroll offset, a human performs pull-to-dismiss, confirms expected threshold/feel/dismissal and focus/backdrop behavior, then reopens and confirms normal content scrolling. When the complete FIX4F fingerprint is identical, do not repeat its full XXXL traversal; if any dependency differs, supersede FIX4F and rerun the complete Legend scenario.

### D. Remaining ActivityFeed traversal

Use real overflowing activity content, not the near-zero error state. Confirm visible before/after offset, reach last content, reverse direction, sheet stays open, Retry/error header remains reachable, and human pull-to-refresh triggers once. If a safe real fixture is unavailable, mark blocked; do not infer from a static guard.

### E. Focused guards

```bash
node_modules/.bin/jest --ci --watchman=false -w 3 --runTestsByPath \
  src/__tests__/sheetScrollFix4b.guard.test.ts \
  src/__tests__/sheetScrollFix4bFlatList.guard.test.ts \
  src/__tests__/sheetScrollFix4cStateBody.guard.test.ts \
  src/__tests__/sheetScrollFix4bSectionList.guard.test.ts \
  src/__tests__/legendScrollFix4.guard.test.ts \
  src/__tests__/legendScrollFix4e.guard.test.ts \
  src/__tests__/sheetPull.guard.test.ts \
  src/components/ui/__tests__/SheetPull.test.tsx
```

The published FIX4F extends `legendScrollFix4e.guard.test.ts`, so the listed path is current. If a later change replaces/renames it, substitute its exact guard. Discover every ActivityFeed source reader with:

```bash
rg -l 'ActivityFeedModal' src -g '*.{test,spec}.{ts,tsx}' | sort
```

### F. Broad Jest / baseline

Run the exact base/candidate protocol. Accept only the formal receipt. No baseline exception may survive into a red final TestFlight SHA.

### G. Static gates

Run typecheck and lint on the exact integrated candidate. Use `git diff --check`. Do not require the known repository-wide Prettier check as a release gate.

### H. Remote publication proof

```bash
BRANCH='replace-with-prompt-a-final-branch'
LOCAL=$(git rev-parse HEAD)
git status --short
git push origin "HEAD:$BRANCH"
git fetch origin --prune
REMOTE=$(git rev-parse "origin/$BRANCH")
test "$LOCAL" = "$REMOTE"
git show --stat --oneline "$REMOTE"
```

Stop on dirty tree, missing evidence dependency, new/changed baseline failure, invalid native fingerprint/shell receipt, or remote SHA mismatch.

## Prompt B Contract

Consume B2 + B2-R as authority. Do not reopen architecture.

### B-0: fresh read-only preflight

- exact accepted Prompt-A base and changed-source impact;
- project identity `kldlwszpfkdmsjrjhjym` by three-way correlation;
- ledger tip, relevant catalog/nullability, ACL/RLS, writer-island absence;
- six exact failure/control REST calls;
- deletion/Storage only if source/runtime changed;
- installed shell provenance/native fingerprint.

Any mismatch triggers focused re-adjudication before mutation.

### B-1: one minimal backend mutation

One managed additive migration only: nullable `flags.photo_object_key`, `users.avatar_object_key`, `flag_photos.object_key`; authenticated column-only avatar select; three narrow key-write guards. No uploader columns, writer island, Storage/deletion, backfill, ordinary production-row DML, or leaderboard RPC.

### B-2: one hosted security / REST proof

Clean and upgrade replay; exact ledger entry; catalog/type/nullability; role/grant/RLS matrix; guard positive/negative probes only in safe disposable/staging or authorized sacrificial fixture; legacy hashes/counts; exact flag/Profile/gallery HTTP 200 projections; privacy negatives; conditional single cache reload only if catalog correct/API stale.

### B-3/B-4: grouped client and pre-native proof

The eight production files are B2's seven plus B2-R `SignInScreen.tsx`. Run all eight mandatory groups:

1. schema/privacy;
2. key authority/backend safety non-regression;
3. six flag readers/media/query semantics;
4. Profile load/update;
5. recovery-state owner matrix;
6. punctuation/location normalization;
7. gallery helper/consumer error/retry;
8. receipt preservation plus B2-R's four grouped unavailable-state cases.

Retain `accountDeletionReceipt.test.ts` and `confirm.test.ts`. Then typecheck, lint, one required CI `test:ci` execution on the exact B candidate, and native-fingerprint decision. That CI execution supplies both broad regression and coverage; do not add a duplicate local broad/coverage run unless diagnosing failure.

### B-5: exact-JS dev-shell acceptance

Against the frozen B-2 backend, cover provider cohort, Profile, My Reports, Activity, Admin, Watched, Recently Viewed, export, deep links, legacy gallery render/order, punctuation, Home Retry, Map/Report location presentation, and safe receipt UI. Use only safe/mock or existing non-production receipt fixture. Monthly/realtime/canonical writers remain deferred. No real destructive account deletion.

### Final relation

B behavior and hosted evidence inherit to the final product SHA only while their fingerprints and backend deployment remain unchanged. The final R1 TestFlight build provides binary provenance; it does not replace B's earlier functional/security proof.

## Prompt C Contract

### Stable shared proof

Inherit C2A's source proof only when `src/lib/announce.ts`, `src/lib/accessibility.ts`, `src/lib/a11yText.ts`, `App.tsx`, `A11yLiveRegion.tsx`, and the exact relevant consumers are byte-identical. Preserve web guards, `useFocusOnOpen`, and `useSurfaceTrigger` restore/release semantics.

### Source proof

Revalidate C1 against the exact post-B base. If still present, implement/prove post-dismiss focus restoration for report/sheet flows. Revalidate Sheet/SheetPull dismissal source after all Prompt-A changes. Run target/shared focused tests, typecheck, and lint.

### Screen-specific proof after B

B changes Home, Map, Flag Detail, SignIn, copy/location, and data state. Prompt C screen acceptance occurs after B so it tests final text, error states, focus order, and content fit rather than obsolete screens.

### Dynamic Type

Automate content-size changes, then have a human verify long labels, status/error copy, controls, scroll reachability, no clipping, and no inaccessible off-screen actions at the largest required sizes. Fingerprint includes exact strings and fixture data.

### VoiceOver

Human verifies focus entry/return, order, labels/hints/state, announcements, escape/dismissal, and no parent trap on the core path. Source props and Jest are supporting evidence only.

### Human judgment and TestFlight

One C/final Simulator session may combine screen-specific, Dynamic Type, and human gesture proof on the exact final product SHA. The post-TestFlight physical sitting confirms the core VoiceOver/Dynamic Type path and release-binary behavior. Do not turn C into another app-wide audit.

## R1 Contract

R1 commit changes exactly:

- `.github/workflows/eas-testflight-submit.yml`;
- `package.json` scripts; and
- `src/__tests__/releaseScripts.guard.test.ts`.

`eas.json` is an unchanged fourth semantic dependency because the guard reads `build.testflight` and `submit.production`.

Inheritance on final candidate:

```bash
CAND='replace-with-final-sha'
R1=32584d34e7591f59ac9011e8ce5ae67158920d80
git diff --exit-code "$R1" "$CAND" -- \
  .github/workflows/eas-testflight-submit.yml \
  src/__tests__/releaseScripts.guard.test.ts

package_scripts_hash() {
  git show "$1:package.json" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const z=v=>Array.isArray(v)?v.map(z):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,z(v[k])])):v;
      console.log(JSON.stringify(z(JSON.parse(s).scripts||{})));
    })' | git hash-object --stdin
}
eas_release_hash() {
  git show "$1:eas.json" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const e=JSON.parse(s),o={testflight:e.build&&e.build.testflight,production:e.submit&&e.submit.production};
      const z=v=>Array.isArray(v)?v.map(z):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,z(v[k])])):v;
      console.log(JSON.stringify(z(o)));
    })' | git hash-object --stdin
}
R1_SCRIPTS=$(package_scripts_hash "$R1")
CAND_SCRIPTS=$(package_scripts_hash "$CAND")
R1_EAS=$(eas_release_hash "$R1")
CAND_EAS=$(eas_release_hash "$CAND")
printf 'scripts r1=%s candidate=%s\neas r1=%s candidate=%s\n' \
  "$R1_SCRIPTS" "$CAND_SCRIPTS" "$R1_EAS" "$CAND_EAS"
test "$R1_SCRIPTS" = "$CAND_SCRIPTS"
test "$R1_EAS" = "$CAND_EAS"
```

If workflow/guard blobs and semantic package/EAS projections match, inherit R1 design/source reasoning. Always run cheap aggregate revalidation:

```bash
npm test -- --runInBand --forceExit \
  src/__tests__/releaseScripts.guard.test.ts
git diff --check
```

R1 does not require its own native build; its runtime dependency projection, lock, app config, plugin, and icon are unchanged.

Cannot inherit: external `release-approval` existence/reviewer/actual wait; secret or production-env validity; D8 evidence tied to final SHA/device; live `GITHUB_SHA`/ref/input/checkout equality; CLI/service behavior; EAS build/submission IDs; Apple signing/provisioning/upload/processing; TestFlight version/build reconciliation. Those exist only after the actual canonical run.

## Final Product Gate

Run once after A+B+C+R1 integration and source/backend freeze:

1. **Clean tree / exact SHA:** full 40-character SHA, clean index/worktree, published remote equality.
2. **Ancestry/diff sanity:** expected A/B/C/R1 parents/patches; no accidental report/product/native/backend files.
3. **Proof ledger:** every inherited row has a recorded fingerprint; stale/superseded rows are explicit.
4. **Focused critical guards:** Prompt-A sheet/Legend set; Prompt-B eight groups; Prompt-C target/shared a11y; `appConfig.guard`; R1 release guard; security/privacy guards affected by the diff.
5. **Typecheck and lint:** exact SHA; `git diff --check`; no full Prettier gate.
6. **Broad + coverage:** one exact final `test:ci` CI run. No duplicate plain local broad run unless diagnosing CI.
7. **Backend:** exact project/ledger/deployment; relevant B hosted evidence still fresh; exact client projections; no drift.
8. **Migration history:** managed order, clean/upgrade replay receipts, deployed ledger identity; do not repeat unrelated history audit.
9. **R1:** semantic/blob inheritance plus focused aggregate guard.
10. **Native fingerprint:** compare final candidate with installed shell source; decide E5/E6 objectively.
11. **Simulator:** one combined C/final session for any still-unproven final screen/gesture/navigation states.
12. **Accessibility:** final Dynamic Type/VoiceOver/focus/gesture evidence only for target/core paths.
13. **Privacy/release targeted rechecks:** final `app.json` privacy/permissions guard, D8 source dependencies, release version/config; no broad re-audit.
14. **Pre-dispatch physical D8:** exact-final-SHA physical photo and stored-object evidence with sign-off.

Any source/backend change after this gate invalidates only intersecting rows, but the final aggregate/CI and D8/TestFlight authorization must be re-evaluated before dispatch.

## Physical Device Gate

Two short sessions are normal because R1 demands D8 before build.

### Pre-dispatch physical final-SHA session

| Check | Class |
|---|---|
| Bind exact final SHA, compatible physical dev shell/native fingerprint, backend, account/device/OS | MUST |
| Camera or library input with known metadata; upload/report through exact final code | MUST |
| Inspect exact stored object for EXIF/GPS absence and bind object/bytes/metadata to receipt | MUST |
| Real location permission/presentation and report location behavior | MUST |
| Owner/privacy sign-off authorizing `d8_closed=yes` | MUST |
| Broad unrelated manual app tour | NOT NEEDED |

### Post-TestFlight sitting

| Check | Class |
|---|---|
| Install processed TestFlight version/build and record identity | MUST |
| Cold launch and production backend | MUST |
| Review-account authentication | MUST |
| Guest browse, Map, anonymous report, report/detail | MUST |
| Camera/photo path plus a narrow D8 release-binary confirmation | MUST |
| Real location core path | MUST |
| Core VoiceOver/Dynamic Type/focus path | MUST |
| Account-deletion unavailable/retry/confirm behavior | MUST only when an existing safe non-production fixture is available in the exact binary. Otherwise inherit B-5/component proof and perform only non-destructive entry/copy/cancel smoke; never create a real production deletion. |
| Push receipt | MUST if push is claimed/review-critical; otherwise SHOULD |
| Final App Store screenshots from exact accepted UI | SHOULD/MUST before submission if not already captured |
| Every admin/list/filter edge case | NOT NEEDED |
| Repeat full backend security matrix | NOT NEEDED |

Stop on crash, wrong backend/version/build, missing review-account access, real metadata leak, destructive-state ambiguity, or a core accessibility blocker.

## Expensive Work Budget

| Work | Best case | Normal case | Extra run authorized only when |
|---|---:|---:|---|
| Broad Jest executions | 4 | 5 | A same-command receipt missing; new shared/core/config/dependency change; failure diagnosis. |
| Coverage runs | 2 | 2 | Counted source/config changes after last coverage gate or CI-only diagnosis. |
| Simulator acceptance sessions | 3 | 3 | A/B/C-final fingerprint invalidated, safe fixture unavailable, or shell/provenance failure after repair. |
| Fresh local `xcodebuild` | 0 with a proven installed-shell receipt | 0-1, receipt-dependent | Native fingerprint differs/ambiguous or installed-shell receipt cannot be established. |
| TestFlight builds | 1 | 1 | Exact second-build authorization in TestFlight Rule. |
| Physical iPhone sessions | 2 | 2 | Real physical-only defect/change invalidates D8 or post-TestFlight smoke. |
| Hosted backend mutation/proof sessions | 1 | 1 | Failed/partial deployment, cache/catalog mismatch, or relevant runtime drift after freeze. |

These are decision outcomes, not arbitrary ceilings. Real defects override economy.

## Time Savings

### Naive strategy

- broad Jest after each A sibling, B wave, C screen, integration, and release;
- coverage attached to focused tests or every broad run;
- simulator re-setup for byte-identical sibling surfaces;
- fresh native build after every JS-only SHA;
- repeat every human gesture after unrelated changes;
- repeat hosted backend proof after UI-only changes; and
- use TestFlight as exploratory QA.

### Fingerprint strategy

- five planned broad executions end-to-end, two of which already satisfy coverage;
- three purpose-built Simulator sessions;
- zero local fresh native builds when the exact final native fingerprint and shell receipt match;
- one hosted B session;
- one canonical TestFlight build; and
- human work only where source/automation cannot prove the invariant.

Conservative avoided work model:

- roughly 5 to 9 duplicate broad executions;
- roughly 3 to 6 duplicate coverage collections;
- roughly 3 to 6 simulator setups/traversals;
- roughly 2 to 4 clean local native builds at the documented 50+ minutes each;
- one speculative TestFlight build in a naive two-build path;
- one or more repeated human gesture/backend proof passes.

**Conservative wall-clock saved: approximately 3 to 6 hours.** This counts primarily the measured native-build lower bound plus duplicated broad/setup work and does not assign invented minutes to backend or human work.

**Likely wall-clock saved: approximately 6 to 10 hours.** This assumes the avoided coverage, simulator traversal, human gesture, backend re-proof, and speculative TestFlight work have meaningful setup/interaction cost. It is a planning range, not a benchmark. If the installed shell lacks provenance and one fresh native build is required, subtract that avoided-build benefit; do not weaken the gate to preserve the estimate.

## Future Prompt Blocks

### Prompt A final acceptance

```text
EVIDENCE TO INHERIT: FIX4B, MyReports/MyWatched, ActivityFeed, and FIX4F rows only where complete fingerprints match; FIX4E Legend rows are superseded.
FINGERPRINT TO CHECK: target production blobs + every reading guard + Sheet/SheetPull + helpers + Babel/Metro/RNGH/native_fp + fixture/backend/shell receipt.
REQUIRED NEW TESTS: integrated focused guard set; exact base-vs-candidate normalized broad receipt.
REQUIRED LIVE PROOF: one integrated-candidate human Legend pull; ActivityFeed real-content traversal and human pull-to-refresh; full Legend rerun only if FIX4F's fingerprint changed.
BROAD JEST RULE: paired base/candidate only for formal red-baseline adjudication.
NATIVE BUILD RULE: no if native_fp identical and installed shell receipt complete; otherwise build/stop.
HUMAN RULE: gestures/fit only; do not repeat byte-identical sibling scenarios.
STOP: new/changed failure, missing fingerprint/fixture, dirty/unpublished SHA mismatch, ambiguous shell.
```

### Prompt B implementation

```text
EVIDENCE TO INHERIT: B2/B2-R architecture; B0-X only as historic runtime provenance; accepted Prompt-A rows by fingerprint.
FINGERPRINT TO CHECK: final A source, project kldl..., ledger/catalog/ACL/RLS/writer absence, exact client/native shell.
REQUIRED NEW TESTS: B2-PN01..08, including four grouped SignIn unavailable-receipt cases and retained receipt/confirm tests.
REQUIRED LIVE PROOF: B-0 preflight; one B-1/B-2 hosted session; one B-5 exact-JS client session.
BROAD JEST RULE: one required B candidate CI test:ci; it supplies broad+coverage.
NATIVE BUILD RULE: no for approved JS/backend cut when native_fp and shell receipt pass.
HUMAN RULE: location/gesture/receipt UI only with safe fixtures; no real deletion.
STOP: runtime drift, active writer, privacy broadening, unsafe fixture, native ambiguity, any B2 forbidden scope.
```

### Prompt C implementation

```text
EVIDENCE TO INHERIT: C2A shared infrastructure and C1 preserve rows only when exact shared/consumer blobs match.
FINGERPRINT TO CHECK: post-B target screens, primitives/focus/announce helpers, exact content, tests, OS/settings/device.
REQUIRED NEW TESTS: changed target/shared a11y guards and component tests; typecheck/lint.
REQUIRED LIVE PROOF: screen-specific post-B focus, largest Dynamic Type reachability, VoiceOver order/return, human dismissal feel.
BROAD JEST RULE: no separate run unless actual C diff hits shared/core/global invalidators; final SHA buys aggregate confidence.
NATIVE BUILD RULE: native_fp decides; accessibility JS alone does not force xcodebuild.
HUMAN RULE: VoiceOver, fit, focus context, and gesture quality are human claims.
STOP: stale C1 finding, new shared dependency, untestable core path, native ambiguity.
```

### Final product SHA

```text
EVIDENCE TO INHERIT: all PASS rows with recorded final-SHA fingerprint equivalence; R1 source reasoning with exact workflow/guard/script/EAS projections.
FINGERPRINT TO CHECK: complete ledger, backend freeze, native_fp, installed-shell receipt, final remote SHA.
REQUIRED NEW TESTS: focused critical guards, typecheck, lint, one final CI test:ci, focused R1 aggregate guard.
REQUIRED LIVE PROOF: one combined C/final Simulator session; exact-final-SHA physical D8 before dispatch.
BROAD JEST RULE: one final test:ci; no duplicate local broad unless diagnosing.
NATIVE BUILD RULE: E6 only on native difference/ambiguity; E7 remains mandatory once.
HUMAN RULE: final accessibility core and D8 sign-off.
STOP: dirty/unpublished mismatch, red CI, stale backend, missing R1/D8/approval prerequisite.
```

### Final TestFlight

```text
EVIDENCE TO INHERIT: accepted final source/backend/D8 ledger only.
FINGERPRINT TO CHECK: exact 40-char SHA, R1 source, testflight/production profiles, GitHub event/ref/checkout, EAS project/env/CLI, Apple app/team.
REQUIRED NEW TESTS: source-mandated R1 workflow typecheck/plain full Jest; no exploratory product testing.
REQUIRED LIVE PROOF: release-approval wait/approval, EAS build+linked submission IDs, processed matching TestFlight build, short physical sitting.
BROAD JEST RULE: workflow's one mandatory plain run; no added coverage.
NATIVE BUILD RULE: exactly one canonical EAS store build in normal case.
HUMAN RULE: post-TestFlight install/launch/core paths, review account, accessibility, camera/location/D8 confirm, forms/screenshots.
STOP: any SHA/profile/auth/approval/D8/artifact/version/build ambiguity or release smoke failure.
```

## One-Page Decision Map

| Stage | Cheap proof | Inherited proof | Expensive proof | Build? | Human? | Blocker |
|---|---|---|---|---|---|---|
| Prompt A | E0 blob checks, focused sheet guards, type/lint, exact baseline receipt | Unchanged FIX4B/MRMW/Activity/Legend rows | One A Simulator session | No if native_fp/shell receipt pass | Legend pull + Activity traversal/PTR | New/changed failure, FIX4F stale row, missing fixture/provenance |
| Prompt B | B-0 identity, focused PN01-08, type/lint | B2/B2-R architecture; historic B0-X only as provenance | One hosted session + one B Simulator session + B CI | No local native if fingerprint passes | Location/receipt/gesture only | Runtime drift, active writer, security/privacy failure |
| Prompt C | Shared blob checks, target a11y tests | Byte-identical C2A infrastructure | Combined C/final Simulator accessibility | No unless native change | Dynamic Type, VoiceOver, focus, feel | Stale screen finding or unprovable core path |
| Final product SHA | Clean SHA, ledger, focused critical guards, R1 guard, final CI | Every still-valid row | Final Simulator + pre-TF physical D8 | Local E6 only if fingerprint fails | D8 and final a11y | Red CI, stale backend, missing D8/R1/remote proof |
| TestFlight | R1 source/profile/SHA preflight | Accepted final source/backend/D8 | One canonical EAS build/linked submit | YES, one normal | Approval | Any identity/profile/auth/build/submission ambiguity |
| Physical TestFlight | Version/build identity | Final ledger | Short physical release sitting | No new build unless defect | YES | Crash, wrong backend, D8/accessibility/core failure |
| App Review | Metadata/reviewer-account/forms checklist | Exact processed TestFlight build | External submission/review | No unless Apple/binary defect | YES | Missing/inconsistent forms/account/screenshots or Apple rejection |

## Do Not Redo

| Proof | Why still valid | Invalidation trigger |
|---|---|---|
| R0 stable bundle ID/scheme/project mapping | Source config is fingerprinted and unchanged across named inputs. | Relevant `app.json`/`eas.json` change. |
| R0 stable When-In-Use/camera/photo/microphone/privacy source sanity | Guarded `app.json` source remains identical. | Permission/privacy/plugin/dependency change. |
| Simulator infrastructure/toolchain rediscovery | Authority branch resolves exactly and documents verified commands/failures. | Machine/Xcode/runtime/UDID/contract contradiction. |
| FIX4B mechanism on byte-identical sibling sheets | Exact production/guard/shared fingerprint. | Any row dependency changes. |
| MyWatched empty-state live scroll | Direct accepted evidence exists. | Modal/shared/shell/fixture change. |
| ActivityFeed XXXL error-banner scroll/Retry | Direct accepted follow-up evidence exists. | Activity/error/bridge/shared/shell fixture change. |
| FIX4F leaf Legend scroll/pull | Direct self-reported focused and human evidence exists at the published leaf; only one integrated-candidate composition pull remains. | Post-FIX4F Legend/shared/native/runtime/fixture change. |
| C2A shared announcement/focus primitives | No shared defect found and exact blobs can be checked cheaply. | Helper/root/consumer/platform change. |
| B2/B2-R architecture adjudication | Final authority is explicit. | B-0 source/runtime contradiction or scope change. |
| B0-X broad root-cause archaeology/log discovery | Historical provenance is already durable. | Do focused B-0 recheck, not broad rediscovery. |
| R1 design | Implementation exists and can be semantically compared. | R1 source/profile contract change. |
| Native build for R1 | Runtime/native projection is identical; scripts-only change. | Any native fingerprint change/ambiguity. |
| Hosted B proof after unrelated UI/R1 change | Backend fingerprint is independent of unrelated UI. | Relevant backend/client projection deploy/change. |
| Full sibling Simulator replay after unrelated SHA | Proof expires by fingerprint, not total SHA. | Target/shared/external dependency change. |
| Coverage after every focused edit | Coverage is integration CI, not iteration proof. | Counted-source/config change requiring prediction. |

## Future Retrieval

```bash
git fetch origin --prune
git show origin/codex/sol-test-economy-v2-20260830:qa-reports/2026-08-30_Sol_Test_Economy_V2.md
```

The report is architecture and procedure only. Unknown final Prompt-A source, installed-shell provenance, current hosted Prompt-B state, final D8, release-approval configuration, EAS/Apple credentials, final TestFlight artifact, and App Review state remain explicitly unproved.
