# R2 FEEL AUDIT — SHARED LAW (read this before your lens brief; binding for every lens agent)

## Subject + mission
AccessMap (`~/AccessMap`, branch `bench/4-quality` @ `a8549ff`) — Sky's flagship civil-benefit
accessibility product. It maps physical-world accessibility barriers (6 categories, severity 1–5,
status open/verified/resolved) so people with mobility, vision, or other disabilities can find and
trust navigable routes. Real disabled people depend on it. DESIGN.md's law: "Beauty that excludes
people is a defect — especially here."

## The Round-2 thesis (given, not discovered — every judgment serves it)
**"Disabled users deserve beautiful software — one material, one voice, one hand."**
Round 1 made the app CORRECT (honest, reachable, coherent, safe). Round 2 makes it LOVELY —
because utilitarian-bare is what disabled users are always handed, and refusing that is both the
mission and the differentiator. One voice = the same warm, civically-serious editorial voice in
every small copy moment. One hand = every corner feels made by ONE careful hand — and stays usable
WITH one hand. Beauty NEVER costs legibility, reachability, or honesty; WCAG 2.2 AA is the HARD
FLOOR. Glass is the STAGE; the severity grammar is the ACTOR (Round 1's signature thesis, intact).
Reduce Transparency users get a FIRST-CLASS experience, not a fallback.

## Sky's taste anchor (judge against THIS, not generic mobile convention)
The Deep Field material system — material depth as hero, used with RESTRAINT and breathing room;
EDITORIAL typography; ALWAYS LEGIBLE. Distinctiveness comes FROM the ethos, never by abandoning it.
Deviations from Sky's OWN ethos are the most valuable findings. Read `~/AccessMap/GLASS.md` and
`~/AccessMap/DESIGN.md` for the ethos in the app's own words.

## STRICTLY READ-ONLY
You never modify, create, or delete any file; never run git write commands; never npm-install;
never sign in to anything; never press any submit affordance. You READ code, captures, and docs.
Your deliverable is your final returned text — the orchestrator banks it.

## Finding format (exactly this, one block per finding)
`F{n}-{seq}` · **Where** (screen/component/file:line) · **What** · **Why it matters**
(mission- and thesis-weighted) · **Evidence** (capture filenames from the render index + code refs,
each claim carrying one honesty tag) · **Severity**.

## Severity scale (Round 1's, verbatim — at equal tier, access failures outrank aesthetic ones)
- **CRITICAL** = an access failure on a core flow, a trust-breaking defect, or overlap/clip/occlusion at any size.
- **HIGH** = materially impairs a disabled user's job or the cohesion/trust mission.
- **MEDIUM** · **LOW** · **POLISH**.

## Honesty tags (every evidence claim carries one)
`web-approximated` (expo web in Chromium — this round's captures come from the STATIC EXPORT on
:8082, production bundle; RN-web ≠ iOS/Android) · `code-inferred` · `test-inferred` ·
`arbiter-measured` (contrast-check.mjs output only — never eye-judge a ratio) · `lab-mockup` ·
`NEEDS-SKY-DEVICE`. True blur feel, scroll smoothness, VoiceOver/TalkBack, haptics, real Dynamic
Type, and Reduce Transparency are DEVICE-ONLY — say so wherever it matters. Web tiles are CartoDB
always; RT states are code-/test-inferred (iOS-only API). Auth-gated + post-submit states are
code-inferred (the fence never signed in, never submitted).

## THE RESTRAINT CHECK (inline verdict on every finding-with-a-direction)
Does the direction cost legibility, reachability, or honesty? Then it DIES, however pretty.
Write `RESTRAINT: PASS — <why>` or kill the direction yourself.

## Do NOT re-find (calibration failure if you do)
All 20 Round-1 proposals S1–S20 and all 11 bench items B1–B11 are CLOSED at this HEAD.
`design-reviews/r2-audit/01_feel_orientation.md` §1 lists exactly what shipped per surface —
read it FIRST. If a SHIPPED fix looks wrong at HEAD, that IS a legitimate new finding — cite the
ledger AND the regression evidence. Known-closed micro-items you must not re-find: the 350ms
callout delay (now the `retryShowCallout` race-ladder, MapScreen.tsx:159); the `/ago$/` test
flake; B6 light-bulk ghosting (Sky's device call — SETTLED); D9 ≥500-on-glass haze (Sky's device
read — SETTLED).

## NEVER re-litigate (Sky's open either/ors — you may reference their UI/read halves, never
prescribe the decision): Fork 1 proximity/geo-query · Fork 2 points-economy honesty · Fork 3
auth-wall/guest contract · Fork 4 k-anonymity/guest cache · Fork 5 trust-model scope (verifier
count + guest flag-as-wrong) · Fork 6 product-name · Fork 7 stagePoolB · Fork 8 dark saved-place
chips · Fork 9 ui/Button adopt-or-remove. Also Sky's open bench discoveries: blocked_path icon
collision · CATEGORY_ICONS dead export · searchClearText dead style · heat no-zones copy tuning ·
OnboardingCards local RM detection.

## PROTECT (never propose regressing; extensions only)
The 17-item merged list: `design-reviews/fable-audit/partials/protect-merged.md`. Load-bearing:
GlassSurface.tsx DO-NOT-EDIT · the map overlay `pointerEvents="box-none"` gesture law · the
anonymity/honesty overlays byte-preserved · every arbitrated floor/ink is script-decided.

## Your evidence base
- `design-reviews/r2-audit/01_feel_orientation.md` — §1 delta digest, §2 feel inventory (your
  nerve paths), §3 how-to-reach, §4 honesty ledger. READ FIRST.
- `design-reviews/r2-audit/01_feel_render-index.md` — one row per capture; your asset groups live
  under `design-reviews/r2-audit/assets/<group>/`.
- `design-reviews/r2-audit/01_feel_persona-reads.md` — seven blinded persona reads (unprimed
  reactions = first-class evidence; credit them as "R{n} felt…").
- The repo at HEAD (read-only) + `design-reviews/fable-audit/` (Round-1 authority).

## Output contract
Return ONE markdown document: `## F{n} — <lens name>` · a 3–6 sentence lens verdict paragraph ·
the findings (format above, severity-ordered) · `### PROTECT nominations` (feel patterns worth
freezing) · `### Copy observations` (rail, not rewrite — one line each). Number findings
F{n}-01, F{n}-02, … Be exhaustive within your lens; do not drift into other lenses' territory
(cross-reference instead: "→ F4 territory").
