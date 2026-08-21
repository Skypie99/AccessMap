# G3 — Push notification permission flow (SIGNED IN) · Pro Max · sim-release @ bc91789

## WHAT WAS WALKED
- **SW-20 re-test:** signed in, the Settings push switch reports `enabled=1` (guest had `enabled='0'`). SW-20's guest gating is **resolved by auth**; the guest-side "disabled with no dimming or explainer" defect itself is unchanged and still stands for signed-out users.
- Initial state: switch **ON** (`value='1'`) — code comment confirms the state mirrors `push_tokens` row presence, so Sky's real account already had a row.
- **In-app priming Alert** (fires before any OS prompt): title "Push notifications", body *"Get notified when your flag is verified or resolved. You can turn this off anytime in Settings."*, buttons **Not now** (140×48 ✓) and **Enable** (140×48 ✓). Alert rect 320×192.
- **DENY path walked:** tap Not now → alert dismisses, switch correctly stays **OFF**. Matches the code's stated intent ("If they tapped 'Not now' or permission was denied, the toggle stays off").
- **ACCEPT path walked:** tap Enable → switch returns to **ON**. Round-trip complete.

## ⚠ COVERAGE GAP — the OS-level dialog was NOT reached, and cannot be from here
Tapping Enable went straight to ON **without any OS permission dialog**, because notification authorization was already determined during Phase A's onboarding (`shots/promax/A1_onboarding_4_notifs.png`). To make iOS ask again the authorization must be undetermined, and **`simctl privacy` has no `notifications` service** (its services are calendar/contacts/location/photos/media-library/microphone/motion/reminders/siri) — the only resets are uninstalling the app or erasing the device, both of which would destroy Sky's signed-in session mid-walk. **So "walk both accept and deny of the OS dialog" is banked as UNREACHABLE in this session** — it needs a fresh install, and belongs with the DEVICE-ONLY remainder alongside actual push delivery.

## STATE CHANGE CAUSED + RESTORED (see SIMTEST_CLEANUP.md)
Turning the switch OFF deleted the real `push_tokens` row for her account; turning it back ON re-created it. **Net zero, verified back at `value='1'`.** Also toggled "Notify on Open" '1'→'0'→'1' as the control experiment — **restored and verified**.

## FINDING RAISED
SW-49 (intermittent unresponsiveness after mount).
