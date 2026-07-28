# 01 · MODERATION GAP-CLOSE — M-1 … M-4

**Fire in a FRESH window. Top available Opus (currently Opus 5), ultracode, max effort.**

**Repo:** `~/AccessMap` · **Branch:** `shipready/3-polish-submission` · **Base:** `df80f1c`
**Reads first, before any edit:** `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` (Sky's ratified
texts — the source of truth for every string below) and `design-reviews/ship-ready/DECISIONS.md` **§SKY-4**
(the ratification record + the M-1…M-4 table this prompt closes).

---

## What this closes

`df80f1c` banked Sky's ratified moderation texts as **documents**. Nothing in the app changed. This run
turns four of those documents into shipped behaviour. Apple Guideline 1.2 leg **(a) is 🔴 OPEN** and this
run is what moves it.

| Car | Item | Shape |
|---|---|---|
| **M-4** | SR-117 repo-vs-live schema, now a published-promise dependency | one-line repo text edit |
| **M-1** | `REPORT_SENT_BODY` ships the ratified string | string + fence conversion |
| **M-2** | Leg 1.2(a) submit-time content filter | new module + 2 call sites |
| **M-3** | The five report categories | UI + fence inversion, **Sky-gated** |

Ordered cheapest-and-most-load-bearing first. **M-4 and M-1 are zero-decision — start there.**

---

## ⚠ THE TWO TRAPS — read before writing a line

The audit train mechanised its honesty fence into the test suite. **Two of those tests will go red in this
run. Both are supposed to. Neither may be deleted.** Converting a fence is the work; deleting one silently
destroys the mechanism that kept agents from writing Sky's policy text.

### Trap 1 — the PROPOSED-marker fence (hits M-1)

[`src/lib/__tests__/copy.test.ts`](../../../src/lib/__tests__/copy.test.ts) has
`describe('B-1 copy carries the PROPOSED marker (the honesty fence, mechanised)')`. It asserts every export
in `PROPOSED_EXPORTS` carries, **as the last thing in its JSDoc**, the exact marker:

```
S-8) — Sky's final wording lands in DECISIONS §A / BP16.
```

`REPORT_SENT_BODY` is in that list. M-1 ratifies it, so its JSDoc marker becomes a lie and the test goes red.

**Do this:** move `REPORT_SENT_BODY` **out** of `PROPOSED_EXPORTS` and into a new sibling list —
`RATIFIED_EXPORTS` — with its own marker asserting provenance, e.g.
`RATIFIED by Sky 2026-07-27 — DECISIONS §SKY-4, 14_MODERATION_TEXTS_v1.md §5.` Add the mirrored
`it.each` pair (contains-marker + ends-with-marker) so a ratified string is guarded exactly as strictly as a
proposed one. The `prose()` helper is reusable as-is.
**Do NOT:** delete the test, delete the export from the list, or loosen the assertion to `.toContain`.

### Trap 2 — the anti-taxonomy fence (hits M-3)

Same file: `it("carries no report-category taxonomy — that list is Sky's copy (05 §3 ⑯)")` asserts `copy.ts`
contains **no** exported string beginning `Harassment` / `Hate speech` / `Spam` / `Nudity` / `Violence`.
M-3 adds *"Spam or fake report"* and *"Harassment or hate"*. Red by design.

**Do this: invert it.** Replace with a test asserting the taxonomy is present and is **exactly** Sky's five,
verbatim from `14_MODERATION_TEXTS_v1.md` §3, in order. The fence's purpose was never "no taxonomy" — it was
"no agent-invented taxonomy." Ratification flips the polarity; it does not remove the guard.
**Do NOT:** delete the test.

Both conversions get a comment naming `DECISIONS §SKY-4` as the authority.

---

## §SKY-PREP — ✅ BOTH DECISIONS ANSWERED (2026-07-27). No open gates.

Record both in `DECISIONS.md` under a new `§SKY-5` as part of this run.

### ✅ D-1 (M-3) — **SUPPLEMENT.** Category picker *plus* the free-text box.

Sky's decision. The five categories are added **alongside** the existing free-text reason, not in place of
it. Rationale she accepted: the typed detail is what makes a report actionable for a solo maintainer, and the
picker adds the triage axis Apple expects — both, not either.

