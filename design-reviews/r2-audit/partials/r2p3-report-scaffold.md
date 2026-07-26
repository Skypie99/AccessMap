## 2. Orientation digest · render-index reference · persona-read digest

### Orientation digest (from `01_feel_orientation.md`)
Round 2 audits the post-uplift (P0–P5 / S1–S20) + post-bench (BENCH 1–4 / B1–B11) tree at `bench/4-quality` `a8549ff`, exactly as Sky left it. The delta digest (ten ledger digests, 70/70 grep-verified at HEAD) confirmed the baseline is present by three markers spanning the trains: `PHOTO_MAX_DIMENSION` in the photo pipeline (BENCH-4/B8), `LiveStatusRegion.tsx` (uplift P5/S10), and `variant="bulk"` in `NearbyFlagsModal.tsx` (BENCH-3/B4e). The signature — the severity grammar single-source (`theme.ts:533`, ramp `#F7C948→#D92D20`, labels Minor→Severe, `textOnColor` ink fork) + `SeverityBadge` + `severityColor()` — is intact. Round 1's enemy (clutter, occlusion) still stands as the enemy; the empty-filters recovery card (`MapScreen.tsx:2161`, "the app's best moment," PROTECT-2) remains the bar every state is judged against.

### Render-index reference (from `01_feel_render-index.md`)
The whole audit rests on a 182-file capture matrix banked append-only, VERIFY1 PASS (0 missing / 0 failed / 0 orphan; expected 170 == on-disk == indexed) plus 16 annotated/corrected top-ups. **The lucide dev-preview boundary LIFTED this round** via a static export (`__DEV__` false, `:8082` production bundle) — so the whole Map/Tasks family renders as live `web-approximated` evidence, the first Round to reach those surfaces without code-inferring them. Every CRITICAL/HIGH carries an annotated capture in `assets/annotated/` (indexed), except the two whose defect no still can carry (F1-03 the AX-tree state drop, F4-02 the spoken layer — both evidenced by CDP probe + source excerpt in-finding).

### Persona-read digest (verbatim highlights, credited — full reads: `01_feel_persona-reads.md`)
- **R1 · wheelchair, route-planning:** "Somebody decided how this app talks about danger and then never wavered. That consistency is what lets me stop decoding and start deciding." The legend is "the warmest screen in the app… written in consequences." Trust-reducers: "**'BUMBAKLOT' — Severity 5 · Severe · Verified**… the single most damaging pixel in the whole set"; the silent Home load-error "indistinguishable from loading"; the callout/toolbar collision — "sloppiness reads as 'maybe the data is sloppy too.'"
- **R2 · blind, VoiceOver-primary:** "Someone here has actually written sentences for me… That is prose, not a control dump." The report form is "the high point of the whole app." But: "I hear every flag twice, slightly differently"; "I hear **'Verify this flag'** six times in a row with no idea *which* flag each belongs to"; "Everything is a level-1 heading."
- **R3 · low-vision, large-type:** "The bones respect me. The edges — headline, FAB, action row, toolbar overflow — were only ever tested at 100%." "Dark mode is kinder [to lists] but **loses the map**… I'd live in dark and be forced to light every time I navigate — an uncomfortable trade."
- **R4 · one-handed / limited-dexterity:** "Designed for someone else's *steadier* hand. The bones are right… but the moment-of-touch layer is missing almost everywhere, and that's the layer I live in." Begged-for fix #1: "a real pressed state… the drawer row already proves the pattern."
- **R5 · senior craft reviewer:** **7/10 — "the system thinking is 8+; the execution hygiene is 5."** Signature, unprompted: "a civic reporting tool whose brand is its severity scale." "The transition frames are an empty folder wearing a trench coat." Would interview; demands "an occlusion-and-loading pass" before calling it premium.
- **R6 · first-timer under cognitive load:** kept the app for one sentence — "**'AccessMap doesn't notify the city — see Resources'**… an app honest about its limits is an app I'll believe about everything else." Nearly undone by BUMBAKLOT. "'Still trying — check your signal' with a Retry button is exactly right."
- **R7 · Reduce Transparency (engineered-material packet — §4.9 caveat):** "**Yes — mostly first-class. Maybe 85% of this app was clearly designed as *the* app**, not derived from something flashier." Designed-for-me: Tasks both themes, the severity grammar, the legend, the static skeletons, the pinned report footer, the anonymity band. The asks: "make every sheet and panel genuinely opaque" (a C-lite-design question, not an RT failure) and "give my finger a visible pressed state… that's not reduced motion, that's removed feedback."

