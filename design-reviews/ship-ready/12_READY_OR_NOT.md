# SHIP-READY — 12 · THE SUBMISSION VERDICT

**Date:** 2026-07-27 · Branch `shipready/3-polish-submission`, **stopped on the branch**
`main == origin/main == 512494a`, untouched · Provenance: Opus 5, ultracode max effort

---

# ⛔ VERDICT: NOT READY TO SUBMIT

Not because the build is bad — the gate is green and a lot closed this phase — but because **four things
block, and every one of them needs your hand, not another agent's.** Two are wording, one is a credential,
one is a device check. None can be closed from a branch.

**The single most important sentence in this document:** *Apple Guideline 1.2 is still open.* Phase 3 built
the report mechanism it was green-lit to build, and it works — but 1.2 has five legs and the mechanism is one
of them. A verdict that averaged four partial legs into a pass would be the same error as closing B-1 on the
strength of W1, in a new costume.

---

## §1 Apple Guideline 1.2, scored leg by leg — never averaged

| Leg | Score | Why | Owner |
|---|---|---|---|
| **(a) filter objectionable material from being posted** | 🔴 **OPEN — unmoved** | Never specced anywhere in 00–05 or the fork briefs. Report → review → takedown is **reactive**; it is not a filter. A submit-time gate needs a word list or a service, and a word list is policy text | **Sky** (product + wording) |
| **(b) report mechanism + timely response** | 🟠 **PARTIAL** | **Mechanism: closed.** A visible Report control on flags *and* comments, guest-usable, reason captured, greppable in `public.feedback`, honest failure (never a false "sent"). **Two real holes:** takedown is **incomplete for flags** — SR-050, admin cannot remove the reported photo — and "timely" is a commitment only you can make | **Sky** (the commitment; the SR-050 fork) |
| **(c) block abusive users** | 🟠 **PARTIAL** | Hide ships on **comments only**, your scoping (§SKY-3h). Flag-level hide is unbuilt and named as a follow-up. Do not report (c) as closed | this train for comments; a follow-up for flags |
| **(d) published contact info** | 🟢 **plausibly met** | mailto feedback + the report failure ladder now surfaces the address in-app at the moment of need; ASC Support URL is yours | **Sky** (ASC field) |
| **ToS / community guidelines** | 🔴 **OPEN — 100% Sky** | Nothing authored anywhere. The honesty fence held: no agent wrote policy text | **Sky** |

**B-1 remains BLOCKING-OPEN.** What would close it: your ToS/guidelines text · a decision on leg (a) · a
stated response commitment · the SR-050 takedown fork.

---

## §2 What BLOCKS submission (4)

| # | Blocker | Why it cannot be closed from a branch |
|---|---|---|
| **B-1** | Apple 1.2 — see §1 | Policy text, a product decision, a commitment, and an authorization fork. All yours |
| **B-3** | Privacy policy content drifted 6 ways vs the shipped app | You word it. Reviewers cross-read the policy against the nutrition labels, so it must be true *before* the labels lock. Checklist: `04 §A-14` |
| **B-6** | Reviewer demo account is dead credentials | 2.1(a) needs working creds. Provisioned in the Auth dashboard — no agent handles credentials |
| **SR-021** | **No binary-launch evidence exists. None.** | The simulator tier was down all train and no store build exists. **The first proof this app launches on iOS is your next EAS build.** Everything below is web-verified, code-inferred, or NEEDS-DEVICE |

### ⚠ Three more, added by the B-1 adversarial pass — `13_B1_VERIFY_LEDGER.md`

Not blockers in the Apple sense, but all HIGH and all needing a decision before this ships:

- **The report envelope is shown back to the reporter as raw markup.** A signed-in report appears in Settings
  → My feedback as `[REPORT] v1 target=comment id=9f3c… flag=22a1…`, as the row's accessible name, and in the
  PIPEDA data export. Recommend hiding `[REPORT]%` rows from that surface — one predicate, no new copy.
