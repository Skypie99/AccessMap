# Slate draft — cluster "arrival-trust" (L1 + L8)

DRAFTER over-production for Part 3. Onboarding / first-impression, distinctiveness, signature, trust
instrumentation, guest contract. Every candidate traces to Part-2 finding IDs; WCAG 2.2 AA is a hard
floor; GLASS.md law respected; RN/Expo feasibility honored; PROTECT items extended not regressed.
Backend/privacy/scope halves are marked FORKS-TO-SKY and scoped to the UI half only.

Ambition legend: S = quick win (copy/mechanical), M = meaningful, L = larger build.
Tier guess: T1 = quick copy/mechanical win, T2 = design-led build.

Cluster note on ownership: several of this cluster's biggest findings dedup to OTHER clusters'
canonical IDs — L8-1 and L1-1 fold into canonical **L3-2** (proximity-lie), L8-5/L2-3 into canonical
**I=L8-5** but the map-chrome build sits in the cohesion/map cluster, L8-6/L2-2 into canonical
**H=L2-2** (two-header), L8-4a and L1-2/L1-3/L1-5 into the guest-contract canonicals owned partly by
L3. Where a proposal here would collide with those, I scope to the arrival-trust HALF and cross-note
the canonical. This cluster's clean-owned spine is the **trust-instrumentation** set (L8-2/L8-3/L8-7),
the **distinctiveness/signature** set (severity-grammar reach, Wayfinder mark), and the **first-run
honesty** copy set (L8-9/L8-10/L8-11/L8-12/L8-13/L8-14 + L1 onboarding copy).

---

## arrival-trust-1 — Wear the severity grammar everywhere severity is spoken (define "verified" in the same breath)

**Resolves:** L8-2 (HIGH, UI half), L8-7 (HIGH), L8-11 (MED), L8-10 (MED, partial) · facets: copy-index L2 "callout speaks numbers only", L3 "the decoder lives everywhere except where map users decide".
**Effort:** M · **Tier:** T2 · **SIGNATURE CANDIDATE: YES**

