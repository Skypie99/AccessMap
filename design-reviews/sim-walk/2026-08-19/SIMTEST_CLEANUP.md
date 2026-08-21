# [SIMTEST] CLEANUP LEDGER

The Production Law: anon writes walked to the EDGE only; nothing persisted to the live Supabase backend. Below = the only created state, all DEVICE-LOCAL (AsyncStorage), none on the backend.

| # | Item | Where stored | Status |
|---|------|--------------|--------|
| 1 | Filter preset **"SIMTEST preset"** | AsyncStorage `filterPresets` (device-local, Pro Max sim only) | **DELETED & VERIFIED GONE** (long-press → Delete → empty-state confirmed). Zero residue. NOT on backend. |

## Backend writes: NONE
- No flag created (ReportFlagModal walked to edge, never submitted).
- No verify/resolve/reject (guest-gated; never fired).
- No comment (guest-gated).
- No feedback sent (edge only).
- No account created.
- The saved preset is client-only (filterPresets AsyncStorage), never touches Supabase.

## Sky one-tap list (if any residue)
- Erase the sim: `xcrun simctl erase 1AFA3DED-3D31-4397-9361-B24C31ADE750` (Pro Max) and `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC` (17e) — wipes all local app state including any preset. Zero backend impact.

---

# SESSION 5 — AUTHED PASS (2026-08-20)

**Account used: Sky's REAL account `skylerhalisky@gmail.com` (ADMIN), not a throwaway.** No `[SIMTEST]` rows were created — all write-class actions were escalated to Sky instead of assumed (see 00_CLOSEOUT_AUTHED.md §DECISIONS). Backend state changes below are limited to reversible preference toggles, all restored and re-verified.

| # | Item | Where stored | Status |
|---|------|--------------|--------|
| 2 | **`push_tokens` row** — push toggle turned OFF (deleted the row) then back ON (re-created it) while walking the G3 deny/accept paths | Supabase `push_tokens` (REAL backend) | **RESTORED & VERIFIED** — switch re-reads `value='1'`, its original state. Net zero. |
| 3 | **Notification preference "Notify on Open"** — toggled '1'→'0' as a control experiment to prove the driver could actuate RN switches, then immediately back to '1' | notification prefs (REAL backend) | **RESTORED & VERIFIED** — re-read `value='1'`. Net zero. |
| 4 | "Recently viewed" list on Profile now shows "Steep grade · Very steep sidewalk" | device-local (AsyncStorage) | **Left in place** — a passive read-history side effect of viewing a flag detail, not a created row. Cleared by `xcrun simctl erase` if Sky wants it gone. |

| 5 | **`[SIMTEST]` FLAG — a REAL row on the live backend** · category **Other** · severity **1 Minor** · description **"[SIMTEST] automated QA row - please ignore, will be deleted"** · coords **49.26090, -123.11390** (Vancouver) · created 2026-08-20 ~17:30 PDT | Supabase `flags` (REAL backend, PUBLIC on the live map) | ✅ **DELETED & VERIFIED GONE.** Flag UUID **`d0246cef-b7cb-4580-ae28-d00e223cd673`** (captured from the console during a crash repro). Deleted in-app via FlagDetail → **Delete this flag** → confirm dialog "Delete this flag?" → Delete. Proof: My Reports went **7 → 6 reports** ("showing 6 of 6"), and the Home barrier count returned to **13 barriers** — its exact pre-test baseline. |

**Created under Sky's explicit authorisation** (she chose "Full walk incl. verify + resolve" knowing the points cost). Exactly ONE row was created — the map total moved 13 → 14 and no further; a second Submit tap was correctly swallowed while the button was disabled.

| 6 | **Comment "SIMTEST automated QA comment"** posted on flag #5 above | Supabase `flag_comments` (REAL backend) | ✅ **REMOVED with its parent flag** (cascade — the flag row is gone, verified above). |

## Backend writes: the [SIMTEST] flag above, plus the two restored preference toggles
- No flag created · no comment posted · no verify/resolve/reject fired · no content reported · no feedback sent · no account changes · no display-name save · no data export shared.
- **No real user's content was acted on at any point.** Every destructive control (Verify / Resolved / Reject / Flag as wrong on other people's flags) was deliberately left untouched; the one tap that came near them was placed at y722, above the Verify row's y739 edge, specifically so a miss could not fire a real verify.
- The deliberate SW-47 crash was induced on a READ path (opening a flag's detail from a second parent) and wrote nothing.

## ⚠ NOT REVERSIBLE — points and tier (Sky authorised this explicitly)
The points trigger is forward-only, so **deleting the flag did NOT return the points**. Sky's real account moved **90 → 124** and **Bronze → Silver**, plus a new badge (Achievements 3/13 → **4/13**, the Engaged badge at 100 points). Exact ledger, all confirmed in RECENT POINT ACTIVITY:
| Award | Points | From |
|---|---|---|
| Reported a barrier | +5 | creating the [SIMTEST] flag |
| Added a photo | +3 | the carried-over photo (see **SW-52**) |
| Added a comment | +1 | the [SIMTEST] comment |
| Your report was verified | +10 | verifying it |
| Your report was resolved | +15 | resolving it |
| **Total** | **+34** | 90 → **124** ✓ |

**I gave Sky wrong information before she chose.** I told her the "create + comment only" option would award **zero** points; the live app actually awards +5 / +3 / +1 for those actions (this is also **SW-53** — CLAUDE.md documents none of them). She chose the full walk regardless, so the outcome is unchanged, but the premise she was given was wrong and the correction belongs on the record.

## Sky one-tap fallback (unchanged)
`xcrun simctl erase 1AFA3DED-3D31-4397-9361-B24C31ADE750` and/or `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC` — wipes device-local app state only. **Note: this also signs the account out; it does not and cannot undo backend rows.**
