# Adversarial Skeptic Verdict — S18

**Proposal:** S18 — "'Submit report' label + 200%-zoom reflow guards (CRITICAL)"
**Resolves (claimed):** L5-03 (CRITICAL, WCAG 1.4.4 at 200%) · L3-27 (POLISH, title == button words) · the "Report anonymously as a button label" copy observation.
**Effort:** S · **Tier:** QuickWin · **FORKS-TO-SKY:** none.
**Verdict:** **FIX** (sound and access-positive; attach two concrete conditions before build).

---

## What I verified in the actual code (did not trust the entry)

Read `src/screens/ReportFlagModal.tsx`, `src/components/ui/ScreenHeader.tsx`, `src/navigation/RootNavigator.tsx`, plus the cited findings in `02_findings.md`, `partials/L5.md`, `partials/L3.md`.

| Claim in S18 | Reality at HEAD | Verdict |
|---|---|---|
| Visible submit label is `'Report anonymously'` | `:995` — `{isAnon ? 'Report anonymously' : 'Report'}` | ✅ exact |
| a11y label is already the distinct `'Submit anonymous flag report'` | `:982` — verbatim | ✅ exact |
| Sheet h1 is also `'Report anonymously'` (L3-27 duplication) | `:460` — `{isAnon ? 'Report anonymously' : 'Report a flag'}` — literally the same string as the button when anon | ✅ exact — real h1==button merge |
| `submitBtn: overflow:'visible'` | `:1230` — `submitBtn: { backgroundColor: color.brand, overflow: 'visible', ...shadow.glowBrand }` | ✅ exact |
| Submit stays reachable (sticky footer outside scroll) — "strictly legibility/boundary, not reachability" | `:962` `<View style={styles.actions}>` is OUTSIDE the `ScrollView` that closes at `:960`; comment at `:448-450` confirms the sticky-footer intent | ✅ — the skeptic's L5-03 correction ("architecture holds") is accurate |
| Anon-banner mid-word shred is "a `flex`/min-width bug, not an inevitability" | `:1161-1183` — `anonBanner` is `flexDirection:'row'`; `anonBannerInfo` flex:1; `anonBannerBody` flex:1; `anonBannerTitle` has **no** `minWidth:0`, no `flexShrink` guard, no word-break control. On web a flex child without `minWidth:0` won't shrink below content min-width, forcing mid-word breaks in the ~195pt effective viewport | ✅ — diagnosis correct; `minWidth:0` / word-break fix is real and RN-web-feasible |
| Header fix = "extend ScreenHeader's deterministic auto-fit … NOT `adjustsFontSizeToFit` (a RN-web no-op)" | ScreenHeader.tsx `:28-49` — the M18 deterministic char-count auto-fit exists exactly as described, precisely because `adjustsFontSizeToFit` is a RNW no-op (comment `:29-33`); `MIN_TITLE_SCALE = 0.6` floor present | ✅ mechanism real and RN-correct — **but see Condition 2** |
| Guest-reachable (web IS guest mode) | `:82` `isAnon = !user`; `:315` `createAnonFlag` — the anonymous CONTRIBUTE flow; the 200% failure hits real web guests | ✅ — CRITICAL severity justified |

**L5-03 status:** `02_findings.md:28` — CONFIRMED (1 over-claim trimmed: the "unsubmittable" claim was correctly downgraded to a legibility/boundary failure). **L3-27 status:** `L3.md:168` / `02_findings.md:665` — POLISH, real. Both trace genuinely.

---

## Per-rail attack

- **tracesToFinding = TRUE.** L5-03 (CRITICAL, CONFIRMED) and L3-27 (POLISH) both exist and are genuinely resolved. The label rename kills L3-27's h1/button merge and is the biggest single lever on L5-03 item ② (label overflow); the banner-wrap guard fixes item ①; the header guard addresses item ③.

- **wcagFloorHeld = TRUE.** Improves WCAG 1.4.4 (resize text) and 1.4.10 (reflow) at 200% on the CONTRIBUTE flow. No AA regression anywhere. The one WCAG nuance (2.5.3 Label-in-Name) is an *opportunity to improve*, not a floor drop — see Condition 1; the mismatch pre-exists shipped code.

- **glassLawHeld = TRUE.** Touches no color/floor/severity token, no blur (no expo-blur intensity involved), `box-none` untouched, `GlassSurface.tsx` not edited/forked, virtualization/forceEngineered laws irrelevant. `submitBtn` keeps `color.brand`/`color.textOnBrand`. Pure copy + flex-layout + auto-fit extension.

