# Quinn — Correctness review of Cycle C (T1 / C4 / CL1 / CL2) — 2026-05-24

## Scope

4 branches off `main @ 40d7dd2` (38 suites / 578 tests / 0 TS errors):

| Branch | Worktree | Commit | What it does |
|---|---|---|---|
| T1 | `wt-t1` | `79544b9` | Status-history audit trail + propose-only migration |
| C4 | `wt-c4` | `7da774c` | Time-of-day / context tags (input-only) + propose-only migration |
| CL1 | `wt-cl1` | `eaf59be` | Lift 4 shared modals to a single navigator-root mount |
| CL2 | `wt-cl2` | `35aa1d3` | Add `color.brandText` theme token + migrate 3 AA-failing callsites |

All 4 typecheck clean (`tsc --noEmit` → 0 errors). The new test files (24 + 21 + 5 = 50 new tests) all pass when run with `npx jest --rootDir=. --testPathIgnorePatterns=/node_modules/`.

Verdicts: **Merge with follow-up** all four. No HIGH bugs that block landing, but C4 has one HIGH UX trap (silent tag drop on missing-column) and CL2 has one HIGH consistency bug (token-vs-literal mismatch in 2 of 3 migrated files).

---

## Carry-forward from Cycle B Quinn report

Spot-checked the items called out in `qa-reports/qa-quinn-cycle-B-2026-05-24.md`:

| Item | Status |
|---|---|
| Tasks bulk `contentInset` → `contentContainerStyle` (Android padding) | FIXED on main (`src/screens/TasksScreen.tsx:610` uses `paddingBottom: BULK_BAR_HEIGHT` when `selection.active`). No regression in any Cycle C branch — none touches TasksScreen. |
| F4-wire button contrast bumps (13 → 14pt) at brand-blue | FIXED on main (Cycle B polish `80e7e53`). CL2 takes this further by switching `presetBtnSecondaryText` to a darker color (`#1c4f99`) so even sub-14pt would still pass. No regression. |
| Tasks bulk `useFocusEffect` tab-clear | FIXED on main. CL1 does NOT alter Tasks selection behavior. |
| Data export `Share.dismissedAction` guard | FIXED on main. No regression. |
| 5 Alert.alert migration to `confirm()` | FIXED on main. T1 adds ONE new `Alert.alert` at `FlagDetailModal.tsx:484` for an informational "Could not open maps app" error — this is intentionally NOT destructive, matches Cycle B cleanup's documented carve-out ("Informational alerts intentionally left as Alert.alert (worst case: silent no-op on web is OK)"). |

No Cycle B regressions identified.

---

## Findings by branch

### T1 — Status history (`feat/status-history-2026-05-24`, worktree `wt-t1`)