- **Hide is immediate, irreversible, and has no unhide anywhere in the app** — while drawn as the
  pixel-identical twin of Report, 16pt away. A mis-tap silently removes a comment from that device forever.
- **"Report sent" is silent on iOS VoiceOver** — `accessibilityLiveRegion` is Android-only in RN, and the
  house pattern pairs it with `announceForAccessibility`.

Three were **fixed** in the same pass, one of them serious enough to have broken the blocker: every **guest**
report was told it had failed while landing correctly in the table (`6abe5fe`). Guests are the App Review
reviewer's cohort.

### ⚠ A fifth, conditional: **D-B6 → R-6**

`§SKY-3d` is a **blocking gate**: Phase 3 may not be marked complete and this branch may not merge until you
check Help and About on a real device at AX5. **If the ✕ still clips there, R-6 upgrades from RECOMMENDED to
BLOCKING** — on touch there is no scrim-tap fallback, so a clipped ✕ means the sheet cannot be dismissed at
all. The web fix is measured and real (About ✕ −65 → 97; Help wrapper exactly 90% of 812); web is a proxy and
Dynamic Type at AX5 is device-only.

---

## §3 What is DONE — 32 commits, gate green

**Gate at the tip: typecheck 0 · lint 0 errors / exactly 79 warnings · jest 177 suites / 2534 passed / 0
failed / 84 todo · `GlassSurface.tsx` 0 changed lines · box-none 6 sites · migrations applied by an agent: 0.**

| Item | Outcome |
|---|---|
| **Step 0 — the lint gap** | ✅ Closed. The prep run genuinely could not run eslint (darwin binding vs Linux VM) and said so instead of claiming green; run locally it is exit 0 at exactly the 79-warning baseline. Backlog §SKY-3e#5 discharged |
| **SR-117 — comment author type lie** | ✅ And it was **two** drifts: nullable *and* `ON DELETE SET NULL` where the repo says CASCADE, neither with a ledger row. Types now honest; the `==` ownership trap pinned by test; the DDL half is a fork with **Option B flagged destructive** (a CASCADE would let a user erase reports of their own abuse by deleting their account) |
| **G5 focus-return** | ✅ 3 adoptions + guard J. The adversarial pass caught **5 real defects**, the worst mine: `release()` returned focus at close *intent*, so on Android — its only path — the cursor was aimed at an occluded control, with every gate green. Also: the screen-reader auto-open, the one Nearby session every VoiceOver user gets, had no focus return at all |
| **B-1 moderation controls** | ✅ Built (8 commits): the `[REPORT]` envelope with a round-trip parser, one report sheet for both targets, controls on flags and comments, Hide on comments, and "Flag as wrong" wired at last — with the dedup that stops one person crossing the disputed threshold alone. **Zero schema change**, as you specified |
| **G3 grabbers** | ⏸ **Stopped for you, by design.** The arbiter ran first and decided the ink |
| **Conservation** | ✅ All 117 findings disposed with evidence — which is how the 12 nobody had disposed came to light |
| **Class B collateral** | ✅ Export compliance, the four accessed-API reason codes, and the manifest's truth against the new report path are now pinned by tests. All were true and asserted by nothing |

---

## §4 SKY'S LIST — in order

### 🔴 First, because everything else waits on them

1. **Word the four moderation texts.** ToS · community guidelines · report-category vocabulary (if you want
   one — the sheet ships free-text deliberately) · your response commitment. Apple's standard 1.2 rejection
   asks for ~24-hour handling; a stated commitment helps, and it must be yours.
2. **⚠ Ratify one string personally: `REPORT_SENT_BODY`** — *"Thanks. Reports are reviewed by the AccessMap
   maintainer."* It carries no cadence, no response time and no outcome, and your §SKY-3g said to state the
   triage path visibly — but it is still a claim about a person's behaviour, and an agent should not have
   final say over that. Every new string is PROPOSED and listed in the B-1 record; this is the one that
   commits you to something.
3. **Decide Apple 1.2(a).** A submit-time filter, or a documented reason there isn't one. Unspecced by
   everyone so far, so it will not resolve itself.