- **protectPreserved = TRUE** (verified, not trusted):
  - **PROTECT-3** (sheet architecture): sticky footer `:962` is outside the ScrollView `:450-960`; the five severity buttons (`:610/:651`) are untouched; only the label string + banner-body flex change. **Preserved.**
  - **PROTECT-4 / 10** (ScreenHeader auto-fit + severity grammar): the fix *extends* the M18 auto-fit; severity grammar not touched. **Preserved.**
  - **PROTECT-8** (anonymity honesty set): the load-bearing check. Renaming the *visible* button "Report anonymously" → "Submit report" does **not** erase the anonymity signal — it is independently carried by the sheet h1 `:460` (when anon), the persistent anon `role=alert` banner `:477-490` ("Reporting anonymously — your identity is not stored"), and the SR label `:982`. **Preserved.**

- **rnExpoFeasible = TRUE.** Label string change + flex `minWidth:0`/word-break + the EXISTING deterministic char-count auto-fit. It explicitly avoids `adjustsFontSizeToFit` (correctly, since it's a RNW no-op) and makes no `announceForAccessibility`/web-announce call. No CSS-only-impossible-in-RN trick. Fully real on RN-web.

- **accessNotTradedForPolish = TRUE.** This is an access *gain*, not a trade. No hidden regression. The only subtlety (2.5.3 alignment on the renamed button) is a condition that makes it *more* accessible, not a concealed cost.

- **arbiterReRunPresent = TRUE** (vacuous). Touches no color/floor/severity value, so the rail is set true by rule. The entry correctly states "No arbiter" / "No color change."

---

## FIX conditions (attach before build; neither is fatal)

**Condition 1 — align the accessible name to satisfy WCAG 2.5.3 (Label in Name) on the app's most important button.**
The audit itself flags 2.5.3 as a real defect elsewhere (L1-25 / `02_findings.md:135`: visible "Browse without an account" absent from a11y name "Continue as guest" — voice-control users can't speak what they see). Today's shipped code already has the same tension here: visible "Report anonymously" is **not** a substring of the a11y name "Submit anonymous flag report". S18 as written changes only the visible label to "Submit report" and leaves the a11y name as-is — so the visible words "Submit report" still aren't contained in the accessible name (2.5.3 requires the visible label text to be contained in the accessible name for speech input). Do not perpetuate this on the flagship button: when you rename the visible label, set the accessible name so the visible words appear in it and (ideally) at the start — e.g. visible "Submit report" with a11y "Submit report anonymously" (or "Submit anonymous report" only if the visible label is "Submit report" — but prefer the contiguous form). This costs one string and turns a pre-existing miss into a pass.

**Condition 2 — scope/route the header-collision leg (item ③) correctly; the stated mechanism only fits the post-S8 world.**
The "MapFeedback"/"ProfiFeedback" collision (L5-03 item ③) is on the **react-navigation nav header** used by Map/Profile/Settings — `headerTitleStyle` at `RootNavigator.tsx:271` with `headerRight: renderHeaderRight` (the Feedback pill) at `:279`. Those routes are NOT `headerShown:false` and do NOT use the in-body `ScreenHeader` (only Home/Tasks do — `:328/:335`). So "extend ScreenHeader's deterministic auto-fit" does not fix item ③ as the app ships **today**; it only becomes the right mechanism *after* S8 migrates Map/Profile/Settings onto `ScreenHeader` + `headerShown:false`. Therefore: either (a) sequence the item-③ leg explicitly behind S8 (the entry already cross-references S8 — make it a hard dependency for item ③), or (b) apply an equivalent shrink/truncate directly on the nav header's `headerTitleStyle`/`headerTitle` for those routes. The label + banner-wrap legs (items ①②, the bulk of the CRITICAL) are independent of S8 and can ship standalone.

---

## Reasoning (bottom line)

S18 is a genuine, well-scoped QuickWin whose central lever — renaming the 19-char "Report anonymously" visible label to the 13-char verb-forward "Submit report" — is verified in code to relieve the L5-03 item-② pill overflow and simultaneously kill the L3-27 h1==button merge, at zero AA cost and with the anonymity signal fully preserved by the title + persistent alert banner + SR label. The banner mid-word shred is a real, fixable flex/min-width bug (no `minWidth:0` on the flex chain), and the header fix correctly reaches for the app's own deterministic auto-fit rather than the RNW-dead `adjustsFontSizeToFit`. All seven rails are satisfiable. It is **not** KEEP-clean only because two conditions must be nailed: (1) don't perpetuate a WCAG 2.5.3 Label-in-Name miss on the app's most important button when you rename it — align the accessible name; (2) the header-collision leg's stated mechanism (extend ScreenHeader auto-fit) applies to the wrong component as the app ships today and must either hard-depend on S8 or target the react-navigation nav header directly. Both are precise, cheap, and non-fatal — hence **FIX**, not KILL and not KEEP.
