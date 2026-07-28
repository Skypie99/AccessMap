# RESULT · 01 — MODERATION GAP-CLOSE (M-1 … M-4)

**Date:** 2026-07-27 · Branch `shipready/3-polish-submission`, **stopped on the branch**
**Base:** `df80f1c` → **tip `fd75a86`** · `main == 512494a`, untouched · Opus 5, max effort

---

## Verdict

**All four cars built. Leg 1.2(a) moves 🔴 → 🟠. B-1 is still BLOCKING-OPEN.**

| Commit | Car | Files | Tests after |
|---|---|---|---|
| `7835c3b` | **M-4** SR-117 repo text | 2 SQL | 2545 ✅ |
| `fabf13b` | **M-1** ratified string + iOS VoiceOver | 4 | 2545 ✅ |
| `7158131` | **M-2** the 1.2(a) filter | 5 (+2 new) | 2590 ✅ |
| `fd75a86` | **M-3** five categories, envelope v2 | 5 | 2610 ✅ |

**2545 → 2610 passing, 0 failing, 178 suites.** Typecheck clean. Lint 0 errors / 80 pre-existing warnings.
No SQL statement was run. No merge, no push.

---

## Sky's decisions as built

- **D-1 SUPPLEMENT** — picker *and* free text; `canSend` = category selected **OR** reason typed.
- **D-2 CURATED** — slurs / hate / explicit / harassment block; ordinary profanity does not.

---

## M-4 · the fork Sky closed without noticing

`14_MODERATION_TEXTS_v1.md` §1 *"Your account"* — *"Anything you've contributed may stay in the app, with
your name removed"* — **is** SR-117 **Option A**, in her own published words.

It also **forecloses Option B**, which is `ON DELETE CASCADE`: that would delete contributions on account
deletion and make the published Terms false. Option B was already flagged destructive, Jordan-relevant, and
colliding with C-8 (a user could erase reports of their own abuse by deleting their account).

`2026-05-30_flag_comments.sql:8` now matches live, with the Terms dependency recorded in the header. Both
option texts kept verbatim in the drift-capture file; neither struck. **Repo text only — live was already
correct; the repo stopped lying.**

---

## ⚑ Five mechanised fences converted, zero deleted

The train wrote its honesty fence into the test suite. Ratification made five tests wrong. Every one was
converted to guard the *new* truth. **Deleting a fence is indistinguishable from an agent quietly removing
the thing that stops it authoring policy** — so none were.

### 1 · `copy.test.ts` — the response-time ban

```diff
- it('no report string invents a response time, a review window, or an outcome')
-   for REPORT_SENT_BODY: expect(s).not.toMatch(/\d+\s*(hour|day|business|week)/i)
+ it("REPORT_SENT_BODY carries Sky's ratified 24h commitment, verbatim")
+   expect(REPORT_SENT_BODY).toBe('Thanks, your report was sent. Reports are reviewed within 24 hours.')
+   expect(REPORT_SENT_BODY).toMatch(/within 24 hours/)
```
The remaining un-ratified strings keep the original guard, unweakened, under a renamed test.
**The fence was never anti-promise. It was anti-agent-invented-promise.**

### 2 · `copy.test.ts` — the PROPOSED marker

```diff
  PROPOSED_EXPORTS = [ …, 'REPORT_SENT_TITLE',
-   'REPORT_SENT_BODY',
+   // moved to RATIFIED_EXPORTS 2026-07-27
    'REPORT_FAILED_TITLE', … ]

+ RATIFIED_EXPORTS = [['REPORT_SENT_BODY','§5'], ['CONTENT_BLOCKED_MESSAGE','§2']]
+ it.each(...)('%s is marked RATIFIED, not PROPOSED')   // + ends-with-marker, + not-in-both-lists
```
A string leaving PROPOSED must **land somewhere equally guarded**, carrying who ratified it and where that
is recorded — not simply lose its marker.

### 3 · `copy.test.ts` — the anti-taxonomy fence

```diff
- it("carries no report-category taxonomy — that list is Sky's copy (05 §3 ⑯)")
-   for (const word of ['Harassment','Spam',…]) expect(src).not.toMatch(…)
+ it("carries Sky's five report categories, verbatim and in her order (§3)")
+ it('the category ids are stable wire tokens — changing one orphans stored rows')
+ it('the catch-all is last, so it does not suppress the specific answers')
```