4. **B-3 — rewrite the privacy policy** against `04 §A-14`, *before* the nutrition labels.
5. **B-6 — provision the reviewer account**, verify the login, and put the creds plus a "Browse without an
   account" line in the review notes.

### 🟠 Then the forks I prepared but would not decide

6. **SR-050 — the takedown fork.** Admin takedown cannot remove a reported photo (owner-only Storage RLS).
   Option A: a Storage delete policy for admins — synchronous, narrow, my recommendation. Option B: a
   server-side sweep, shareable with R-1. Jordan review either way. **No SQL was pre-written** — an
   authorization change on user-uploaded content should not sit one paste from live before you say yes.
   `11_SR050_TAKEDOWN_GAP.md`
7. **SR-117's DDL half.** Option A ratifies live and corrects the repo text (recommended, zero runtime
   change). Option B is destructive — see above.
8. **G3 grabbers.** The ink is arbitrated: `inkGlassMuted` is the only candidate clearing 3.0 on all five
   surface variants in both modes. What's left is whether a grabber ships at all, since iOS's own sits near
   1.3–1.6:1 and every one of these sheets already has a visible Close. Four options: `08_G3_GRABBER_ARBITER.md`
9. **The moderation visual treatments** — the Report pill, the comment footer, the "Flag as wrong" outline.
   Each was built with an arbitrated or already-shipped ink and each is flagged as awaiting you, not asserted.
10. **The 12 undisposed findings** in `10_CONSERVATION_TABLE.md §6` — two HIGH. And note `05 R-10`'s
    disposition for SR-048 was fictional: the fork brief it claims to attach to has zero SR-048 content.

### 🟢 Then App Store Connect

11. Privacy nutrition labels (`04 §A-Sheet-A`) — **after** B-3, so policy and labels agree.
12. Age rating (`§A-Sheet-B`, expect 13+). Submitting before Sept 2026 avoids the mandatory social-media
    questions.
13. Accessibility Nutrition Labels — declare **only device-verified rows**, after the device pass.
14. EU DSA trader declaration, or deselect EU for v1.
15. Metadata: name, subtitle, category, keywords, support URL, review notes — your voice.
16. **Screenshots: iPhone 6.9″ and 6.5″ only.** `supportsTablet:false` retired the 13″ iPad requirement.
17. Export compliance: nothing to do — `ITSAppUsesNonExemptEncryption:false` ships in the binary and is now
    test-pinned. It stops ASC asking per build.

### The merge-order note

`shipready/3-polish-submission` contains Phase 2 beneath it. Also unmerged and **not** part of this train:
`fix/photo-privacy-sanitize` @ `64342e1` (CRITICAL, no file overlap), the device-tune train (three phases,
with mockup gates A-2/A-4/A-5 still open), and the R2 stack BP3→BP17 (BP16 owns every string, so **all the
PROPOSED copy above lands in its gate, not here**). Nothing in this train touches those surfaces.

---

## §5 THE CONSOLIDATED DEVICE LIST — one TestFlight pass

**Run `§6` of `05_THE_SUBMISSION_GAP_LIST.md` — the 10-line smoke script — FIRST.** Line 4 (an anonymous
report end to end) is the first true proof the app can write to production at all.

References, not duplicates:

| Source | Rows | What |
|---|---|---|
| device-tune `qa-reports/2026-07-26_…Phase3….md §8` | **20** | the standing list (drawer, header, map) — verified count; docs elsewhere say 21 |
| ship-ready `06 §5` | **D-B1…D-B9, D-B12** | dismissal + escape + safe-area + the box-none gesture check jest cannot do |
| **D-B6** | ⛔ | **the blocking gate** — Help/About ✕ at 1.0× / 1.3× / AX5 |
| ship-ready `09 §device rows` | **D-B11, D-B13…D-B17** | focus return on 3 surfaces; whether `onDismiss` fires for a pageSheet; whether our restore beats UIKit's own; TalkBack after the 320ms exit wait; the SR auto-opened session |
| **new this phase** | **D-B18…D-B21** | ① the report sheet presenting *over* the flag sheet (modal-over-modal) ② the 5-pill `secondaryRow` and the comment footer at AX5 ③ VoiceOver reaches Report **and** Hide on another person's comment — the composite-label law is the highest-risk edit in the phase ④ file a real report end to end and confirm the row lands in `feedback` with `[REPORT]` at byte 0 |

