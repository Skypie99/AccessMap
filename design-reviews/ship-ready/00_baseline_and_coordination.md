# SHIP-READY Phase 1 — Baseline & Coordination (STEP-0 bank)

Run: 2026-07-26 · Fable 5 max effort · READ-ONLY audit (changes nothing except `design-reviews/ship-ready/**`)
Repo: `/Users/skypie/AccessMap` · audited tip: **`main == origin/main == 512494a`**
Plan of record: `~/.claude/plans/ship-ready-phase-1-humble-koala.md`

---

## §1 Train state at audit start (verify-first, from git + ledgers)

| Train | State | Evidence |
|---|---|---|
| R2 build (bp1→bp17) | **MERGED to main** (whole stack; Sky ff'd) | `d43f867` ancestor of main; §P in `r2-audit/build-plan/DECISIONS.md` |
| BP16 copy-gate | Mechanics shipped (T18 `d9d3887`, T17 `8adb4d4`); **ZERO strings shipped — still GATED on Sky's §A picks + Jordan ratification** | DECISIONS.md §P BP16; §A ends awaiting picks |
| Device-tune 1–4 | **MERGED + PUSHED** (`f41def4` → `7887ce3` → `2030151` → `26ec0ac`); device-tune HANDOFF.md is STALE vs §M — trust §M + git | device-tune DECISIONS §M + correction |
| Photo-privacy fix | **MERGED** (`7887ce3` on main) — no longer awaiting Sky | git; qa-reports/2026-07-20_PhotoPrivacyFix.md |
| Root-cause / lucide | **No code fix exists or is needed**: dev-server-only crash; static export renders Map/Tasks (web gate restored BY METHOD) | r2-audit/01_feel_orientation.md:28; device-tune/render-index.md:5 |
| In-flight branches | Only **`fix/fmt-xcode26-local-sim-2026-07-25`** (fmt pod vs Xcode 26.6; local sim builds fail on untouched main). `r2/bp11` tip = documented dup-rebase wart (content on main via `eafd20e`); `fix/noscript-fallback`, `fix/tasksflagcard-date-flake` = stale/superseded | git branch --no-merged + DEPLOY-CHECKLIST §1.3 |
| Fork briefs | **All 4 forks UNDECIDED; no migration applied since 2026-06-18** (Fork-2 `IS DISTINCT FROM` NOT applied) | `fork-briefs/2026-07-16_…`; migrations dir newest = 2026-06-18_PROPOSED |

Working-tree conventions honored: ` D .claude/launch.json` pre-existing deletion left alone; `design-reviews/**` and `qa-reports/assets/**` untracked-by-design; **never `git clean -fd` here**.

## §2 Evidence-tier law (every finding carries one tag; wrong tier ⇒ invalid at synthesis)

Tags (aligned with the established render-index vocabulary): **web-verified** (functional truth proven on the static-export web build) · **web-approximated** (Chromium visual proxy — directional only) · **code-inferred** (source + jest) · **NEEDS-SKY-DEVICE**.

Hard assignments — these claim classes can NEVER be web-verified:
- Modal presentation style / swipe-dismiss / `accessibilityViewIsModal` / escape gestures → code-inferred + NEEDS-SKY-DEVICE
- Safe-area behavior (notch, home indicator) → code-inferred + NEEDS-SKY-DEVICE (insets are 0 on web)
- Dynamic Type → code-inferred + NEEDS-SKY-DEVICE (does not exist on web)
- VoiceOver truth → code-inferred; web ARIA confirms *presence only* (F-22: `accessibilityElementsHidden`/`importantForAccessibility` are no-ops on RN-web)
- Map interactions → engine-specific tag (web = Leaflet/supercluster; native = react-native-maps) — never cross-attribute
- Haptics → code-inferred
- **Binary-launch evidence this train: NONE** (sim tier down: fmt pod breaks local sim builds on untouched main under Xcode 26.6 — fix lives on the in-flight branch, SEAM; sim-MCP attach also broken). First launch proof = Sky's next EAS build.

Known-benign console noise on web: one `findNodeHandle is not supported on web` pageerror (never a finding). Dev-server lucide crash = pre-existing boundary, not a finding.
**Harness artifact (never a finding):** the audit's `python3 -m http.server` has no SPA rewrite, so typing a deep route URL (`/Home`, `/Tasks`) 404s; production `vercel.json` rewrites to `/index.html`. Navigate in-app.

## §3 Brink protocol + traffic law (live-walk rails)

- The static export talks to the **production** Supabase. Walks fill forms to the final CTA and assert enabled/disabled state, but **NEVER click a terminal mutating control** (Submit report/anonymously, post comment, delete, vote, send feedback). Submission efficacy = code+jest evidence, honestly tagged.
- No credentials handled ever → signed-in cohort is code-traced, never live-authenticated.
- Max ONE Nominatim geocode query per walk (rate-limit courtesy).
- Parent serves ONE export for all agents: fresh `npx expo export --platform web` (bundle is BAKED — stale export = lie), served on **:8082**.
- Walkers use the lab harness (`createRequire('/Users/skypie/AccessMap-material-lab/2026-07-02/tools/package.json')` → `require('playwright')`), own headless contexts; the session browser pane is parent-only. ≤2 concurrent live walkers.
- Sub-agents NEVER run jest (cite §5 baseline); targeted re-runs are parent-serialized.
- Single-writer banking: sub-agents return findings; only the parent writes files.

## §4 Alert/confirm web-shim map (pre-banked so walkers don't file web-artifacts)

`Alert.alert` is a silent no-op on react-native-web. Files routing through the shim (`src/lib/confirm.ts` — `confirm()`/`notify()` use `window.confirm`/`window.alert` on web): FilterPresetsModal · FlagDetailModal · HamburgerDrawer · MyWatchedModal · SavedPlacesModal · pushNotifications.ts · AdminScreen · MapScreen · ProfileScreen · ReportFlagModal · SettingsScreen · SignInScreen · TasksScreen.
Files with RAW `Alert.alert` calls (some also import the shim — per-call-site check needed): FeedbackModal · FilterPresetsModal · FlagDetailModal · SavedPlacesModal · errors.ts · feedback.ts · pushNotifications.ts · AdminScreen · MapScreen · ProfileScreen · ReportFlagModal · SettingsScreen · SignInScreen · TasksScreen.
**Rule: a dead Alert-gated path on web is NOT a finding** — downgrade to code-inferred and (only if user-reachable on web) note as a web-cohort completeness row.

## §5 Baseline (live run, this session — 2026-07-26 ~17:50, main @ 512494a)

| Gate | Result | Detail |
|---|---|---|
| `tsc --noEmit` | **EXIT 0** | clean |
| `eslint src` | **EXIT 0** | 79 problems (0 errors, **79 warnings**) — matches ledger baseline exactly |
| `jest --ci` | **EXIT 0** | **158/158 suites · 2227 passed · 0 failed · 84 todo · 26.7s** (load avg 4.88 — no F-13 flakes fired) |

Notes: jest emits a known "worker process has failed to exit gracefully" teardown warning (exit still 0 — noise, not a failure). Baseline == expected ledger numbers on all three gates; **any later deviation in this train is environment, not code** (nothing changes code in Phase 1).

## §6 Web gate (step 2 — PASSED)

- Fresh export: `npx expo export --platform web` EXIT 0 → `/private/tmp/claude-501/-Users-skypie/5cc1b03d-ae9d-4473-87d0-d523f41847a1/scratchpad/dist` (bundle BAKED from `512494a`)
- Served: `python3 -m http.server 8082` PID 11486 · HTTP 200
- Smoke (browser pane, 375×812, fresh profile): first-launch **OnboardingCards render** (Skip/Back/Next labeled) → **Home** (live prod flags list, report pill, editorial header) → **Tasks RENDERS** (lucide boundary confirmed lifted on export; search/filter/bulk + per-card triage controls present) → **Profile → GuestProfile** ("Sign in to your account") → **FullMap RENDERS** (Leaflet + attribution + full control set; NearbyFlagsModal auto-opened on no-location, correct fallback banner). Dark scheme: re-themes correctly (severity discs, dark banner palette). **Console errors: ZERO across all scenes, both themes.**
- Smoke-level observations handed to walkers (not yet findings): guest Tasks tree exposes Verify/Resolve/Reject buttons (brink-terminal — trace their gate, never click); background tab scenes stay in the ARIA tree (scene-inert check → Lens 2, F-22-aware).

## §7 SEAM / routing table (findings on these ROUTE, never re-litigated here)

| Owner | Surface owned | Route label |
|---|---|---|
| BP16 copy-gate (R2) | ALL drawer-surface strings, the 38-row proposed-strings table, S-8/O-5 picks, HelpModal k≥3 caveat | ROUTED→BP16 |
| Device-tune F-20 | Home banner slim (rec F-21 = leave alone) | ROUTED→device-tune |
| Device-tune F-22 (parked) | RN-web a11y-prop no-op gap, app-wide (`aria-hidden` fix pattern) | ROUTED→F-22 (cite, don't re-find) |
| `fix/fmt-xcode26-local-sim` | Local sim build failure + its QA doc | ROUTED→in-flight branch |
| Fork briefs (Sky) | Fork 1 proximity · Fork 5 trust/W1/W2 · Fork 2 points honesty (OA) · blocked_path icon | ROUTED→fork-briefs (new Apple context ATTACHES to existing option sets) |
| R1/R2 settled | Forks 1–9, D9/D10 device reads, all CLOSED ledger items | calibration failure if re-found |

Close-out ledgers loaded into every brief: `fable-audit/uplift-assets/P5-verification-evidence.md` (S1–S20) · `fable-audit/bench-assets/BENCH-4-verification-evidence.md` (B1–B11) · `r2-audit/build-plan/DECISIONS.md §P` + `DEPLOY-CHECKLIST.md` · conservation block `r2-audit/r2_part1_feel.md:16` · `device-tune/DECISIONS.md §P/§A/§M` · PROTECT list `fable-audit/partials/protect-merged.md` (17 items) · re-find guard `r2-audit/tools/briefs/common.md:54`.

## §8 Known-issues registry (SR-001…SR-039, banked BEFORE lens work; conservation check greps these)

Each must appear in exactly one of: a lens report finding · ROUTED · closed-with-evidence. Lens findings beyond this registry get SR-040+ (parent-assigned at banking).

**Submission / Lens 4:**
- **SR-001** UGC moderation absent: no report-objectionable-content, no block/mute, no filter, no ToS/EULA (admin takedown half exists; comments lack even admin-delete RLS). Apple 1.2 exposure. Mechanism candidate = fork-briefs W1 (ATTACH context, Sky decides).
- **SR-002** Privacy policy URL (`app.json:5`) never linked in-app (About has prose only) — 5.1.1 exposure.
- **SR-003** `ios/` gitignored ⇒ hand-written `ios/AccessMap/PrivacyInfo.xcprivacy` untracked and never ships via EAS prebuild; no `ios.privacyManifests` in app.json.
- **SR-004** `NSPrivacyCollectedDataTypes` empty vs actual collection (precise location, photos, email, UGC) — manifest + nutrition-label honesty gap.
- **SR-005** 4 boilerplate purpose strings regenerate on prebuild (`NSMicrophoneUsageDescription` for a feature the app lacks; 2× always-location; `NSPhotoLibraryAddUsageDescription`) — need app.json overrides (`microphonePermission:false`, etc.).
- **SR-006** No crash reporting (Sentry removed; `App.tsx:208` stale comment claims wrapped; `SENTRY_DISABLE_AUTO_UPLOAD` vestigial in eas.json) — release blindness.
- **SR-007** No server-side anon throttle: client 5/24h AsyncStorage (`anonRateLimit.ts`) clearable; server 20/24h trigger counts `user_id = auth.uid()` ⇒ NULL-collapse no-op for anon inserts. Artifact = Sky-applied rate-limit migration spec.
- **SR-008** SQL NULL trap, points trigger ×3 copies (`auth.uid() <> NEW.user_id`): schema.sql:163-165 · 2026-05-24_status_history_table.sql:289-291 · 2026-05-30_trust_score_system.sql:186-188. Fix shape = Fork-2 OA `IS DISTINCT FROM` (ATTACH to fork brief 3).
- **SR-009** SQL NULL trap, `flag_verifications` INSERT policy (trust_score_system.sql:70-76): `verifier_id <> (SELECT user_id …)` denies attesting anon flags; table currently dead code (no app reads/writes).
- **SR-010** Account deletion **PRESENT end-to-end** (edge fn + account.ts + ProfileScreen modal + cascade migration). Gaps: `verify_jwt=true` not in version control (no root `supabase/config.toml`); "get in touch with support" sentence has no link/address.
- **SR-011** App icon `assets/brand/app-icon.png` has **alpha channel** (`hasAlpha: yes`) — ITMS-90717 rejection shape.
- **SR-012** `orientation: portrait` + `supportsTablet: true` + **no `ios.requireFullScreen`** — ITMS-90474 shape; iPad review reality unaudited until this train's tablet pass.
- **SR-013** No dark splash variant (single `splash` block, `#1466E0`).
- **SR-014** Android `adaptiveIcon` lacks `foregroundImage` (Android-only; note).
- **SR-015** `deploy:testflight` runs `eas submit --profile preview` but eas.json defines only `submit.production` — the documented ship command fails.
- **SR-016** `expo-media-library` in deps, zero imports — autolinks into the binary (privacy surface + latent purpose-string).
- **SR-017** Reviewer demo account = PROPOSE-ONLY migration (2026-05-31) needing a manual Auth step — SKY-SIDE prerequisite for review notes.
- **SR-018** Push: `aps-environment=development` in untracked entitlements (EAS regenerates — verify); APNs credentials SKY-SIDE; `notify-flag-status` `verify_jwt=false`; hardcoded webhook secrets in trigger defs (flags_policy_consolidation.sql:65-68) — status check.
- **SR-019** Stale claims: `docs/TESTFLIGHT_ACTION_ITEMS.md:127` ("requires sign-in" — false); `src/lib/flags.ts:600-604` listFlags docblock ("only authenticated users can read" — stale since anon SELECT).
- **SR-020** `PUSH_NOTIF_TYPES_ENABLED:false` hides NotificationPreferencesScreen because nothing reads saved prefs — dead settings surface (completeness).
- **SR-021** **Binary-launch evidence NONE this train** — top-line honesty statement + 10-line TestFlight smoke script for Sky.
- **SR-022** Age-rating questionnaire (2025/26 overhaul, 13+/16+/18+, UGC + location questions) unanswered — SKY-SIDE with prepared answer sheet.
- **SR-023** `ITSAppUsesNonExemptEncryption:false` set in app.json + Info.plist — verify sufficiency, grade PRESENT.
- **SR-024** `flag_photos` junction policies NULL-collapse for anon flags (photos_junction.sql:57,65,68) — consistent with anon-no-photo law, but must be an explicit decision, not an accident.
- **SR-025** `GUEST_SIGNIN_ENABLED` dead config (zero consumers) — completeness/cleanup row.
- **SR-026** Sign in with Apple **not required**: auth = email+password only, no third-party login (4.8 N/A) — record with evidence. No password reset flow exists (`resetPasswordForEmail` absent) — functional finding to grade.

**Dismissal / a11y knowns (Lens 2/3):**
- **SR-027** 0/33 modal surfaces implement `onAccessibilityEscape` — the VoiceOver scrub-escape is app-wide absent.
- **SR-028** Swipe-dismiss exists on exactly 1 surface (NearbyFlagsModal `pageSheet`); everything else `animationType` overlay with no sheet affordance — spec per class needed.
- **SR-029** `accessibilityViewIsModal` missing on the 2 Map "Name this…" dialogs (MapScreen.tsx:2747, :2832); dialogTier test pins fade+shadow but not AVM.
- **SR-030** Backdrop tap-to-close on only 4/33 surfaces (3 deliberately a11y-hidden) — spec decision per class.
- **SR-031** No in-app RM/RT affordance (OS-only signals — likely correct per platform convention, grade it); C-lite glass mode = undiscoverable long-press on Tasks header title.
- **SR-032** ResourcesScreen: all 6 cards have `url` unset — no link fires (dead-ish content surface).
- **SR-033** box-none root-overlay law comment-enforced only (single unit guard covers header pair) — improvement slate.
- **SR-034** 44pt floor: no automated guard (convention + review only) — improvement slate.
- **SR-035** Cold-start first-run path (fresh storage → splash → session restore → OnboardingCards → wall/guest, offline/slow network) untested as a path — Lens 1 trace item.
- **SR-036** Anon rate-limit AsyncStorage key `anon_submit_timestamps` unnamespaced (only un-prefixed key) — minor.
- **SR-037** `recordAnonSubmit()` silent on write failure — minor honesty-of-throttle note.
- **SR-038** No E2E harness (no Detox/Maestro) — improvement slate.
- **SR-039** `supabase/schema.sql` self-declared incomplete (10 tables absent); PROPOSE-ONLY-headered migration applied per 06-01 notes — sweep must declare source-of-truth ordering (migrations > schema.sql; deprecated excluded) and tag everything `repo-inferred`.

## §9 Cohort topology (RESOLVED — the definitive answer to the fork-briefs' fuzziness)

On the **iOS build** exactly three cohorts exist:
1. **Signed-in** — real Supabase email+password session.
2. **Native guest** — session-only `guestMode` state via "Browse without an account →" on the SignInScreen wall (`App.tsx:110-150`); NOT persisted across relaunch; browse + anonymous report (no photo, client 5/24h) only.
3. **Signed-out (the wall)** — SignInScreen itself.

There is **NO Supabase anonymous auth** (`signInAnonymously` nowhere): "anonymous" = `user_id IS NULL` rows via `createAnonFlag`. `GUEST_SIGNIN_ENABLED=false` gates **nothing** (zero consumers — the gate is `App.tsx`). The **web** build skips the wall entirely (`Platform.OS === 'web'`) — web IS the guest cohort, which is why the export walk legitimately covers the App-Store-reviewer's cold anonymous walk (modulo native-only divergences per §2). An App Store reviewer on iOS lands on the wall first — reviewer notes must say "Browse without an account" exists (SR-017 companion).
