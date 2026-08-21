# Cross-appearance + Dynamic Type pass — AUTHED surfaces · Pro Max · sim-release @ bc91789

## DARK (OS appearance dark) — PASS, no contrast failures found
- **A5b Profile (signed in):** all nav rows, DISPLAY NAME field, DEFAULT LANDING TAB segmented control, REAL-TIME UPDATES switch, ONBOARDING row and tab bar render coherently. Disabled "Save" reads as legibly dim (correct, it is disabled). `shots/promax-authed/A5b_profile_DARK.png`
- **C14 Leaderboard:** sheet, period toggle, trophy icon and the monthly empty-state copy all legible on dark. `shots/promax-authed/C14_leaderboard_DARK.png`
- Confirms Phase A's result (the dark STATUS_COLORS bug is fixed) now extends to the authed-only surfaces.
- **SW-45 reproduces in dark** — the leaderboard sheet still overlaps the ghosted tab bar.

## DYNAMIC TYPE (accessibility-extra-large) — PASS with one wrap defect
- Profile nav rows grow correctly: My Reports 67→**185pt**, Watched Flags 81→**266pt**, Achievements→**145pt**, See leaderboard→**186pt**; buttons 44→**51pt**. No clipping, no overlap, no lost controls.
- C14 Leaderboard sheet reflows and grows; the empty-state sentence stays fully legible across four lines.
- **Defect: mid-word wrapping on the Profile breakdown lists → SW-51** (extends SW-36).
- Content size restored to `medium` after the pass.

## NOT COVERED
True VoiceOver reading order and rotor behaviour remain **DEVICE-ONLY** — the AX tree is a proxy, not a screen reader.
