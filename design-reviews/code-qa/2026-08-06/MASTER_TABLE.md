# MASTER TABLE — Deep Code QA · AccessMap · Phase A · 2026-08-06 · `[F5/2026-08-06]`

**Target:** `d243b51` (`ui-polish/accessmap-preship-2026-08-01` = main+22, the APP_STORE_TODO 1.2 ff tip) · read-only · gates measured green (tsc 0 · lint 0/80 · jest 200 suites / 2923 pass / 84 todo / 0 fail).
**Roll-up: 0 Blocker · 1 High · 7 Medium · 25 Low · 4 info/advisory.** Nothing found blocks the App-Store chain; the High is a pre-TestFlight-worthy fix.

Dispositions: **B** = Phase B fixes on the stacked branch · **B†** = Phase B with named coordination/caveat · **Q-n** = gated on QUESTIONS.md row · **PARK** = parked with reason · **X-REF** = new site/rider of a KNOWN item.

| ID | Tier | Surface | Finding (evidence) | Disposition |
|---|---|---|---|---|
| **COR-1** | **HIGH** | FlagDetailModal.tsx:552-570 → flags.ts:1296 | Edit path skips ALL create-path content guards — no 2000-char cap, no category/severity validation, no blocked-term filter; DB has no description length CHECK (schema.sql:63) | **B†** — apply all three guards; blocked-term half noted in **Q-1** so Sky sees the full filter map with 0.2; flips the TEST-3 pin deliberately |
| COR-2 | MED | users.ts:16-32 | display_name has no blocked-term filter while comments + descriptions do; renders on public leaderboard | **Q-2** (moderation policy, 0.2 sibling; one line if yes) |
| COR-3 | MED | photos.ts:26-45 | `listFlagPhotos` returns [] on ANY error (docstring claims migration-pending only) — transient failure renders "no photos"; also skews `addFlagPhoto` position | **B†** — rethrow non-42P01; coordinate with SLOP-3 extraction |
| COR-4 | LOW | TasksScreen.tsx:551 | Bulk-loop analytics `from:` is tautologically 'open' after CAS (flagId IS stripped by stripPII — verified, no PII issue) | **B** — pass pre-CAS status |
| COR-5 | LOW | PlatformMap.tsx:256 | `zoomBy` getCamera promise unguarded; sibling handlePinPress guards identical failure | **B** — add `.catch(() => {})` |
| COR-6 | LOW | OnboardingCards.tsx:264-276 | Un-caught permission-request await can strand the slide + unhandled rejection | **B** — try/catch, treat as not-granted, still advance |
| COR-7 | LOW | ReportFlagModal.tsx:411-413, 500-517 | Success-side callbacks inside try — a throwing parent callback would show "Couldn't submit" for a committed insert | **B** if trivial, else PARK (internal callbacks currently benign) |
| COR-ADV-1 | ADV | ReportFlagModal.tsx:422 | 0.2 rider: anon catch lacks `isContentBlockedError` routing the auth path has | X-REF → Q-1 note (for the 0.2 implementer) |
| SLOP-1 | MED | blockedTerms.ts:1-48 | Stale pre-vendoring header contradicts the §SKY-6 provenance header below it — false claim leads the file | **B** — delete lines 1-48 only; header #2 untouched |
| SLOP-3 / DUP-2 | MED | photos.ts:16-20 et al. | 5-variant PostgREST error sniffing; photos' variant lacks comments.ts's SR-092 embed early-out (real diverging bug) | **B†** — extract `postgrestErrors.ts` (comments.ts = canon), 5 converts, one commit, with COR-3 |
| SLOP-2 | LOW | anonRateLimit.ts:3, realtimePrefs.ts:21 | 2 storage keys off the 22-module `@accessmap/*_v1` canon | **B†** — only WITH read-old-key fallback (state reset otherwise); else PARK |
| SLOP-4 | LOW | 17× `#0F1B2D` + 4× `#f4f3f4` + 6 MapScreen legacy hex | Ink/thumb/legacy literal families where tokens exist; ratified dark-surface literals explicitly excluded | **B** — one sub-family per commit, value-identical |
| SLOP-5 | LOW | ProfileScreen.tsx:695, reports.ts:278, feedbackStore.ts:101 | 3 `errorMessage()` bypasses in a 35-adopter estate | **B** |
| SLOP-6 | LOW | analytics.ts:117-131, TasksScreen.tsx:551 | Dual event taxonomy; legacy catalog declares props stripPII always removes | **B** or PARK to Phase-6 wiring; check test pins |
| SLOP-7 | LOW | flags.ts:1752-1760 | createAnonFlag dev-voiced errors vs createFlag's user-voiced twins | **B** — align to shipped createFlag phrasing (BP16-adjacent, noted in commit) |
| SLOP-8 | LOW | flagsStore.tsx:288,341,405 | Bare `__DEV__` console.log (3 of 80 lint warnings) vs analytics.ts's disabled convention | **B** — warnings 80→77 |
| TEST-1 | MED | wave6.test.tsx (52) + 4 files (32) | 84 `it.todo` stubs; the 52 pin a retired palette and predate the a11y train's real coverage | **B†** — triage commit: implement-cheap / delete-superseded-with-citation; ambiguous → **Q-3**; test-count delta recorded |
| TEST-2 | LOW | flagsStore.d4.test.tsx:298 | Real 50ms sleep (load-sensitive) | **B** — fake timers/event wait; must still fail when F32 broken |
| TEST-3 | INFO | flags.updateFlagContent.test.ts:94-100 | Pins today's guard-free pass-through — COR-1 must flip it deliberately | X-REF COR-1 |
| TYPE-1 | LOW | flags.ts:1233-1241 vs database.ts:55 | Stale cast+comment: Insert already accepts context_tags | **B** — remove cast+comment; tsc canary |
| TYPE-2 | LOW | disputes.ts:55-62 vs database.ts:370 | Stale cast+comment: RPC IS in the Functions union (reopen twin shows the target form) | **B** — remove cast; tsc canary |
| TYPE-3 | LOW | comments.ts:101,154,185 | 3 documented casts forced by missing flag_comments Relationships entry | **B** attempt (tsc + SR-092 tests canary); PARK if postgrest typing fights back |
| DEAD-1 | MED | featureFlags.ts:14-35 | 3 of 4 flags gate nothing; GUEST_SIGNIN_ENABLED=false claims to gate shipped guest access | **B** — remove 3 keys + stale comments; keep PUSH_NOTIF_TYPES_ENABLED |
| DEAD-2 | LOW | flagsRealtime.ts (54 ln) | Superseded module, app refs zero, alive only in own test | **B** — delete module+test; full gates + mock-resolution check; count delta recorded |
| DEAD-3 | LOW | apply-migrations.js | Tracked, referenced nowhere, frozen at May, name misleads (verified: print-only, no DB) | **B** delete (default) / **Q-7** |
| DEAD-4 | LOW | assets/icons/category/*.svg (6) | Referenced nowhere; category visuals ship as glyphs + CategoryIcon paths | **B** delete (default) / **Q-6** |
| DEAD-5 / DUP-1 | LOW | flags.ts:1277 vs :1730 | Dead `CreateAnonFlagInput` twin carries the better WHY docs | **B** — delete dead twin, migrate its comments to `AnonFlagInput` |
| DEAD-6 | LOW | photos.ts:80-90 | `deleteFlagPhoto` uncalled + promises a nonexistent Edge Function | **B** delete (default) / **Q-6** |
| DUP-3 | LOW | PlatformMap.tsx:362, .web.tsx:1064 | Severity-ink threshold re-derived outside `severityRamp.textOnColor` | **B** (inside SLOP-4 family) |
| CPLX-1 | PARK | MapScreen 3702 + 5 more | God-file splits blocked by 18 source-reading guard suites, 4 of them fail-open (HF-3/4/5/9) until Guard-Forge B | **Q-4**; only flags.ts photo-pipeline split is safe-optional |
| DEBT-1 | MED | README.md:19, CLAUDE.md | Test counts stale ~2×: "1,120" / "~1575" vs measured 2923/3007 | **B†** — counts only; do NOT touch the C-1 WCAG sentence (Sky-gated) |
| DEBT-2 | LOW | CLAUDE.md §Database | Self-contradiction: 5/10/2/5 vs its own QA-note + points.ts 10/15/3/7 | **B†** — align to reality; commit notes it does not pre-empt the values decision |
| DEBT-3 | LOW | PROJECT_STATE.md | Five trains stale (pins 45bca1a) | **Q-8** / B may add ARCHIVED banner |
| DEBT-4 | LOW | README.md:10 | Fourth SITE of KNOWN PC-4 (k≥3 promise) — most public copy of a cosmetic claim | X-REF → Sky's PC-4 artifact (**Q-9** pointer) |
| DEBT-5 | INFO | package.json | Dependency currency unmeasured (posture); eslint-9 pin + legacy-peer-deps are LAW, never "outdated" | Phase B may run `npm outdated` read-only |

## Phase-B execution order (per train law: Blockers → High → safe Mediums; question-gated stay OPEN)
1. **COR-1** (High) — guards + deliberate TEST-3 flip (+Q-1's half only if answered).
2. Coordinated pair: **SLOP-3 extraction → COR-3 rethrow** (one family, then the behavior fix on top).
3. Safe Mediums: **SLOP-1**, **DEAD-1**, **DEBT-1**, **TEST-1** (each one commit, gates at every stop).
4. Lows in family batches: TYPE-1/2 (tsc-proof pair) → DEAD-2/3/4/5/6 (with mock-resolution checks) → SLOP-4 sub-families → SLOP-5/7/8, COR-4/5/6, TEST-2, DEBT-2 → TYPE-3 attempt → COR-7 if trivial.
5. PARKED: CPLX-1 splits (post-Guard-Forge-B), SLOP-2 (unless migration written), SLOP-6 (if test pins argue), COR-7 (if non-trivial).

**Conservation:** every lens ended with an explicit FINISHED verdict; every finding above carries exactly one disposition; KNOWN items were cross-referenced, never re-found (checked against: APP_STORE_TODO 0.1-0.4 + admin + Sentry · security-audit master (client-fixed 17 IDs, server A-01..A-20 pending) · guard-forge HF-1..9 · a11y conservation table · dossier Q1-Q8 · R2/BP16 · points-drift carry-over).
