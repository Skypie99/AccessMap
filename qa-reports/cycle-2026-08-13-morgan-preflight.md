---
role: Morgan (PM)
mode: ACTIVE (direct invocation)
date: 2026-08-13
subject: Pre-flight go/no-go — EAS iOS build + TestFlight submission
model_tier: Opus 5 (Sky-initiated)
delta_vs: 2026-08-03 (APP_STORE_TODO.md)
coherence_score: 0.93
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
---

# PRE-FLIGHT GO/NO-GO — EAS BUILD + TESTFLIGHT

**VERDICT: GO for the build. GO for TestFlight *internal*. NO-GO for TestFlight *external* / App Review.**
Nothing here was run, spent, or changed. Read-only verification.

---

## §1 DEPENDENCY GRAPH

nodes:
- `sky/merge-gestures#done` (Sky, merge) — ✅ COMPLETE, `main` @ `f69fbeb` == `origin/main`
- `sky/eas-build-testflight#1` (Sky, build) — READY
- `sky/eas-submit-testflight#2` (Sky, submit) — READY (internal testing only)
- `sky/device-gesture-pass#3` (Sky, verify) — LOCKED behind #1+#2
- `sky/appstore-0.1-credential-rotation` (Sky, security) — BLOCKED, open since 2026-08-03
- `sky/appstore-0.2-anon-filter` (Sky, decision) — BLOCKED, open since 2026-08-03
- `sky/appstore-0.3-terms-sentence` (Sky, copy) — BLOCKED, open since 2026-08-03

edges:
- `sky/merge-gestures#done` → `sky/eas-build-testflight#1` (gate: gestures must be on main to be in the binary) ✅ satisfied
- `sky/eas-build-testflight#1` → `sky/eas-submit-testflight#2` (gate: store-signed IPA)
- `sky/eas-submit-testflight#2` → `sky/device-gesture-pass#3` (gate: installable build; **no OTA path exists**)
- `sky/appstore-0.1` + `0.2` + `0.3` → `external TestFlight / App Review` (gate: Apple 2.1(a) + 1.2(a))
- **NO edge** from `0.1/0.2/0.3` → `sky/device-gesture-pass#3` — internal TestFlight bypasses Beta App Review

## §2 REASON FOR ORDERING

