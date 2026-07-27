# SHIP-READY Phase 1 — 04 · App Store Readiness (Lens 4)

Banked incrementally: §A guidelines verification (research agent, live sources, all retrieved 2026-07-26) · §B parent config/asset pass · §C SQL sweep + Sky-applied artifacts · §D graded requirement-class table (synthesis).
Evidence discipline: §A claims carry source + retrieval date; §B claims are locally re-verified by the parent (commands shown); §C is `repo-inferred`. HONESTY FENCE: nothing here words policy/legal/moderation copy — structure only, Sky words it.

---

## §A Apple-guidelines verification (Lens 4a — web-verified against live pages, retrieved 2026-07-26)

### A-1 · Guideline 1.2 UGC — **FAIL (hard blocker)** [SR-001]
Live 1.2 requires ALL four for UGC apps: (a) filtering of objectionable material, (b) report mechanism + timely response, (c) block abusive users, (d) published contact info (short quote: "Published contact information so users can easily reach you"). AccessMap has none of (a)(b)(c); the mailto feedback modal plausibly satisfies (d) (plus ASC Support URL, SKY-SIDE). Anonymous UGC changes nothing — the four are unconditional (1.2's anonymity language only targets apps *primarily* for anonymous/random chat). ToS/EULA: not a published bullet, but 1.2 presupposes "your terms of service" and the standard 1.2 rejection letter (documented across developer forums, retrieved 2026-07-26) demands zero-tolerance terms agreement + ~24h report handling — treat as enforced-in-practice.
**Minimum compliant shape (structure only):** ① report-content control on every flag detail + every comment, feeding the existing admin queue; ② block/hide-author that works for anonymous authors too (client-side hide list keyed on report id is accepted practice); ③ a filtering layer (pre-publication keyword filter or hold-for-moderation is sufficient given admin takedown exists); ④ the missing admin-delete RLS policy on comments (so "timely response" is possible at all — see §C); ⑤ ToS/community-guidelines agreed at signup AND before first anonymous report (SKY WORDS ALL TEXT); ⑥ keep the contact modal + plain-text email. **Mechanism choice ROUTES to fork-briefs W1's option set** (auth-gated dispute is the pre-specced candidate for report-mechanics; Apple context now attached) — SKY DECISION on the how; the *that* is mandatory.

### A-2 · Guideline 5.1.1 — privacy link **FAIL** [SR-002] · account deletion **PRESENT with semantics GAP** [SR-010]
5.1.1(i): policy must be linked in ASC metadata AND "within the app in an easily accessible manner" — app.json-only fails the in-app half; add a visible link (Settings/About + near account creation). 5.1.1(v): the in-app Profile → Delete Account flow satisfies the *mechanism* requirement (per Apple's offering-account-deletion support page, retrieved 2026-07-26). GAP: that page frames deletion as the whole account record + associated personal data with no anonymization carve-out; AccessMap anonymizes public reports — AND the live privacy policy currently *promises full deletion of flags/photos*, a direct contradiction (see A-14). Shape: keep the flow; either also delete reports/photos, or offer the explicit user choice with clear disclosure — and make the policy say whichever is true (Sky words it).

### A-3 · Privacy manifests / required-reason APIs — **GAP (cheap fix; not the upload blocker it looks like)** [SR-003, SR-004]
ITMS-91053 (required-reason declarations) live since 2024-05-01. Per Apple's privacy-manifest docs (retrieved 2026-07-26): app-level PrivacyInfo.xcprivacy is NOT unconditionally required when pods carry manifests covering the flagged APIs — so the gitignored hand-written file being dropped by prebuild is *survivable* but fragile and currently dead weight. Empty `NSPrivacyCollectedDataTypes` is not a validator error (labels live in ASC, not the manifest) — it's a 5.1 accuracy liability. Shape: `ios.privacyManifests` in app.json (survives prebuild), populated collected-data-types matching reality, `NSPrivacyTracking=false`, app-code `NSPrivacyAccessedAPITypes` (UserDefaults/CA92.1 at minimum); then one archive + Xcode "Generate Privacy Report" check pre-submit (SKY-SIDE step).

### A-4 · Privacy nutrition labels — **SKY-SIDE, answer sheet ready** (§A-Sheet-A below)
All collection declarable under App Functionality, no tracking. Push tokens = Identifiers→Device ID (collected). Diagnostics = EMPTY (no crash SDK shipped — reconcile the policy's Sentry claim, A-14). "Linked to you" = Yes (signed-in content ties to account; declare conservatively despite anon path).

### A-5 · Age rating (2025 overhaul) — **SKY-SIDE, answer sheet ready** (§A-Sheet-B) — **timing tripwire**
Five tiers (4+/9+/13+/16+/18+); expanded questionnaire was due 2026-01-31 for existing apps. **2026-07-09: Apple added social-media capability questions** (ability to "redistribute, amplify, or interact with user-generated content" via feed/discovery) — **mandatory for new-app submissions beginning September 2026**; social-media=Yes forces 13+ minimum. A public browsable map of user reports with comments sits close to that definition → plan on **13+**. No location-sharing rating question could be verified to exist (location publicity is 5.1.x, not rating).

### A-6 · Accessibility Nutrition Labels — **optional today; DECLARE (credibility)** — new opportunity row
ASC self-serve, optional as of 2026-07-26 (no verified deadline; Apple messaging says eventually expected). Nine declarable features. For an accessibility app an empty label is a credibility problem: declare only device-verified ones — realistically VoiceOver, Larger Text/Dynamic Type, Dark Interface, Sufficient Contrast, Reduced Motion — AFTER the consolidated device gate runs (ties to the NEEDS-SKY-DEVICE list). Do not declare Captions/Audio Descriptions (no media).

### A-7 · iPad / ITMS-90474 — **FAIL as configured; one-line fix** [SR-012] + **SDK floor** (new)
Portrait-only + `supportsTablet:true` + no `requireFullScreen` is still the live ITMS-90474 upload-failure shape (no retirement notice found). TN3192 (retrieved 2026-07-26): `UIRequiresFullScreen` deprecated starting iPadOS 26 but **still honored today**; launch screens become required for iOS 27+ SDK submissions (future note). **NEW FACT: since 2026-04-28 App Store uploads must be built with Xcode 26 / iOS 26 SDK** — the EAS build image must be Xcode 26 (§B verifies what eas.json pins). Recommended v1 shape: **`supportsTablet:false`** (iPhone-only; runs on iPad in compatibility mode; sidesteps ITMS-90474 AND the iPadOS-26 windowing migration debt) — OR keep iPad + `ios.requireFullScreen:true` and eat the tablet QA surface. SKY DECISION (one line either way).

### A-8 · Guideline 4.8 Login Services — **N-A / PASS** [SR-026]
Live 4.8 triggers only for third-party/social login; exclusively-own-account-system apps are explicitly exempt. Email+password Supabase = exempt; no Sign in with Apple obligation. Adjacent reviewer-dead-end risk (not a violation): **no password-reset flow exists** — ship at least `resetPasswordForEmail` email reset (functional finding, graded in §D).

### A-9 · 2.1 completeness / 4.2 minimum functionality — **demo account GAP-BLOCKING** [SR-017] · 4.2 **PASS**
Live 2.1(a): if the app has a login, review needs working demo credentials; guest browsing does NOT exempt login-gated features (comments, deletion, signed-in reporting must be reviewable). Today the reviewer account exists only as an unapplied PROPOSE-ONLY migration = dead credentials. SKY-SIDE: apply it (her hands, live-DB), verify login, put credentials in App Review notes (+ "Browse without an account" walkthrough line — Sky words the notes). 4.2: comfortably cleared (real native utility).

### A-10 · Export compliance — **PASS** [SR-023]
Current ASC export-compliance reference: OS-provided TLS only ⇒ no docs, no France declaration; `ITSAppUsesNonExemptEncryption=false` is the sanctioned self-classification. Holds while no pod ships non-exempt crypto (standard RN/Supabase stack qualifies).

### A-11 · Push 4.5.4 — **PASS (conditional)**
No required-for-function push (app fully usable denied); pushes transactional (status updates). No prompt-timing law (pre-permission explainer is HIG advice — app already has one). Condition: if marketing pushes ever ship, explicit opt-in first.

### A-12 · Location 5.1.5 — **PASS (conditional)** + disclosure sub-item
Location is centrally relevant; consent + purpose met by the honest when-in-use string. Conditions: graceful denied behavior (guest browsing works; manual pin-drop fallback is the clean reporting shape — cross-check Lens 1 findings), and because **precise coordinates become public map content**, the submit-report UI should say so explicitly near submit (also services 5.1.2 consent-to-share). Structure-only: one disclosure line adjacent to submit; Sky words it. (Cross-check: anon banner + heat disclaimer exist; a coordinates-become-public line near submit is the gap to verify in Lens 1.)

### A-13 · EU DSA trader — **SKY-SIDE (not a US/Canada blocker)**
Since Feb 2024 every developer declares trader-or-not for EU storefronts; non-compliant apps removed from EU since 2025-02-17. Options: declare non-trader (free app, no published address) or deselect EU territories for v1.

### A-14 · Privacy policy page — **LIVE (200) but DRIFTED — truth-pass required (SKY WORDS IT)** — new rows
Fetched 2026-07-26 ("Last updated May 30, 2026"). Accurate on: EXIF/GPS stripping, retention windows, PIPEDA/GDPR/CCPA requests, contact + 30-day response, under-13 clause. **Drift vs the shipped app:** ① claims Sentry crash reporting — none ships; ② claims screen-visit analytics — none ships; ③ anonymous account-less reporting never mentioned (a headline feature collecting data with no account); ④ push tokens never mentioned; ⑤ says deletion removes all flags/photos — app anonymizes instead (collides with A-2); ⑥ implies an account is required to post. 5.1.1(i) requires accuracy ⇒ policy truth-pass BEFORE locking Sheet-A labels (reviewers cross-read policy vs labels). Structure list above is the rewrite checklist; Sky words every sentence.

### §A-Sheet-A · Privacy Nutrition Label answers (ready to enter in ASC)
"Collect data?" → **Yes**. All rows: Purpose = App Functionality, Tracking = No.
| ASC data type | Collect? | Linked to user? |
|---|---|---|
| Location → Precise Location | Yes | Yes (conservative: signed-in reports tie to account) |
| Contact Info → Email Address | Yes | Yes |
| Contact Info → Name (display name) | Yes (verify repo — display names exist) | Yes |
| User Content → Photos or Videos | Yes | Yes |
| User Content → Other User Content (reports, comments) | Yes | Yes |
| Identifiers → User ID | Yes | Yes |
| Identifiers → Device ID (Expo push token) | Yes | Yes |
| Diagnostics → Crash Data | **No** (no crash SDK — fix policy claim first) | — |
| Usage Data | **No** (no analytics — ditto) | — |
| All other categories | No | — |
Tracking section: **No data used for tracking** (matches NSPrivacyTracking=false). Labels are ASC-side, editable without a new binary.

### §A-Sheet-B · Age-rating questionnaire draft
Parental controls **No** · age assurance **No** · UGC **Yes** · messaging/chat **No** (public comments, not private chat) · advertising **No** · unrestricted web **No** · **social media: honest answer likely Yes** under the 2026-07-09 definition (public map + discovery of others' UGC) ⇒ **13+ minimum**; "No" defensible only if comments ship disabled · medical/wellness **None** · violence/mature/horror **None** (credible only once A-1 moderation exists) · gambling/contests **No** · Made for Kids **No**. Expected outcome: **13+**. Timing: submitting in/after **2026-09** makes the social questions mandatory at first submission.

### §A honesty flags (NOT-VERIFIED items)
Exact per-question ASC questionnaire wording (visible only inside ASC); 13+-social consequence read via Apple news + same-day trade press; no deadline verified for Accessibility Nutrition Labels; whether App Review cross-checks manifest collected-types vs labels: no official statement found.

---

## §B Parent config/asset verification pass (every row locally re-verified this session; commands noted)

| # | Item | Status | Evidence (local) | Fix shape / owner |
|---|---|---|---|---|
| B-1 | App icon | **GAP-BLOCKING** [SR-011] | `sips`: 1024×1024, `hasAlpha: yes` — ITMS-90717 upload-failure shape | Re-export PNG without alpha (flatten onto brand blue). Phase-2 buildable (asset swap). |
| B-2 | iPad orientation | **GAP-BLOCKING** [SR-012] | app.json: `orientation: portrait`, `supportsTablet: true`, NO `requireFullScreen` key | SKY DECISION per §A-7: `supportsTablet:false` (rec) OR `ios.requireFullScreen:true`. One-line app.json patch either way; Phase-2 buildable after pick. |
| B-3 | Purpose strings — authored 3 | **PRESENT** | app.json infoPlist: location-when-in-use, camera, photo-library — specific + honest wording | Keep. |
| B-4 | Purpose strings — boilerplate 4 | **GAP-RECOMMENDED** [SR-005] | Local prebuilt Info.plist carries `NSMicrophoneUsageDescription` ("Allow $(PRODUCT_NAME)…"), 2× Always-location, `NSPhotoLibraryAddUsageDescription` — plugin defaults; regenerate on every EAS prebuild (Expo autolinks dependency plugins even when not in `plugins[]`) | Artifact B-α below (plugin props set to `false`) + B-6 removal kills the add-photos string at the root. Phase-2 buildable. |
| B-5 | Privacy manifest | **GAP-RECOMMENDED** [SR-003/004] | No `ios.privacyManifests` in app.json; hand-written `ios/AccessMap/PrivacyInfo.xcprivacy` is untracked (`git ls-files ios/` = 0) with EMPTY collected-types | Artifact B-β below (app.json block, survives prebuild). SKY-SIDE finish: one archive + Xcode Generate Privacy Report pre-submit. |
| B-6 | `expo-media-library` dep | **GAP-RECOMMENDED** [SR-016] | package.json:44 present; ZERO src imports (only a comment at flags.ts:120 saying the old impl was a production no-op) | Remove the dependency (kills autolinked manifest surface + NSPhotoLibraryAddUsageDescription). Phase-2 buildable (`npm uninstall` + pod regen on EAS). |
| B-7 | Ship scripts × eas.json | **GAP-RECOMMENDED** [SR-015] | package.json:21 `deploy:testflight` → `eas submit --profile preview`; eas.json submit profiles = `['production']` ONLY → the documented TestFlight ship command fails | Add `submit.testflight` (mirror production ascAppId) or point the script at `--profile production`. Phase-2 buildable. |
| B-8 | EAS image / Xcode 26 floor | **SKY-VERIFY** (new — from §A-7) | eas.json pins NO `image` on any profile → resolves to EAS defaults at build time; the 2026-04-28 Apple floor requires Xcode 26/iOS 26 SDK | SKY-SIDE: confirm the next EAS build resolves to an Xcode-26 image (or pin `"image"` explicitly). Cannot be verified from the repo. |
| B-9 | Splash / launch screen | **PRESENT + note** [SR-013] | Single splash block (icon `contain` on `#1466E0`); Expo generates the storyboard (satisfies today); NO dark variant; TN3192: launch screen required for iOS 27+ SDK era (future) | Optional polish: dark splash variant. LOW. |
| B-10 | Android adaptive icon | **note (Android-only)** [SR-014] | `adaptiveIcon: {backgroundColor: '#ffffff'}` — no `foregroundImage` | Not iOS-blocking; fix before any Play submission. |
| B-11 | Crash reporting | **GAP-RECOMMENDED** [SR-006] | `src/lib/sentry.ts` = no-op stub; `App.tsx:207-208` comment still claims "App is wrapped by Sentry.wrap" (verified verbatim); `SENTRY_DISABLE_AUTO_UPLOAD` vestigial in eas.json preview+testflight | Re-add a crash reporter in Phase 2 (or accept release blindness knowingly — SKY DECISION); fix the stale comment either way. Post-submit you are blind to reviewer crashes without it. |
| B-12 | Push wiring | **PRESENT + 2 rows** [SR-018/020] | Entitlements file (local-only): `aps-environment: development` — EAS regenerates per profile+credentials (store builds get production APNs) → SKY-VERIFY on the store build; `PUSH_NOTIF_TYPES_ENABLED:false` keeps the categories screen dead because nothing reads saved prefs (SR-020) | APNs key state = SKY-SIDE (EAS credentials). Dead surface = Phase-2 decision row (wire or remove). |
| B-13 | Export compliance | **PRESENT** [SR-023] | `ITSAppUsesNonExemptEncryption: false` in app.json infoPlist (+ mirrored in local Info.plist); §A-10 confirms sufficiency | Keep true while no custom-crypto pod ships. |
| B-14 | Reviewer demo account | **GAP-BLOCKING (SKY-SIDE)** [SR-017] | `2026-05-31_reviewer_test_account.sql` header: PROPOSE-ONLY, manual Auth-dashboard step, password never committed (good hygiene) | SKY-SIDE per §A-9: provision, apply, verify login, credentials into review notes. |
| B-15 | `verify_jwt` for delete-account | **GAP-RECOMMENDED** [SR-010] | No root `supabase/config.toml` (verified); only `functions/notify-flag-status/config.toml` (`verify_jwt=false`) exists | Artifact B-γ below (config.toml, Sky-applied at deploy time — function config). |
| B-16 | Stale doc/docblock claims | **GAP-LOW** [SR-019] | `docs/TESTFLIGHT_ACTION_ITEMS.md:127` "requires users to sign in before using any features" (verbatim, stale — guest exists); `src/lib/flags.ts:898` "table ensures only authenticated users can read rows" (stale since 2026-05-29 anon SELECT; note: fork-briefs cited :600-604 — the docblock MOVED to ~:892-900 after the photo-privacy fix added lines) | Phase-2 doc fixes; keep truth-of-record clean before review notes are written from these docs. |
| B-17 | In-app privacy-policy link | **GAP-BLOCKING** [SR-002] | app.json:5 `privacyPolicyUrl` present; AboutScreen has prose only (no Linking.openURL of the policy anywhere in src — re-verified via grep) | Phase-2: visible link rows (Settings + About + near sign-up). §A-2. |

### §B artifacts (Sky-applied / Phase-2-consumable; structure only)

**B-α — app.json plugin-prop overrides (kills boilerplate purpose strings at the source):**
```json
"plugins": [
  "expo-notifications",
  ["expo-location", {
    "locationWhenInUsePermission": "AccessMap uses your location to show nearby accessibility flags and to attach your location when you report a new flag.",
    "locationAlwaysPermission": false,
    "locationAlwaysAndWhenInUsePermission": false
  }],
  ["expo-image-picker", {
    "photosPermission": "AccessMap needs photo access to attach images to accessibility reports.",
    "cameraPermission": "AccessMap uses the camera to capture photos of accessibility barriers.",
    "microphonePermission": false
  }],
  "expo-font"
]
```
(`false` removes the key per Expo plugin convention. Pair with B-6 removal so `NSPhotoLibraryAddUsageDescription` disappears with its package. Verify post-prebuild Info.plist on the next build — SKY-VERIFY step.)

**B-β — app.json `ios.privacyManifests` block (survives prebuild; factual categories only):**
```json
"privacyManifests": {
  "NSPrivacyTracking": false,
  "NSPrivacyTrackingDomains": [],
  "NSPrivacyCollectedDataTypes": [
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypePreciseLocation", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeEmailAddress", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeName", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypePhotosorVideos", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeOtherUserContent", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeUserID", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeDeviceID", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] }
  ],
  "NSPrivacyAccessedAPITypes": [
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults", "NSPrivacyAccessedAPITypeReasons": ["CA92.1"] },
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp", "NSPrivacyAccessedAPITypeReasons": ["C617.1"] },
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryDiskSpace", "NSPrivacyAccessedAPITypeReasons": ["E174.1"] },
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime", "NSPrivacyAccessedAPITypeReasons": ["35F9.1"] }
  ]
}
```
(API categories seeded from the existing hand-written manifest; final set MUST be reconciled against Xcode's Generate Privacy Report on a real archive — SKY-SIDE.)

**B-γ — root `supabase/config.toml` (locks delete-account JWT verification into VC):**
```toml
[functions.delete-account]
verify_jwt = true

[functions.notify-flag-status]
verify_jwt = false  # webhook-secret verified in-function (existing behavior, now recorded at root)

[functions.send-push-notification]
verify_jwt = true
```
(Rollback: delete the file — deploy-time config only. Verify `send-push-notification`'s intended auth mode before applying that row — flagged for the SQL/functions sweep.)

## §C SQL sweep + Sky-applied artifacts (Lens 4b)

### §C-0 · LIVE-DB drift check (J-3: read-only MCP calls only — `list_projects`/`get_project_url`/`list_migrations`/`get_advisors`/`list_tables`; binding PROVEN: project `kldlwszpfkdmsjrjhjym` "Accessable City App" == the host in the app's `EXPO_PUBLIC_SUPABASE_URL`; run 2026-07-26)

**Applied-migrations ledger (55 entries, latest `20260603 admin_role`):** repo-vs-live reconciliation highlights —
- `trust_score_system` APPLIED live `20260531` ⇒ **SR-008 (points-trigger NULL trap) and SR-009 (`flag_verifications` policy trap) are LIVE IN PROD**, not just repo text.
- Both repo `*_PROPOSED.sql` files (06-09 status guard, 06-18 leaderboard RPC) absent from the live ledger ✓ consistent with headers.
- **Chunks applied live with NO same-named repo file**: `restore_flags_auth_user_only_triage_unblock_20260601`, `flags_close_nonowner_delete_and_fix_triage_20260601`, `notify_flag_status_webhook_trigger` (20260529) — presumably the 06-01 consolidation session's "ALSO APPLIED" chunks, but the repo carries no file per chunk ⇒ SR-039 upgraded with live evidence (repo cannot reproduce the live policy set by file replay alone).
- Several names applied 2×+ (`data_layer_hardening`, `status_update_trigger` family, `flag_reopen_requests`) — application order ≠ repo file dates; the SQL sweep must reconcile FINAL live state per object, not file text alone.
- `verify_webhook_secret` exists live (advisor sees it) though no ledger row bears that name — applied inside another chunk.

**Supabase security advisors (live linter, 6 WARN):**
1. **`flags status update by any authenticated` (UPDATE) is `USING (true) WITH CHECK (true)`** — advisor: effectively bypasses RLS for authenticated. If the column-pinning lives only in the non-owner-status trigger, fine-BY-DESIGN (community triage); if NOT, any signed-in user can rewrite any flag's content — **SQL sweep must determine which guard is actually live**. Potentially HIGH for a UGC app.
2. **`verify_webhook_secret(text)` executable by `anon` AND `authenticated` (SECURITY DEFINER)** — a public secret-comparison oracle via `/rest/v1/rpc/` — brute-forceable; ties to SR-018 (hardcoded webhook secrets). Fix shape: `REVOKE EXECUTE FROM anon, authenticated` (artifact from the sweep).
3. `increment_reopen_request` authenticated-executable — matches repo grants (intended).
4. `log_realtime_event` authenticated-executable — telemetry; confirm intended.
5. **Auth: Leaked-password protection DISABLED** — SKY-SIDE dashboard toggle (HaveIBeenPwned check); cheap hardening before review.

**⚠️ §C-0a · UN-VERSIONED LIVE POLICY — `flags_user_scoped` (live-verified; the single most important thing the drift check found)**
The live performance advisor names a policy `flags_user_scoped` on `public.flags` applying to **anon INSERT, anon SELECT, authenticated INSERT, authenticated SELECT, authenticated UPDATE, authenticated DELETE** — i.e. an ALL-verbs policy. `grep -rn "flags_user_scoped" supabase/ src/` returns **ZERO hits**: it exists in production and in no file in the repository. Because Postgres combines permissive policies with OR, this policy can only *widen* access beyond what every reviewed file shows — so the repo's policy set is a **lower bound** on live permissions, not the truth. Consequences: (a) every access-control conclusion drawn from repo SQL alone is unsound until this policy's body is read; (b) it is invisible to code review, to CI, and to any future re-audit; (c) it also triggers the RLS-initplan performance warning, so it re-evaluates `auth.uid()` per row on the app's hottest table.
**Grade: HIGH (security-review-blocking for a UGC app; not itself an Apple-submission blocker).** **SKY-SIDE (read-only, 2 min):** in the Supabase SQL editor run
```sql
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname='public' and tablename='flags' order by policyname;
```
then paste the result into DECISIONS §SKY. Phase 2 can then either (i) commit the policy to a migration so repo == prod, or (ii) drop it if it is a leftover — **not decidable by the agent, and not applicable without Sky.** Same query is worth running for every table before submission (the advisor also shows `feedback_select_*`, `flags readable by anon`, `admin delete any flag`, `flags owner edit open` co-existing — those DO exist in repo files).

**Performance advisors (live, INFO/WARN — not submission blockers; recorded for the improvement slate):** RLS-initplan (`auth.<fn>()` re-evaluated per row) on `flags_user_scoped`, `flag_photos` ×2, `push_tokens` ×4, `notification_preferences` ×3, `flag_status_history`, `flag_comments` ×2 — the fix is the `(select auth.uid())` wrapper the repo already applies elsewhere (the 05-23 initplan migration did this for some policies; these are the ones it missed or that were added later). Multiple-permissive-policies on flags/feedback/users/history tables. 10 never-used indexes (incl. `flag_verifications_verifier_id_idx` — consistent with that table being dead).

**Live tables (13, ALL `rls_enabled: true`):** users(4 rows) · flags(18) · feedback(0; table comment says "dual-write companion to the mailto flow" — cross-check whether the app actually dual-writes: walkers trace) · flag_status_history(18) · push_tokens(2) · realtime_subscribe_log(67) · flag_edit_history(0) · notification_preferences(0) · flag_comments(0) · flag_photos(0) · point_events(27) · flag_verifications(**0 — dead-code status confirmed live**) · comment_votes(0).

### §C-0b · UGC surface inventory (parent, local verification — feeds §A-1 / SR-001)

Free-text fields a reviewer can fill with anything, all with **length caps only, zero content filtering** (grep for profanity/moderation/blocklist libraries across `src/`: **zero hits** — the single match is an unrelated comment at `flags.ts:1298`):

| Surface | Cap | Who can write | Public? |
|---|---|---|---|
| Flag description (`ReportFlagModal.tsx:765`) | 2000 chars | **anyone, incl. account-less anonymous** | yes — on the public map |
| Flag photo | — | signed-in only (anon forced null) | yes |
| Comment (`FlagDetailModal.tsx:1389`, `MAX_COMMENT_LENGTH`; edit path :1054 = 2000) | 280 / 2000 | signed-in | yes |
| Display name (`ProfileScreen.tsx:1548`) | 60 chars | signed-in | yes — rendered on the **Leaderboard** |
| Feedback (`feedbackStore.ts:50/88` — the live table comment's "dual-write companion to the mailto flow" is CONFIRMED in repo) | — | user | no (private to Sky) |

**Live-data proof that this is not theoretical:** the production dataset visible in the guest walk contains a nonsense entry — category "Other", severity 5 of 5, description `BUMBAKLOT`, status **Verified** — sitting on the public map. It is harmless, but it is exactly the shape a reviewer points at when applying 1.2: arbitrary anonymous text, promoted to Verified, with no way for a user to report it and no filter that could have caught it. Tag: web-verified (guest walk, 2026-07-26).

### §C-1 · Repo sweep results + artifacts — **COMPLETE (recovered)**

> **Provenance:** the sweep agent finished 18:30; its report was never banked before the 18:32 window death. Recovered verbatim from the transcript into **`04b_sql_sweep_lens4b_RECOVERED.md`** (794 lines — the full text, incl. all fenced artifacts). This section is the SR-id-assigned summary; the SR rows below point into 04b by §-number.

**Sweep scope delivered:** 93 NULL-comparison sites enumerated (7 defective, 86 clean), per-table RLS matrix for all 13 tables (04b §B), 11 Sky-applied artifacts each with rollback + read-only verify (04b §C), a 9-query read-only SKY-SIDE verification block for the Supabase SQL editor (04b §E — **this is the paste-block that settles every open question, incl. `flags_user_scoped`**), and an explicit §NOT-VERIFIED. Source-of-truth order honored (migrations > schema.sql; deprecated files excluded). All repo-inferred except where §C-0's live data corroborates (tagged per row).

**Reconciliation vs §C-0 (the questions §C-0 posed, now answered):**
- §C-0 advisor WARN 1 (`USING(true) WITH CHECK(true)` triage policy) → **the column lock IS trigger-only, and it has an allow-by-omission hole**: `context_tags` + every post-2026-05-23 column are rewritable by any signed-in user (SR-086). Blast radius = filter/semantic pollution, not XSS (`isValidTag` at `FlagDetailModal.tsx:395`).
- §C-0 advisor WARN 2 (`verify_webhook_secret` oracle) → confirmed unnecessary grant; the only caller uses the service-role key. Artifact 04b §C-4. Companion SKY-SIDE: rotate secret + delete the dashboard DB-webhook + enable leaked-password protection.
- §C-0a (`flags_user_scoped` un-versioned live policy) → the sweep **quarantined it correctly**: its §B matrix carries an epistemic CONTAMINATION header (repo = lower bound on live permissions; the `flags` row's cells marked UNKNOWN), no artifact touches it, and 04b §E queries 1+9 are the 2-minute Sky-side read that settles whether it re-opens non-owner DELETE (§F-1 hypothesis, explicitly not asserted as fact).

**Findings — new SR-ids assigned (SR-083…090; full detail at the cited 04b §):**

| SR | Tier | Cohort | Evidence | Where (04b §) | What |
|---|---|---|---|---|---|
| **SR-086** | **MED-HIGH** | signed-in | live-verified | A2-1, artifact C-6 | The only column lock on `flags` UPDATE (the non-owner revert trigger) omits `context_tags`, `id`, and every column added after 2026-05-23 — any signed-in user can rewrite any flag's disability/context tags (drives MapScreen's filter). Artifact executes the 06-01 consolidation's own never-done follow-up #3. |
| **SR-088** | MED | all | repo-inferred + live-corroborated | A4-1, artifact C-9 | **Status history is doubly dead**: the live `handle_flag_status_change` (trust_score body) lost the history INSERT, and even the 18 creation rows are unreadable (base-table SELECT revoked ⇒ the `security_invoker` view 42501s ⇒ `StatusHistoryModal` shows "No history yet" forever). Two-half artifact: column-scoped grant (standalone-safe) + 6-line history INSERT to fold into whichever trigger body Sky applies. |
| **SR-089** | MED | — | repo-inferred | A4-2 | Duplicate webhook triggers (pg_net + dashboard DB-webhook) — the 06-01 follow-up never remediated ⇒ predicted **two push notifications per status change**. 04b §E query 4 settles it; fix shape = delete the dashboard webhook (also closes the SR-018 `tgargs` secret residue). |
| **SR-090** | MED (latent; HIGH if flag-editing ships) | signed-in owner | live-verified existence | A4-3, artifact C-10 | `flags owner edit open` carries the same mis-correlated subquery (`where id = flags.id` self-binds) that live-broke the triage policy on 06-01 ⇒ SQLSTATE 21000 for an owner UPDATEing their own open flag. Reachability today UNCONFIRMED (cut mid-check — TasksScreen wires self-triage as supported; whether an earlier gate hides it is unverified). Cheaper alternative: drop the policy until owner-edit ships (SKY-DECISION). |
| **SR-087** | MED | guest/anon | repo-inferred | A2-2, artifact C-7 | `feedback` is a **second** unthrottled anon write surface (policy has no `TO` clause ⇒ role `public`; reachable from the global header for guests). The anon surface is {flags SELECT, flags INSERT, feedback INSERT} — not the two the registry assumed. |
| **SR-083** | LOW | — | repo-inferred | A1-5 | `handle_flag_photo_added` owner guard inverts under NULL `auth.uid()` (service-role/dashboard inserts) ⇒ +3 to the flag owner for someone else's insert. Unreachable via REST. |
| **SR-084** | LOW | — | repo-inferred | A1-6 | `flag_edit_history` INSERT policy NULL-collapses for anon flags — same class as SR-009; dead table (0 rows, no app writer). |
| **SR-085** | NOTE | — | repo-inferred | A1-7 | `handle_comment_vote_added` self-vote guard NULLs if the parent comment vanishes mid-txn ⇒ NOT-NULL violation aborts the vote; FK CASCADE makes it near-unreachable. Robustness nit. |

**Evidence added under existing SRs:** SR-008 (ONE live object, not three; OA body must fold in the C-9(ii) history INSERT — apply-order law at 04b §C-1) · SR-009 (denial live-corroborated; fix-or-drop artifact + OPTION 2 drop, SKY-DECISION) · SR-024 (accident-of-NULL made explicit, behavior-preserving artifact C-3, also clears 2 initplan WARNs) · SR-007 (**anon rate-limit no-op confirmed at `flag_creation_rate_limit.sql:20`; RECOMMENDED artifact C-5 option (a) global sliding window; option (b) per-IP explicitly NOT-VERIFIED as designable**) · SR-001 (RLS half: no admin comment-delete — artifact C-8, mirrors admin_role.sql exactly) · SR-018 (oracle revoke C-4; dashboard-webhook `tgargs` copy NOT-VERIFIED, presumed exposed; rotation never evidenced) · SR-039 (repo cannot reproduce live by replay: ≥3 live chunks + 2 live functions have no repo text; 2 PROPOSE-ONLY headers were demonstrably applied — "header lies" ×2; recommend `pg_dump --schema-only` regeneration) · SR-020 (notification_preferences among 4 dead tables — disposition SKY-DECISION ×4).

**⚠️ Anti-finding (DO-NOT-FIX, must survive into every future null-safety pass):** `enforce_flag_status_only_for_non_owner`'s `auth.uid() is null` early-out is **load-bearing** — the delete-account edge function anonymizes flags as service_role (NULL `auth.uid()`); hardening that line to `IS DISTINCT FROM` would revert `user_id` back to the deleted user's UUID and silently break account-deletion anonymization (SR-010). Recorded verbatim at 04b §A Class-1.

**CHECKS-PASSED (04b §D, selected):** 16/16 DEFINER functions pin `search_path` (live-corroborated: zero advisor warnings) · 14/14 trigger functions REVOKE EXECUTE from client roles · RLS enabled 13/13 · 0 `GRANT ALL` · 0 hardcoded secrets at `512494a` · recursion guard on the one self-writing trigger · BEFORE/AFTER correctness 11/11 · storage upsert:false ↔ no-UPDATE-policy agreement.

## §D Graded requirement-class table (synthesis of §A+§B+§C — one row per requirement class; action-ordered view lives in 05)

Grades: **PRESENT** (verified satisfied) · **GAP-BLOCKING** (submit fails or rejection highly likely until fixed) · **GAP-RECOMMENDED** (should fix; ⚠ = blocking-adjacent with reasoning) · **SKY-SIDE** (only she can do it). Detail lives at the cited §; rows do not repeat it.

| Requirement class | Grade | SRs | Detail | One-line state |
|---|---|---|---|---|
| UGC moderation (Guideline 1.2) | **GAP-BLOCKING** | SR-001 | §A-1, §C-0b, 04b §C-8 | 0 of the 3 in-app requirements exist (filter/report/block); contact plausibly present; mechanism choice routes to fork-brief W1 (SKY DECISION on how; the *that* is mandatory). DB half (admin comment-delete) pre-specced. |
| In-app privacy-policy link (5.1.1(i)) | **GAP-BLOCKING** | SR-002 | §A-2, B-17 | Metadata URL exists; zero in-app link (grep-verified). Phase-2: visible rows in Settings + About + near sign-up. |
| Privacy-policy accuracy (5.1.1(i)) | **GAP-BLOCKING (SKY WORDS)** | — | §A-14 | Live page drifted 6 ways vs the shipped app (claims Sentry + analytics that don't ship; promises full deletion the app doesn't do; omits anon reporting + push tokens). Truth-pass before labels lock. |
| App icon (ITMS-90717) | **GAP-BLOCKING** | SR-011 | B-1 | 1024×1024 but `hasAlpha: yes` — the upload-failure shape. Asset re-export, Phase-2 buildable. |
| iPad orientation (ITMS-90474) | **GAP-BLOCKING (1-line, SKY pick)** | SR-012 | §A-7, B-2 | Portrait + `supportsTablet:true` + no `requireFullScreen` = upload failure. Rec: `supportsTablet:false` for v1 (also sidesteps iPadOS-26 windowing debt + the 02 §T tablet-polish debt); alternative `requireFullScreen:true`. |
| Reviewer demo account (2.1(a)) | **GAP-BLOCKING (SKY-SIDE)** | SR-017 | §A-9, B-14 | Exists only as a PROPOSE-ONLY migration = dead credentials. Sky provisions + applies + verifies login + puts creds in review notes. |
| Reviewer-visible dead feature: comments (2.1 bug-free) | **GAP-BLOCKING** | SR-092 | 01 §T | Every flag detail shows "Couldn't load comments"+Retry against prod, all cohorts — first thing a reviewer sees in detail view. One-line embed-hint fix (`users!flag_comments_user_id_fkey`). |
| Purpose strings — authored 3 | **PRESENT** | — | B-3 | Location/camera/photo-library: specific, honest. |
| Purpose strings — boilerplate 4 (incl. microphone for a nonexistent feature) | **GAP-RECOMMENDED** | SR-005 | B-4, artifact B-α | Plugin defaults regenerate on every prebuild; B-α kills them at the source (+ B-6 removes the add-photos string with its package). |
| Privacy manifest + required-reason APIs | **GAP-RECOMMENDED** | SR-003/004 | §A-3, B-5, artifact B-β | Survivable without it (pod manifests cover flagged APIs) but the hand-written file is untracked + dead; B-β makes it durable in app.json. SKY-SIDE finish: Xcode Generate Privacy Report on a real archive. |
| Nutrition labels | **SKY-SIDE (sheet ready)** | — | §A-4, §A-Sheet-A | Enter in ASC after the policy truth-pass; Diagnostics/Usage = No until a crash SDK ships. |
| Account deletion (5.1.1(v)) | **PRESENT + semantics gap ⚠** | SR-010, SR-049, SR-051, SR-059-062 | §A-2, 01 §P | Mechanism present end-to-end + FK-safe. ⚠ Blocking-adjacent residue: the public avatar (a face photo) + all flag photos survive deletion forever and become un-deletable (SR-049) — collides with the dialog's promise, the policy's claim, and 5.1.1(v)'s framing. Fix = edge-function Storage sweep (Phase-2/Dana). Dialog re-tap bug SR-051 rides along. |
| Anon-throttle enforcement locus | **GAP-RECOMMENDED ⚠** | SR-007, SR-087 | 04b §A1-4/A2-2, artifact C-5/C-7 | Server cap is a NULL-collapse no-op for the whole anon cohort; the only throttle is user-clearable AsyncStorage. Not a written Apple rule ⇒ not BLOCKING; ⚠ because it's the abuse surface 1.2 moderation presumes and a one-file fix (option (a), pre-specced). `feedback` is a second uncapped anon surface (C-7). |
| SQL null-safety class + RLS posture | **GAP-RECOMMENDED** (security-review class) | SR-008/009/024/086/088/090, SR-083-085 | 04b §A/§C | 7 defects, 11 artifacts pre-specced with rollbacks; the anti-finding (load-bearing NULL branch) recorded so no future pass breaks account deletion. Not Apple-visible; ship-quality. |
| **`flags_user_scoped` un-versioned live policy** | **SKY-SIDE (2-min read) ⚠** | SR-039 | §C-0a, 04b §E q1+q9 | The single biggest unknown: repo is a lower bound on live permissions until its body is read; could re-open non-owner DELETE. Paste-block ready. |
| Sign-in rules (4.8) | **PRESENT (N/A)** | SR-026 | §A-8 | Email+password only ⇒ exempt from Sign in with Apple. |
| Password reset (reviewer dead-end) | **GAP-RECOMMENDED ⚠** | SR-052 | §A-8, 01 §P | No reset flow + re-signup is an indistinguishable dead end; a reviewer who typos a password hits a wall. `resetPasswordForEmail` minimum. |
| Guest-cohort honesty on the reviewer path | **GAP-RECOMMENDED ⚠** | SR-093/094/095, SR-041 | 01 §T, 01 §H | The reviewer walks as guest first: triage buttons produce a FALSE "flag changed" dialog (SR-093), reopen submits into silence (SR-094), history claims "not yet enabled" (SR-095), location button goes dead after denial (SR-041). Each is a small client gate/copy fix; together they define the reviewer's first 5 minutes. |
| Crash reporting | **GAP-RECOMMENDED (SKY DECISION)** | SR-006 | B-11 | None ships (stub + stale comment claims otherwise). Re-add or knowingly accept release blindness; fix the comment either way. |
| Ship script × eas.json | **GAP-RECOMMENDED** | SR-015 | B-7 | Documented TestFlight command targets a submit profile that doesn't exist. |
| EAS image / Xcode-26 upload floor | **SKY-VERIFY** | — | §A-7, B-8 | Uploads must be Xcode 26-built since 2026-04-28; eas.json pins no image — confirm at next build or pin explicitly. |
| Launch screen / splash | **PRESENT (+LOW polish)** | SR-013 | B-9 | Storyboard generated; no dark variant (LOW). |
| Crash-free baseline / 4.2 minimum functionality | **PRESENT** | — | §A-9, 00 §5 | Real native utility; jest 2227/0 green; no known crashers in evidence. |
| Export compliance | **PRESENT** | SR-023 | §A-10, B-13 | `ITSAppUsesNonExemptEncryption:false` set; OS-TLS-only stack qualifies. |
| Push (4.5.4 + wiring) | **PRESENT + 2 rows** | SR-018/020 | §A-11, B-12 | Compliant design; store-build APNs state = SKY-VERIFY; dead categories screen = Phase-2 wire-or-remove. SR-089 duplicate-webhook risk pairs with 04b §E q4. |
| Age rating (2025 overhaul) | **SKY-SIDE (sheet ready)** | SR-022 | §A-5, §A-Sheet-B | Expect 13+; the social-media questions become mandatory for new submissions Sept 2026 — submitting before then avoids the harder form. |
| Accessibility Nutrition Labels | **SKY-SIDE (post-device-gate)** | — | §A-6, 02 §D device map | Declare only device-verified features; the D-A1…A13 list maps checks → declarable labels. |
| EU DSA trader status | **SKY-SIDE** | — | §A-13 | Declare non-trader or deselect EU for v1. |
| Dead tables / dead config disposition | **SKY-DECISION ×4** | SR-020/025, SR-098, SR-009/084 | 04b §F-4 | `flag_verifications`, `comment_votes` (already broke comments once), `flag_edit_history`, `notification_preferences`: keep-and-fix or drop before review. |
| Supabase dashboard hardening | **SKY-SIDE (cheap)** | SR-018 | §C-0, 04b C-4 | Leaked-password protection toggle; webhook-secret rotation + dashboard-webhook deletion; `verify_webhook_secret` revoke artifact ready. |
