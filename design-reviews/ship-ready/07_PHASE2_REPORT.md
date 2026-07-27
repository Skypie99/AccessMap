# SHIP-READY Phase 2 — REPORT

Branch **`shipready/2-blockers-dismissal`**, 19 commits off `main @ 512494a`. **STOPPED on the branch** —
Sky merges, builds, submits. Opus 5, ultracode max effort, 2026-07-26.

**Gate: tsc 0 · eslint 0 errors / 79 warnings · jest 167 suites / 2310 passed / 0 failed / 84 todo.**
Baseline was 158 / 2227 / 0. `src/components/ui/GlassSurface.tsx`: **0 changed lines**.

---

## §1 Blockers closed — finding → fix → proof

| # | Finding | Fix | Proof |
|---|---|---|---|
| **B-7** | Comments dead in production for **every** cohort since `comment_votes` landed. `comment_votes` carries FKs to both `flag_comments` and `users`, so PostgREST derives a second m2m relationship, calls the bare `users(...)` embed ambiguous, and answers **PGRST201 / HTTP 300**. Every flag detail showed a perpetual "Couldn't load comments" + Retry; the insert's returning-clause carried the same embed, so posting failed too | One shared `COMMENT_SELECT` naming the direct FK, used by both call sites. Plus: `isTableMissingError` matched the loose phrase `"does not exist"`, which a relationship error can carry — it now early-outs on PGRST200/201/202, so a broken join can never be misreported as "Comments coming soon" | **Live prod REST: bare → 300 (PGRST201); hinted → 200.** PostgREST's own hint names the exact string shipped. Constraint name read from `pg_constraint`, not inferred. 9 guard tests; the repo-wide scan proven by reintroducing the bug |
| **B-2** | Privacy policy reachable only from ASC metadata — 5.1.1(i) requires in-app too. About had privacy *prose* and no link | Link rows on Settings, About and beside sign-up, all reading one constant | Web-verified: `role=link` on all three, 327×64 / 44 / 44. **PROTECT-11 held** — both footnote promises and all three About paragraphs present and **unmoved in reading order** (asserted, not eyeballed) |
| **B-4** | App icon was PNG colour type 6 (RGBA) with real transparent corners — the ITMS-90717 upload-failure shape | Flattened onto `#1466E0`, the icon's own field colour | **PROTECT-16: 1,003,245 opaque pixels, 0 changed RGB.** Header now type 2, no `tRNS`. Visually inert — only corners were transparent and iOS re-masks them |
| **B-5** | `portrait` + `supportsTablet:true` + no `requireFullScreen` = the ITMS-90474 shape | `supportsTablet: false` per Sky's IPHONE-ONLY pick | Guard test. 13″ iPad screenshots no longer required; 02 §T debt drops to MED |
| **R-8** | `ios/` is gitignored, so the hand-written privacy manifest never shipped — and its collected-types list was empty anyway. Four boilerplate purpose strings regenerated on every prebuild, including a **microphone** justification for a feature that does not exist | Artifacts B-α + B-β applied verbatim; `expo-media-library` (zero imports) removed | Guards assert 7 collected types, Diagnostics/Usage **absent**, and the three kept purpose strings **byte-identical** to `ios.infoPlist` — so the commit authors no copy |
| **R-12** | `deploy:testflight` was broken **two** ways, only one of them reported: `submit.preview` does not exist, **and** it chained `build:preview` (`distribution:"internal"`), which cannot be submitted to ASC at all — while the store-distribution `testflight` profile sat orphaned | Chain the orphaned store profile; submit with `production` | Guard checks both halves for every `deploy:*`; fails on both against the pre-fix state |
| **R-6** | The unresolved-percentage overflow class: `maxHeight:'90%'` on a card whose wrapper is content-sized never resolves, so the card grew unbounded, `flex-end` pinned its bottom, and the 44pt close X went **above the viewport** — with no scrim-tap, touch web had **no pointer path to dismiss at all** | The cap moves up to the node whose own parent is definite; the card is merely allowed to shrink. **5 surfaces**, including two the report did not name: FeedbackModal (its cap belongs on the KAV — one more auto-height layer) and **`ui/Sheet`**, which carried the same recipe | **Web-verified, fresh export, 375×812:** About X **−65 → 97**; Help X **−53 → 97**; Help wrapper h=731 = **exactly 90%** of 812. Tasks filter sheet unregressed. 03's suggested fix could not have worked — About and Help already had `body:{flexShrink:1}` and still overflowed |

