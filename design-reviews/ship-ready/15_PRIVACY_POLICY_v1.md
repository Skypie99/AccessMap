# AccessMap Privacy Policy v1.0 (DRAFT for Sky's ratification, 2026-07-29)

Drafted by Claude with Sky. Requires Sky's ratification before it ships. Plain-language, not legal advice.

**★ VERIFY-BEFORE-SHIP:** every factual claim below is marked [V] where the build run must confirm it against the codebase before rendering. If any claim is wrong, the run STOPS and reports rather than shipping a policy that describes a different app. The whole point of this rewrite is that the policy matches the real binary.

## The policy text

**Flagstone Privacy Policy**
Effective 2026-07-29 · v1.0

**Who runs this.** Flagstone is built and run by one person, Sky, in British Columbia, Canada. If you have a question about your data, email support@skypistudio.com and it comes straight to me.

**The short version.** Flagstone collects as little as it can. You can report a barrier without making an account at all. There is no advertising, no analytics, no crash reporting, and nothing is sold or shared with anyone. [V: no analytics/crash SDK active, confirmed 2026-07-29]

**What you can do without an account.** You can browse the map and submit barrier reports anonymously. Anonymous reports are not linked to you. [V: anonymous flag insert path] If you hide a comment, that choice is stored only on your own phone and never leaves it. [V: hiddenContent uses device-local storage only]

**What I store if you make an account.** An email address and password, handled by my hosting provider (Supabase). Your display name and avatar if you add one. The reports, comments, and feedback you submit. Your points total. If you turn notifications on, a push token so the app can reach your device. [V: users, flags, flag_comments, feedback, push_tokens]

**What's in a barrier report.** The location of the barrier, its category and severity, your description, any photos you add, and the time you submitted it. Reports are public in the app, because that is what the map is for. Photos are stored on a public link, so please keep faces, licence plates, and anything that identifies a person out of frame. [V: flag-photos bucket is public-read]

**Your location.** If you allow location access, the app uses your location on your device to centre the map and work out how far away barriers are. Your own location is not stored on my servers and is not sent anywhere. The only location saved is the location of a barrier you choose to report. [V: transient use, no user-location persistence]

**Notifications.** If you turn them on, I store a push token so the app can notify you about your reports. Turn them off and it stops. [V]

**Who else sees your data.** My hosting provider (Supabase) stores it so the app can work. When you type into the address search, that text goes to OpenStreetMap's Nominatim service to look up the place — that's the only thing it receives. Apple sees whatever Apple normally sees when you download an app from the App Store. That's it. I don't sell your data, I don't share it for advertising, and there are no third-party trackers in the app. [V: no third-party SDKs beyond Expo/Supabase; geocode.ts sends only the typed query to nominatim.openstreetmap.org]

<!-- AGENT-PROPOSED (QA 2026-08-18, closes S11): the Nominatim sentence above was added for 5.1.1(i) accuracy — the reviewer notes already disclosed it, the policy didn't. Sky: ratify or reword; the same sentence shipped to copy.ts and docs/privacy/index.html. -->

**Getting a copy of your data.** You can export your data from inside the app, in Settings. [V: dataExport path]

**Deleting your account.** You can delete your account any time from your Profile. Your account and personal details go. Reports and comments you contributed may stay in the app with your name removed, so the community's record of barriers stays whole. [V: users FK is ON DELETE SET NULL, per SR-117] Photos attached to your reports may remain unless you delete the report itself first. [V: SR-050 owner cleanup ships on the owner delete path]

**Children.** Flagstone isn't designed for children and I don't knowingly collect information from anyone under 13.

**Where your data lives.** On servers run by my hosting provider. Data may be stored or processed outside Canada.

**Your rights.** Under Canadian privacy law (PIPEDA) you can ask what I hold about you, ask for a copy, and ask me to correct or delete it. Email support@skypistudio.com and I'll sort it out.

**Changes.** If this policy changes, the new version appears here with a new date.

## Ratification block (append to DECISIONS.md §SKY-8 after Sky approves)

```
§SKY-8: Privacy policy ratified (2026-07-29)
Privacy Policy v1.0 RATIFIED per accessmap_privacy_policy_v1.md.
Ships two ways: (1) rendered VERBATIM into an in-app Privacy Policy screen
  using the ToS screen's pattern, with a drift tripwire test reading the
  markdown; (2) the same text hosted at the public URL used in App Store
  Connect, so the listing and the app agree.
Every [V] claim must be verified against the codebase before render. Any
  mismatch STOPS the run and is reported; the policy is never shipped
  describing an app that does not exist.
The existing B-2 privacy links repoint to the in-app screen.
```
