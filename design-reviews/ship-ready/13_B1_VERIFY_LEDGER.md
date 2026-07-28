# SHIP-READY Phase 3 — 13 · B-1 adversarial verify: what it found

**Date:** 2026-07-27 · 3 lenses (honesty-fence · pipeline · comment-row a11y) · **18 findings**
The moderation controls passed every gate — typecheck, lint, 177 suites, a 10-regression census guard — and
the hostile read still found four things that would have shipped. This is the ledger.

---

## FIXED this session (4)

| # | Finding | Commit |
|---|---|---|
| **1** | **Every guest report was told it FAILED while landing correctly.** Both `feedback` SELECT policies exclude anonymous rows, and PostgREST applies SELECT RLS to the RETURNING clause — so `.select('*').single()` read back nothing and reported `skipped` for a successful write. `submitContentReport` maps skipped → failed by design, so guests — **the App Review reviewer's cohort** — saw "Couldn't send report", got a mail composer, and duplicated a row already in the table. Invisible for two months because FeedbackModal ignores the result | `6abe5fe` |
| **2** | **`[REPORT]` was not on byte 0 of the emailed report.** `buildMailtoUrl` prepends `Category: <Label>\n\n`, so the mail read `Category: Other\n\n[REPORT] v1 …`. This rung fires only when the insert already failed — the throttle path — so it is where a report is most likely to be missed | `9fb1876` |
| **3** | **`REPORT_SENT_BODY` was a review promise, and the fence guard could not see it.** "Reports are reviewed by the AccessMap maintainer" — the promise is the verb. The guard banned "will be removed" and a present-tense passive walked past, so a green suite would have read as evidence of no promise | `ca15afb` |
| **4** | The rung-2 test was **pinning** defect #2 (it asserted `category: 'other'`) | `9fb1876` |

---

## ⚠ OPEN — recorded, not fixed (the ones that matter)

### A · The report envelope is rendered back to the reporter as raw markup — **HIGH**

A signed-in report is inserted with `user_id`, so it appears in **Settings → My feedback**, where
`MyFeedbackModal` prints `row.body` verbatim: the user sees
`[REPORT] v1 target=comment id=9f3c… flag=22a1… This comment is abusive.` — internal encoding plus the
reported comment's uuid. The same string is the row's **accessible name**, and `dataExport.ts` copies it into
the PIPEDA plain-text export the user can download.

Nobody checked that the rows the envelope was designed for are also read back *by the reporter*. Not fixed
here because the fix is a product decision, not a formatting one: either reports are hidden from My Feedback
(they are the user's own data, so hiding is arguable), or the envelope is pretty-printed for that surface
(new copy = Sky's), or reports move to their own table (schema = the fork Option B deliberately deferred).
**Recommend: hide `[REPORT]%` rows from My Feedback for now** — one predicate, no new copy, and it stops a
uuid appearing in a data export.

### B · Hide is immediate, irreversible, and has no unhide anywhere — **HIGH**

Hide and Report are drawn as pixel-identical peers 16pt apart, and the sibling guard *asserts* the shared
treatment. But Report opens a sheet you can cancel; Hide executes on the first tap, permanently, with no
confirmation and **no unhide affordance in the entire app** (`clearHidden` exists and is wired to nothing). A
mis-tap silently removes a comment from that device forever. This is where "distinct and must not be
collapsed" actually fails — not in the wording, in the consequence. **Fix direction:** either a confirm, or an
unhide entry in Settings, or visual non-parity. All three are taste calls → the mockup gate.

### C · "Report sent" is silent on iOS VoiceOver — **HIGH**

The sent state relies solely on `accessibilityLiveRegion="polite"`, which is **Android-only** in React Native,
while the comment above it claims the live region is what announces the send. The house pattern — in
`ReportFlagModal`, `TasksScreen`, `MapScreen` — pairs it with `announceForAccessibility`. The sheet does that
on the mailto rung and not on success. The Send button holding the VoiceOver cursor is unmounted, so focus is
dropped and nothing is spoken.

### D · The census guard's hint rule is vacuous on 3 of its 5 pairs — **MEDIUM**

It matches only `accessibilityLabel={CONSTANT`, and the codebase's own recommended pattern for per-row
controls is a **helper call** — so `CommentBubble` and `ReportContentModal` run that assertion with **zero
`expect()` calls** and pass green. A guard that silently asserts nothing is the same failure class as #3.

### E · Others, in the ledger rather than the summary

The a11y label helpers collapse to identical names when two comments share an author or both are anonymous
(SR-117 makes the anonymous case real) · the comment footer widens short bubbles and, at large Dynamic Type,
`space-between` on a wrapped line pushes the timestamp to the **left** edge · the dispute dedup only records
after an *observed* success, so a lost response plus a retry can reach the threshold from one device · the
"byte-identical own bubble" test renders both sides with the post-change component, so it proves less than it
says · a **Jordan-relevant privacy asymmetry**: a signed-in report stores `user_id` beside a flag uuid (a
location) in one row, which is exactly the linkage W1's counter was hard-blocked from making — defensible for
an attributable abuse report, but undocumented and unreviewed.

---

## What this changes about the verdict

**B-1's mechanism half was NOT closed when the controls landed** — it was closed for signed-in users and
broken for guests, which is the cohort Apple sends. That is fixed. The three remaining HIGH items are all
about what happens *around* a report — where it is shown back, whether its sibling is safe, whether it is
announced — and none of them can be resolved without a Sky decision.

**The verdict in `12_READY_OR_NOT.md` stands: NOT READY.** This ledger adds three items to §4 and does not
move any leg's score, except to note that (b)'s mechanism is now genuinely working for the cohort it will
first be judged by.

**The lesson worth keeping:** every one of these passed a green gate. Two of them passed a guard *written for
exactly that class of defect*. A test that cannot fail is indistinguishable from a test that passes.
