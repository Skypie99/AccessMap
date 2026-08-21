# RUN — PHASE B **WAVE 3 of 4**: THE MED FINDINGS (20)

Paste this whole file into a fresh window. This is **fix work**. Model: Opus (Sky-initiated only).
**Prerequisite:** Waves 1 and 2 committed. Full context: `PHASE_B_MASTER_PLAN.md` · findings: `LEDGER.md` **and** `screens/` (Cluster A's numbers live mostly in the screen banks).

---

## RAILS
- **Never touch `main`.** **Waves 1+2 were merged and pushed 2026-08-20 — branch off `main` (`c452884` or later), NOT off the old wave branches.** **One commit per cluster, not per finding.** Sky merges — nobody else.
- **STEP 0 — you run this, before editing. Sky does nothing.** Pin the gate: `npm run typecheck` · `npx jest --ci -w 3` · `npm run lint`.
  **Expect the WAVE 2 numbers, not `bc91789`'s** — Wave 2 added 5 suites and 48 tests, so measuring against the old baseline will make a pre-existing state look like a regression you caused:

  | Gate | On the Wave 2 tip (`a720181`) |
  |---|---|
  | `npm run typecheck` | **0 errors** |
  | `npx jest --ci -w 3` | **215 suites · 3127 passed · 32 todo · 0 failed** |
  | `npm run lint` | **0 errors / 78 warnings** (pre-existing) |

  (For reference, `bc91789` was 210 suites / 3079 passed — that is the PRE-merge number and is no longer your baseline. Verified on `main` @ `c452884` after the merge.)
- 🔴 **Never `prettier --write src`** — breaks 5 source-pinning guard tests (PROTECT-11 / §SKY-6).
- PROTECTED identifiers: `com.accessmap.app`, slug/scheme `accessmap`.
- **Rebuild → reinstall → re-walk** at the end. Cluster E is invisible to unit tests.

---

## CLUSTER A — micro hit targets · **9 IDs, roughly ONE sweep**
Every number below was **measured** from the accessibility tree, not eyeballed. The 44pt floor is the standard.
| ID | Control | Measured |
|---|---|---|
| SW-09 | clear-search | **16×17** |
| SW-10 | search bar | pressable ≈34pt tall; its AX element under-reports at **358×20** |
| SW-12 | "Report a barrier" FAB | **105×42** — 2pt under, and it's the **primary CTA** |
| **SW-22 + SW-43** | **list-row TITLES** | Tasks **376×22** · MyReports **318×21** · ActivityFeed **320×29** · 17e **326×22** |
| SW-25 | copy-coordinates | **21×24** |
| SW-32 | filter-preset **Save** | see Cluster F — different root cause |
| SW-33 | collapse filter panel | **90×32** |
| SW-35 | dismiss heat-map notice / collapse legend | **24–25** |
| SW-40 | tier chip **87×33** (83×32 on 17e); display-name field **286×39** |
| SW-50 | remove-photo badge | **28×29**, and it **overlaps its own 96×97 thumbnail** — a miss opens the lightbox instead of removing |
**★ Do SW-22+SW-43 as ONE component fix.** The same row-title pattern repeats across three screens and both devices; the adjacent "Show … on the map" buttons are correctly 44×45 in all of them, which is what makes the 21pt title read as an oversight rather than a style.
**SW-29** (map markers **38×40**) is in this family but was **judged acceptable** — map-marker convention. **This is Sky's decision (#4), not yours.** Don't fix by reflex.
**Verify:** re-census every control above on **both** devices and assert ≥44 in the dimension that was short.

## CLUSTER B — tab-bar a11y count · **SW-13 + SW-38**
VoiceOver announces "Home, tab, **1 of 5**" (guest / non-admin) or "**1 of 6**" (admin) against a bar with **3 visible tabs**. Hidden routes (FullMap, Settings, Admin) with `tabBarButton: () => null` still count toward the navigator's child total.
SW-13 predicted the admin case; A-2 **confirmed it live**. The consequence SW-38 adds: **the number is a role oracle** — a listener can hear whether the account is an admin.
**Fix:** exclude hidden routes from the announced count (e.g. `tabBarAccessibilityLabel`), so all users hear "1 of 3" regardless of role.
**Verify:** census tab labels as guest **and** signed-in admin — the count must be identical and equal to the visible tab count.

## CLUSTER C — Profile headline stats · **SW-39**
The tiles read **6 REPORTED · 0 VERIFIED · 3 RESOLVED** while RECENT POINT ACTIVITY directly above says "Your report was verified · +10 pts" **twice**.
**Cause — mixed semantics, not bad data:** `reported` is a **lifetime total** (`Math.max(statusRows.length, statusSum)`, `ProfileScreen.tsx:372`) while `verified`/`resolved` are **current-status snapshots** (`stats.byStatus.verified` `:1162`; `resolved: byStatus.resolved` `:373`). **Rejected (3) is omitted entirely**, so 0 + 3 ≠ 6 with no visible remainder.
**A-2 confirmed it live:** the VERIFIED tile went **1 → 0** the instant the flag moved verified → resolved.
**Fix — Sky's decision (#3):** either relabel the tiles as current-status **and add Rejected**, or make Verified/Resolved lifetime counts to match the feed. 🔴 **Do NOT "fix" this by changing the points trigger.**

## CLUSTER D — Leaderboard · **SW-44**
Every anonymized contributor gets a **"ME"** avatar monogram: `const name = displayName ?? 'Member'` then `name.slice(0,2).toUpperCase()` (`LeaderboardScreen.tsx:158-159`). On screen, 1st/3rd/4th all wear **ME** while the row that actually *is* the signed-in user wears **JA** — the one monogram meaning "me" is everywhere the user isn't.
**Fix:** give the anonymized fallback a non-initial glyph (person icon), or derive no initials when `displayName` is null. The `'Member'` label itself is correct and privacy-preserving — only the derived initials are wrong.
**Note:** SW-45 (leaderboard overlaps the tab bar) belongs to the Wave 2 sheet-geometry family — don't fix it twice.

## CLUSTER E — enabled-looking controls that silently no-op · **SW-49** (+ a pattern)
The push toggle ignored **two consecutive taps** right after Settings mounted, with **no handler error in the whole console log** and **no alert**; a control switch in the same session toggled fine, ruling out the driver, and the push switch worked on a later attempt.
**A-2 hit this pattern three times** — push switch, severity buttons, and the Verify button. The common shape is a **silent early return while the control still renders as enabled**:
- `handlePushToggle`: `if (!user || pushBusy) return;` (`SettingsScreen.tsx:328`)
- `runStatusChange`: `if (busy) return;` (`FlagDetailModal.tsx:694`)
**Fix as one class:** an enabled-looking control must never no-op silently — either disable it visibly (the code already intends this: `pushBusy` is supposed to swap in an `ActivityIndicator`) or give feedback. Confirm the mechanism before changing behaviour; the walk established the symptom, not the cause.
**Verify:** tap each control immediately on screen mount and confirm it either acts or visibly shows why it can't.

## CLUSTER F — remaining singles
- **SW-08** — Home's map card says "No reports here yet. You could add the first." while defaulting to a **San Francisco** viewport against **Kelowna** data. Distances were always correct; the card misrepresents. Decide the default viewport (**Sky's decision, tied to #5-ish**) and make the copy honest.
- **SW-20** — the guest push switch is `enabled='0'` but carries **no dimming and no explainer**, so a normal-looking row silently ignores taps. Auth resolves the *gating* (signed in it reports `enabled=1`), but the **guest presentation** bug stands. Inconsistent with the app's own patterns nearby: Export uses an alert, Blocked people uses grey + subtitle. Match those.
- **SW-32** — the filter-preset **Save** button is **absent from the AX tree** *and* sits under the keyboard; VoiceOver users likely cannot reach it (the return key submits). Fix both halves.
- **SW-53 (docs)** — **CLAUDE.md under-documents the points economy.** Live, measured end-to-end on a real account: **Reported +5 · Photo +3 · Comment +1 · Verified +10 · Resolved +15** (90 → 124, reconciling exactly). CLAUDE.md documents only the verify/resolve awards. This is load-bearing: CLAUDE.md itself warns the TasksScreen flash strings are coupled to the trigger and must be updated together. **Reconcile CLAUDE.md against `supabase/schema.sql`.**
- **SW-48** — **not a fix.** It's a correction to SW-31: "Try again" recovered cleanly twice under auth. **Re-verify before anyone writes a recovery fix.**

---

## STOP CONDITION
Stop when the clusters are committed and the gate is green. Report baseline vs final gate numbers, per-cluster measurements proving the hit targets now clear 44, and anything deferred to Sky (SW-29, SW-39, SW-08). **Do not merge.**