- **Build will succeed — evidenced, not assumed.** `eas build:list` shows THREE consecutive `finished` iOS builds on profile `testflight`, SDK 54.0.0 — most recent build number 26, commit `5ab3f0c`, finished 2026-07-30. Source: live EAS API this cycle.
- **The local Xcode failure is irrelevant to EAS.** Local `expo run:ios` fails with 5 errors, all in `ios/Pods/fmt/include/fmt/format-inl.h` (consteval incompatibility with the host's Xcode 26.6). EAS builds on its own pinned image, which is exactly why builds 24–26 succeeded while local has never worked. Source: build log `bw46ituvo.output`, `xcodebuild -version`.
- **Submit is configured.** `eas.json` → `submit.production.ios` carries `appleId`, `ascAppId 6774709116`, `appleTeamId S78F8ZA8QU`. ASC credentials present at `~/.app-store/`. Source: eas.json + filesystem.
- **A build is MANDATORY to test the gestures — there is no free path.** `expo-updates` is not a dependency (grep count 0), so no OTA. Source: package.json.
- **App Review blockers are real but do not gate internal testing.** TestFlight *internal* (team testers) requires no Beta App Review; *external* does. Source: APP_STORE_TODO.md §Phase 0, verified still open this cycle.
- LEARNINGS:2026-05-25 — *Sequential merge/build discipline*: never build while a merge is in-flight on the same working tree. Satisfied — merge is complete and pushed before any build starts.

## §3 BLOCKED NODES

- `{node: sky/appstore-0.1-credential-rotation, why: docs/APP_STORE_REVIEWER_NOTES.md is still tracked on main and still carries a password field — plaintext reviewer credential in a PUBLIC repo, open 62+ days as of 2026-08-03 and unresolved today. Apple 2.1(a) auto-rejection AND the estate's only live security exposure. Adjacent: ~/.app-store/itunes_service_key.txt still mode 644 (world-readable), unchanged since 2026-05-29., unblock: rotate in Supabase → verify new pair → new pair goes ONLY into App Store Connect review notes → purge in-tree copies → chmod 600 the ASC key, type: BLOCKER}`
- `{node: sky/appstore-0.2-anon-filter, why: createAnonFlag (src/lib/flags.ts) still has ZERO references to the blocked-term filter — verified this cycle. The entire Apple 1.2(a) content filter is bypassed by reporting anonymously, which is the headline feature a reviewer will test first., unblock: Sky's moderation-policy decision; Morgan's standing rec is ship the one-liner in v1, type: DECISION_FOR_SKY}`
- `{node: sky/appstore-0.3-terms-sentence, why: src/lib/copy.ts says account deletion lives in Settings; the control is on Profile, and the LIVE privacy policy already says Profile. Two published documents contradict each other in the doc Apple reads under 1.2., unblock: one-line copy fix, type: BLOCKER}`
- `{node: external-testflight / app-review, why: gated by all three above, unblock: close 0.1 + 0.3, decide 0.2, type: BLOCKER}`

**None of the above block the gesture device-test.** Internal TestFlight is clear.

## §4 CHECKPOINT REFERENCES

- `{name: map-gestures merged, role: Sky, artifact: commit:f69fbeb (main == origin/main), qa-report: design-reviews/map-gestures/2026-08-12/BUILD_REPORT.md}`
- `{name: gesture gate green, role: Opus 5 build, artifact: branch:feat/map-gestures (203 suites / 3,004 tests / typecheck 0 / lint 0 errors), qa-report: design-reviews/map-gestures/2026-08-12/BUILD_REPORT.md:§Gate}`
- `{name: last successful iOS build, role: EAS, artifact: commit:5ab3f0c build 26 profile testflight status finished, qa-report: eas build:list (live, this cycle)}`
- `{name: App Store blocker chain, role: Morgan, artifact: APP_STORE_TODO.md (2026-08-03), qa-report: APP_STORE_TODO.md:§Phase 0}`

## §5 DUPLICATION REPORT

No duplications detected this cycle.

## §6 STATE SNAPSHOT

- `main` = `f69fbeb` == `origin/main`. Map-gestures merged + pushed 2026-08-13.
- Gesture work: 8 commits — Tier 1 (`allowSwipeDismissal` × 5 pageSheets), Tier 2 (`SheetPull` on Report/FlagDetail/Legend), guard law F amended + F2 added, zoom floor.
- EAS: authenticated as `skypie911`; remote build number at 26; `appVersionSource: remote` so autoIncrement handles the next.
- Local iOS build: BROKEN and expected to stay broken (fmt vs Xcode 26.6). Not worth fixing pre-submission.
- No OTA capability (`expo-updates` absent).
- App Store Phase 0 chain: 3 of 3 items still open, unchanged since 2026-08-03.

## §7 EXECUTION PLAN SUMMARY

- **Phase 1 (READY now):** `sky/eas-build-testflight#1` → `sky/eas-submit-testflight#2` → `sky/device-gesture-pass#3`. Critical path, fully unblocked, ~35–45 min of EAS wall-clock (builds 24–26 each ran 3.5–4h queue-to-finish; budget generously).
- **Phase 2 (BLOCKED):** the Phase-0 App Store chain (0.1 → 0.3 → 0.2), serialized, ~25 min of Sky's hands.
- Classification: 7 total / 3 READY / 1 LOCKED / 3 BLOCKED. `acyclic: true`.
- Parallelizable: Phase 2 items 0.1 and 0.3 can run while the Phase 1 build is in the EAS queue.
- **Jordan trigger check:** the gesture change touches no location data, no disability data, no PII, no RLS/auth/session, no external send, no new persistence. **No triggers fire — Jordan not required** (Const. 4.5.4). Blocker 0.2 (anon content filter) is a moderation-policy call already routed to Sky, not a new privacy review.

## §8 MORGAN'S RECOMMENDATION

**Build. The money is not at risk from a technical failure.** Three consecutive successes on this exact profile and SDK, valid auth, credentials on file, and the one thing that IS broken (local Xcode) plays no part in an EAS build.

**Correction to earlier guidance in this session:** `npm run build:preview` was the wrong command for Sky's stated goal. `preview` is `distribution: internal` — an install link, NOT TestFlight. For TestFlight the profile is `testflight` (`distribution: store`), which is also the only profile with a proven success record here.

**Use `npm run deploy:testflight`** — it chains build + submit in one command, and matches the three builds that already worked.

**Do 0.1 while the build queues.** It is 5 minutes, it closes the estate's only live security exposure, and it is free time — the build is sitting in a queue anyway.