---

## 3. Findings carried through (canonical, post-verification)

Feel skeptic outcome: **16 verified · 4 CONFIRMED · 12 ADJUSTED · 0 REFUTED** (two demoted a tier: F4-01, F5-01 → MEDIUM). Filed 73 → **65 canonical** (dedup map in `02_feel_findings.md` §Calibration). Material census: **57 surfaces, completeness-critic PASS**, zero rows re-classified in the Stage-6 fidelity pass; the reading test found **14 breaks (RB1–RB14)**, concentrated in four places. Every id keeps its evidence tags.

### Feel — the CRITICAL and the HIGH band (13 canonical HIGH + 1 CRITICAL)
- **CRITICAL — F2-01** — the map pin callout composites UNDER the top chrome cluster (the S3 trust doorway; the severity grammar text itself occluded, both themes, re-verified). `web-approximated` + `code-inferred` (native Callout same class). → **T1**.
- **HIGH — F1-01** report-sheet press silence across all 10 Pressables (guest flow; the signature severity picker silent under the finger). → T4.
- **HIGH — F1-02** PressableScale's RM feedback hole across ~20 controls (institutionalized in its own doc comment). → T3.
- **HIGH — F1-03** selection-state drop for web SR on button-role chips (Chromium drops `aria-selected` from the AX tree; the five Map filter-panel chip families announce nothing). → T11.
- **HIGH — F1-04** the focus-visible net defeated by same-height overflow clipping + focus escaping into a non-inert occluded screen (annotation found a CLIPPED DEFAULT ring — stronger than filed). → T11.
- **HIGH — F2-02** the editorial Home headline clips to gibberish at 200% (`numberOfLines={1}`; WCAG 1.4.4 on the shipped web surface). → T13.
- **HIGH — F2-03** (≡F5-04/F5-08) LiveStatusRegion + FlashBanner both mount screen-blind at `top:max(insets.top,56)`, colliding with headers. → T6.
- **HIGH — F2-04** (≡F5-06) the signed-out Profile void (early-return screen, no header/no shape). → T10.
- **HIGH — F3-01** (≡F5-07) the drawer→Settings lazy-mount spinner void — "the single worst tear in the one-material thesis," on every first Settings visit per session. → T12.
- **HIGH — F4-02** the FlagCard spoken layer's double-speak + orphaned "Verify this flag" ×6 (D1-adjacent). → T8.
- **HIGH — F4-03** the no-location arrival's split voice (+ F5-03 silent San-Francisco default frame). → T7.
- **HIGH — F5-02** the em-dash first-load headline + Loading/Updating split. → T9.
- **HIGH — F6-01** the detail sheet speaks a third of the grammar ("Severity 4" with no word, no stake-line). → T5.
- (Demoted to MEDIUM by the skeptic pass: F4-01 — the banked trees were Playwright ariaSnapshot, not the computed AX tree; F5-01 — the "stuck loading" engine-bug framing deleted, the em-dash presentation remains as F5-02.)