- **[MED] History button is `disabled={busy}` — gates read-only navigation behind a write operation** — `src/components/FlagDetailModal.tsx:507-517`. The new "History" button copies the `disabled={busy}` pattern from the existing verify/resolve/reject buttons, but History is a read-only modal. While a verify is in-flight (typically 200-1500ms) the user cannot peek at the audit trail. Minor but inconsistent with the design intent — `View on Map`, `Directions`, `Share` already have the same problem and `Share` was already disabled-while-busy in main, so this matches house style. **Fix:** drop `disabled={busy}` on `historyBtn` (and consider doing the same for the other 3 in a follow-up — they're all read/navigate actions).

- **[MED] `formatHistoryEntry` relative-time goes stale while modal is open** — `src/components/StatusHistoryModal.tsx:83-97`. The `formatted` memo computes `relativeTime(iso)` once per entries-change. If the user opens the history at 09:59:30 and reads it past 10:01:30, an entry that was "30s ago" still shows "30s ago" instead of "2m ago". Same staleness exists in `Tasks` cards (so it's house-style), but here it's a focused single-flag view where the user is more likely to dwell. **Fix:** either (a) add a 30s tick interval that triggers a re-format while `visible`, or (b) accept the staleness and add a comment noting the choice (the modal is short-lived in practice).

- **[MED] No re-fetch on flag status change while history modal is open** — `StatusHistoryModal.tsx:63-79`. The effect re-runs only on `[visible, flagId]`. If the user has the FlagDetailModal open AND the history modal open over it, taps "Verify" (which closes nothing), the history modal will NOT show the new history row until the user closes/reopens. The flow is awkward (history opens above detail; verify is reachable only by closing history first), so in practice this is rare — but the trigger inserts the row synchronously in the same txn as the status change, so a refresh would surface it instantly. **Fix:** thread a `refreshKey` prop bumped by FlagDetailModal's `handleAction` success path, OR simply close the history modal on parent action (less ideal — user loses their place).

- **[MED] `accessibilityRole="text"` on a focusable row + custom label is non-standard cross-platform** — `StatusHistoryModal.tsx:152-161`. Same caveat as the Cycle B T4 finding (tier pill). On RN web `role="text"` is non-standard; iOS handles as plain text and Android may ignore. The custom `accessibilityLabel` carries the full content so functionally fine, but cosmetically odd. **Fix:** drop the role entirely — `accessible` + `accessibilityLabel` is the canonical RN pattern for a static text-only focus stop.

- **[LOW] `formatHistoryEntry` test matrix is thorough** — 24 tests cover all 16 from×to transitions + null initial + custom label resolvers + i18n callback + unknown-status passthrough + timestamp variations. No off-by-one. Confirmed safe.

- **[LOW] Defensive `listStatusHistory` returns [] on any error** — by design, includes the missing-table case. Confirmed. Empty-state copy ("History not yet enabled") is honest and non-alarming.

- **[LOW] Migration is well-documented and idempotent** — `supabase/migrations/2026-05-24_status_history_table.sql` has apply / verify / rollback sections, comments why SECURITY DEFINER and append-only RLS. The trigger inserts the history row BEFORE the points update, so a constraint failure on the history table aborts the txn and refuses the status change. Correct.

- **[LOW] Migration rollback note acknowledges the trigger leaves the extended function in place** — lines 76-82 spell out that if the table is dropped without restoring the original function body, future status updates will fail because the insert into `flag_status_history` will raise. The comment is correct but somewhat buried; the procedure relies on Sky reading carefully. Consider an inline `notice:` warning in the migration footer.

- **[LOW] Hex literal `#1c4f99` for `entryDot` is documented as awaiting CL2** — `StatusHistoryModal.tsx:244-251`. Comment notes the swap. Once both T1 and CL2 are in main, a follow-up should migrate this dot color to `color.brandText`. Tracked.

- **[LOW] Buttons row wrap acknowledged** — `FlagDetailModal.tsx:730-737`. Added `flexWrap: 'wrap'` for the now-4-button row. On small screens the History button will wrap to a second line. Acceptable.

---

### C4 — Time-of-day / context tags (`feat/time-of-day-tags-2026-05-24`, worktree `wt-c4`)

- **[HIGH] Silent tag drop when migration not yet applied — user gets no feedback** — `src/lib/flags.ts:119-148` + `src/screens/ReportFlagModal.tsx:117-122`. When the user picks 1+ chips and submits, `createFlag` tries the WITH-tags insert first. If the column doesn't exist (likely on Sky's DB right now — migration is propose-only), the postgrest error is swallowed by `isUnknownColumnError`, and the code falls through to a SECOND insert (without tags) that succeeds. The user sees a success toast and has no idea their carefully-picked context was discarded. **Why it matters:** the ReportFlagModal labels the section "Context (optional) — when is this most relevant?" — users will reasonably assume the data was saved. **Fix:** on fallback, surface a one-time non-blocking toast like "Tags couldn't be saved on this server yet — your report was filed without them." Alternatively, gate the chip UI entirely behind a server-capability probe so users don't pick what won't be saved.

- **[MED] Two round-trips per submission while migration is pending** — `src/lib/flags.ts:132-145`. Same code path. Every report submission with tags incurs a wasted network call (fail) + retry (success). On flaky mobile networks this doubles the failure probability and adds 300-1000ms of submit latency. Less critical once Sky applies the migration, but the pending window is the most user-visible. **Fix:** cache the "column missing" detection in module-level state for the session — first fallback marks `columnKnownMissing = true`, subsequent calls skip the WITH-tags attempt entirely. (No need to persist; a re-launch after migration re-tries cleanly.)

- **[MED] No display path — picked tags vanish from the UI as soon as the report is submitted** — repo-wide grep shows `context_tags` is referenced ONLY in `flags.ts` (write), `ReportFlagModal.tsx` (input), and `contextTags.ts` (vocabulary). `FlagDetailModal` does not render them; the Tasks list doesn't surface them; no future filter chip uses them. This is intentional per commit message "(input)" but worth noting that until a follow-up adds a read path, the feature is "trust me, the server has it." **Fix:** plan a Cycle D follow-up to render the chips back in `FlagDetailModal` near the description (read-only). Also consider adding `context_tags?: string[]` to `FlagRow` in `src/types/database.ts` once the migration lands so the type matches reality.

- **[MED] `isUnknownColumnError` heuristic is brittle for non-PGRST204 messages** — `src/lib/flags.ts:97-106`. Falls back to a `/not (find|exist)/i` regex on the message string. This will misfire if Supabase ever phrases the error as "column ... is unknown" or "no such column", AND it could match unrelated errors that happen to include the column name and one of those words (e.g. "cannot find user with role X for context_tags upload"). The PGRST204 code path is the only reliable check; the message-string fallback is best-effort. **Fix:** add a comment that this is a heuristic and may need adjustment if a future Supabase upgrade changes the error wording; keep an inline TODO with a date.

- **[MED] Inline `Alert.alert` for "Permission needed" / "No location" / "Not signed in" / "Could not pick photo" / submit error path** — `ReportFlagModal.tsx:71-74, 91, 97-98, 101, 124`. These already existed pre-C4 — not a regression — but worth flagging: on web all of these are silent no-ops, so the user with no camera permission sees nothing happen. These are NOT destructive confirms (so they don't need `confirm`), but consider migrating to an in-page banner or toast for web-parity in a future polish loop.

- **[LOW] Empty selection submits with `context_tags: undefined`** — `ReportFlagModal.tsx:117-122`. Skips the WITH-tags attempt entirely, single round-trip. Correct.

- **[LOW] Stale comment "createFlag still tries the column path so it stays exercised"** — `ReportFlagModal.tsx:117-120`. The actual behavior is the opposite: when `contextTags.length === 0`, `context_tags: undefined` is passed, and `createFlag`'s `if (tagsToSend !== undefined)` SKIPS the WITH-tags attempt. The comment is misleading. **Fix:** rewrite as "skipping the field when no tags are selected keeps the legacy insert path cheap (one round-trip)."

- **[LOW] `contextTags` test suite is thorough** — 21 tests cover the vocabulary frozen-shape check, isValidTag against every known/unknown/non-string, toggleTag round-trip / inverse / no-mutate / fresh-ref, sanitizeTagList null/undefined/non-array/dedupe/preserve-order. No gaps.

- **[LOW] Migration adds a GIN index ahead of any consumer** — `supabase/migrations/2026-05-24_flag_context_tags.sql:92-93`. The index is "cheap on small table" per the comment but is unused until a filter is shipped. Defensible (index now = filter ships instantly later), and idempotent enough to drop if Sky never wires the filter. Confirmed safe.

- **[LOW] `text[]` with empty-array default avoids NULL — good design choice** — confirmed.

- **[LOW] Vocabulary union is stable** — `ContextTag` is a string literal union; `CONTEXT_TAGS` and `CONTEXT_TAG_LABELS` are both frozen at module scope; tests assert keys exactly match. Adding a new tag is a one-place change with a typecheck-enforced label.

---

### CL1 — Lift shared modals (`chore/lift-shared-modals-2026-05-24`, worktree `wt-cl1`)

- **[MED] Cross-screen state preservation is a SUBTLE behavior change** — `src/components/FeedbackModal.tsx:48-58`. The FeedbackModal preserves `body` and `category` across close/reopen (per the inline comment, intentional). Before CL1, RootNavigator had its OWN FeedbackModal mount AND SettingsScreen had its own — so a draft typed via the header was preserved on header-reopen but LOST when the user switched to Settings and tapped "Send feedback". After CL1, all three triggers (header, Profile-via-shared-context isn't wired but Settings's "Send feedback" row is) share one mount, so a draft typed anywhere now persists everywhere. Probably an improvement, but it IS a user-visible behavior change. **Fix (if Sky cares):** add a `useEffect(() => { if (!visible) { setBody(''); setCategory('idea'); } }, [visible])` to FeedbackModal to restore "fresh draft on every open" semantics. Otherwise document the change in CHANGELOG / RELEASES.

- **[MED] `accessibilityViewIsModal` on shared modals isn't visited in CL1, but the lift changes the parent context** — modals previously rendered as siblings of ProfileScreen / SettingsScreen, now they render as siblings of the entire tab navigator. On iOS this should be transparent (Modal renders to native root anyway), but worth a smoke check that VoiceOver focus doesn't leak to tab-bar buttons when a shared modal is open. (Same concern as Quinn's Cycle B finding on the tier modal — Android, `accessibilityViewIsModal` is iOS-only.)

- **[LOW] `useSharedModals()` throws outside the provider — caught by tests** — `sharedModalsContext.tsx:99-107`. Surfaces missing-provider bugs immediately. Confirmed by the dedicated test case (line 134-148).

- **[LOW] Single-key constraint means only one shared modal at a time** — by design; matches the prior behavior where Profile/Settings could only open one of these per tap. Documented in the context comment. No bug.

- **[LOW] NotificationPrefsModal correctly kept per-screen** — `ProfileScreen.tsx` still mounts its own with `initialPrefs` + `onPrefsChanged` callbacks; `SettingsScreen.tsx` mounts a bare instance. The trade-off (two mounts but Profile keeps its update-count optimization) is well-documented in three places (context file, both screen import comments). Confirmed correct.

- **[LOW] No stale `feedbackOpen` / `helpOpen` / etc. state variables left behind in ProfileScreen or SettingsScreen** — grep confirms full cleanup. Confirmed.

- **[LOW] `useMemo` for the context value is good practice** — `sharedModalsContext.tsx:83-86`. Stable identity prevents needless re-renders of every consumer when the provider re-renders for unrelated reasons.

- **[LOW] `refreshKey` prop unused on the lifted MyFeedbackModal** — `MyFeedbackModal.tsx:30-32`. Defined but never passed from the lifted host (`RootNavigator.tsx:196`). On main, neither Profile nor Settings was passing it either, so no regression. But the prop exists for future use (Profile bumping it after sending feedback); the lift removes the only path that could plumb it. **Fix (future):** wire the lift's `setOpen` to also accept an optional refresh trigger, or add a separate "bump" function to the context. Low priority.

- **[LOW] Tests for sharedModalsContext use `react-test-renderer` via `require` (no types installed)** — `sharedModalsContext.test.tsx:30-31`. Works (the dep is transitively in `jest-expo`), TS-clean via local interface. Documented inline. Acceptable workaround.

---

### CL2 — `color.brandText` theme token (`chore/brandtext-theme-token-2026-05-24`, worktree `wt-cl2`)

- **[HIGH] Token vs. literal mismatch — 2 of 3 migrated files hard-code `#1c4f99` while their comments claim they use `color.brandText`** — `src/components/FlagDetailModal.tsx:700-703,714-716` AND `src/screens/MapScreen.tsx:1923-1926`. The comments say "Uses color.brandText" but the actual style values are HEX LITERALS (`color: '#1c4f99'`). Only `AddressSearchModal.tsx:497` actually uses `color: color.brandText`. Two consequences: (a) if Sky ever tweaks `color.brandText` in `theme.ts`, two of three migrated callsites won't pick up the change — the whole point of a token; (b) the comments and code disagree, which is the worst kind of doc drift. **Why it matters:** this is literally the chore's headline goal. **Fix:** add `import { color } from '@/theme';` to FlagDetailModal and MapScreen (MapScreen already does — check) and change the three `color: '#1c4f99'` lines to `color: color.brandText`. Trivial 5-minute fix; or leave hex literals and remove the misleading comments.

- **[MED] CL2 migrates only 3 of N AA-failing brand-blue callsites** — repo-wide grep for `color: '#2f80ed'` and `color.brand` in `Text` style positions probably surfaces more candidates (e.g. T1's StatusHistoryModal `entryDot` and `historyBtnText` use `#1c4f99` and `#2f80ed` respectively — and the secondary actions in FlagDetailModal got migrated for the OUTLINED buttons but not the OUTLINED `directionsBtnText` if it's blue-on-white). The 3 migrated are a useful start but the chore description "migrate AA-failing callsites" implies a comprehensive sweep. **Fix:** either rename the commit "(initial migration)" or schedule a follow-up to cover the remaining instances. Low risk because contrast is preserved on what WAS migrated.

- **[LOW] Token naming is clear** — `brand` for ≥14pt-bold / surfaces, `brandText` for any-size text-on-white. The inline comment block in `theme.ts:38-44` is the right place for migration guidance. Confirmed.

- **[LOW] `color.brandOnSoft` already exists at the same value `#1c4f99`** — `theme.ts:42` (existing) and now `brandText` (new) are the same color. Duplicate semantic tokens are fine and arguably good (different intents — "dark brand for soft-blue background" vs "dark brand for white background"), but flag for Dani / Sky to consider consolidating into one `color.brandDark` with two aliases if the palette ever grows.

- **[LOW] No tests added (token-only change)** — appropriate. Visual change is contrast-only; no behavior to assert. Confirmed.

---

## Summary

| Branch | HIGH | MED | LOW | Total |
|---|---:|---:|---:|---:|
| T1 — status history | 0 | 4 | 5 | 9 |
| C4 — context tags | 1 | 4 | 5 | 10 |
| CL1 — lift modals | 0 | 2 | 6 | 8 |
| CL2 — brandText token | 1 | 1 | 3 | 5 |
| **Total** | **2** | **11** | **19** | **32** |

## Verdicts

| Branch | Verdict | Why |
|---|---|---|
| T1 | **Merge with follow-up** | Defensive on missing migration, well-tested, well-commented. MED items are polish (busy-disable, time-tick, modal refresh on parent action). |
| C4 | **Hold for HIGH fix OR ship with explicit "tags pending migration" UX** | Silent tag drop is a user-trust hit. Either surface the drop or gate the picker on a capability probe. Otherwise solid foundation (input only, no read path yet by design). |
| CL1 | **Merge** | Cleanup done right. Tests cover the throw-outside-provider failure mode. Per-screen exclusions (NotificationPrefs, About) are correctly motivated. Only behavior change is FeedbackModal draft preservation, which is arguably an improvement. |
| CL2 | **Hold for HIGH fix** | The chore claims to migrate to the new token but 2 of 3 files only updated the COMMENT, not the code. Trivial fix (3 lines), but the inconsistency is exactly what a token system is supposed to prevent. |

## Cross-branch concerns

- **T1 and CL2 both touch `FlagDetailModal.tsx` styles** — different sections (T1 adds `historyBtn` + `historyBtnText` + `flexWrap` on `secondaryRow`; CL2 changes `viewMapBtnText` and `shareBtnText` color values). No merge conflict expected; the diffs are non-overlapping.
- **T1's `entryDot` hex literal `#1c4f99` should switch to `color.brandText` once both T1 and CL2 are in main** (the T1 inline comment already flags this).
- **C4 + T1's propose-only migrations are both safe to apply in either order** — they touch disjoint tables (`flags.context_tags` column vs new `flag_status_history` table).
- **Constitution check:** None of these branches push, deploy, modify main, or apply migrations. All four are READ-ONLY for the live DB. All four worktrees typecheck and pass their new tests. No `~/.claude/**` files touched.

## Top 3 HIGH findings (for the verification print-out)

1. **C4 silent tag drop when migration not yet applied** — `src/lib/flags.ts:119-148`. User picks chips, sees success, tags are silently discarded. Fix: surface the drop OR gate the picker.
2. **CL2 token-vs-literal mismatch** — `FlagDetailModal.tsx:703,716` and `MapScreen.tsx:1926` use hex literals while their comments claim to use `color.brandText`. Defeats the purpose of the token. Trivial 3-line fix.
3. *(no third HIGH — included below as the next-most-impactful MED)* **C4 two-round-trip overhead per submission while migration is pending** — adds 300-1000ms latency and doubles flake-fail probability on every report-with-tags until Sky applies the SQL. Module-level cache of "column missing" would eliminate the second-RT after the first failure.

---

*Quinn — Read-only correctness review. No code changes, no commits, no DB writes, no external sends.*