### 4 · `ReportContentModal.test.tsx` — the anti-picker fence

```diff
- it('offers no report-category picker — the taxonomy is not ours to author')
+ it("renders Sky's five categories, in her order, and no others")
+   expect(getAllByRole('radio')).toHaveLength(5)   // no invented sixth
```

### 5 · `reports.test.ts` — the mailto category guard

```diff
- expect(call).not.toContain('category')          // scanned comments too
+ call = <comments stripped>
+ expect(call).not.toMatch(/\bcategory\s*:/)      // the ARGUMENT
+ expect(call).toMatch(/buildReportBody\([^)]*category/)  // …but it MUST reach the envelope
```
The old form was prose-sensitive and went red on an explanatory comment while the code was correct.

---

## 🔴 Three findings raised while building

### F-1 · `submitContentReport` would have failed every one-tap report

Its gate was `if (!reason) return { status: 'failed' }`, written when free text was the only input. D-1
makes a category-only report valid — so the sheet would have **enabled Send for a state the submitter
refused**, failing *after* the user committed. On an abuse-reporting surface that reads as the app losing
the report. Now `if (!reason && !category)`, and a source-level test pins the UI gate and the submitter
gate together so they cannot drift apart again.

### F-2 · the Sky-editable `ADDITIONS` array did not work

`BLOCKED_TERMS` was `[...SEED, ...ADDITIONS]` evaluated **once at module load**, so anything pushed later
was silently ignored while the export still looked authoritative. §2 promises this path. Now
`allBlockedTerms()`, read live. Caught by the very test §2 asked for.

### F-3 · the report *reason* is deliberately unfiltered — and now says so

Reporting abuse means quoting it. *"This comment called me a &lt;slur&gt;"* is the most useful report a
moderator gets. Filtering that field would block the abuse reports the filter exists to serve, and would
fail silently. A fence now asserts `reports.ts` never imports the filter.

---

## Leg 1.2(a): 🔴 → 🟠 — scored, never averaged

A filter now exists on the posting path, which is what 1.2(a) asks for. It is **not closed**:

1. **Client-side and bypassable.** A direct PostgREST call sails past it. Acceptable for 1.2(a), paired with
   the reactive report → review → takedown half — but the module header says so plainly and nothing in the
   repo describes this as making the platform safe.
2. **The list is a curated seed, not a verbatim LDNOOBW vendoring.** No network fetch happened in this run,
   and a header claiming otherwise would be a lie in exactly the place someone would later trust it.
3. **No adversarial review.** Nobody has tried to get past it.

### What a reviewer would still find missing

- The **ToS is banked but unreachable** — §1 is a document in the repo; no in-app screen renders it.
- **1.2(b)** still has SR-050: admin takedown cannot remove the reported photo.
- **1.2(c)** is still comments-only; flag-level hide is unbuilt.

**B-1 remains BLOCKING-OPEN.** This train closed the filter and the copy — not the blocker.

---

## Coverage added

| Area | What it pins |
|---|---|
| `blockedTerms.test.ts` (41) | **must-PASS corpus first** — 16 real barrier reports incl. profane ones, 8 Scunthorpe cases; the D-2 regression guard |
| `reports.test.ts` (+13) | v2 `cat=` round-trip, category-with-empty-reason, unknown-category fail-open, **v1 rows still parse** |
| `ReportContentModal.test.tsx` (+7) | radio semantics, single-select, deselect, category-only send, iOS-announces / Android-silent |
| `copy.test.ts` (+6) | the ratified 24h string, RATIFIED marker discipline, Sky's five verbatim |

---

## DECISIONS FOR SKY

1. **The ToS is unreachable in-app.** Needs a screen and a nav entry. Out of scope here; Apple expects the
   terms readable in the app.
2. **`REPORT_CATEGORY_LABEL` — "What's wrong?" — is AGENT-PROPOSED.** The one new user-visible string this
   run introduced. Ratify or replace.
3. **The curated term list wants your eyes, and Jordan's.** Vendor real LDNOOBW and re-apply the D-2 rule,
   or keep this seed and grow it. Neither changes the matcher or the tests.
4. **The 24h commitment now ships.** `REPORT_SENT_BODY` is the only place in the running binary stating it.
   If it stops being sustainable, three things change together: the string, ToS §1, §4.
5. **Nothing is merged.** Rollback for the whole train: `git reset --hard df80f1c`.
