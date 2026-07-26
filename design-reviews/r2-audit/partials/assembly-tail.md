---

## §Persona digest (verbatim highlights, credited — full reads: `01_feel_persona-reads.md`)

- **R1 · wheelchair, route-planning:** "Somebody decided how this app talks about danger and then
  never wavered. That consistency is what lets me stop decoding and start deciding." · The legend
  is "the warmest screen in the app… written in consequences." · The empty-filter recovery is "the
  most considered dead-end I've seen in a map app." · Trust-reducers: "**'BUMBAKLOT' — Severity 5
  · Severe · Verified**… the single most damaging pixel in the whole set"; the silent Home
  load-error "indistinguishable from loading"; the callout/toolbar collision — "sloppiness reads
  as 'maybe the data is sloppy too.'"
- **R2 · blind, VoiceOver-primary:** "Someone here has actually written sentences for me… That is
  prose, not a control dump." The report form is "the high point of the whole app." But: "I hear
  every flag twice, slightly differently" (double-speak); "I hear **'Verify this flag'** six times
  in a row with no idea *which* flag each belongs to" (orphaned context); "Everything is a level-1
  heading."
- **R3 · low-vision, large-type:** "The bones respect me. The edges — headline, FAB, action row,
  toolbar overflow — were only ever tested at 100%." · "Dark mode is kinder [to lists] but **loses
  the map**… I'd live in dark and be forced to light every time I navigate — an uncomfortable
  trade."
- **R4 · one-handed / limited-dexterity:** "Designed for someone else's *steadier* hand. The bones
  are right — bottom-anchored actions, huge Verify button, honest selected states, a beautiful
  focus ring on search — but the moment-of-touch layer is missing almost everywhere, and that's
  the layer I live in." Begged-for fix #1: "a real pressed state… the drawer row already proves
  the pattern."
- **R5 · senior craft reviewer:** **7/10 — "the system thinking is 8+; the execution hygiene is
  5."** Signature, unprompted: "a civic reporting tool whose brand is its severity scale — a
  typographic 1–5 color grammar that means the same thing on every surface." · "The transition
  frames are an empty folder wearing a trench coat… the motion story: instant everywhere except
  the one place you get a white flash." · Would interview; demands "an occlusion-and-loading pass"
  before calling it premium.
- **R6 · first-timer under cognitive load:** kept the app because of one sentence — "**'AccessMap
  doesn't notify the city — see Resources'**… an app honest about its limits is an app I'll
  believe about everything else." Nearly undone by one card — "BUMBAKLOT, Severity 5, Verified…
  that one card cost the word 'Verified' most of its meaning." · "'Still trying — check your
  signal' with a Retry button is exactly right — it's alive, it blames the network not me, it
  gives me a verb."
- **R7 · Reduce Transparency (engineered-material packet — §4.9 caveat applies):** "**Yes — mostly
  first-class. Maybe 85% of this app was clearly designed as *the* app**, not derived from
  something flashier." Designed-for-me list: Tasks both themes, the severity grammar, the legend,
  the static skeletons, the pinned report footer, the anonymity band. The asks: "make every sheet
  and panel genuinely opaque" (a C-lite-design question, not an RT failure — see §4.9) and "give
  my finger a visible pressed state… that's not reduced motion, that's removed feedback."

## §Copy-observations index

Each lens's copy rail is banked at the tail of its section above (F1–F6 → "Copy observations").
Round 1's appendix (report §6) remains the inherited base; the R2 rails ADD to it — Part 3
assembles the merged copy appendix from both. Highest-recurrence R2 items across lenses: the k≥3
caveat speaking in three variants (F4-06) · "Resolve/Resolved" verb-state drift at the triage
surfaces (F4-08, R5) · the noun-canon leaks at the report moment and Tasks header (F4-07, R6's
"I'm not staff") · "colour/color" + casing drift (F4-13/F4-14, pre-spotted in §1) · the missing
next-step echo in Help's empty state (F5-10).

## §Probe log

1. `tools/probe-export.mjs` — the lucide-boundary probe: static export renders Tasks / Map /
   NearbyFlagsModal / ReportFlagModal (the boundary LIFTS; §0). One benign `findNodeHandle`
   pageerror.
2. Filter-count probe (inline, Stage 2) — live guest data: 9 flags; category counts No ramp 5 ·
   Broken sidewalk 0 · Blocked path 1 · Missing signal 0 · Steep grade 1 · Other 2 (drove the
   true-empty recipe); discovered the NEW DISTANCE filter section + "Heat map · Off" state text.
3. F1's pixel probes — `cmp` byte-comparison: report category/severity pressed frames (and the RM
   severity press) **bitwise-identical** to rest; map-zoomin pressed differs by 726 px (edge ring
   only); control pair tabbar rest/pressed differs (harness DOES capture pressed deltas — the
   dead frames are app truth).
4. Skeptic probes (Stage 5, banked in `partials/verdicts.json` rationales): CDP AX-tree dump —
   `aria-selected` present in DOM but DROPPED from the Chromium accessibility tree on
   `role="button"` chips (F1-03's corrected mechanism); the severity-hint live region
   (`accessibilityLiveRegion="polite"`, ReportFlagModal.tsx:719–728) verified live in the export;
   Playwright ariaSnapshot output caveat recorded against the R2/F4 tree evidence (F4-01
   demotion).
5. Wrong-element press-hold corrections (F1) — four index rows appended; the affected frames'
   honest meaning re-recorded (they prove chip/subtitle deadness, not card/Verify deadness).

## §Honesty ledger

The orientation's ledger (`01_feel_orientation.md` §4, items 1–12) is the canonical ledger for
this evidence base — including: everything is `web-approximated` from the static export (§4.2);
the fenced success moments (§4.8); R7's C-lite-not-RT packet (§4.9); the RN-web Modal
presentation question (§4.10 — F3 resolved its judgment shape: the web sheets present as cuts;
the designed slide's native feel is NEEDS-SKY-DEVICE); the halt-and-resume model-provenance note
(§4.11); and the font-race artifact risk (§4.12 — the skeptic pass applied it). Additions from
Stages 4–5:

13. The a11y-tree evidence is Playwright `ariaSnapshot` output — a derived view of the ARIA tree,
    not the browser's computed accessibility tree; where the two diverge (notably state exposure
    on role="button"), the CDP AX probe is the authority (F1-03, F4-01).
14. All 16 CRITICAL/HIGH skeptic rationales + attack logs are banked verbatim in
    `partials/verdicts.json`; the lens sections above carry each verdict inline.
15. Native feel remains device-gated throughout: haptic acknowledgment, VoiceOver traversal of
    the recomposed FlagCard (D1), true sheet-slide presentation, blur frost, Apple-tile visuals —
    every native-scoped claim in F1–F6 carries NEEDS-SKY-DEVICE inline.
