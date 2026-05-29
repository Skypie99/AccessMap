# AccessMap E2E Integration Test Plan
**Date:** 2026-05-30  
**Author:** Riley (QA Strategy Lead)  
**Scope:** Full user journey from first launch to verified flag  
**Status:** ACTIVE — Ready for execution pre-launch

---

## Overview

This E2E test plan validates critical user workflows across AccessMap's core feature set. Four distinct journey tests cover the happy path (new user flag reporting), community verification, flag resolution, and profile management. All tests execute on real devices (iOS, Android, web) to catch platform-specific regressions.

**Regression gate:** A 10-minute smoke test (Journey 1, steps 1–8) runs before every release. If it fails, do not ship.

---

## Journey 1: New User Reports First Flag (CRITICAL PATH)

**Duration:** ~8 minutes (manual execution)  
**Devices:** iOS, Android, Web  
**Success Criteria:** New flag appears on map, in Tasks, and awards points

### Test Setup
- Fresh app install (delete and reinstall)
- Empty app state (first launch)
- Device/browser has network access
- Location services permission NOT pre-granted

### Steps

#### Step 1: Fresh Install & First Launch
**Action:**
- Delete app (or clear all data on web)
- Reinstall from TestFlight (iOS/Android) or navigate to web URL
- Tap to open the app

**Expected Behavior:**
- App loads successfully
- First screen is **Onboarding** (sign-up/sign-in prompt) OR **MapScreen** (if guest mode enabled)
- No crashes, no blank screens

**Failure Indicators:**
- White screen / blank map
- JS console error (web)
- App crash
- Onboarding screen does not load

---

#### Step 2: Browse Map Without Signing In
**Action:**
- If guest mode is available, tap "Browse as Guest" or skip onboarding
- Pan/zoom the map (drag, pinch-zoom)
- Look for existing flags on the map

**Expected Behavior:**
- Map loads with base layer (street map)
- Existing flags appear as markers or clusters
- Map is interactive (pan, zoom work smoothly)
- No permission prompts yet

**Failure Indicators:**
- Map tiles don't load (blank/gray)
- Pan is sluggish or unresponsive
- Existing flags not visible
- Premature location permission prompt

---

#### Step 3: Sign Up with New Email
**Action:**
- Tap sign-up button (if not already in onboarding)
- Enter a unique test email (e.g., `test-riley-<timestamp>@example.com`)
- Enter a password
- Tap "Create Account" or "Sign Up"

**Expected Behavior:**
- Form submits successfully
- User is logged in (no redirect to login)
- Onboarding completes or user is taken to MapScreen
- Display name defaults to email or blank (can be edited)