**What / why.** The audit's own verdict is that the signature already exists and it is *not* the glass —
it is the **severity grammar**: the numbered amber→red disc + plain word + one-line stake ("5 — Severe.
Impassable. Needs a detour."), praised independently by all six blinded readers. The defect is that the
grammar is spoken in full in exactly one place (the report form's inline definitions) and reduced to a
bare number or a lone color at every *decision* surface — the pin callout says "SEVERITY 4 · VERIFIED"
with no word and no stake; the Nearby list says "Severity 4 · verified"; and the anonymous pin
(arrival-trust owns this) drops the severity *color entirely* to a neutral gray (`PlatformMap.web.tsx:363`
`pinIcon(flagIsAnon ? '#9CA3AF' : severityColor(...))` — mirrored native at `PlatformMap.tsx:228`), so a
sighted user reads an anonymous impassable barrier as quieter than an authed trivial one. This proposal
makes the grammar the app's actual signature by *repeating it identically* at the three surfaces it
currently truncates: (1) the pin callout and Nearby rows gain the severity WORD beside the number ("4 ·
Significant · verified") so the number is never naked; (2) the anonymous pin keeps its severity FILL and
carries provenance as a *ring or dashed border* instead — provenance without erasing the safety channel,
directly honoring DESIGN.md §1's "color is never the only signal, and severity color is the safety
channel"; (3) the Map legend — the app's designated vocabulary surface, which today defines all 5
severities and all 6 categories but zero status words (`LegendModal.tsx`, confirmed: no status section) —
gains a one-line "Verified" definition using the sentence the FAQ *already wrote*: "another person checked
the spot and confirmed the issue is real," plus a legend entry for the gray/anon ring and the resolved
checkmark. This is the memorable, ownable, access-first move the lens named: R1 "I could judge risk from
this alone," R6 "exactly what the rest of the app was missing." A signature that's inaccessible is a
contradiction here — this one is *more* accessible because it stops the color-only failure.

**FORKS-TO-SKY:** the *verifier-count* and *callout-date* half of L8-2 depends on Sky-decision note #5
(trust-model: how much verification provenance to expose). This proposal takes only the parts that need
no data decision — the severity WORD, the legend status-line, the anon ring. Count/date land in
arrival-trust-2.

**Preserves:** PROTECT-4 (the severity grammar — this *extends* it, adopting the existing `theme.ts
severity` ink-on-color rule + `severityA11y` centralization, never a new token), PROTECT-16 (the bespoke
CategoryIcon set + Wayfinder ownership), PROTECT-1 (the Nearby list one-breath row — the word is *added*
to the row, the SR label content is untouched; anon pins already announce "submitted anonymously" via
`alt`, which stays). Arbiter re-run named: any color/ring choice for the anon variant is verified against
`contrast-check.mjs` + `tools/audit-stacks.json` over the map's worst-case tile bases (never eye-tuned).

---

## arrival-trust-2 — Surface the trust ledger where trust is spent (the callout, the Nearby row)

**Resolves:** L8-2 (HIGH, the count/date half), L8-3 (HIGH), L1-13/L8-9-adjacent trust-reconciliation · facets: L6-05 "the accessible list's only action dead-ends in the visual layer" (the FlagDetailModal is the fix), R6 friction #2, R1 "the one thing I'd base a detour decision on."
**Effort:** L · **Tier:** T2 · **SIGNATURE CANDIDATE: YES**

**What / why.** The cruelest finding in the cluster: the app *already built* a full trust ledger —
`StatusHistoryModal` (its own header comment: "Foundational for trust"), `FlagDetailModal`'s
reporter/date/anonymous-aggregate surfaces, `flag_verifications`, `flag_status_history` — and then hid
every one of them three taps deep behind Tasks→Details or Profile→My Reports, *never* reachable from the
callout or Nearby list where a user actually decides to bet an outing on a badge. So "verified" arrives
as a word with no receipt, and the instant R1 met "BUMBAKLOT · Severity 5 · verified" the whole badge
economy collapsed for him ("if that badge is meaningless, so is the severity-4 'no ramp' I was about to
detour around"). This is an information-architecture problem, not a build problem. The proposal: make the
pin callout and each Nearby row *open into the existing `FlagDetailModal`* — the "Open for details" /
"Tap to view details" over-promise that today opens nothing (L3-12, L6-05) finally cashes out — so the
badge carries its provenance in one tap: "Verified 29d ago by 2 people," the status history timeline, the
reporter/anonymous-aggregate line. This is the same "trust ledger in miniature" the Nearby row already
gestures at (category + severity + distance + status + age in one breath, PROTECT-7); we're *extending*
that card into its own detail, exactly as the PROTECT note says to solve L8-2 ("by extending it, not
replacing it"). It is a signature because it makes the app's central promise word *inspectable* — the
one civic move no venue-rater in the meta table makes.

**FORKS-TO-SKY:** Sky-decision note #5 (trust-model scope). Two dependencies: (a) whether to *display* a
verifier count at all is a trust-model call — if Sky says yes, the count rides the callout; if not, the
ledger still surfaces the status *history* (which is already shipped) without a raw count. (b) L8-3's
"report this looks wrong" counter-affordance — linking an encountered junk flag to a moderation/flag-as-
wrong action — is a product decision (can guests flag content?) with a privacy dimension; this proposal
scopes only the *read* side (surface the receipt) and cross-notes L8-3's write side as the fork. The
epistemic-verify prompt ("have you seen this spot?") is a smaller sibling captured in arrival-trust-8.

**Preserves:** PROTECT-1 (Nearby list content untouched — we add a destination, not rewrite the row),
PROTECT-7 (the Nearby card grammar — this is its detail view), PROTECT-8 (empty-filters recovery
untouched). No new contrast token; `FlagDetailModal` already ships arbitrated. RN/Expo: `FlagDetailModal`
is already imported by ~20 modules (per L8-2 correction), so wiring it to the callout is adoption, not a
new surface — no web no-op risk (it's a Modal, not an `announceForAccessibility` call).

---

## arrival-trust-3 — First-run honesty sweep: retire the four promises the app can't keep in minute one

**Resolves:** L1-2 (HIGH, copy half), L1-8 (MED), L1-11 (LOW), L8-11 (MED), L8-14 (MED) · facets: copy-index L1 "one thing four names" + "two location-privacy contracts" + "Open the Map never opens the map", copy-index L8 "submit-moment sentence missing" + "noun canon needed."
**Effort:** S · **Tier:** T1 · **SIGNATURE CANDIDATE: no**

**What / why.** The first five minutes are "two different products" (L1 lens verdict): the pitch is
excellent, then it breaks its own promises. This is the cheapest high-signal win in the cluster because
almost every fix is a string change to copy that the app *already contradicts itself on elsewhere*. Four
edits, all copy: (1) **Noun canon** (L8-11/L1-11) — pick *barrier* as the human display noun and *flag*
as the system/object noun, and stop the "barrier → flag → report → task" whiplash that delayed R6's
severity comprehension; retire "reports/tasks" as display nouns; consider "open" → "unconfirmed" to break
the open-for-business collision R6 hit. (2) **The guest-contract copy that is factually wrong** (L1-2c) —
SignInScreen's "you'll need an account to report" and the a11y hint "Reporting flags requires an account"
are *false*: anonymous reporting is a shipped first-class flow. Correct them TO the truth the report sheet
already tells beautifully ("Your anonymous report still counts"). (3) **The onboarding photo/tap promise**
(L1-8) — slide 2's "Tap where the barrier is, snap a photo" describes an interaction guests don't have
(no plain-tap placement exists; anon flow has no photo). Soften to what's true for the reader being
taught. (4) **The submit-moment sentence** (L8-14) — the report submit is a "black box" (R6): add one
line under the CTA — "Your report appears on the map now; neighbours can verify it. AccessMap doesn't
notify the city — see Resources." — which converts the app's most anxious moment into its most honest one
and finally cashes the onboarding's "so it gets fixed" promise (today cashed only in the drawer's
Resources page). These are trust withdrawals at the exact moments trust is decided; each correction is
one honest sentence.

**FORKS-TO-SKY:** none for the copy itself. The *structural* halves of L1-2 (the walled native CTA, guest-
mode amnesia) belong to the guest-contract canonical (Sky-decision note #3) — this proposal takes only the
copy, and cross-notes that the auth-wall architecture is Sky's call.

**Preserves:** PROTECT-5 (the anonymous-report sheet trust block — we correct funnel copy *toward* it, the
exemplar is untouched), PROTECT-11 (the privacy-forward trust voice — every edit is written in that
voice), PROTECT-3 (Home's honesty law — the noun canon touches labels, never the never-fabricate-distances
logic). Pure copy: no AA, GLASS, or RN/Expo surface touched.

---

## arrival-trust-4 — Reconcile the numbers the app disagrees with itself about (Tasks badge, empty-area honesty)

**Resolves:** L8-9 (MED, canonical for the badge family L8-9·L3-15·L1-13·L6-18), L8-10 (MED) · facets: copy-index L2 "tab badge semantics", R6/R2/R5 all tripped on 2-vs-5.
**Effort:** S · **Tier:** T1 · **SIGNATURE CANDIDATE: no**

**What / why.** A data product lives or dies on whether its numbers reconcile, and AccessMap has two
small self-contradictions that three blinded readers each caught cold. (1) **The Tasks badge has two
writers, two meanings**: RootNavigator sets it to open-only count (→2, `RootNavigator.tsx:220-221`),
TasksScreen overrides it to open+verified (→5, `TasksScreen.tsx:614-619`) whenever Tasks is focused — so
the same permanently-visible counter says "5" on the Tasks tab and "2" everywhere else, and the list
underneath shows "OPEN 2." R6: "the tab badge says 5 but the list says OPEN 2 — numbers don't match."
Pick ONE definition (the open-only count is the honest "work waiting" number; verified items are done-ish)
and delete the override. This is a same-family, smaller-blast-radius sibling of the L3-2 proximity lie —
the ambient conditioning that AccessMap's numbers are approximate is exactly what a civic data product
can least afford. (2) **Empty areas read as surveyed-and-clear** (L8-10): "0 flags nearby" and Home's "No
barriers reported yet" (`HomeScreen.tsx:309`) both imply completeness — R1 named the stakes: "an empty
map reads as 'no barriers,' which is the most dangerous possible misreading." The honest framing already
exists in the heatmap toast ("coverage varies by area") but only opt-in users see it. Cheapest trust fix
in the audit: "No reports here yet — be the first" instead of "No barriers reported yet," and give the
coverage caveat a home on the default map.

**FORKS-TO-SKY:** L8-10's deeper "no unknown-state" question (AccessMap's barrier model can't mark
unknown streets, unlike Wheelmap's explicit gray) touches Sky-decision note #1 (proximity/coverage
architecture). This proposal takes only the *copy* that stops implying completeness; the architectural
coverage-honesty (bounded queries, an unknown-state) is cross-noted to the L3-2 proximity fork.

**Preserves:** PROTECT-3 (Home honesty law — reinforces it), PROTECT-8 (empty-filters recovery card — the
empty-*area* copy is a different state; we match its honest voice). Pure copy + one badge-source deletion:
no AA/GLASS/RN surface. The badge fix is mechanical (remove a competing writer), not a new feature.

---

## arrival-trust-5 — Wear the Wayfinder mark (retire the three stock intro glyphs and the "A" placeholder)

**Resolves:** L8-8 (MED) · facets: R5 (onboarding pin ≠ sign-in pin), DESIGN.md §10 names the mark as *the* brand asset.
**Effort:** S · **Tier:** T2 · **SIGNATURE CANDIDATE: no (supports the signature system)**

**What / why.** Distinctiveness needs repetition, and AccessMap owns a genuinely good, on-mission mark —
the Wayfinder (blue pin + white striding figure = wayfinding + human movement) — that it then *fails to
wear*. `LogoMark.tsx` is imported by exactly one screen (SignInScreen), and on web sign-in is an optional
Profile modal, so a web guest can use the entire product and never meet the brand. Meanwhile the app
introduces itself three times with *stock* glyphs: onboarding slide 1 uses a Lucide **compass**
(`OnboardingCards.tsx:93`), the replay tutorial a generic Lucide **MapPin** (`OnboardingModal.tsx:37`),
and — worst — the daily-use drawer header shows a **letter-"A" tile** (`HamburgerDrawer.tsx:167`), the
very placeholder LogoMark's own header comment says was replaced. The fix is pure asset-swap: put the
Wayfinder mark on onboarding slide 1, the replay tutorial header, and the drawer header, so the brand is
the *first and most-repeated* pixel instead of three different stock icons. Low effort, real
distinctiveness payoff: R5 flagged "two brand pins" as part of the "two kits stitched together" read.

**FORKS-TO-SKY:** L8-18 (the "AccessMap" name colliding with UW Taskar Center's accessmap.io) is a naming-
strategy decision, Sky-decision note #6 — explicitly *not* in this proposal, which only makes the app wear
the mark it already has. Cross-noted so the two don't get conflated.

**Preserves:** PROTECT-2/PROTECT-16 (the Wayfinder mark + "Wayfinder Blue" `#1466E0` `ctaFill` mode-
independence — the fix is literally "wear it more," which is what the PROTECT note prescribes). No AA
concern (the mark already ships accessibly on SignInScreen with an `accessibilityLabel`); one caveat —
when the mark lands in onboarding, ensure the decorative-icon a11y treatment matches (slide icons are
marked hidden; the mark should announce once, not per-slide — see L1-9 sibling). RN/Expo: asset swap only.

---

## arrival-trust-6 — Repair the trust fallback surfaces (Help FAQ accuracy, stale changelog, About anchors)

**Resolves:** L8-12 (MED), L8-13 (MED), L8-14 (MED, the About half) · facets: copy-index L8 "Fix in Help FAQ" + "Stale changelog" + "Casing sweep."
**Effort:** S · **Tier:** T1 · **SIGNATURE CANDIDATE: no**

**What / why.** These are the surfaces a user consults *at the exact moment trust is already strained* —
and they're partially wrong about the shipped app, which converts confusion into a verdict. Three copy
repairs: (1) **Help & FAQ** (L8-12) — the one page that must be right, because it also contains the app's
*only* definition of "verified" (L8-2): fix "Open the Map tab" (there is no Map tab — tabs are
Home/Tasks/Profile), fix "tap the '＋ Report' button" (auth-only, invisible to guests — the answer must
name the guest path and the auth note), fix "magnifying glass → filters" (the magnifier is address search;
filters are the sliders icon), and "Resolved reports appear in a different color" (they keep severity
color and gain a *checkmark*). (2) **Changelog** (L8-13) — `ChangelogModal.tsx` has a single entry dated
2026-05-23, six weeks and three visual eras stale (v3.0.0, editorial Home, the entire Deep Field system,
heatmap, presets, onboarding — none logged); R5 explicitly *counted* "the honest changelog" toward trust,
so a changelog that stops while the product visibly evolves reads as abandonment or spin. Add the v3-era
entries. (3) **About anchors** (L8-14) — About claims "The maps, icons, and database schema are open"
under a heading literally titled SOURCE CODE with *no repo link or license name*, and "Status changes are
logged, visible to other users" with no map-side path (fixed by arrival-trust-2). Add the link/license or
soften the claim; unverifiable virtue claims read as decoration exactly where the app is otherwise
unusually honest. Also fold the casing sweep ("How To Help" vs "About the App" vs "What's new"; modal
"What's New" vs Settings row "What's new").

**FORKS-TO-SKY:** none — all copy/link. (If the repo is private, the "open source" claim is a factual/
scope question for Sky, but softening the claim needs no decision.)

**Preserves:** PROTECT-11 (privacy-forward trust voice — every edit stays in it), PROTECT-10 (maker-voiced
micro-copy — the changelog's candid bullets are the model to extend). Pure copy: no AA/GLASS/RN surface.

---

## arrival-trust-7 — Give the location consent slide a visible "Not now" (and stop the web permission theater)

**Resolves:** L1-3 (HIGH) · facets: R6 "consent is the toll to continue," copy-index L1 "two location-privacy contracts."
**Effort:** S · **Tier:** T1 · **SIGNATURE CANDIDATE: no**

**What / why.** The location slide is the most sensitive consent moment in an app that maps *disability* —
and it is the *only* permission slide with no visible decline. Slide 4 (notifications) models the
respectful pattern perfectly: a big "Turn on Notifications" plus a visible "Maybe later" (`showMaybeLater`,
`OnboardingCards.tsx:216`). Slide 3 (location) offers only "Allow Location," a dimmed Back, and the tiny
Skip that abandons the whole tutorial — so a user who doesn't want to grant must either open the OS dialog
just to decline it or quit onboarding. R6 hesitated here and nearly bailed. The correct pattern lives
*eight lines away* in the same file; this proposal extends it to the more sensitive of the two
permissions. Second leg (web): on web, tapping "Allow Location" performs *no permission action* and just
advances (`:243-255`) — theater — then the real browser prompt appears later, unannounced, on Home's "Use
my location." Make the first ask honest (either wire it or relabel it so it doesn't masquerade as the
grant). The behavior is actually benign (denial never blocks — the handler advances regardless), but the
UI hides that fact, which is the dark-pattern *shape* even though the intent is good; adding "Not now"
makes the benign truth visible.

**FORKS-TO-SKY:** the web "does the guest build request location / expose sign-in at all" question is
Sky-decision note #3 (guest contract). This proposal only adds the decline affordance and de-theaters the
web button; the larger web-guest-location architecture is cross-noted.

**Preserves:** PROTECT-1-of-L1 (the permission-priming architecture — explain → check silently → prompt
on tap → denial never blocks; this *extends* it by adding "Not now" to location, exactly as L1-3 asks,
never dilutes it), PROTECT-7-of-L1 (reduce-motion discipline in both carousels — the new button inherits
the gated motion). No AA/GLASS surface; RN/Expo: adding a button + honoring the existing web-advance path,
no web no-op trap (it's a UI control, not an SR announce).

---

## arrival-trust-8 — Contain the first-run carousel for screen readers (and the epistemic-verify nudge)

**Resolves:** L1-9 (MED), L8-3 (the epistemic-prompt half, MED) · facets: R2 "the visual state and my state don't match," copy-index L1 "1/5 announces as one slash five" + "Next. Card 1 of 5."
**Effort:** M · **Tier:** T2 · **SIGNATURE CANDIDATE: no**

**What / why.** Two smaller trust/first-run repairs bundled because both are "the app already ships the
correct pattern elsewhere; adopt it." (1) **The first-launch carousel exposes all five slides to a screen
reader at once** in an unnamed dialog with five unlabeled images (`a11y-tree/onboarding__light__390.txt`:
unnamed dialog → all five slides traversable → "Next. Card 1 of 5." while the user has already "read" the
whole deck). A blind user reads the entire deck linearly, then meets a button insisting they're on card 1
(R2). The app's *own replay modal* already implements the fix — hidden pager, one polite live region,
"Step N of M" labels (`OnboardingModal.tsx:133-153`). Adopt that architecture on the first-launch
carousel; fix "1 / 5" announcing as "one slash five" and "Next. Card 1 of 5" (labels the current card,
not the destination). This is the *first screen of the product for every new device* — its thoughtful
touches (disabled-Back explanation, per-slide headings) deserve the containment to match. (2) **The
epistemic-verify nudge** (L8-3 half): the one-tap Verify buttons carry no "have you seen this spot?"
prompt, and verifying pays points — three of six readers spontaneously questioned couch-verification (R6:
"can I really verify from my couch?"). A single confirming line before the paid verify action ("Only
verify barriers you've seen in person") is a small honesty gate on the app's cheapest, most trust-
sensitive social action.

**FORKS-TO-SKY:** the L8-3 counter-affordance write-side (flag-as-wrong, can guests moderate) remains the
Sky-decision note #5 fork — this proposal takes only the *epistemic prompt* on the existing verify action,
which needs no data/scope decision.

**Preserves:** PROTECT-7-of-L1 (reduce-motion discipline — the replay modal's architecture is already RM-
gated), PROTECT-17 ("Back. Disabled on first card." — the best disabled-state label in the audit; the
containment fix keeps it), the anonymity-honesty set. RN/Expo hard-fact honored: this is NOT an
"announce on web" fix — the replay modal's live-region pattern already works cross-platform (it's a
rendered `aria-live` node, not an `announceForAccessibility` no-op); we adopt a shipped, working
architecture, not invent a web announce.

---

## Bench / deliberately-not-proposed (recorded for the runner-up pool + fork hygiene)

- **L8-21 (light-mode sheet ghosting + feedback footer collision)** — MEDIUM, verified current at HEAD,
  but AA *holds* (arbiter-PASS `inkGlassMuted`); it's a perceived-quality defect and the true blur feel is
  device-only (NEEDS-SKY-DEVICE — the native read may be fine). Bundling it with the About copy fixes
  (arrival-trust-6) is tempting but the ghosting is a glass/render tuning question that belongs with the
  cohesion/map cluster and must respect the blur-budget law (intensities only 12 or 24; `GlassSurface.tsx`
  DO-NOT-EDIT). Recorded, not proposed here, to avoid an eye-tuned glass change escaping the arbiter. The
  Feedback footer reply-email-field-hidden-behind-buttons leg is a real layout bug worth a bench entry.
- **L8-15 / L8-16 / L8-17 (dismissal-idiom schism · emoji-in-UI vs DESIGN.md §10 · "1+"/shapes glyphs)** —
  LOW cohesion texture ("several hands, no editor"). The emoji fix (Feedback chips 🐛💡❤️💬 → SVG per
  §10) and the "1+"/shapes on-ramp (a label or count-styled chip, keeping the invention) are clean small
  wins but sit below the cluster's HIGH/MED spine; benched for the runner-up pool. Worth folding into a
  cohesion "one-editor sweep" if that cluster raises one.
- **L8-5/L2-3 (flagship map raw Leaflet chrome, dark tiles in light shell)** — HIGH, but canonical I=L8-5's
  *build* (theme the vendor chrome, condense attribution, fix `dark_all` in light mode at
  `PlatformMap.web.tsx:531`) sits in the cohesion/map cluster; arrival-trust cross-notes it as the loudest
  "passion project not audited product" signal (R5 #1, R6 nearly quit) but does not own the map-chrome fix.
- **L8-6/L2-2 (two header families)** — HIGH, canonical H=L2-2, owned by the cohesion cluster; cross-noted:
  the editorial family IS the brand and the nav-header screens dilute it on the flagship Map.
- **L1-2 structural half (walled native CTA + guest-mode amnesia) / L8-4 / L8-4a (guest triage buttons →
  RLS refusal → fabricated error)** — the guest-contract canonicals. arrival-trust owns the *copy* halves
  (in arrival-trust-3) and cross-notes that the auth-wall architecture + the L8-4a correctness bug (gate
  the action row on `user`, stop mapping an authz denial to the stale-snapshot message) are Sky-decision
  note #3 forks / a correctness fix likely owned by the guest-contract cluster.
- **L8-18 (product-name collision) / L8-19–L8-20 (app.json brand hygiene · pin-glyph legibility at render
  size)** — L8-18 is Sky-decision note #6 (naming strategy); L8-19/L8-20 are POLISH and device-only
  (NEEDS-SKY-DEVICE for the icon/splash/retina reads). All recorded, none proposed.

**FORK SUMMARY (Sky-decision notes this cluster leans on):** #1 proximity/coverage architecture (behind
L8-10's deep half, cross-noted in arrival-trust-4), #3 guest contract (behind L1-2/L8-4/L8-4a, cross-noted
in arrival-trust-3 and -7), #5 trust-model/verification provenance (behind L8-2 count and L8-3 counter-
affordance, cross-noted in arrival-trust-1, -2, -8), #6 name collision (behind L8-18, cross-noted in
arrival-trust-5). Every proposal above is scoped to the UI half that stands *without* the fork resolving.