**Why so much is device-only:** react-native-web stubs `setAccessibilityFocus` to an empty body and drops
`accessibilityViewIsModal`, so the entire focus-return feature has **zero web-observable delta**. Jest proves
a call happened with the right handle. It cannot prove a cursor moved.

---

## §6 The honest shape of this train

Three things went right that are worth keeping: the arbiter ran **before** anyone rendered a grabber, so a
taste argument became a table; the adversarial pass found a defect in code that had already passed every gate,
including one I designed; and enumerating all 117 findings — instead of asserting a range, as `05 §8` did —
is what surfaced the twelve that had been dropped.

Two things to carry forward. **A green gate is not evidence of behaviour** — G5's entire feature was green and
Android-broken at the same time, and only a hostile read caught it. And **`05 §8`'s conservation claim was
false**: it covered SR-001…039 and cited a grep that does not exist. The remedy in `10_CONSERVATION_TABLE.md`
is enumeration, because a range is a promise and a list is a check.

**Nothing was merged, built, submitted, or applied to the database. The branch stops here.**


---
---

# ⏱ RUN-2 RE-SCORE — 2026-07-28

**Everything above is the 2026-07-27 verdict and is left standing as the record.** This section supersedes
its §1 and §2. Branch `shipready/3-polish-submission`, stacked on `7349346`, **stopped on the branch**.
`main` untouched. Decisions: `DECISIONS.md §SKY-6` + `§SKY-6a`.

**Gate at the tip:** typecheck 0 · lint 0 errors / **80 warnings** · jest **182 suites / 2701 passed / 0
failed** / 84 todo · `GlassSurface.tsx` **0 changed lines** · **migrations applied by an agent: 0.**

> ⚠ The rails say "exactly 79 warnings". The true baseline at `7349346`, measured with zero `src/` changes in
> the tree, is **80**. The drift predates this run. Recorded rather than quietly matched.

---

## §1′ Apple Guideline 1.2, re-scored leg by leg — **never averaged**

| Leg | Was | Now | Why |
|---|---|---|---|
| **ToS / community guidelines** | 🔴 OPEN — 100% Sky | 🟢 **CLOSED** | Sky's §1 text ships **verbatim** in a real in-app screen, reachable from Settings, About, **and the report sheet**. A markdown-reading guard fails if the app and her document ever drift, in either direction |
| **(a) filter objectionable material** | 🟠 (curated seed) | 🟠 **still amber, and better** | The real LDNOOBW list is now vendored — CC BY 4.0, retrieved 2026-07-28, sha256 recorded — re-curated under D-2, **369 terms live**. Still client-side and bypassable; still no homoglyph/l33tspeak defence (buying that costs false positives on ordinary words, the wrong trade here). **A server-side mirror is the only thing that makes this green, and it is a migration proposal for you** |
| **(b) report mechanism + timely response** | 🟠 PARTIAL | 🟠 **mechanism complete; one half awaits your SQL** | Report path unchanged and working. **Owner takedown now deletes the photos** (SR-050 (a) built). **Admin takedown still cannot** — that needs a Storage policy, written and waiting as **§C-12**, applied by nobody. The 24-hour commitment is visible in-app *and* readable in the ToS, word-identical, guarded |
| **(c) block abusive users** | 🟠 comments-only | 🟠 **comments-only, and Unhide is at your gate** | Scope is unchanged by design (§SKY-3h). The Unhide surface is **rendered as candidates and stopped for your pick** — Car 5 was instructed to stop, and did. Flag-level hide remains a named follow-up |
| **(d) published contact info** | 🟢 plausibly met | 🟢 **met** | Unchanged, plus the ToS now carries the address in Sky's own words |

### What still blocks B-1

