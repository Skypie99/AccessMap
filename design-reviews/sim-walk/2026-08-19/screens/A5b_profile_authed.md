# A5b — ProfileScreen (SIGNED IN) · Pro Max 440×956 · light · sim-release @ bc91789

## SESSION VERIFICATION (proof, not Sky's word)
Census shows the **stats surface, not the GuestProfile CTA**: header "Jarvis Mckneil" + "Signed in as skylerhalisky@gmail.com" + POINTS 90 + Sign out / Delete Account. Session confirmed.
Shots: `shots/promax-authed/02_post_signin.png`, `A5b_profile_light.png`. Census: `screens/A5b_profile_census.json`.

## ⚠ ACCOUNT REALITY (governs the whole authed pass)
- Account = **Sky's REAL account** (`skylerhalisky@gmail.com`), NOT the throwaway the prompt anticipated. Real data: **90 points, 6 real reports, Bronze tier, 10 pts from Silver.**
- Account is **ADMIN** (`is_admin = true`) — see the SW-38 caveat block in LEDGER.md.
- **Consequence:** the points trigger is forward-only. Any verify/resolve I fire on my own row adds real points to her real profile and would push 90 → 105, **crossing the Silver threshold and the Engaged badge**, permanently and un-undoably. Write actions therefore ESCALATED to Sky rather than assumed (see close-out §DECISIONS).

## MEASUREMENTS (numeric, 44pt floor)
| Control | Rect w×h | Verdict |
|---|---|---|
| Open navigation menu | 44×44 | ✓ exactly at floor |
| Send feedback | 44×44 | ✓ |
| Add profile photo (avatar) | 72×73 | ✓ |
| **Bronze tier chip ("Tap to see all tiers")** | **87×33** | ✗ **11pt under floor → SW-40** |
| Status tiles (View your N resolved/rejected) | 92×52 | ✓ |
| My Reports / Watched / Recent Activity / Achievements / Leaderboard / Notifications / My Feedback | 392×67–81 | ✓ |
| Save display name | 72×45 | ✓ |
| **Display name TextField** | **286×39** | ✗ 5pt under floor (minor; typed target) → SW-40 note |
| Default-tab segments (Home/Tasks/Profile) | 126×44 | ✓ exactly at floor |
| Real-time updates Switch | 63×29 | native iOS switch — Apple's own metric, tolerated (same judgment as SW-29) |
| Show me the intro again | 392×45 | ✓ |
| Sign out of your account | 100×45 | ✓ |
| Delete Account | 150×45 | ✓ |

## CONTENT / DATA OBSERVED
- Points 90 · Bronze · "10 pts to Silver" · "10 points to Engaged badge"
- Recent point activity (5 rows): 3× "Your report was resolved +15", 2× "Your report was verified +10" (all Jun 2)
- Stat tiles: **6 REPORTED · 0 VERIFIED · 3 RESOLVED**
- Your reports by status: 0 open · 0 verified · **3 resolved · 3 rejected** (= 6 ✓)
- By category: No ramp 6, all others 0. By severity: sev3 = 5, sev4 = 1 (= 6 ✓)
- Streak: "1 day streak — welcome". Nearest unresolved jump target present.
- Achievements "3 of 13 earned". My Reports "6 reports". Tasks tab badge = 9.

## OUTCOMES VERIFIED
- Header/identity, points, tier, progress, activity feed, stats, category+severity breakdowns, all 7 navigation rows, display-name field, default-tab segmented control, real-time switch, onboarding replay, Help/What's New/About, Sign out, Delete Account — **all present and correctly labelled**.
- Internal arithmetic reconciles everywhere EXCEPT the three headline tiles (SW-39).
- Scroll extent: content runs to y≈3062 on a 956pt screen ("Vertical scroll bar, 4 pages") — long but coherently sectioned.

## POSITIVES WORTH KEEPING
- Composite a11y labels are excellent and consistent with the guest surface: "Achievements, 3 of 13 earned", "My Reports, 6 reports", "Bronze tier, 90 of 100 points to Silver", "Your stats: 6 reported, 0 verified, 3 resolved", "Jump to the nearest unresolved flag: …".
- Empty states are worded, not blank: "No open reports", "No verified reports".
- Email shown as identity but the copy elsewhere promises it is never public — consistent with the SignIn privacy line.
- Both progress bars expose proper `progress bar, 90 percent` values to AX.

## ELEMENTS
Found **68** labelled/valued elements · exercised **7 navigation rows + drawer + tab bar** in this and following banks (C9–C12, C14 walked from here).
