# LENS 2 — TEST QUALITY · code-qa 2026-08-06 · `[F5/2026-08-06]`

**Measured floor:** 200 suites · 2923 passed · **84 todo** · 0 failed (jest --ci -w 3, 32.4s — fast and stable).
**KNOWN baseline honored:** guard-forge HF-1…HF-9 (fail-open CI budget, unreachable eas guard, classA/terms/disputeControl indexOf fail-opens, zero-test CI pass, stale TestFlight attestation, no-op guard.sql pair, tautological bp10 ink loop) are open, owned by the un-fired Guard Forge Phase B, and are **not re-found here**.

## Verified CLEAN (adversarial checks that came back negative)
- **New fail-open indexOf hunt:** all non-HF ordering assertions verified. `privacyLink.guard.test.ts:112-124,133-140` anchors the right operand with `expect(anchor).toBeGreaterThan(-1)` AND presence-guards the left operands in companion tests (`:103`, `:126-130`) — deleting either string fails the suite. The forge's "correct exemplar" citation holds under re-derivation.
- **Trivial assertions:** zero `expect(true).toBe(true)`-class hits repo-wide.
- **Mock boundaries:** screen suites mock lib modules; lib suites mock the supabase client — no suite mocks the module it tests. The 18 `src/__tests__/*.guard.test.ts` files + arbiter proof-sets are the estate's spine.
- **Critical flows all have dedicated suites:** auth (`pkceFlowType`, SignIn), writes (`flags.test`, `flags.supabase.test` incl. **CAS/`FlagStatusConflictError`**), anon path (`createAnonFlag.test`, `anonRateLimit.test`), deletion (`account.test`, `dialogTier`), store races (`flagsStoreTimeout`, `flagsStore.d4`), moderation (blockedTerms MUST-FAIL pins).

## Findings

### TEST-1 · MEDIUM — 84 `it.todo` stubs, 62% of them a 10-week-old superseded plan
**Evidence:** `src/components/__tests__/wave6.test.tsx` carries **52 todos** — a fully-specified CommentBubble a11y/contrast test plan from the May wave. It references the retired brand palette (`'#2f80ed'` at :94-96; the live brand is Wayfinder `#0F53BE` since phase 11/12) and predates the a11y-qa train that landed real SR coverage + guards for these exact surfaces (A11Y-213/214 class). Remainder: `MapScreen.heatmap` 14 (incl. k-anonymity disclaimer rows — adjacent to KNOWN PC-4, whose real fix is server-side), `MapClustering` 7, `WatchedFlagsSearch` 6, `OfflineIndicator` 5.
**Why it matters:** todos can't pass vacuously (honest marker), but 52 stubs pinning a retired palette read as abandoned intent and inflate the suite total (3007 incl. todo).
**Disposition:** Phase B triage, one commit: implement the still-true cheap ones; DELETE superseded ones naming the superseding coverage in the commit; ambiguous rows → QUESTIONS. Record the test-count delta against the 3007 baseline explicitly (the fix/tasksflagcard-date-flake lesson: deleting tests must be an announced act, never a side effect).

### TEST-2 · LOW — One real-clock sleep in a race test
**Evidence:** `src/lib/__tests__/flagsStore.d4.test.tsx:298` `await new Promise((r) => setTimeout(r, 50))` — load-sensitive wait in the realtime-channel test (the other two `setTimeout(r, 0)` sites are benign microtask flushes). 8 suites already use `jest.useFakeTimers` — the house knows the pattern.
**Disposition:** Phase B — replace with fake timers or an event-based wait; guard: suite must still fail when the F32 teardown serialization is broken.

### TEST-3 · CROSS-REF (no independent action) — The edit-path suite pins today's guard-free pass-through
`flags.updateFlagContent.test.ts:94-100` asserts the patch is passed **directly** to `.update()` — true today, and exactly what COR-1 changes. The fix must flip this pin deliberately (new contract tests: blocked-term throws, >2000-char throws, invalid category/severity throws) rather than leaving a red test as a surprise.

**FINISHED** — lens 2 complete. 1 Med · 1 Low · 1 cross-ref. The suite is fast, honest, and unusually well-guarded; its debt is one stale plan-file, not vacuity.