Two things, both yours:
1. **§C-12** — the admin Storage-delete policy. Until applied, an admin takedown leaves the reported photo
   publicly fetchable, and (b) cannot be called closed.
2. **Leg (a) is amber by honest choice, not by omission.** If you want it green, that is a server-side filter
   and a migration.

Everything else B-1 was waiting on — your ToS text, a decision on (a), a stated response commitment — **is
done and shipping.**

---

## §2′ What BLOCKS submission — **now 3, and every one is physical**

| # | Blocker | Why no agent can close it |
|---|---|---|
| **B-3** | Privacy policy content drifted 6 ways vs the shipped app | You word it. Reviewers cross-read the policy against the nutrition labels, so it must be true *before* the labels lock. Checklist: `04 §A-14` |
| **B-6** | Reviewer demo account is dead credentials | 2.1(a) needs working creds. Provisioned in the Auth dashboard — no agent handles credentials |
| **SR-021** | **No binary-launch evidence exists. None.** | The first proof this app launches on iOS is your next EAS build. Everything is web-verified, code-inferred, or NEEDS-DEVICE |

**B-1 moved off this list as a blocker in its own right** — what remains of it is the §C-12 apply, which is a
Sky-physical action and is counted below.

### The three HIGHs from the B-1 adversarial pass

| | Was | Now |
|---|---|---|
| Report envelope shown back as raw markup | HIGH, open | ✅ **Fixed.** Hidden from My Feedback; **deliberately kept in the PIPEDA export**, stance recorded in three places |
| Hide is irreversible with no unhide anywhere | HIGH, open | ⛔ **At your mockup gate** — three letters unblock the build |
| "Report sent" silent on iOS VoiceOver | fixed in the M-run | unchanged |

---

## §3′ SKY'S LIST — what is actually left

### 🔴 Physical, and nothing else can proceed without them

1. **Apply §C-12** (admin Storage delete on `flag-photos`). Fenced, with rollback, a read-only verify, and a
   pre-state probe. Jordan review first — it widens delete authority over user-uploaded content.
2. **Answer the HIGH-2 mockup gate** — Row `A`/`B`/`C` · Unhide-all `H`/`F` · Section `S1`/`S2`.
   `HIGH2_hidden_comments_mockup_gate.html`.
3. **B-3 — rewrite the privacy policy** against `04 §A-14`, *before* the nutrition labels.
4. **B-6 — provision the reviewer account**, verify the login, put the creds + "Browse without an account" in
   the review notes.
5. **The device pass** (§5′ below), including the **D-B6 blocking gate**.
6. **Merge this branch**, then the first EAS build — the first evidence the app launches at all.

### 🟠 Decisions you can take at any time

7. **Leg (a) green or amber?** A server-side filter mirror is the only path to green.
8. **SR-117's DDL half** — Option A ratifies live (recommended); Option B is destructive.
9. **R-1's edge function** — `R1_ACCOUNT_DELETION_SWEEP.md`, written, undeployed. Face photos currently
   survive account deletion **and become permanently un-deletable**.
10. **`storage_path` column** — the day the photo-URL shape changes, the SR-050 derivation becomes the wrong
    bet. Backlogged, not forgotten.
11. ~~**Six `color.brand`-as-text sites** flagged by the Car-4 arbiter run and **not swept**~~ ✅ **CLOSED
    2026-07-29 — measured, all six pass, nothing restyled.** `17_BRAND_INK_MEASUREMENTS.md`. Note the line
    numbers cited here had drifted (`MapScreen:3458` is now `zoomBtn`); the real site is
    `MapScreen:3480`. One of the six is dead style, two have inert colours wrapping lucide SVGs.
12. **The residual guidelines citation:** `CONTENT_BLOCKED_MESSAGE` still cites the community guidelines from
    inside an `Alert`, which cannot hold a link. You ruled it out of scope for Run 2 (§SKY-6a); a user told
    they broke the guidelines still has no route to read them.

---

## §5′ DEVICE ROWS GAINED THIS RUN