### Material — the reading-test breaks (RB1–RB14) and census headlines
The one-material world breaks in **four concentrations** (04 §1): **Home** (RB1 two-worlds tab switch M-06↔M-01 · RB2 the leftover legacy glass pane · RB3 glass sheet frosting a paper page); **the un-migrated overlay remainder** (RB4 the trust ledger wears the least-considered material at the S3 doorway · RB5 same break at every Tasks/Profile doorway · RB6 Profile's list opens two material worlds from adjacent rows · RB7 the same split inside Settings); **the transient/boot edges** (RB8 the dark-launch boot strobe · RB10 the map's third material recipe · RB11 the one banner not speaking banner); and **two deliberate tiers needing RATIFICATION not migration** (RB12 the four-dialog tier — ratified, craft-delta remainder only; RB13 the map legacy always-light trio — ratified law + a keep-vs-swap fork). RB9 (drawer siblings' presentation-shape delta) and RB14 (the last Admin nav header) round out the list. Census headline: **15 surfaces MIGRATE, 42 RATIFY** (04 §2g target ledger; 15+42=57 ✓); the arbiter proved the proposed world at spec time (**80 pairs, exit 0**), with the trials file recording **six live shipped-AA drifts** (M-52 View 3.42 · M-36 reopen 2.07 · M-48 light-inactive 3.17/4.04 · M-51 chip · M-22 rankTop · M-46 dark chrome) — five repaired in-train, the sixth (M-48 light-inactive) slated as **T15** because its fix needs a `theme.ts` ink outside the train's zero-theme-edits rule.

---

## 4. Reference tables

### ★ The updated PROTECT list — Round 1's 17 restated (extend, never regress) + Round-2 additions

**Round 1's 17 (canonical; full text in `../fable-audit/2026-07-04_AccessMap_Design_Review.md` §4 / `partials/protect-merged.md`):**
1. The Nearby list / NearbyFlagsModal as the map's accessible twin. 2. The empty-filters recovery card. 3. The ReportFlagModal sheet architecture (KAV, 88% cap, sticky 44pt footer, five discrete severity buttons). 4. **The severity grammar** (the signature). 5. The contrast-arbitration system + DO-NOT-EDIT `GlassSurface.tsx`. 6. The locating fix + tests + battery/thermal posture. 7. Reduce-motion discipline outside the map camera. 8. `POINTS` single-source + the anonymity honesty set. 9. Web-as-guest-mode. 10. Home's honesty law (no fabricated distances). 11. The privacy-forward trust voice. 12. `accessibility.ts` hook suite + `severityA11y`/`statusA11y` + `accessibilityViewIsModal` across ~25 sheets. 13. The DT guard suite + AppText's uncapped body law. 14. The Map blur-budget CUT via literal `forceEngineered`. 15. Store/marker/cold-start discipline. 16. The bespoke `CategoryIcon` set + Wayfinder mark + "Wayfinder Blue" `ctaFill` mode-independence. 17. "Back. Disabled on first card." *(Plus the re-affirmed untouchables: the `box-none` overlay law, the hardened guard tests, the shipped glass tokens + GLASS.md arbitrated floors.)*

**Round-2 additions — everything shipped in P0–P5 + BENCH 1–4 joins the protected baseline (testable statements; fixes must EXTEND these):**
- **PROTECT-18 — LiveStatusRegion's persistent-mount text-mutation announce law** (`LiveStatusRegion.tsx:16–24,106–109`, uplift P5/S10): the region is mounted persistent and announces by MUTATING its text; it makes success + escalation audible to the guest-web cohort. Never regress to mount-with-text. *(T6 moves its PLACEMENT; the announce mechanism stays byte-preserved.)*
- **PROTECT-19 — the em-dash status grammar** ("state — next step"; P0/P5): one shape for every status beat ("Report filed — thanks for flagging this barrier" · "Still trying — check your signal" · "Couldn't refresh — showing older data. Tap to try again."). Every future status string is written in it.
- **PROTECT-20 — the shared LiveStatusRegion Clear ≥44pt bar + action-bar fade** (uplift P5/S16): the new-chrome 44pt floor is held everywhere new; the overflow fade is the shipped affordance.
- **PROTECT-21 — the BENCH-3 unified bulk-glass tier** (`variant="bulk"`, 11 sheets on one material — M-25…M-35): the closed baseline the MP train extends. Never fork a sheet off it; every newly-migrating sheet joins THIS recipe.
- **PROTECT-22 — the motion delay-gate + pulse token + RM regression net** (BENCH-4/B5: the 220ms RM delay-gate at `HamburgerDrawer.tsx:119`, `motion.pulse:700`, and the 21-test RM guard net incl. the falsy-zero trap): every new motion honors the gate; the RM guard net stays green.
- **PROTECT-23 — the resize-on-ingest photo pipeline** (BENCH-4/B8: `PHOTO_MAX_DIMENSION` 2048 cap; resize + EXIF-strip in ONE `manipulateAsync` pass, native + web; the `verifyExifStripped` gate before upload; no original-copy path). Never split the resize from the strip; never add a bypass.
- **PROTECT-24 — the Lucide house style** (BENCH-1/B2 retired the UI emoji for Lucide app-wide; B3 wore the Wayfinder mark on more surfaces): no decorative UI emoji returns. *(T17 closes the one survivor, the UpdateBanner 🔔.)*
- **PROTECT-25 — the severity-grammar wording spine's four zero-drift consumers** (`theme.ts:533` `severity` → `SEVERITY_LABELS`/`severityColor` → `severityA11y` → `heatmapSeverity`): the Part-2 census verified zero drift across all four at HEAD. Extensions only; new severity surfaces inherit the spine, never re-decide. *(T5 extends it with the `SeverityDisc` primitive.)*
- **PROTECT-26 — the web announce shim** (`announce.ts`, uplift P1/S9: `announce()`/`subscribeAnnounce()`/`installWebAnnounceShim()` replacing the dead `announceForAccessibility` web no-op): the mechanism that makes state audible to the guest-web cohort. Never regress.
- **PROTECT-27 — ThemeContext's TOTAL lightColor default** (`ThemeContext.tsx:218`; 04 §2b/M-54, Part-2 S9 B.2): load-bearing for the error-boundary safety net — the app boundary mounts OUTSIDE `ThemeProvider` and depends on the non-throwing default rendering a light-palette crash screen. `useColor` must never become a throwing hook.

*Round-2 PROTECT nominations (from the Parts 1–2 lenses + census — strengths the eventual uplift should freeze as it touches them, not yet numbered into the canonical baseline): the drawer-row pressed dim (the app's benchmark press) · the Tasks FlagCard static-truth + gated-delight acknowledgment stack · the Legend severity-row rhythm (32pt disc + "N — Word" + consequence, even five-row pitch — the single most-praised composition) · the Nearby card header grammar · the ScreenHeader type rhythm + M18 auto-fit floor · the dark-mode luminosity-led edge duality · the RM designed-stillness contract across all modal mounts · the cross-platform camera grammar · the presentation grammar (sheets slide / dialogs fade, 25/5 zero exceptions) · the welded arrival · the SR nested-detail continuity pattern · `Suspense fallback={null}` warm chunks · the taught severity scale on the report buttons · the submit-moment honesty sentence · the Skeleton contract · the S11 read ladder + its write-half twin · the extended empty-filter recovery card (per-axis one-tap clear) · the pin's four-channel encoding at capacity (never a fifth channel/digit) · reward gold never wears the disc.*

### The fork registry — Forks 1–9 inherited verbatim-by-reference + new Round-2 forks

**Inherited (full wording: Round-1 report §5; framed here, never decided):** Fork 1 proximity/geo-query architecture · Fork 2 points-economy honesty (+ CLAUDE.md doc drift) · Fork 3 auth-wall & guest contract · Fork 4 k-anonymity / guest cache-scope · Fork 5 trust-model scope (verifier COUNT + guest flag-as-wrong; S3 shipped the read half only) · Fork 6 product-name collision · Fork 7 `stagePoolB` keep/kill · Fork 8 dark saved-place chips · Fork 9 `ui/Button` adopt-or-remove.

**New Round-2 forks (each a crisp either/or; the DECISION half is Sky's, the UI/read halves are what the slate scopes):**
- **Fork 10 — the map's legacy always-light pair** (M-12 locating banner / M-13 heat legend; 04 §6.2): **(A)** KEEP the legacy `GlassSurface` implementation (ratified default; zero change; keeps the two accepted BlurViews), or **(B)** swap to always-light LITERAL engineered fills (same 0.82/0.95 literals + RT branch; kills 2 map BlurViews; identical over light tiles, subtler frost over dark tiles — frost feel is device-read territory). If (B), a one-phase train addendum.
- **Fork 11 — the bulk-tier mechanism lever** (04 §6.3; inherited B4 flag #2 made explicit): the nine B4 sheets ship live blur; the nine newly-migrating sheets ship engineered-literal (the budget law forces it for the Tasks-hosted FlagDetail). Sky's standing one-prop lever can later flip either family to match the other after the on-device frost/perf read. The arbiter floors cover both mechanisms either way. Frame only.
- **Fork 12 — M-37 locked-row idiom** (04 §6.8): **(A)** accept-and-record Achievements' `rowDimmed {opacity:0.7}` (the MP3 block default; the locked `rowDesc` is a pre-existing ≈3.0:1 light, SR-mitigated), or **(B)** re-spec locked styling as explicit muted inks at opacity 1.
- **Fork 13 — the lightbox blacks** (M-47; 04 §6.10): **(A)** tokenize the literal `rgba(0,0,0,0.92)` → `backdropStrong` (a visible 0.92→0.85/0.75 change; honors `theme.ts:136`'s stated intent), or **(B)** record the deeper black as deliberate for paged viewing.

*Fork-adjacent Sky-notes (not new forks — routed, never silently resolved): §6.4 `ui/Sheet`'s zero-consumer opaque default path (Fork-9-adjacent adopt-or-remove; the MP train ships hand-roll and leaves Sheet untouched) · §6.5 GLASS.md doc-refresh OWNERSHIP after the train lands (executor caboose vs Sky's hand — T20 specs the edits, the hand is Sky's) · §6.7 MP5 (Admin) include/skip (self-contained caboose; skipping records B14/RB14 as a deliberate exception, conservation reads 13/15).*

### ★ The refreshed device-gate ledger (R2-D0…R2-D20)

**R2-D0 — the ONE build gate.** Every gate below waits on the single EAS TestFlight build: `cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive`. **Sky's build, Sky's merge — never auto-run.**

**Closures recorded this round (the paper record catching up):**
- **D9 — CLOSED.** The `bodyMedium` ≥500-weight-on-glass haze reads fine on device — **Sky's direct device read, 2026-07-09.** This read POST-DATES the bench docs, which still say NEEDS-SKY-DEVICE; the on-disk ledgers are stale, the read stands. This report is the paper record catching up.
- **D10 — CLOSED.** The B6 light bulk sheet reads clean as-is — recorded in `bench-assets/BENCH-3-verification-evidence.md` §B6 (Sky device read).

**Still-open Round-1 gates (verified against the ledgers; folded forward once each):**
- **R2-D1** (= D1) — **the single highest-stakes check.** L6-04/S13 Tasks-card-action VoiceOver flattening: are Verify/Resolve/Reject/Details independently focusable, or does the `accessible` parent collapse them? (T8's spoken recompose rides this exact check.)
- **R2-D2** (= D2) — SignIn `accessibilityViewIsModal` containment.
- **R2-D3** (= D3) — native VoiceOver truth broadly (~30 state sites, announce dual-wiring, legend backdrop sibling, every RN-web-artifact caveat).
- **R2-D4** (= D4) — **the privacy gate.** EXIF-strip GPS removal on a real photo after upload (the strip-by-re-encode is code-confirmed; on-device removal is device-only).
- **R2-D5** (= D5) — native reduce-motion feel (instant cut vs swooping arc on the FIND payoff).
- **R2-D6** (= D6) — Reduce Transparency posture (the glass surfaces' C-lite fallback under iOS Reduce Transparency).
- **R2-D7** (= D7) — real Dynamic Type (native per-variant caps ~1.5–1.6; header collision at the capped size).
- **R2-D8** (= D8) — iOS light Apple-tile pin/ring visuals (anon ring, pin hairline; the on-device light-tile regime the harness cannot render).
- **R2-D11** (= D11) — real-tile / runtime states on device (single-pointer zoom-out, pinch/VoiceOver, Split View / true-320pt, tap-swallow, announcement timing, poor-signal ceiling).

**New Round-2 device items (from Parts 1–2 + the slate's needsSkyDevice legs, deduped — each appears once, cross-referenced to the T that raises it):**
- **R2-D12** (T1) — native Callout occlusion on top-third pins, both themes, RM on/off; rapid Nearby A→B yields B only; theme-flip continuity (map never blanks).
- **R2-D13** (T3/T4) — the press-vocabulary felt dialect across drawer row / Map tool / tab / filter chip; press-in haptics on the pickers; the tab-press haptic; RM-on dims still answer.
- **R2-D14** (T2, the material train's own gate) — dark-launch first frame (M-56); Home stage in both palettes; frost/perf feel of the engineered sheet tier over live content; an RT sweep (OS + Settings toggle); a VoiceOver walk of FlagDetail post-MP4.
- **R2-D15** (T5) — the auth-fenced grammar surfaces (Profile pill, MyReports, MyWatched, the detail chip, the Tasks pill): Sky signs in, VoiceOver pass, both themes.
- **R2-D16** (T6) — the status-ledge placement on device (no header collision; SR announce timing preserved through the reposition).
- **R2-D17** (T7) — **closes 02 honesty-ledger #16:** does the native denied-arrival banner render-then-clear on this reach, or require a state the harness missed? + the no-location single voice.
- **R2-D18** (T20) — MyWatched `accessibilityViewIsModal` native containment (VoiceOver stays inside the sheet until close, side-by-side with MyReports).

*(R2-D1 subsumes T8's spoken-layer device leg; R2-D6 subsumes T2/T5/T20's RT legs; R2-D7 subsumes T13's real-×2 leg; R2-D11 subsumes T14's overflow-scent leg and T3's Split-View leg — the deduped ledger is the one list that survives the round.)*

### The five open bench discoveries — dispositioned (not re-derived; Sky's)
`blocked_path` per-template icon collision (⛔/🚗) · `CATEGORY_ICONS` dead export · `searchClearText` dead style · heat "no zones in view" copy tuning · OnboardingCards' local RM detection (vs `useReducedMotion()`). All remain Sky's open discoveries; T17's sweep and T19's hygiene are flag-adjacent but touch none of them without Sky's call; the OnboardingCards RM-detection unify is the one a future motion pass may fold, framed here only.

### The conservation table — every id in exactly one bucket (no orphans)
*(Full id→bucket map in `05_r2-slate.md` §Conservation Map; summary here.)*
- **PROPOSAL:** all 65 canonical F-ids (→ T1,T3–T20 by cluster) except F1-09; the 15 MIGRATE M-ids + M-48-ink + M-40-containment (→ T2, T15, T20); RB1–8/10/11/14 (→ T2); §6.5/§6.6/§6.9/§6.11/§6.12 (→ T15, T20).
- **FORK:** §6.1→Fork 8 · §6.2→Fork 10 · §6.3→Fork 11 · §6.8→Fork 12 · §6.10→Fork 13 · §6.4→Fork-9-adjacent note · RB13→NO-ACTION + Fork 10.
- **PARK (with reason + revisit-when):** F1-09 rail-zoning — Dani-gated layout pass with a built-in kill condition (must preserve the box-none map-gesture law, no tile occlusion, no crowding of 44pt FAB targets — "if it can't, the direction dies and the rail stays"); revisit when a chrome-layout pass is scoped. RB9 drawer presentation-shape delta — recorded glass-family delta, softened by both being glass; revisit only if the presentation grammar is ever reworked.
- **PROTECT (nominated):** the ~20 Parts-1/2 lens + census nominations (listed under the PROTECT additions above) — strengths, frozen on the uplift that touches them.
- **NO-ACTION (stated reason):** the 41 ratified-stays M-ids (04 §4 written reasons); the M-48 mechanism-kill (trial record, exit-1-by-design — glass adoption fails 4/4 on the true chrome floor); RB12's ratified-tier status (T20 fixes only the craft-delta remainder).

---

## 6. Copy-observations appendix
*(From the F1–F6 copy rails + the persona reads. Round 1's report §6 remains the inherited base; these ADD to it. Every string is an OBSERVATION or a PROPOSAL — nothing ships. The T-proposals that would carry these to before/after tables: chiefly **T17** the convergence sweep, **T5** the grammar strings, **T6/T7/T9** the status/arrival/wait voice.)*

**Highest-recurrence (across ≥2 lenses):**
- The **k≥3 privacy caveat** speaks in three wordings ("reported" / "submitted" / "reports are shown") — PROTECT-11 names it part of the trust moat; one exact sentence, single-sourced beside `offlineBannerText`. (F4-06 → T17.)
- **"Resolve/Resolved" verb-state drift** at the triage surfaces (F4-08, R5: card "Resolved" state vs bulk bar "Resolve" verb — one grammar, two conjugations). → T8/T17.
- The **noun-canon leak** at the report moment and Tasks header ("flag" the database talking vs "barrier" the public voice; F4-07, R6's "I'm not staff"). → T17.
- **"colour/color" + casing drift** (F4-13/F4-14; LegendModal contradicts itself in one screen: "colors" subtitle vs "colour" entries; drawer "How To Help"/"About the App" title-case inside a sentence-case list). → T17.
- The **missing next-step echo** in Help's empty state (F5-10); Home discards the provider's warmer "taking longer than usual" for generic "Couldn't load barriers." (F5-05). → T9/T17.
- The **recovery card / status vehicles speaking a different dialect visible vs spoken** — a DESIGNED two-channel voice where it's paired (PROTECT'd), drift where it isn't. → judged case-by-case; the paired ones stay.

**Per-surface rail (observation only):**
- **Map:** "Showing 9 flags" ↔ "3 of 9 shown" — two count grammars, both honest, pick one if touched. The "1+" min-severity glyph remains cryptic to R6 (Round-1 L8-21 lineage, Sky's). "Loading flags…/Updating…" split landed and reads right.
- **Report sheet:** the location line speaks raw coordinates ("at 49.88740, -119.49250") — consider a spoken-only "at your current location." Anon banner em-dash (visible) vs period (spoken) is fine — the period is the better spoken pause.
- **Legend:** the "Verified" definition lives twice as independent strings (LegendModal / HelpModal), word-identical today — drift risk, single-source candidate. The Status block defines Open/Verified/Resolved but not Rejected — correct (rejected leaves the map).
- **Tasks:** the severity denominator tiers (chip "3 · Moderate" → Home "Severity 3 · Moderate" → Nearby "Severity 4 of 5 · Significant") read as deliberate progressive compression — document it so it stays a rule, not an accident. (T5 codifies the disc; the compression stays.)
- **FlagDetail:** "Date" is the register's one bureaucratic field name. Delete-confirm "This cannot be undone" (un-contracted, deliberate gravity — keep, but know it's the only one).
- **Onboarding / Sign-in / Profile:** the S19 platform fork ("Continue" web / "Allow Location" native) reads coherent, settled. Sign-in copy is canon-clean anchor register. Profile signed-out "…your stats, badges, and reports" — "reports" is natural possessive; exempt from the canon sweep.
- **The signature's authority ceiling — BUMBAKLOT.** Live seed data wears the grammar's most authoritative dress (sev-5 disc + "Severe" + "Verified") on nonsense; R1 "the single most damaging pixel," R6 "cost the word Verified most of its meaning." **Content, not design — the trust-model response is Fork 5 (Sky's); no direction offered.** Recorded because the grammar's authority is only as strong as what it endorses. "Severity" is never abbreviated anywhere at HEAD — protect that in any future tight-space work.

---

## 7. Honest coverage statement

**What each claim rests on.** Every finding carries one of the six tags. This round's evidence base is unusually strong for the Map/Tasks family because **the lucide dev-preview boundary LIFTED** — the static export (`__DEV__` false, `:8082`) rendered Map, Tasks, and the lazy heavy-lucide modals (ReportFlag, FlagDetail, Nearby) that crash the dev server, so those surfaces are live `web-approximated` this round rather than code-inferred. That is the single biggest coverage gain over Round 1.

**Still device-only (NEEDS-SKY-DEVICE), honestly:** true blur/frost feel, scroll smoothness, VoiceOver/TalkBack traversal, haptics, real Dynamic Type ×2, Reduce Transparency designed states (an iOS-only API — never renderable on web, so every RT claim is code/test-inferred), and Apple light tiles (web tiles are CARTO-dark always). The refreshed R2-D ledger (§4) is the one deduped list of what the one build lets Sky settle; R2-D1 (Tasks-card VoiceOver flattening) is the highest-stakes single check, R2-D4 (EXIF GPS) the privacy gate, R2-D14 the material train's own device gate.

**Arbiter-measured** covers every color/floor/ink claim in the material spec: the proposed world is `contrast-check.mjs` exit 0 at 80 pairs (`assets/arbiter/r2-material.txt`), with the trials file recording the six shipped-drift findings (exit 1 by design). Any color/floor/ink change in the slate names its own arbiter sibling to extend before it ships.

**Unreached states (code-inferred, tagged in-finding):** all signed-in surfaces (the fence never signed in — Profile self-surfaces, MyReports/MyWatched, the auth-gated grammar sites in T5, the actor-bonus triage paths); every post-submit state (the CONTRIBUTE flow was exercised only up to the submit affordance); native Callout occlusion (F2-01/T1's native leg); the native denied-arrival banner render (02 honesty ledger #16 → R2-D17).

**Thinner than ideal, said plainly:** the native-motion feel legs (T1/T3/T12 depend on device confirmation of what the harness proves only in code); the RT designed states throughout (code/test-inferred, never web-rendered); and the F2-11 Tasks-action-row window at fontScale 1.10–1.14 on a 376–390pt device (a harness-artifact-plus-window, registered on the device gate rather than code-fixed). Where a proposal's "done right" is provable only on device, its VERIFICATION field says exactly what Sky checks and its NEEDS-SKY-DEVICE flag is set.

Model provenance (disclosed): the prompt set was authored 2026-07-09 on Fable 5 max effort. Part 1 ran Fable 5 max (Stages 0–3 on 07-09, Stages 4–5 on 07-10 across a session-limit halt+resume — no model change). Part 2 ran Fable 5 max (two Fable availability halts in Stage 6, Sky-resumed both times; no verdict from a degraded model). Part 3 STARTED on Fable 5 (Stage 1 reconcile + the Stage-2 drafter fan-out), then **Sky switched the session to Opus 4.8 at the Stage-2 merge boundary** — the Round-1 precedent, Sky's call — so the Stage-2 merge, the Stage-3 skeptics + judge panels, this assembly, and the Stage-5 cold read ran on Opus 4.8 at max effort at Sky's direction. The slate's eventual execution may also land on Opus 4.8; this report and `04`'s migration train are written to be executed by a different model without design re-derivation.
