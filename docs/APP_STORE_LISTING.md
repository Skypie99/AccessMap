# AccessMap — App Store + Play Store Listing Copy

> ⚠️ **SUPERSEDED 2026-08-17. The app ships as Flagstone, and every name below is the old one.** Do not paste from this file into App Store Connect. The current sheet is `design-reviews/name-forge/2026-08-17_rename/05_store_metadata_flagstone.md`. This file is left unedited as the v0.2.0 record.

**Version:** v0.2.0  
**Status:** Ready for submission  
**Last updated:** 2026-05-30

---

## App Name
AccessMap

---

## Subtitle (iOS, 30 chars max)
Community Accessibility Map

---

## Short Description (Google Play, 80 chars max)
Map and share accessibility barriers in your community.

---

## Full Description (both stores, ~500 words)

**AccessMap — Find and fix accessibility barriers, together.**

AccessMap is a community-powered map that helps you find accessible routes, entrances, and facilities — and report barriers that make your neighbourhood harder to navigate.

**Report what you find**
Spotted a broken elevator, a missing curb cut, or a door that's too heavy to open? Add a flag in seconds. Take a photo, write a quick description, and tap submit. Your report helps everyone in your community get around more easily.

**See what others have found**
Browse a live map of accessibility flags near you. Filter by category — ramps, elevators, parking, washrooms, entrances, and more. Each flag shows the current status: open, in progress, or resolved. Watch barriers get fixed in real time.

**Heatmap view**
Toggle the density heatmap to see which neighbourhoods have the most reported accessibility barriers at a glance. Areas with no reports may not have been surveyed yet — you can be the first.

**Track progress in your community**
Get notified when flags you reported are resolved. See your reports make an impact and help shape a more accessible neighbourhood.

**Works everywhere**
Available on iPhone, Android, and web. Your reports sync instantly across all your devices. Start a flag on mobile, complete it on the web — seamless.

**Privacy first**
Your location is only used to place flags on the map. We never sell your data. Photos are automatically stripped of GPS metadata before upload. You control what you share.

**For everyone**
Whether you use a wheelchair, travel with a stroller, have low vision, are recovering from an injury, or just want your neighbourhood to be more welcoming — AccessMap is for you. Accessibility benefits everyone.

**Built by accessibility advocates**
Designed with input from people with disabilities. Made to be easy to use, fast, and reliable. No ads. No paywalls. Open source.

---

## Keywords (iOS, comma-separated, 100 chars max)
accessibility,map,wheelchair,ramp,elevator,community,disability,navigation,barrier,inclusive

---

## Categories
**Primary:** Navigation  
**Secondary:** Utilities

---

## Age Rating
4+ (no objectionable content)

---

## Support & Privacy URLs
- **Privacy Policy URL:** [Sky fills in — typically `https://accessmap.app/privacy`]
- **Support/Contact URL:** [Sky fills in — typically `https://github.com/skypie99/AccessMap/issues`]

---

## Screenshots (iOS 6.7" iPhone, 6 required)

| # | Screen | Caption |
|---|---|---|
| 1 | Map view with flag clusters | See accessibility flags clustered on the map |
| 2 | Flag detail + status history | View flag description, photos, and resolution progress |
| 3 | Report flow (new flag) | Report a barrier in three taps: location, photo, description |
| 4 | Tasks list (area summary) | Browse all flags and updates near you |
| 5 | Heatmap density view | Discover accessibility gaps in your neighbourhood |
| 6 | Profile screen (stats + achievements) | Track your contributions and impact |

**Suggested alt text for accessibility:**
- Screen 1: "Map showing red, yellow, and green flag pins clustered in a urban area"
- Screen 2: "Flag detail card with photo of broken ramp, description, and status history timeline"
- Screen 3: "Report form with location map, photo upload button, and text description field"
- Screen 4: "List of nearby accessibility flags with status badges and distance"
- Screen 5: "Map in heatmap mode showing colour gradient from red (many barriers) to green (few barriers)"
- Screen 6: "User profile showing 24 flags reported, 8 verified, achievement badges earned"

---

## App Preview Video (30 seconds, optional but recommended)

**Script:**
1. Cold open on map (2s) — "Find accessibility barriers in seconds"
2. Tap a flag, shows detail + photo (3s) — "See reports from your community"
3. Heatmap toggle (2s) — "Spot accessibility gaps at a glance"
4. Swipe to report flow, take photo, submit (4s) — "Report a barrier in three taps"
5. Flag appears on map, zoomed to it (2s) — "Your report helps everyone"
6. Profile screen, points + achievements (2s) — "Track your impact"
7. End frame with app icon + "AccessMap — Find and fix barriers, together" (1s)

---

## What's New (v0.2.0 release notes for store)

**v0.2.0** — Heatmap, live updates, performance

• **Heatmap view** — See accessibility barrier density at a glance. Filter hotspots by category.  
• **Live status updates** — Flags update in real time as reports are verified and resolved.  
• **Push notifications** (iOS) — Get alerted when flags you reported are updated.  
• **Faster map loading** — Tile caching reduces data use and speeds up navigation.  
• **Dark mode improvements** — Better contrast and usability in low-light conditions.  
• **Offline access** — Flag list and map tiles cached for 24 hours — browse without data.  

---

## Submission Checklist

- [ ] Sky reviews listing copy and approves tone
- [ ] Sky adds privacy policy URL
- [ ] Sky adds support contact URL (GitHub issues or email)
- [ ] Rory generates 6 screenshots at required resolution (iOS 6.7" or 5.5" — check App Store specs)
- [ ] Rory generates 30-second preview video (or confirm submission without video)
- [ ] Sky uploads listing to App Store Connect and Google Play Console
- [ ] Both stores: enable testing (internal testing track) before public release
- [ ] Rory confirms EAS build artifacts ready for submission

---

## Notes for Sky

1. **Tone:** Inclusive, accessibility-forward, community-focused. Avoids jargon but explains impact clearly.

2. **Keywords:** All accessibility + map-related terms; tested for Play Store + App Store search prominence.

3. **Screenshots:** Ensure alt text is included in both stores for compliance with WCAG 2.1 AA.

4. **Privacy & Support:** Leave blank for now; Sky fills in before submission.

5. **Compatibility:** Confirm minimum OS versions before submission:
   - iOS: 15.1+ (from app.json)
   - Android: 21+ (from app.json)

6. **Store links (once live):**
   - iOS App Store: `https://apps.apple.com/app/accessmap/[ID]` (Sky will have this after submission)
   - Google Play: `https://play.google.com/store/apps/details?id=app.accessmap` (from app.json slug)