Add to the consolidated list in §5. **D-B6 remains the blocking gate.**

| row | what to check |
|---|---|
| **the ToS walk** | Open from all three entries (Settings, About, report sheet). Confirm it presents **over** About and **over** the report sheet, and that closing returns to the surface beneath. VoiceOver two-finger-Z escape on the pageSheet. The prose at AX5 |
| **the Unhide flow** | After the gate is answered and built |
| **the grabber on real glass** | 1.0× / 1.3× / AX5. It is **deliberately darker than the platform's** — confirm it still reads as a drag affordance rather than a rule. Includes the Tasks filter sheet (the SEAM) |
| **filter rejection with VoiceOver** | Submit a blocked description; confirm the rejection is announced, and that it never names the matched term |
| **owner photo takedown** | Delete an owned flag with **2+ photos**; confirm every photo URL 404s afterwards |
| **admin takedown** | Confirm the row goes and the photo **survives** — until §C-12 is applied. This is the gap, observed |
| **guest cold walk** | Triage, bulk-triage, and reopen each say "Sign in required" instead of "This flag changed" or silence. "Use my location" works on a **second** tap after a denial |
| **web (if user-facing)** | Nearby no longer auto-opens for every visitor; a no-location guest is fitted to the flags rather than stranded on San Francisco |

---

## §6′ The honest shape of Run 2

**The arbiter caught this run's own defect.** Car 1's terms link reused a shipped link treatment and argued
it needed no measurement. Car 4 measured it: **3.70:1 light / 3.56:1 dark against a 4.5 floor** — and the
*shipped* privacy link had the same defect, inherited and never checked. "Already shipped elsewhere" is an
argument, not a measurement.

**A real render caught what jest could not.** The whole suite was green while the terms sheet rendered
*underneath* the About card on web — rn-web gives every modal the same z-index, so DOM order decided. Native
was never affected, which is exactly why only building and driving the app could find it.

**Writing a guard found a third instance of the bug it was guarding.** The SR-093 gate was specced for two
callers. Scoping the test properly surfaced `runBulkAction`, where a guest could fire one refused write per
selected flag.

**And the vendoring nearly deleted the thing that matters most.** "Vendor the real list" sounds like *replace
the seed*. LDNOOBW contains **no disability slurs at all** — the class most likely to be aimed at this app's
users — and no self-harm phrases. A wholesale replace would have removed them and turned two tests red.

**Nothing was merged, submitted, or applied to the database. The branch stops here.**

---
---

# ⏱ RUN-3 RE-SCORE — 2026-07-29 · THE FINAL BUILD RUN

**Everything above stands as the record.** This section supersedes §1′ and §2′. Branch
`shipready/3-polish-submission`, stacked on `c70eb65`, **stopped on the branch**. `main` untouched.
Decisions: `DECISIONS.md §SKY-7` + `§SKY-8` + `§SKY-9`.

**Gate at the tip:** typecheck **0** · lint **0 errors / 80 warnings** · jest **186 suites / 2826 passed /
0 failed** / 84 todo · `GlassSurface.tsx` **0 changed lines** · **migrations applied by an agent: 0.**

> ⚠ **A pre-existing flake — diagnosed, and it has a workaround.** Several timing-heavy suites
> (`ReportFlagModal`, `MyReportsModal`, `flagsStoreSwr`, `HamburgerDrawer.destinations`) intermittently
> exceed jest's 5s per-test timeout under full-suite parallel load. `ReportFlagModal` passed at 48s and
> failed at 88s and 163s **in the same tree**; `HamburgerDrawer.destinations` failed at the suite level in
> one run and passed alone in 7.5s.
>
> **It is CPU contention, not a defect, and not this run's doing.** `flagsStoreSwr`, `MyReportsModal` and
> `HamburgerDrawer.destinations` contain zero references to anything Run 3 touched, and `ReportFlagModal`
> first flaked *before* it was edited. All use fake timers / `waitFor`, and the runs also report "a worker
> process has failed to exit gracefully".
>
> ### ✅ The remedy: `npx jest --ci -w 3`
>
> Capping workers removes the contention and the suite goes deterministically green — **186 / 2826 / 0**,
> reproduced. Use that as the gate command on this machine. At default worker count the same tree passes
> only sometimes, which is a property of the machine, not the code.

