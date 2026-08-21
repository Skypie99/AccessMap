# C14 — LeaderboardScreen (modal, SIGNED IN) · Pro Max 440×956 · light · sim-release @ bc91789

## GEOMETRY (differs from the C9–C12 family — see SW-42 scoping)
Card **y548 h408 (42.7%), gap below = 0** — this sheet runs **flush to the screen bottom (956)** and therefore **overlaps the tab bar** (861–914). C9/C10/C11/C12 all stop at y835, clearing it. So the sheet family is not internally consistent about the tab bar; that inconsistency is recorded in SW-42's notes rather than claimed as intentional design.

## CONTENT OBSERVED
- Title "Leaderboard" + "Top 20 contributors by points"; period toggle **All-time / This Month** (194×45 each ✓).
- All-time ranking (4 contributors hold points): **1st Member 166 · 2nd Jarvis Mckneil 90 (you) · 3rd Member 21 · 4th Member 10**.
- **Self-highlight WORKS**: the row is blue-tinted AND the accessible name carries it — `"2nd, Jarvis Mckneil, 90 points, you"`. Rank + name + points + self-status all in one label. ✓
- **This Month → proper empty state**, not a blank list: *"No monthly ranking yet — points appear as people verify each other's reports."* ✓
- Rows are `Other(accessible)` 440×55–56 — non-interactive by design (no drill-in), so the 44pt floor doesn't apply. Close 44×45 ✓.
- **Ties:** none present in this data (166/90/21/10 all distinct) — tie-rendering is therefore **UNVERIFIED**, recorded as a coverage gap, not a pass.

## FINDINGS RAISED
- **SW-44** — the "ME" monogram on every anonymized contributor.
- **SW-45** — rows render over the ghosted tab bar in the overlap band.

## OBSERVATION (not logged as a defect)
The selected "All-time" segment renders its label with an underline while "This Month" does not. Could be a deliberate selected-state treatment or a text-decoration artifact; not investigated further and not claimed as a defect.

## ELEMENTS
Found 12 in-sheet · exercised: open, full census, geometry chain, list scroll, **All-time ↔ This Month toggle both directions**, empty state, close.