**R-11** contributed the honest half only: `App.tsx` no longer claims Sentry is initialised. The reporter
itself is a native module plus a **DSN credential**, so it is not an agent's to add.

---

## §2 The dismissal standard

**32 of 32 live surfaces** now dismiss on the VoiceOver escape gesture, each handler byte-identical to its
`onRequestClose`. Full per-cell table: **`06_dismissal_census_verified.md`**.

### The discovery that changed the work

**`onAccessibilityEscape` on `<Modal>` is a silent no-op.** RN 0.81.5 forwards an explicit prop allowlist to
`RCTModalHostView` (`Libraries/Modal/Modal.js:326-347`) with no `{...props}` spread; the prop is not in it,
and typechecks only because `ModalProps` spreads `ViewProps`.

03's G1 as written would have shipped **zero behaviour with every proposed guard green** — 32 surfaces of
false PASS on precisely the finding the phase exists to close. Every handler therefore rides the modal's
**containment node**, and guard assertion **B2** fails if one is ever moved back.

### Also delivered

- **G2** — `accessibilityViewIsModal` on the two Name-this dialogs. MapScreen had **zero** before: centred
  text-entry dialogs over a live map, the worst case for focus leakage.
- **G9** — ReportFlagModal's mid-submit close guard. Its visible Cancel was already `disabled={submitting}`
  while Android back and Escape sailed through; S11 escalates-never-aborts, so closing over an in-flight
  write produced the duplicate its own comment says the 5/day limit punishes.
- **The guard suite** — `dismissalStandard.guard.test.ts` derives the census from source on every run, so a
  new surface enters it automatically. Ten assertions; verified non-vacuous against three regressions
  (prop removed · moved onto `<Modal>` · handler drifted), each naming the file and the fault.

### Three of 03's counts were not reproducible — corrected

G4's "17 card dialogs" (reproducibly **15** / **26**) · G5's hook name (the web guard is in
**`useDrawerTrigger`**, not `useTriggerHandle`) · "AVM present on 28" (mixing surfaces with occurrences).

---

## §3 What is NOT done — and why