> ⚠ **Do not pass `--silent` to jest here.** `npx jest --ci --silent` reports 2 false suite failures through
> an RNTL `afterEach` interaction. Plain `npx jest --ci` is the gate.

---

## §1″ Apple Guideline 1.2, re-scored leg by leg — **never averaged**

| Leg | Was (Run 2) | Now | Why |
|---|---|---|---|
| **ToS / community guidelines** | 🟢 CLOSED | 🟢 **CLOSED, and now cited from where it is needed** | Unchanged text. It gained two entry points: the blocked-content alert on both submit paths now carries **"View guidelines"** |
| **(a) filter objectionable material** | 🟠 amber | 🟠 **still amber — and one leg WORSE than recorded** | The coherence fix closes the "cited a document with no route to it" residual. But the run found that **`createAnonFlag` never calls `containsBlockedTerm` at all**: the anonymous submit path is unfiltered. See the box below — this is new, it is real, and anonymous is the reviewer's own cohort |
| **(b) report mechanism + timely response** | 🟠 mechanism complete, §C-12 awaiting Sky | 🟢 **CLOSED** | §SKY-7 records **§C-12 applied and verified by Sky on 2026-07-29**, with the pre-state read live, the post-apply verify read-only, and the rollback on file. Admin takedown can now remove the reported photo. Owner takedown already shipped (SR-050). The 24-hour commitment is visible in-app and word-identical in the ToS |
| **(c) block abusive users** | 🟠 comments-only, **Unhide at the gate** | 🟠 **comments-only by scope — but no longer irreversible** | The gate is answered and built. Hide now has an undo: Settings → Feedback → **Hidden comments**, per-item and bulk, with the "no longer available" state honest about what it does and does not know. **Flag-level hide remains unbuilt and is still a named follow-up** — the scope is Sky's (§SKY-3h), so (c) stays amber. Do not report (c) as closed |
| **(d) published contact info** | 🟢 met | 🟢 **met** | Unchanged |

### 🔴 New this run, and it moves leg (a) the wrong way

**`createAnonFlag` (`src/lib/flags.ts`) never calls `containsBlockedTerm`.** `createFlag` filters the
description at `flags.ts:1207`; the anonymous path has no filter of any kind. So the submit-time filter —
the whole of leg (a) — **is bypassed entirely by submitting anonymously**, which the app advertises as a
headline feature and which is exactly how an App Review reviewer will test it.

It was found while wiring Car B and deliberately **not** patched: adding a filter to a submit path is a
moderation-policy change, and 05 §3 ⑯ assigns those to Sky. It is a one-line change once she says so.
**Until then leg (a) is amber for a reason nobody had written down.**

---

## §2″ What BLOCKS submission — **now 2, and both are physical**

| # | Blocker | Why no agent can close it |
|---|---|---|
| **B-6** | Reviewer demo account is dead credentials | 2.1(a) needs working creds. Provisioned in the Auth dashboard — no agent handles credentials |
| **SR-021** | **No binary-launch evidence exists. None.** | The first proof this app launches on iOS is the next EAS build. Everything is web-verified, code-inferred, or NEEDS-DEVICE |

**B-3 is CLOSED.** The policy is rendered verbatim in-app from Sky's ratified document, all three B-2 links
repoint to it, and a drift tripwire fails in both directions if the app and her text ever disagree. Its
eleven `[V]` claims were checked against the codebase before a word was rendered — **two failed and were
corrected by Sky before the render** (§SKY-9). Evidence: `16_V_VERIFICATION_TABLE.md`.

**B-1 is off the blocker list.** Leg (b) closed with §C-12; legs (a) and (c) are amber by *scope decisions
that are Sky's*, not by unfinished agent work.

---

## §3″ SKY'S LIST — what is actually left

### 🔴 Physical. Nothing else can proceed without them