This **supersedes** the deliberate free-text-only scoping in **§SKY-3h** and the comment at
[`ReportContentModal.tsx:289`](../../../src/components/ReportContentModal.tsx) (*"Free text, deliberately: a
fixed category list would be…"*). **Update that comment** — do not leave it contradicting shipped behaviour.
Same precedent as **J2-1**: a scoping decision superseded by a later Sky decision, recorded rather than
silently overwritten.

**`canSend` becomes: a category is selected OR a reason is typed.** Neither alone is mandatory — an
easy-path reporter taps one chip and sends; a detailed reporter types. Do not make both required; that adds
friction to an abuse-reporting flow, which is exactly where friction does the most harm.

⚠ The report body format changes, and `[REPORT] v1 …` is parsed downstream by the
`UPDATE feedback SET category='report' WHERE body LIKE '[REPORT]%'` path named in
`ReportContentModal.tsx:170`. **Bump the envelope to `v2` and keep the v1 reader working** — old rows exist.

### ✅ D-2 (M-2) — **CURATED.** Slurs / hate / explicit / harassment only.

Sky's decision. Vendor the LDNOOBW English list, then **keep only the four classes §2 actually names** —
slurs and hate terms, explicit sexual terms, harassment language — and **drop mild profanity.** Her §2
wording already describes the curated set rather than the raw file, so this makes the code match the
ratified text.

Rationale she accepted: *"the damn ramp is still broken"* is a genuine barrier report from a frustrated
user, and silently rejecting it teaches that person their report is unwelcome — the exact opposite of what
this app is for.

**Record the curation in the module header**: how many terms the raw list had, how many survived, and the
rule used to cut. A future reader must be able to audit the filter without diffing against upstream. Do not
delete the dropped terms into thin air — keep them in a commented `DROPPED_MILD_PROFANITY` block in the same
file so the decision is reversible and visible.

---

## M-4 · SR-117 — your ToS already decided this

**Start here. It is one line, zero risk, and it closes a promise you have now published.**

The SR-117 fork was live-vs-repo drift on `flag_comments.user_id`. The drift-capture artifact is already
banked at [`supabase/migrations/2026-07-27_drift_capture_flag_comments_user_id.sql`](../../../supabase/migrations/2026-07-27_drift_capture_flag_comments_user_id.sql)
and offers Sky two options. **The fork is now closed — by Sky, in the ToS, without anyone noticing.**

> §1 *Your account:* "Anything you've contributed may stay in the app, with your name removed, so the
> community's record of barriers stays whole."

That sentence **is Option A** — anonymise, don't erase — in Sky's own published words. It also **forecloses
Option B**: Option B is `ON DELETE CASCADE`, which deletes contributions on account deletion and would make
the published ToS false. Option B was already flagged destructive + Jordan-relevant + colliding with C-8
(a user could erase reports of their own abuse by deleting their account). It is now off the table.

**Do:**
1. Edit [`supabase/migrations/2026-05-30_flag_comments.sql:8`](../../../supabase/migrations/2026-05-30_flag_comments.sql)
   to match live, per Option A: `user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,` — plus a
   comment recording that deleted accounts leave comments in place with the author anonymised, **and that
   the ToS §1 "Your account" clause depends on it.**
2. Update the drift-capture file's fork block: mark **Option A RATIFIED (2026-07-27, via ToS §1)** and
   Option B **FORECLOSED — would falsify the published ToS.** Keep both texts; strike neither.
3. Same treatment for `supabase/schema.sql` if it repeats the `NOT NULL` / `CASCADE` declaration — grep it.
4. `DECISIONS.md` §SKY-5: record that the ToS closed SR-117 and that this is a **repo-text correction, not a
   schema change.**

🚫 **Zero SQL runs. Zero `apply_migration`. Live is already correct — this makes the repo stop lying.**

---

## M-1 · `REPORT_SENT_BODY` ships the ratified string

**Change:** [`src/lib/copy.ts:152`](../../../src/lib/copy.ts)

```
- export const REPORT_SENT_BODY = 'Thanks — your report has been sent.';
+ export const REPORT_SENT_BODY = 'Thanks, your report was sent. Reports are reviewed within 24 hours.';
```

Verbatim from `14_MODERATION_TEXTS_v1.md` §5 — note the comma, not the em-dash. Rewrite its JSDoc from
PROPOSED to RATIFIED per **Trap 1**.

**Then chase every consumer:**
- [`ReportContentModal.tsx:274`](../../../src/components/ReportContentModal.tsx) renders it (no change expected)
- [`copy.test.ts`](../../../src/lib/__tests__/copy.test.ts) — lines ~125, ~197, ~223: the `§SKY-3c` W1-vs-B1
  distinctness test asserts `/moderat|abuse|maintainer reviews/i` does **not** appear in W1 strings. The new
  B-1 string says "reviewed within 24 hours" — confirm it still passes and does not collide with a W1 answer.
- [`ReportContentModal.test.tsx:156`](../../../src/components/__tests__/ReportContentModal.test.tsx)

⚠ **The new string makes a time-bound promise the old one didn't.** It is now the *only* place in the running
app that states the 24h commitment, so it must stay word-identical to ToS §1 and §4. Add a test asserting
`REPORT_SENT_BODY` contains `within 24 hours` so a future copy tweak can't silently break the commitment.

**Bundle the related HIGH while you're here** (from `13_B1_VERIFY_LEDGER.md`): *"Report sent" is silent on
iOS VoiceOver* — `accessibilityLiveRegion` is Android-only in RN; the house pattern pairs it with
`announceForAccessibility`. Same moment, same file. Follow the existing house pattern — grep for
`announceForAccessibility` and match it exactly.

---

## M-2 · Leg 1.2(a) — the submit-time filter

The only 🔴 leg. Spec is `14_MODERATION_TEXTS_v1.md` §2.

**New module:** `src/moderation/blockedTerms.ts`
- Vendored LDNOOBW English seed **with its license + provenance in a header comment**, **curated per D-2** —
  slurs / hate / explicit / harassment only, mild profanity dropped into a commented `DROPPED_MILD_PROFANITY`
  block, with the kept-vs-dropped counts and cut rule recorded in the header.
- A clearly-marked, Sky-editable `ADDITIONS` array in the same file (§2 requires it).
- Export a matcher, not a raw list: `containsBlockedTerm(text: string): boolean` (or one returning the
  matched term for tests only). **Case-insensitive, word-boundary** — `\b` around each term. Unicode-aware.

**Call sites — follow the existing trust-boundary pattern, don't invent one:**
- [`src/lib/flags.ts:1092`](../../../src/lib/flags.ts) `createFlag` — validates coordinates then calls
  `assertValidCategoryAndSeverity` before building the payload. **That is the precedent.** Add the
  description check in the same block, throwing the same way.
- [`src/lib/comments.ts:116`](../../../src/lib/comments.ts) `addComment` — already trims, rejects empty, and
  enforces `MAX_COMMENT_LENGTH` client-side before insert. Add the check right after the length guard.

**Rejection copy** (`copy.ts`, RATIFIED marker per Trap 1, verbatim from §2):

> "This can't be submitted yet. It may contain language that breaks the community guidelines. Please edit it
> and try again."

Deliberately does not echo the matched term — **do not add the term to the message, the log, or the
accessibility announcement.** Surface it through each screen's existing error path (see `CLAUDE.md` →
Error Handling Tiers); do not add a new dialog species.

