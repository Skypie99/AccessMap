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