1. **Merge this branch.** `shipready/3-polish-submission` → `main`. Nothing else in the repo is waiting on
   an agent.
2. **B-6 — provision the reviewer account**, verify the login, and put the credentials plus a
   "Browse without an account" line in the review notes.
3. **The first EAS build** — the first evidence the app launches at all (SR-021).
4. **The device pass** (§5″ below), including the **D-B6 blocking gate** (Help/About ✕ at AX5).
5. **App Store Connect**: privacy nutrition labels (`04 §A-Sheet-A`, now safe to lock — policy and labels
   agree), age rating (expect 13+), Accessibility Nutrition Labels (device-verified rows only), EU DSA
   trader declaration, metadata, screenshots at 6.9″ and 6.5″.
6. **Host the policy text at `PRIVACY_POLICY_URL`** so the App Store listing and the app say the same thing
   (§SKY-8 P-3). The constant and `app.json` already agree with each other; what is missing is the page.

### 🟠 Decisions, any time

7. **Leg (a): the anonymous filter gap above** — one line, but it is a moderation-policy call.
8. **Leg (a) green or amber?** A server-side filter mirror is still the only path to green.
9. **Flag-level hide**, to move leg (c) — named follow-up, scope is yours.
10. **R-1's edge function** — `R1_ACCOUNT_DELETION_SWEEP.md`, written, undeployed. Face photos currently
    survive account deletion and become permanently un-deletable.
11. **`storage_path` column** — the day the photo-URL shape changes, the SR-050 derivation becomes the
    wrong bet.
12. ~~**Six `color.brand`-as-text sites**~~ ✅ **CLOSED — measured, all pass.** `17_BRAND_INK_MEASUREMENTS.md`.
    One of the six (`ProfileScreen`'s `nearestBtnChevron`) is **dead style, never rendered**; two more
    (`HelpModal`, `ChangelogModal` chevrons) have **inert colours** wrapping lucide SVGs. Nothing restyled.
13. ~~**The residual guidelines citation**~~ ✅ **CLOSED** by Car B — with web knowingly excepted (a
    buttoned `Alert` is a no-op on react-native-web; the guidelines stay reachable there from Settings and
    About).
14. **Dead code, recorded not removed:** `lib/links.ts`'s `openExternalUrl` has no production caller now
    that the privacy links open in-app. `ProfileScreen`'s `nearestBtnChevron` style likewise.
15. **The 12 undisposed findings** in `10_CONSERVATION_TABLE.md §6` — two HIGH — remain open.

---

## §5″ DEVICE ROWS GAINED THIS RUN

Add to the consolidated list in §5. **D-B6 remains the blocking gate.**

| row | what to check |
|---|---|
| **the Unhide flow** | Settings → Feedback → **Hidden comments**. Hide two comments on a flag, open the list, confirm each row shows the real author, time and text. **Unhide one** — confirm VoiceOver announces "Comment unhidden on this device" and the comment reappears in the thread. **Unhide all** — confirm the confirm dialog names the count and the announcement states it. Empty state reads as a designed moment, not an error. Both themes. The pill at AX5 |
| **the "no longer available" row** | Hide a comment, delete it from another account (or as its author), reopen the list. It must still render **and still unhide** — a stuck row is a device-local entry the user can never clear. Then put the phone in **airplane mode** and reopen: the rows must say "Couldn't load this comment right now", **not** "no longer available" |
| **the View-guidelines path** | Submit a comment containing a blocked term. Confirm the alert offers **"View guidelines"**, that it opens the ToS sheet **over** the flag sheet, and that closing returns to the flag sheet beneath. Repeat on the report sheet's description field (signed in). Confirm the rejection never names the matched term |
| **the Privacy screen walk** | Open it from **all three** entries — Settings, About, and the **sign-in cover** (signed out; that one is a separate local mount). Confirm it presents over About and over the sign-in cover, that closing returns beneath, VoiceOver two-finger-Z escape on the pageSheet, heading-by-heading navigation, and the prose at AX5. **Read it against the app** — that is the last human check on B-3 |
