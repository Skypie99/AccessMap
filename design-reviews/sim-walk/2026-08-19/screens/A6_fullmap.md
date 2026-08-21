# A6 — FullMap (MapScreen) + C2/C4/C5/C6/C7 + deep link · BANKED (Pro Max, light)
Build: sim-release @ bc91789 · LIVE backend (13 flags, Kelowna) · READ-ONLY + report-to-EDGE

## Map chrome — exercised: 15+
Menu 44×44 ✓ · Search by address 44×44 ✓ (=C1 on map) · Toggle filters 44×44 ✓ · More map tools 44×44 ✓ · Recenter/Zoom in/Zoom out 49×48 ✓ · Open nearby flags list 89×48 (C6 — button present; a coord tap hit a marker instead, list modal itself deferred as low-value variant) · markers (SW-29: 38×40, map convention) · marker callout → "Open details ›" works ✓ · Legal link 29×11 (attribution, informational)

## C2 FilterPresets + filter panel — FULLY exercised (best-built surface in the app)
- Categories with LIVE counts (No ramp 3 · Broken sidewalk 2 · Blocked path 3 · Missing signal 2 · Steep grade 3 · Other 0 = **13, sums correct**) 44pt ✓ · Min severity 1–5 44×44 ✓ (filter applies+resets, chip updates) · Status Open/Verified/Resolved/Rejected 44 ✓ · "WHO DOES THIS AFFECT?" disability-need filters 44 ✓ (excellent domain modeling) · Heat map switch 44 (toggles ON→legend bar renders, "Heat zones only appear where ≥3 flags" honest empty-state) ✓
- **C2 preset CRUD PROVEN end-to-end:** Save current filter → "Name this filter" dialog (max-5 note) → named "SIMTEST preset" → saved (chip "tap to apply, long press for options") → long-press → options alert → **Delete → verified gone (empty-state back)**. [SIMTEST] cleanup COMPLETE, device-local only, zero backend. (SIMTEST_CLEANUP.md)
- **SW-32 [Med]: 'Name this filter' Save button absent from AX tree + hidden under keyboard.** The dialog's Save never appeared in the accessibility tree (only Cancel did) and sat visually under the keyboard until the keyboard was dismissed; return-key submitted instead. VoiceOver users likely cannot reach Save. Also 'Collapse filter panel' = 90×**32**pt (SW-33, Med, under floor).

## C5 Map legend — ✓ full severity(1–5 color+meaning) + status semantics, all AX-labeled. Close 44 ✓
## More-tools menu — ✓ Send feedback / Map legend / Refresh flags / Save a place (C4 entry) all 198×44 ✓ (C4 SavedPlaces save-flow deferred as low-value CRUD variant — same pattern as C2 proven)

## ★ C7 ReportFlagModal — THE anonymous write flow, walked TO THE EDGE (Production Law)
Reached via Home 'Report a barrier' pill → FullMap openReport. Surface: "Report anonymously" + privacy banner "your identity is not stored" ✓ · category chips (labeled "Category: X" 45pt ✓) · severity 1–5 with full descriptions in labels (44×45 ✓) · description TextView · "Sign in to add a photo" (photo path guest-gated — honest) · **Submit report anonymously** [194×45].
- Filled: category Blocked path, severity 4, description typed → **Submit ENABLED**. **NOT PRESSED.** Zero backend write. Cancel and close 194×45 ✓ → closed clean.
- The blocked-term content filter (today's anon-filter ship 189bf5a) is a submit-time server path — correctly NOT triggerable without pressing Submit; verified present in code, edge honored.

## ★ Deep link accessmap://flag/{id} — ✓ END-TO-END
`xcrun simctl openurl accessmap://flag/29718d8c...` → OS "Open in Flagstone?" confirm → Open → **map focuses the EXACT flag (Steep grade, Loseth Dr) with callout open.** ✓
- **This SHARPENS SW-28**: deep-link path AND Tasks-card-title path BOTH focus+callout correctly; ONLY FlagDetail's "View on Map" button fails to pass the focus param. Isolated to that one call site.

## New rows → LEDGER: SW-32, SW-33 (above). SW-29 (markers) judged acceptable-tolerable.
Positives: filter panel is the app's strongest surface (live counts, disability-need axis, honest heatmap threshold) · report flow privacy-forward + fully labeled · deep link flawless · share payload verified earlier.
Shots: A6_map_focused/2, A6_map_cardtitle_focus, A6_filters_panel, A6_heatmap_on, C2_preset_save/saved, C5_legend, A6_more_tools, C6_nearby, C7_report_open/edge, deeplink_result/focused
