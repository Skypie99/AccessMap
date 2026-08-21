# C9 / C10 / C11 / C12 — Profile modal family (SIGNED IN) · Pro Max 440×956 · light · sim-release @ bc91789

## ★ THE HEADLINE MEASUREMENT — sheet card geometry (screen height 956pt, cap `maxHeight:'85%'` = 813pt)
| Node | Modal | Card y | Card h | % of screen | Gap below card | KeyboardAvoidingView? | Content clipped? |
|---|---|---|---|---|---|---|---|
| C9 | AchievementsModal | 143 | **692** | 72.4% | 121 | **NO** | no (scrolls, 2 pages) |
| C10 | ActivityFeedModal | 143 | **692** | 72.4% | 121 | **NO** | no (scrolls, 9 pages) |
| C11 | MyReportsModal | 265 | **500** | **52.3%** | **191** | **YES** (`behavior="padding"`, no offset) | list viewport only **198pt** → ~1.5 of 6 cards |
| C12 | MyWatchedModal | 470 | **352** | **36.8%** | **134** | **YES** (`behavior="padding"`, no offset) | **empty-state instruction 100% invisible** |

The two KAV-free modals land on an identical, consistent baseline (692 / 121). The two KAV modals collapse far below it. Measured with `tools/sheetgeom.py`; C11 re-verified at +6s and C12 at +7.5s, so neither is an un-settled animation.

## C9 — AchievementsModal ✓ STRONG
- "3 of 13 achievements earned", sectioned **REPORTING · RESOLUTION · POINTS**, 9 badges visible, scrollable (2 pages).
- **Earned vs locked is correctly distinguished in the accessible name**, not by colour alone: "First Steps, Report your first flag. **Earned.**" vs "Active Reporter, Report 10 flags. **Progress: 6 of 10.**" — this is exemplary and should survive Phase B untouched.
- Badge rows 400×71 ✓. Close 44×45 ✓. Progress values corroborate SW-41: Engaged = 100 pts and Silver = 100 pts genuinely coincide at this tier ("Engaged, Earn 100 points. Progress: 90 of 100").
- Elements found 16 in-sheet / exercised: open, full census, scroll extent, close.

## C10 — ActivityFeedModal ✓ GOOD
- Real community activity, **grouped by day** with counts ("YESTERDAY · 1 flag", "TUESDAY · 12 flags"), filter chips **All / Mine / Watched**, per-row "Show <category> on the map" (44×45 ✓), relative timestamps ("1d ago"), 9 pages of content.
- Row **title** buttons measure **320×29** — under the 44pt floor (see SW-43).
- Elements found 24 in-sheet / exercised: open, filters present, census, scroll, close.

## C11 — MyReportsModal (Sky's 6 real reports)
- All 6 present and correct: **3 Rejected + 3 Resolved**, reconciling exactly with the Profile "by status" row.
- Adaptive filter chips — only statuses that exist are offered: **All (6) · Resolved (3) · Rejected (3)**; no empty Open/Verified chips. Good.
- Search field 348×45 ✓; sort Newest/Oldest/Severity 71/66/76×45 ✓; map jump 44×45 ✓; Refresh + Close 44×45 ✓.
- Row **title** buttons **318×21** — under floor (SW-43).
- **List viewport 400×198** inside a 500pt card → only ~1.5 of 6 cards visible; the 2nd card is sliced mid-row. List DOES scroll (verified: rows translated 113pt on swipe), so all 6 are reachable — degraded, not blocked.
- Data note: 5 of 6 reports read "No description." dated May 30–31 2026 — consistent with the known junk-prod-data cleanup (store-dossier MUST-1), not a new defect.

## C12 — MyWatchedModal
- Empty state, correctly worded: star icon + "No watched flags yet" + "Open any flag on the map or in Tasks and tap Watch to track it."
- **The heading is sliced horizontally and the instruction line is entirely invisible** — present in the AX tree at y836 but the card ends at y822 with `overflow:'hidden'`. A user with zero watched flags cannot read how to watch one. This is the worst instance of the geometry defect.
- Filter chips All/Open/Verified/Resolved and sort Status/Newest/Oldest/Severity all present; "Show all statuses" measures **41×45** (3pt narrow).
- Elements found 18 in-sheet / exercised: open, census, geometry ×2 settles, close.

## POSITIVES WORTH KEEPING (family-wide)
- Every sheet has a real title element + a uniquely-labelled close ("Close My Reports", "Close watched flags", "Close recent activity", "Close achievements") — sheet detection was unambiguous throughout, which is exactly what the Phase A method notes asked for.
- `accessibilityViewIsModal` + `onAccessibilityEscape` are wired on the GlassSurface in both KAV modals (code-verified) — VoiceOver containment is deliberate.
- Empty and populated states are both authored; no blank screens anywhere in the family.
