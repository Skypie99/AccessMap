# iPhone 17e (390×844) — AUTHED small-screen repeat · light · sim-release @ bc91789

Sky signed in on this device separately. An iOS **"Save Password?"** sheet blocked the app on arrival; **the agent did not touch it** (credential-storage decision) — Sky dismissed it. The app's own push priming alert stacked on top of it WAS cleared by the agent (an app dialog, and both its branches were already walked on the Pro Max, so no coverage lost).

## A5b PROFILE @ 390×844 — PASS
Renders correctly and reflows: "Jarvis Mckneil" / "Signed in as skylerhalisky@gmail.com" / **124 points** / **Silver tier** / full RECENT POINT ACTIVITY feed (all five award rows) / nav rows 342×69–85 ✓ / avatar 72×73 ✓ / menu + feedback 44×45 ✓.
- **SW-40 confirmed on small screen:** the tier chip is **83×32** here (vs 87×33 on Pro Max) — still ~12pt under the 44pt floor.

## ★ C12 MyWatched @ 390×844 — SW-42 REPRODUCES, same character
| Device | Screen | Card | % | Card bottom | Instruction line | Result |
|---|---|---|---|---|---|---|
| Pro Max | 956 | 352 | 36.8% | y822 | y836–875 | **outside the card → invisible** |
| **17e** | **844** | **354** | **41.9%** | **y709** | **y722–763** | **outside the card → invisible** |
The empty-state heading "No watched flags yet" straddles the card's bottom edge on both devices, and the instruction ("Open any flag on the map or in Tasks and tap Watch to track it") is fully clipped on both. Interesting nuance: the card is a near-constant **~352pt tall regardless of screen height**, which is why the percentage *rises* on the smaller device while the defect is identical. That points at a fixed/collapsed height rather than a percentage miscalculation — useful for Phase B.

## A4 TASKS @ 390×844 — action controls hold up, titles do not
- Verify **100×45** ✓ · Mark resolved **67×45** ✓ · Reject **69×45** ✓ · View details **69×45** ✓ — all clear the 44pt floor on the narrow screen.
- Row **titles 326×22** — under floor, **confirming SW-43/SW-22 at small size** (Pro Max measured 376×21 / 318×21 / 320×29).

## ⚠ "one verify action" — DELIBERATELY NOT FIRED, and why
The prompt asked for one verify action here. It was **not** performed, by choice: the only flags remaining are **real users'** (acting on them is forbidden by the Production Law, and this account is an admin so a mis-tap carries a −20 penalty against a real reporter), and the `[SIMTEST]` row had already been deleted. Creating a second test flag purely to re-verify sizing would have added **another ~+15 non-undoable points** to Sky's real account for no new information — the verify/resolve path was already walked end-to-end on the Pro Max.
**What was obtained instead:** the same controls were **measured** at 390pt (above), which is the sizing evidence the small-screen pass exists for. Recorded as a deliberate substitution, not a silent skip.

## STALE-CACHE CHECK (promised follow-up) — CLEAN, not a defect
On arrival the 17e still showed **"14 barriers"** and listed the deleted `[SIMTEST]` flag as Open, because real-time updates are OFF on this account so it had not refetched since the deletion. **Pull-to-refresh cleared it immediately** — flag gone, header back to "OPEN 9". Expected client-cache behaviour; no finding.

## NOT REPEATED ON THIS DEVICE (deliberate)
Dark appearance and Dynamic Type were exercised on the Pro Max (`screens/appearance_type_authed.md`); the 17e pass is the sizing repeat the matrix calls for, not a second full pass.