| Item | State | Why |
|---|---|---|
| **G5 focus-return hook + 4 adoptions** | **NOT BUILT** | Sky picked it; the phase ran out of runway before it. It is the only picked item not delivered. Design is fully specced in the plan §B11: generalise the `useDrawerTrigger`/`useTriggerHandle` **pair** *including* the `Platform.OS === 'web'` early return and try/catch (that guard exists because RNW's `findNodeHandle` throws and once made the hamburger inert), `restore` on `onDismiss` not close-intent, `markHandoff` from day one. Adopt Nearby → Report → FlagDetail → Legend. The census reports this column as a **counted residue, never a false green** |
| **G3 grabbers ×3** | **NOT BUILT — correctly** | 03 said "reuse `ui/Sheet`'s pill verbatim". It is `color.borderStrong`, declared in **zero** of the 20 stacks manifests, and an indicative composite over chrome glass lands ≈**1.01–1.23** against the 3.0 floor its sibling close-X uses. Under PROTECT-5 the script decides, so this needs an arbiter run and a mockup gate **before** any code. Also: 03 §7.1 is wrong that Nearby's grabber lands on bulk glass — `styles.header` paints opaque `color.surface` over the fill, so Nearby has a **solid-chrome option the other two do not**. That is the real fork for Sky |
| **SR-112 arbiter** | **NOT RUN** | Routed here by 02 §D-4. Needs a proof set over `brand`+`textOnBrand` in dark at 10 sites plus 5 map-panel pairs over real tiles. Flagged for whoever runs it: a dark-only `ctaFill` would satisfy SR-112 and **regress PROTECT-16** (mode-independence). That collision should be surfaced, not resolved in code |
| **1.2(c) affordance** | mechanism ✓, control ✗ | `hiddenContent.ts` is built and tested; wiring it needs a visible "hide" control = a new string = Sky's words |
| B-3 policy content · B-6 reviewer creds · the 11 SQL artifacts | **untouched by design** | Sky words / Sky applies. Zero migrations were applied |

---

## §4 Data-half items awaiting Sky

**Zero of the 11 SQL artifacts are applied** — verified read-only: the ledger ends at `20260603002810`, and
`public.flags` has no `dispute_requests` column and no `increment_dispute_request` function.

- **W1** — `supabase/migrations/2026-07-16_fork5_dispute_counter_PROPOSED.sql` is **banked verbatim**. The
  client half ships behind `DISPUTE_ENABLED = false`; a guard asserts that, so turning it on is a deliberate
  two-line change. **After applying: flip the constant.**
- **C-8 admin comment-delete** — unapplied, verified. Until it lands an admin **cannot remove an abusive
  comment through the app's role model at all**, which is why comment moderation cannot close.
- **C-1 / C-5 / C-9(i)** — their UI halves stay open by fork discipline: they are downstream of migrations
  that have not run, so building them would ship surfaces whose behaviour is unreachable.

### B-1 remains BLOCKING-OPEN — the honest Apple 1.2 score

| Requirement | After this phase | Owner |
|---|---|---|
| (a) filter objectionable material | **not addressed** — unspecced anywhere in 00–05 or the fork briefs | Quinn/Sky product decision |
| (b) report mechanism + timely response | **not addressed.** W1 is a *doubt counter*: no reason, no category, no user_id, no admin queue, flags only. Comments get nothing, and C-8 is unapplied | Sky applies C-8; the comment-report control is unspecced |
| (c) block abusive users | **mechanism closed** (`hiddenContent.ts`); affordance pending one string | Sky words it |
| (d) published contact info | plausibly met (mailto feedback + ASC Support URL) | Sky (ASC field) |
| ToS / community guidelines | **not addressed** | Sky words all text |

**Any report that closes B-1 on the strength of W1 is wrong.**

---

## §5 New findings raised this phase

- **SR-115** — `aria-label` is also absent from RN's Modal allowlist, so **all 33 modal labels are dead**.
  Reported, not fixed: moving them changes what VoiceOver announces on 33 surfaces — a copy decision.
- **SR-116** — `ReportFlagModal.tsx:495` sets `accessibilityViewIsModal` on the Modal tag (dead); the live
  one is the child at `:508`.
- **SR-117** — live-DB drift: `flag_comments.user_id` is **nullable** with `ON DELETE SET NULL`, while the
  repo migration declares `NOT NULL … ON DELETE CASCADE`. `RawCommentRow.user_id: string` is a type lie for
  post-deletion rows. Not a crash; typing it nullable ripples through `database.ts`.
- **R-12 was under-reported** — the internal-distribution half was in no Phase-1 row.
- **`jest.mock()` resolves the module path even with a factory** — confirmed empirically. Removing
  `expo-media-library` without deleting its two dead mocks broke both suites at load, 0 tests run.

---

## §6 Device-list contributions

**D-B1…D-B9 and D-B12**, appended to the standing device-tune list (which ends at 21). Full text in
`06 §5`. Two carry consequences:

- **D-B6** — if Help/About still clip on a real device at AX5, **R-6 upgrades from RECOMMENDED to BLOCKING**.
- **D-B12** — map pan + pinch through the overlay gaps. SR-033 records the box-none law as comment-enforced
  only; jest cannot catch a regression there, so it **must** be a manual gesture check.

---

## §7 Nothing routed elsewhere was touched

- **BP16 strings** — zero touched. `HelpModal` got a layout fix and no copy change. Exactly **one** new
  visible string ships (the privacy-link label), as a PROPOSED constant in `copy.ts` in the same register as
  `RETRY_VERB` — itself a PROPOSED string already on main — and registered as a new BP16 row.
- **device-tune surfaces** — the drawer took exactly one prop (7 insertions, 0 deletions); the Tasks filter
  sheet and header are unregressed.
- **`fix/fmt-xcode26-local-sim`** — routed, not re-fixed. It is checked out in a live worktree, which is
  also the F-13 flake trigger.
- **R-2 guest cluster (SR-041/093/094/095), R-1 Storage residue, R-3/R-5 SQL** — reported, untouched.
- **PROTECT** — GlassSurface **0 changed lines**; no token edits; no gesture library; box-none sites intact
  (6); `dynamicTypeGuard`'s ALLOW_LIST still empty.