### ⚠ Two things to get right

1. **False positives are a real harm here.** This app exists so disabled people can describe barriers, often
   while frustrated. A filter that rejects *"the damn ramp is still broken"* silently teaches someone their
   report is unwelcome. Word-boundary matching kills the classic Scunthorpe substring bug; the D-2 curation
   handles the over-broad-list half. **Add tests with real barrier descriptions that must PASS** — including
   mildly profane ones, which is the whole point of the curation — not only bad strings that must fail. The
   passing set is the more important half of the suite, and it is the regression guard on D-2.
2. **Client-side only is a real limit, and the docs must not overclaim.** §2 says "rejected client-side before
   insert" — so it is bypassable by anything that isn't the app. That is acceptable for 1.2(a) and worth
   stating plainly in the code header. **Do not** describe it anywhere as making the platform safe. If a
   server-side mirror is wanted later, that is a *migration file* proposal, never an applied change.

---

## M-3 · The five report categories — ✅ D-1 answered: SUPPLEMENT

Build the picker **alongside** the free-text box, per §SKY-PREP D-1. `canSend` = category selected OR reason
typed. Update the now-superseded `ReportContentModal.tsx:289` comment.

- Add the five to `copy.ts` verbatim from §3, in order, RATIFIED-marked.
- Invert the anti-taxonomy fence per **Trap 2**.
- Wire the picker into [`ReportContentModal.tsx`](../../../src/components/ReportContentModal.tsx). Use the
  house primitives (`src/components/ui/`), tokens from `src/theme.ts` — never raw hex. Match the existing
  chip/filter pattern on the map rather than inventing a control.