**Failure Indicators:**
- Email validation fails on valid email
- Password error (weak password rejected when it shouldn't be)
- Submission hangs or network timeout
- Authentication fails; user remains on login screen
- No profile created in database

---

#### Step 4: Grant Location Permission
**Action:**
- Tap icon/button to report a flag (e.g., red + button, "Report" button)
- System prompts for location permission
- Tap "Allow" (iOS) or "Allow only while using" (Android)

**Expected Behavior:**
- Permission dialog appears
- After granting, map centers on user location (blue dot)
- User position is visible on map
- No crashes after permission change

**Failure Indicators:**
- Permission dialog doesn't appear
- Permission dialog appears but Allow button is not functional
- Map doesn't center on user after permission grant
- Location stays as (0, 0) or unknown

---

#### Step 5: Find Accessibility Barrier Nearby
**Action:**
- Pan map to find an area with accessible barriers (use test data or fixtures if empty)
- Optionally, pan to a known location with flags (e.g., downtown test city)
- Locate a visual representation of a barrier (flag icon, cluster, heatmap area)

**Expected Behavior:**
- Map shows flags or heat zones
- Tapping a flag opens a detail card or modal
- Flag details include description, category, severity, verification count

**Failure Indicators:**
- No flags visible (if test data exists)
- Tap on flag does nothing
- Flag detail is truncated or missing fields
- Performance lag when loading flag details

---

#### Step 6: Tap Report Button & Fill Form
**Action:**
- Tap "Report" or "New Flag" button
- Fill out the report form:
  - **Description:** Brief text (e.g., "Broken curb ramp at corner")
  - **Category:** Select from dropdown (e.g., "Sidewalk", "Ramp", "Parking")
  - **Severity:** Select radio or dropdown (Low, Medium, High)
  - **Photo:** (Optional) Tap to take or upload a photo
  - Tap "Submit" or "Post"

**Expected Behavior:**
- Form loads and is fully interactive
- All fields accept input
- Photo picker (if tapped) opens camera or gallery
- Form validation works (empty required fields show error)
- Submit button is enabled once form is valid

**Failure Indicators:**
- Form fields are disabled or unresponsive
- Dropdown doesn't open
- Photo picker doesn't launch
- Submit button is always disabled
- Form text is hard to read (accessibility failure)
- EXIF data is visible in submitted photo (privacy leak)

---

#### Step 7: Submit Flag
**Action:**
- Confirm all fields are filled
- Tap "Submit" button

**Expected Behavior:**
- Form submits
- Success toast/notification appears ("Flag reported successfully")
- Modal closes or redirects back to map
- No errors in console or logs

**Failure Indicators:**
- Submit hangs for >3 seconds
- Error toast appears ("Failed to submit")
- Network request fails (check DevTools Network tab on web)
- Form stays open after submission
- Flag is not created in database

---

#### Step 8: Verify Flag Appears on Map
**Action:**
- Wait 2–3 seconds for realtime update
- Pan/zoom to the location where the flag was reported
- Look for the new flag marker

**Expected Behavior:**
- New flag is visible on map at the exact location
- Flag icon matches the category selected
- Tapping the flag shows the description and data you entered
- Verification count is 1 (user's own report)

**Failure Indicators:**
- Flag doesn't appear on map
- Flag appears but location is wrong (>100 meters off)
- Flag metadata is incomplete or incorrect
- Old cached flag data is shown instead of new data
- Realtime sync is delayed (>10 seconds)

---

#### Step 9: Verify Flag in TasksScreen
**Action:**
- Navigate to Tasks tab (bottom navigation or drawer)
- Look for the flag you just reported

**Expected Behavior:**
- TasksScreen loads without errors
- New flag appears in the list
- Flag shows your description, category, severity
- Flag shows "Your Report" or similar label
- List is sorted by recency (newest first)

**Failure Indicators:**
- Tasks tab crashes or is blank
- New flag does not appear in list
- List shows stale data (your flag from a previous test)
- Tap on task in list doesn't navigate to flag detail

---

#### Step 10: Verify Points Awarded in Profile
**Action:**
- Navigate to Profile tab
- Check user's points/score display

**Expected Behavior:**
- Profile loads and displays current user
- Points are displayed (e.g., "15 points")
- Points increased from the report submission (typically +10 for new flag)
- Display name and avatar (if set) are shown

**Failure Indicators:**
- Profile doesn't load
- Points are 0 (points not awarded)
- Points didn't increment from submission
- Display name is blank or showing system ID instead of email

---

## Journey 2: Community Verification Flow

**Duration:** ~6 minutes (manual, requires 2 devices or accounts)  
**Devices:** iOS + Android, or 2 browsers  
**Success Criteria:** Flag status changes to "Verified", both users gain points, notification sent

### Test Setup
- Journey 1 completed (flag exists)
- Two devices/accounts (User A and User B)
- User A: the reporter
- User B: fresh account or separate login

### Steps

#### Step 1: User A Reports a Flag
**Action:** (If not already done from Journey 1)
- Follow Journey 1, steps 1–8
- Note the flag location

**Expected Behavior:**
- Flag appears on map
- Flag status is "Unverified" or similar

---

#### Step 2: User B Signs In on Different Device
**Action:**
- On Device B, sign up or log in with a different email
- Grant location permission
- Navigate to the map

**Expected Behavior:**
- User B is authenticated and logged in
- Map loads and shows User B's location
- Map shows flags from all users (including User A's new flag)

**Failure Indicators:**
- User B can't authenticate
- Map doesn't show User A's flag

---

#### Step 3: User B Finds the Flag on Map
**Action:**
- Pan/zoom to the location where User A reported the flag
- Tap the flag marker to open details

**Expected Behavior:**
- Flag detail card opens
- Shows User A's description, category, severity
- Shows current verification count (should be 1 or "Unverified")
- "Verify" button is visible and enabled

**Failure Indicators:**
- Flag isn't visible on User B's map
- Tap doesn't open detail card
- Verify button is missing or disabled

---

#### Step 4: User B Taps "Verify"
**Action:**
- In the flag detail card, tap "Verify" button
- Confirm action if prompted (e.g., "Are you sure?")

**Expected Behavior:**
- Verify action submits
- Success message appears
- Flag detail card updates (verification count increments)
- Button may change to "Verified" or become disabled

**Failure Indicators:**
- Verify button click does nothing
- Error message appears
- Network request fails
- Verification count doesn't increment

---

#### Step 5: Points Awarded to Both Users
**Action:**
- User B: Check Profile tab for points increase
- User A (Device A): Refresh profile or check realtime update

**Expected Behavior:**
- User B's points increase (typically +5 for verification)
- User A sees points increase (typically +3 for being verified)
- Changes appear within 3 seconds (realtime sync)

**Failure Indicators:**
- Points don't increase
- Only one user receives points
- Points increase is delayed >10 seconds
- Profile doesn't reflect the change

---

#### Step 6: Flag Status Changes to "Verified"
**Action:**
- Both User A and User B check the flag detail on their maps
- Look at the flag status/verification badge

**Expected Behavior:**
- Flag now shows "Verified" or "2 verifications"
- Status icon changes (e.g., badge color, checkmark)
- Both users see the same updated status

**Failure Indicators:**
- Status stays "Unverified"
- Only one device shows the change
- Status update takes >10 seconds

---

#### Step 7: User A Receives Push Notification (Optional)
**Action:**
- Check User A's device for push notification
- Notification should say something like "User B verified your flag"

**Expected Behavior:**
- Notification appears (if push notifications are enabled)
- Tapping notification navigates to the flag on map
- Notification disappears after reading

**Failure Indicators:**
- No notification appears
- Notification content is missing or generic
- Tapping notification doesn't navigate to flag

---

## Journey 3: Flag Resolution

**Duration:** ~4 minutes  
**Devices:** iOS, Android, or Web  
**Success Criteria:** Status updates to "Resolved", heatmap recalculates, realtime sync works

### Test Setup
- A verified flag exists (from Journey 2)
- User who reported or verified the flag is logged in
- Flag is on the map and visible

### Steps

#### Step 1: Start from Verified Flag
**Action:**
- Navigate to the map
- Find and tap the verified flag (from Journey 2)
- Open the flag detail card

**Expected Behavior:**
- Flag detail loads
- Status shows "Verified" or "2 verifications"
- Action buttons are visible (e.g., "Mark Resolved", "Edit", "Delete")

**Failure Indicators:**
- Flag detail doesn't open
- Status doesn't show verified count
- Action buttons are missing

---

#### Step 2: User Marks Flag as Resolved
**Action:**
- Tap "Mark Resolved" or "Resolved" button in flag detail
- Confirm action if prompted

**Expected Behavior:**
- Request submits
- Success message appears
- Flag detail updates to show "Resolved" status
- Card may close automatically

**Failure Indicators:**
- Button click does nothing
- Error message appears
- Status doesn't change to "Resolved"

---

#### Step 3: Verify Status Updates on Other Connected Clients
**Action:**
- On Device B or in a different browser tab/window, navigate to the same flag location
- Check the flag marker and detail card

**Expected Behavior:**
- Flag status updates to "Resolved" within 2–3 seconds
- Flag appearance may change (e.g., strikethrough, dimmed, different icon)
- Verification buttons are now disabled
- All clients show the same resolved status

**Failure Indicators:**
- Device B doesn't see the status change
- Status change is delayed >10 seconds
- Devices show different statuses

---

#### Step 4: Verify Heatmap Updates
**Action:**
- Open heatmap view (if available)
- Zoom to the flag's location
- Observe heatmap color/intensity

**Expected Behavior:**
- Heatmap recalculates in realtime
- Intensity at the resolved flag's location decreases or disappears
- Other nearby unresolved flags still contribute to heatmap

**Failure Indicators:**
- Heatmap doesn't update
- Resolved flag still shows in heatmap as fully active
- Heatmap update is delayed >5 seconds
- Heatmap view crashes

---

## Journey 4: Edit Profile + Dark Mode

**Duration:** ~5 minutes  
**Devices:** iOS, Android, Web  
**Success Criteria:** Profile changes persist, dark mode is readable, EXIF is stripped

### Test Setup
- User is signed in
- Default light mode is active
- Profile has default values

### Steps

#### Step 1: Sign In to Profile
**Action:**
- Navigate to Profile tab/screen
- Confirm user is authenticated

**Expected Behavior:**
- Profile loads with user's email/display name
- Edit button or pencil icon is visible
- Current points and verification count are displayed

**Failure Indicators:**
- Profile is blank
- Not authenticated (redirect to login)
- No edit button visible

---

#### Step 2: Edit Display Name
**Action:**
- Tap "Edit Profile" button
- Edit display name field
- Enter a new name (e.g., "Riley Accessibility Tester")
- Tap "Save"

**Expected Behavior:**
- Edit form appears (text input, photo upload, etc.)
- Display name field is editable
- Saves successfully
- Display name updates on profile immediately

**Failure Indicators:**
- Form doesn't open
- Field is read-only
- Save fails with error
- Display name reverts to old value

---

#### Step 3: Upload Avatar Photo
**Action:**
- In edit profile form, tap photo upload field
- Take a photo (or select from gallery)
- Confirm upload

**Expected Behavior:**
- Photo picker opens
- Photo is selected and uploaded
- Avatar appears in profile with thumbnail
- No upload errors

**Failure Indicators:**
- Photo picker doesn't open
- Upload hangs
- Avatar doesn't appear
- Photo upload fails

---

#### Step 4: Verify EXIF is Stripped
**Action:**
- Use a tool or check the uploaded photo's metadata
- Inspect EXIF data (if possible via DevTools or photo library)

**Expected Behavior:**
- Photo EXIF data is empty or minimal
- GPS coordinates are NOT present
- Camera model, timestamp, and other identifying data are removed
- Photo is re-encoded without metadata

**Failure Indicators:**
- EXIF data contains GPS coordinates
- Camera identify data is present
- Timestamp metadata is intact
- Photo metadata includes user location

---

#### Step 5: Toggle Dark Mode
**Action:**
- On web: Open settings/preferences, toggle dark mode
- On iOS/Android: Open system settings or app settings, enable dark mode / dark appearance
- Return to app and navigate through screens

**Expected Behavior:**
- Dark mode activates
- All text is readable (sufficient contrast)
- Colors are inverted/adjusted appropriately
- No elements are hidden or become unreadable
- Dark mode persists after app restart

**Failure Indicators:**
- Dark mode toggle doesn't work
- Text becomes unreadable (low contrast)
- UI elements disappear or are misaligned
- Colors are wrong or harsh
- Dark mode resets on restart

---

#### Step 6: Verify All Screens Readable in Dark Mode
**Action:**
- Navigate through all screens:
  - MapScreen
  - TasksScreen
  - LeaderboardScreen (if available)
  - SettingsScreen
  - ProfileScreen
  - Flag detail cards
  - Modals and forms

**Expected Behavior:**
- All text has sufficient contrast (WCAG AA: 4.5:1 for normal text)
- Icons are visible and not inverted incorrectly
- Buttons are clearly defined
- Form inputs are distinguishable
- No layout shifts or broken UI

**Failure Indicators:**
- Any text is illegible
- Icons are missing or corrupted
- Buttons have no visible state (unpressed, pressed, disabled)
- Form inputs are not visible
- Modals have dark text on dark background

---

#### Step 7: Sign Out
**Action:**
- Open settings or profile
- Tap "Sign Out" or "Logout"

**Expected Behavior:**
- User is logged out
- Redirected to login/onboarding screen
- All user data is cleared from local storage (if checking DevTools)

**Failure Indicators:**
- Sign out button doesn't work
- User is still logged in after logout
- Sensitive data remains in local storage

---

#### Step 8: Sign Back In & Verify Changes Persisted
**Action:**
- Sign in with the same email/password
- Navigate to Profile

**Expected Behavior:**
- User is logged in
- Display name shows the new value (not default)
- Avatar shows the uploaded photo
- Points and verification count are correct
- All changes from edit session persisted

**Failure Indicators:**
- Display name reverted to default
- Avatar is missing or shows default
- Points/verification count changed unexpectedly
- Any profile changes were lost

---

## Cross-Platform Test Matrix

### Test Execution Format

For each journey, execute on **all three platforms**:

| Platform | Device | Browser/App | Notes |
|----------|--------|------------|-------|
| iOS | iPhone 14+ | TestFlight build | Use latest iOS version |
| Android | Pixel 6+ | Google Play (beta) | Use Android 12+ |
| Web | Desktop | Chrome / Safari | Latest stable version |

### Platform-Specific Notes

**iOS:**
- Test on both iPhone and iPad if possible
- Check safe area insets (notch, home indicator)
- Verify location permission logic (Always, While Using, Never)
- Check photo permissions and camera access

**Android:**
- Test on at least 2 screen sizes (phone + tablet if possible)
- Verify Android 12+ permissions (Nearby WiFi, Bluetooth)
- Check back button behavior
- Test keyboard dismissal

**Web:**
- Test on desktop and mobile viewports
- Check responsive design (320px to 1920px widths)
- Verify geolocation API usage (HTTPS required)
- Test in private/incognito mode
- Clear cookies and local storage between tests

### Failure Aggregation

If a journey fails on one platform, document:
1. **Platform:** iOS / Android / Web
2. **Step:** Which step failed
3. **Error:** What went wrong
4. **Severity:** Blocker / Major / Minor
5. **Reproduction:** Steps to reproduce the issue

---

## Regression Gate (Pre-Release Smoke Test)

**Duration:** 10 minutes  
**Frequency:** Before every release to TestFlight, Google Play, or production  
**Owner:** Release engineer (Rory) or QA lead (Riley)  
**Platform:** Real device (iOS preferred; Android as backup)

### Condensed Test Steps

1. **Fresh install → first launch** (Step 1)
2. **Browse map without sign-in** (Step 2)
3. **Sign up with new email** (Step 3)
4. **Grant location permission** (Step 4)
5. **Tap report button, fill form** (Step 6)
6. **Submit flag** (Step 7)
7. **Verify flag on map** (Step 8)
8. **Verify flag in Tasks tab** (Step 9)

### Pass/Fail Criteria

**PASS:** All 8 steps complete without errors, flag appears on map within 5 seconds of submission.

**FAIL:** Any step hangs, crashes, or produces an error. Do NOT ship.

### Failure Escalation

If the smoke test fails:
1. Log the error with step number and screenshot
2. Report to Morgan (project manager)
3. Assign blocker ticket to relevant role (Shamus, Gary, etc.)
4. Do not proceed with release until fixed and re-tested

---

## Test Data & Fixtures

### Required Test Data
- At least 5 pre-seeded flags at known locations (for Journey 2–3)
- Test user accounts (User A, User B, additional users for stress tests)
- Known categories and severity levels
- Heatmap test area with high flag density

### Test Accounts

| Account | Email | Password | Purpose |
|---------|-------|----------|---------|
| Tester A | `test-riley-a@example.com` | (secure) | Reporter, verifier |
| Tester B | `test-riley-b@example.com` | (secure) | Verifier, commenter |
| Admin | (internal) | (secure) | Reset data, seed flags |

### Reset Procedure

Before each test cycle:
1. Delete test user accounts or clear their data
2. Seed fresh test flags at known locations
3. Clear local app cache (cookies, localStorage)
4. Confirm app version matches release build

---

## Device & Environment Checklist

### Pre-Test Checklist

- [ ] Device has >50% battery
- [ ] Network is stable (WiFi 5GHz or LTE/5G)
- [ ] Device location services are enabled
- [ ] Camera/gallery permissions are granted
- [ ] Push notifications are enabled (for Journey 2)
- [ ] Bluetooth is disabled (to avoid background interference)
- [ ] Latest app version is installed
- [ ] Test account is ready (email, password)
- [ ] No other apps are using location in background

### Test Environment

- **API:** Production (or staging, clearly labeled)
- **Database:** Test project with seed data
- **Realtime:** Supabase Realtime enabled
- **Push:** Expo Notifications active (iOS/Android)
- **File Storage:** Supabase Storage ready for photo uploads

---

## Known Limitations & Excluded Scenarios

### Out of Scope (Documented for Future)

1. **Offline sync:** Network disconnection and reconnection are not tested in this plan (separate offline test plan)
2. **Stress testing:** High flag density, 1000+ concurrent users not tested
3. **Localization:** Only English is tested (other languages tested separately)
4. **Accessibility (detailed):** Basic accessibility is checked (contrast, touch targets); full WCAG audit is separate (Alex's audit)
5. **Performance profiling:** Load time, frame rate profiling are separate (Peter's performance plan)
6. **Crash analytics:** Error reporting is not validated here (Steve's security plan)

### Environmental Assumptions

- Network latency <100ms
- No firewall blocking Supabase API
- No VPN or proxy interfering with geolocation
- iOS and Android SDKs are current

---

## Reporting & Log Collection

### Log Collection (On Failure)

1. **Device logs:**
   - iOS: Xcode console or TestFlight diagnostics
   - Android: Android Studio logcat
   - Web: Browser DevTools (Console, Network, Storage tabs)

2. **App logs:**
   - Check in-app error toasts
   - Look for stack traces in console

3. **Network logs (Web):**
   - Export HAR file from Network tab
   - Check API response status codes

4. **Database:**
   - Query `flags` table to confirm flag creation
   - Check `verifications` table for verification records
   - Inspect `user_profiles` for display name / avatar updates

### Report Template

```markdown
## Journey X, Step Y Failure

**Platform:** [iOS / Android / Web]  
**Build:** [Version / Date]  
**Severity:** [Blocker / Major / Minor]  

**What Happened:**
[Description of failure]

**Expected Behavior:**
[What should have happened]

**Steps to Reproduce:**
1. ...
2. ...

**Logs / Screenshots:**
[Attach console output, screenshots, HAR files]

**Notes:**
[Anything else relevant]
```

---

## Execution Schedule & Ownership

### Pre-Launch Testing (Current)

- **Journey 1 (Critical Path):** Riley, this week, all 3 platforms
- **Journey 2 (Community):** Riley, with test user, all 3 platforms
- **Journey 3 (Resolution):** Riley, all 3 platforms
- **Journey 4 (Profile + Dark Mode):** Riley + Alex (a11y spot-check), all 3 platforms
- **Regression Smoke Test:** Daily before release (Rory owns execution)

### Post-Launch Testing (Ongoing)

- **Regression gate:** Every release (all platforms)
- **Community testing:** Real users (feedback loop via app)
- **Performance monitoring:** Server logs and Sentry (Steve, Jordan)

---

## Pass/Fail Summary

### Journey 1: PASS if
- All 10 steps complete without error
- Flag appears on map within 3 seconds
- Flag appears in Tasks with correct data
- Points are awarded to reporter

### Journey 2: PASS if
- Verification flow works (User B → User A)
- Flag status changes to "Verified" on both devices
- Points awarded to both users within 3 seconds
- Push notification sent (if enabled)

### Journey 3: PASS if
- Flag status changes to "Resolved"
- Realtime update on all clients within 3 seconds
- Heatmap updates to exclude resolved flag
- No errors in resolution flow

### Journey 4: PASS if
- Display name persists after sign-out/in
- Avatar uploaded and saved
- EXIF data is stripped from photo
- Dark mode is readable on all screens
- Profile data survives app restart

### Regression Gate: PASS if
- Steps 1–8 (Journey 1 condensed) complete in <10 minutes
- No crashes or hangs
- Flag visible on map within 5 seconds

---

## Next Steps

1. **This week (2026-05-30):** Riley executes Journey 1 on iOS + Android + Web
2. **2026-05-31:** Riley executes Journeys 2–4 with cross-platform validation
3. **2026-06-01:** Smoke test the regression gate; prep for launch
4. **2026-06-02:** Final go/no-go decision before release
5. **Post-launch:** Monitor production logs and user feedback; update test plan as needed

---

**End of Test Plan**
