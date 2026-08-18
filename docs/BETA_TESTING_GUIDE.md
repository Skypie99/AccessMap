# Flagstone Beta Testing Guide

How to invite testers and collect feedback before public launch.

---

## iOS Beta Testing (TestFlight)

### One-time setup (Sky does this once)

1. **Create an App Store Connect account**
   - Go to https://appstoreconnect.apple.com
   - Sign in with your Apple ID
   - Accept the developer agreements

2. **Create the Flagstone app record**
   - My Apps → + button → New App
   - Platform: iOS
   - Name: Flagstone
   - Bundle ID: `com.accessmap.app` (matches app.json)
   - SKU: accessmap-v1
   - Click Create

3. **Upload your first build via EAS**
   ```bash
   eas build --platform ios --profile preview
   eas submit --platform ios --profile preview
   ```
   Build goes to TestFlight automatically.

### Inviting testers

**Internal testers (up to 25 people, no review required):**
1. App Store Connect → TestFlight → Internal Testing
2. Add testers by email (they need to accept the TestFlight invite)
3. Fast! Available within minutes of upload

**External testers (up to 10,000 people, needs Apple review ~1-2 days):**
1. App Store Connect → TestFlight → External Testing
2. Create a group name (e.g., "Community Beta")
3. Add tester emails or share the public link
4. Submit for Beta App Review
5. Once approved, testers download from TestFlight app

### Collecting feedback

TestFlight has a built-in screenshot + feedback tool — testers just tap the device, annotate, and submit. You'll see all feedback in App Store Connect → TestFlight → Feedback.

---

## Android Beta Testing (Google Play)

### One-time setup

1. **Create a Google Play Developer account**
   - Go to https://play.google.com/console
   - Pay one-time $25 developer fee
   - Fill in developer profile

2. **Create Flagstone app**
   - All apps → Create app
   - App name: Flagstone
   - Default language: English
   - Free app
   - Complete the store listing using basic app info (name, description, screenshots)

3. **Upload via EAS**
   ```bash
   eas build --platform android --profile preview
   eas submit --platform android --profile preview
   ```

### Inviting testers

**Internal testing (up to 100 testers, immediate):**
- Release → Internal testing → Create new release
- Upload the AAB from EAS
- Add testers by Gmail address
- Available within minutes

**Closed testing (up to 2,000 testers):**
- Release → Closed testing → Create a track
- Add a group name and testers
- Requires brief Google review (usually same day)

---

## Beta Feedback Template

Send this to testers to structure their feedback:

```
Flagstone Beta Feedback

1. Device: [iPhone 15 / Pixel 8 / etc.]
2. OS version: [iOS 18 / Android 14]
3. What you tested: [flag reporting / map browsing / etc.]
4. Bugs found: [describe with steps to reproduce]
5. Confusing moments: [describe what was unclear]
6. What worked well: [describe positive experience]

Send to: skylerhalisky@gmail.com
Or use the in-app feedback button
```

---

## Beta Checklist (run before inviting each new batch)

- [ ] Latest build is uploaded to TestFlight/Play
- [ ] Smoke test passed on real device (map loads, location works, flag reporting flow)
- [ ] Pre-launch blockers all resolved
- [ ] Tester instructions email drafted
- [ ] Feedback channel (email) ready to monitor
- [ ] All tester emails added to the platform

---

## Timeline Recommendation

| Week | Action | Platform | Tester Count |
|---|---|---|---|
| Week 1 | Internal testers (team + close friends) | iOS + Android | 10-15 per platform |
| Week 2 | Fix critical bugs from Week 1 | — | — |
| Week 3 | External/closed beta (wider group) | iOS + Android | 50-200 per platform |
| Week 4 | Fix reported issues | — | — |
| Week 5 | Public launch 🚀 | iOS + Android | Global |

---

## Troubleshooting

**Tester didn't receive TestFlight invite**
- Check their Apple ID is correct (must be valid iCloud/Apple account)
- Resend the invite from App Store Connect
- They may need to enable email notifications in their Apple ID settings

**Build stuck in processing on Google Play**
- Allow up to 24 hours for initial app review
- Check Release notes are filled in
- Verify all store listing fields are complete

**EAS submit failed**
- Run `eas build --platform ios --profile preview` first if no build exists
- Check you have an EAS account linked (`eas whoami`)
- Verify bundle ID matches app.json exactly

---

## What's next

- **Week 1 feedback cycle:** Monitor email/TestFlight feedback daily
- **Bug prioritization:** Use PROJECT_STATE.md to track issues
- **Release notes:** Document changes for each build in RELEASE_RUNBOOK.md