- **A11y is not optional here** — this is AccessMap. Radio-group semantics, ≥44pt targets, a real accessible
  name per option, selection announced. Alex's WCAG 2.2 AA bar applies.
- Update `buildReportBody` → envelope **v2**, keeping the v1 reader alive (see D-1's warning).
- Recheck the **§SKY-4 M-1 note** about `[REPORT]%` rows rendering as raw markup in Settings → My feedback —
  a longer v2 envelope makes that worse. The recommended one-predicate hide is in `12_READY_OR_NOT.md` §2.

---

## Hard fences

- 🚫 **No live database changes.** No `apply_migration`, no `execute_sql` that writes. M-4 is repo text only.
  Migrations are FILES with rollback (Const. Art. 1).
- 🚫 **No merge, no push.** Stop on `shipready/3-polish-submission`. Sky merges.
- 🚫 **No new policy text.** Every user-facing string traces to `14_MODERATION_TEXTS_v1.md`, verbatim. If a
  string is needed that Sky has not written, **stop and add it to a §DECISIONS FOR SKY block** — do not draft
  it. That fence is the whole reason this train is trustworthy.
- 🚫 **Neither mechanised fence gets deleted.** Convert both.
- 🚫 No EAS build, no app-store anything, no external sends.
- One commit per car, `M-4 → M-1 → M-2 → M-3`. Conventional-commit subjects.
- **MVC = M-4 + M-1.** If the window dies, those two alone are a coherent, shippable stop.

---

## Verification — every car

```bash
cd ~/AccessMap && npm run typecheck && npm run lint && npm test
```

Jest was **2040 passing / 0 failing** at the last full run. Expect the two fence tests to go red mid-run and
be **converted, not removed** — the final count should be ≥2040 with the converted tests present and green.

Per car, additionally:
- **M-4** — `git diff` touches only `supabase/**` text + `DECISIONS.md`. Prove no statement ran: no
  Supabase write tool appears anywhere in the transcript.
- **M-1** — new string renders in `ReportContentModal.test.tsx`; the 24h-commitment guard test passes.
- **M-2** — the must-pass corpus of genuine barrier descriptions is green; blocked terms rejected before any
  network call (assert the Supabase client was never invoked).
- **M-3** — a11y assertions on the picker; v1 envelope reader still parses an old `[REPORT] v1 …` row.

---

## Report back

`design-reviews/ship-ready/build-plan/RESULT_01_moderation-gapclose.md`, plus a `§SKY-5` appended to
`DECISIONS.md`. State plainly:

1. Per car: commit hash, files, tests before/after.
2. **Both fence conversions, quoted** — the old assertion and the new one, side by side.
3. **Leg 1.2(a): does it move 🔴 → 🟢, or 🔴 → 🟠?** Score it honestly, and say what a reviewer would still
   find missing. `12_READY_OR_NOT.md` §1 scores legs individually and **never averages** — hold that line.
4. Anything you stopped on rather than guessed, in a `DECISIONS FOR SKY` block.
5. The updated B-1 picture: what still blocks submission after this run.

**Do not claim B-1 is closed.** After all four cars, 1.2(b) still has the SR-050 photo-takedown hole and
1.2(c) is still comments-only. This train closes the filter and the copy — not the blocker.
