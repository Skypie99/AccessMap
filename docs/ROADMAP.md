# Flagstone Product Roadmap

**Last Updated:** 2026-05-29  
**Current Release:** v0.2.0 (Sprint 1 — Shipped)  
**Next Target:** v0.2.1 (Sprint 2 — 2026-06-01 → 2026-06-14)

---

## ✅ v0.2.0 — Sprint 1 (Shipped)

**Theme:** Foundation + Core Accessibility Features

### What's Live
- **Community Flag Reporting** — Report accessibility flags (location, photo, category, severity)
- **Community Map View** — Interactive map with marker clustering, tap-to-detail flow
- **Heatmap Density View** — Privacy-safe visualization of flag hotspots
- **Flag Status History** — See when status changes (open → resolved → archived) with user info
- **Realtime Flag Updates** — Client-side subscription ready (awaiting D4 migration apply)
- **Push Notifications** — iOS-native token storage, user settings, notification badge
- **Web Tile Caching** — 7-day LRU cache (50 MB), user-keyed, offline-aware, auto-clear on sign-out
- **Offline Flags Cache** — 24h cached flag list with stale-while-revalidate strategy
- **Gamification Layer** — Points + achievements (5 badges), leaderboard, visit streaks
- **User Profiles** — Edit name, view profile, sign out
- **Flag Context Tags** — `sidewalk_condition`, `curb_height`, `surface_material`, etc.
- **Dark Mode** — Full theme system with 8 token categories
- **GitHub Actions CI** — Type-check + Jest tests on every push/PR (1135/1135 tests passing)
- **Guest User Experience** — Unauthenticated browse + "Sign in to report" inline prompt
- **Address Search & Open in Maps** — Reverse geocoding, native Maps/Apple Maps integration
- **Accessibility Foundations** — WCAG 2.1 Level AA progress (Wave 5 residuals + a11y hardening in progress)

---

## 🔄 v0.2.1 — Sprint 2 (2026-06-01 → 2026-06-14)

**Theme:** Launch Readiness + Design Polish

### Critical Launch Gates
- [ ] **D1 — Flag Edit RLS Hardening** — Apply `2026-05-25_flag_edit_rls_replacement.sql` (limits owner edits to open flags only)
- [ ] **D2 — Email Privacy Migration** — Apply `2026-05-27_users_email_privacy.sql` (closes PII exposure; Constitution Art. 2.4)
- [ ] **D3 — Status Update Trigger** — Apply `2026-05-23_status_update_trigger_proposal.sql` (column-level immutability for non-owner status changes)
- [ ] **Edge Function Security Patch** — Deploy secured `send-push-notification` function (auth gate + oracle fix; regression from May 25)
- [ ] **EXIF GPS Leak Test** — Verify photo upload strips EXIF/GPS on iOS + Android (Constitution Art. 2.3)
- [ ] **iOS Location Permissions** — Replace `locationAlwaysAndWhenInUsePermission` with `locationWhenInUsePermission` in app.json (App Store requirement)

### Design System Consolidation
- [ ] **Shared StatusBadge Component** — Migrate FlagCard, FlagDetailModal, TasksScreen to unified badge (built; waiting migration apply)
- [ ] **Shared FlagCard Component** — Migrate Feed + TasksScreen to single card implementation (built; awaiting RLS D1 apply)
- [ ] **Font Weight Tokens** — Complete `700 Bold`, `600 SemiBold`, `500 Medium` usage across UI
- [ ] **Spacing Tokens** — Finish `8px`, `12px`, `16px`, `24px`, `32px` adoption (Dani design-compiler)

### Accessibility + WCAG Compliance
- [ ] **Flash Banner Screen Reader** — Add `aria-live="polite"` + role="status" to floating status banner (fixed in `fix/a11y-serious-2026-05-30`)
- [ ] **Severity Button Plain-Language Labels** — "High impact (many people)", "Medium", "Low" + icon alt text (fixed)
- [ ] **Remaining WCAG SERIOUS Items** — Address any Wave 5 residuals (map announceForAccessibility, reduced-motion, photo alt text all in progress)
- [ ] **Modal Keyboard Traps** — Verify ReportFlagModal + modal stack focus containment, escape-key handling

### UX & Flow Completions
- [ ] **Guest Sign-In Prompt** — Add "Sign in to report" explanation in ReportFlagModal (education → conversion)
- [ ] **Offline Error States** — ReportFlagModal shows offline message + queue-for-later (not failed)
- [ ] **User Search / Profiles** — Search leaderboard by name, view other users' flags + achievements
- [ ] **GDPR Account Deletion Flow** — Settings → "Delete My Account" → confirm → purge data + auth user
- [ ] **Feedback Collection** — Post-flag-report 1-question modal ("Was this helpful?") → edge function log

### Post-Launch Security Hardening (apply end of sprint)
- [ ] **D4 Migration Batch** — Apply `2026-05-23_data_layer_hardening.sql`, `rls_initplan`, `realtime_flags.sql` (~15 min)
- [ ] **D2 Push Tokens** — Apply `2026-05-25_push_tokens.sql` + install `expo-notifications` + activate Edge Function webhook
- [ ] **Input Validation Hardening** — Display name char cap, feedback body/email validation, flag description length cap (merged in Wave 2)
- [ ] **Points Self-Write RLS** — Apply `2026-05-29_restrict_users_update_columns.sql` (users cannot self-increment points)

---

## 🔮 v0.3.0 — Sprint 3 (2026-06-15 onwards)

**Theme:** Public Beta Launch

### Mobile & Release Infrastructure
- [ ] **Android Push Notifications** — Complete push token + Edge Function support for Android (iOS live in v0.2.0)
- [ ] **In-App Onboarding Coach Marks** — Modal carousel: "Tap a flag to see details", "Swipe to filter by severity", "Add to Watched Flags for alerts"
- [ ] **TestFlight Beta (iOS)** — Submit build to App Store Connect, distribute to 100 beta testers
- [ ] **Google Play Closed Testing** — Android beta program (2-4 weeks before public launch)
- [ ] **Crash Reporting** — pick a provider and integrate (error telemetry, user impact analysis). Whichever is chosen, both privacy policies must be updated in the same change.
- [ ] **Analytics Setup** — Amplitude or Mixpanel instrumentation (flag submission funnel, map engagement, retention)

### Performance Optimization
- [ ] **Heatmap Performance (2K+ flags)** — Implement viewport-bounded grid rendering, simplify geohash aggregation
- [ ] **Flag List Pagination** — Cursor-based load-more (already wired in TasksScreen; verify >5K flag performance)
- [ ] **Image Optimization** — Serve JPEG/WebP variants, responsive srcset for thumbnails vs. lightbox
- [ ] **Map Clustering Tuning** — Optimize `maxZoom`/`radius` for dense urban areas vs. rural

### Community & Moderation
- [ ] **Community Guidelines Modal** — In-app T&C, nudge on first report, link to full guidelines page
- [ ] **Admin Moderation Dashboard** (private) — View reports by location, flag/unflag content, user moderation history
- [ ] **Flag Resolution Workflow** — City/org staff mark flags "Resolved in progress" → "Fixed" + comment (city communication)
- [ ] **Anonymous Reporting Option** — Allow report without account (requires GDPR/privacy review)

---

## 🚀 v1.0.0 — Public Launch

**Theme:** Production Stability + Scale

### Compliance & Data
- [ ] **GDPR Full Compliance** — Data export endpoint (JSON + CSV), deletion within 30 days, privacy policy finalized
- [ ] **Privacy Policy & Terms** — Legal review, in-app acceptance flow
- [ ] **Data Retention Policy** — Auto-purge archived flags after 2 years, inactive account cleanup
- [ ] **Accessibility Audit (3rd party)** — External WCAG 2.1 AA / Section 508 certification

### Internationalization & Localization
- [ ] **Multi-Language Support** — French, Spanish, German translations (crowdsourced or professional TMS)
- [ ] **Metric to Imperial Toggle** — Settings → distance unit preference
- [ ] **Date/Time Localization** — Respect locale for timestamps, relative times

### Infrastructure & Scale
- [ ] **API Rate Limiting** — Per-user throttling (50 reqs/min for flags, 10 reqs/min for posts)
- [ ] **Database Query Optimization** — Index analysis, slow-query profiling, connection pooling
- [ ] **SLA Monitoring & Alerting** — Uptime tracking, incident response playbook, public status page
- [ ] **CDN & Edge Caching** — Supabase vector + Vercel Edge for static assets
- [ ] **Load Testing** — Simulate 50K concurrent users, heatmap grid at 100K flags

### Public Relations & Growth
- [ ] **Press Release** — Launch announcement, media kit, beta tester testimonials
- [ ] **App Store Optimization** — Keywords, screenshots, video preview, category ranking
- [ ] **Beta Retrospective** — User feedback synthesis, known-issues log, roadmap refresh

---

## 💡 Future (v1.x+)

**Stretch Goals & Post-Launch Evolution**

### Advanced Features
- **Organization Accounts** — Cities, nonprofits report in bulk; moderation tools for staff
- **Route Planner** — Find accessible path from A → B; integrate with Google Maps / Apple Maps API
- **Integration Partnerships** — Waze, Google Maps, Apple Maps data sync (read-only feeds, eventually bidirectional)
- **Open Data Export** — Community flags as CC BY-SA dataset; third-party app integrations via API
- **Mobile App for City Staff** — Resolve flags in the field (photo proof, timestamp, offline-capable); crew assignment

### Analytics & Insights
- **City Dashboard** — Heatmap + trend analysis; which neighborhoods need attention; time-series repairs
- **Accessibility Score by Neighborhood** — Aggregate rating: "This block is 78% accessible"
- **Trend Detection** — Alert cities to emerging issues (e.g., "5 new pothole reports in downtown area")

### Monetization (Consensus Pending)
- **City Subscription Tier** — Advanced moderation, bulk export, private API for city systems
- **Nonprofit Grants** — Free tier for registered nonprofits; open-source redistribution
- **Ad-Free Premium** — "No ads" tier on web; in-app premium features (saved routes, priority alerts)

---

## Success Metrics & Definition of Done

| Release | Success Criteria |
|---|---|
| **v0.2.1** | All launch gates passed (D1/D2/D3 applied, EXIF tested, EF deployed). 2K+ flags in test database. iOS TestFlight distribution live. Zero WCAG SERIOUS violations. |
| **v0.3.0** | Android + iOS in closed beta. 200+ testers across platforms. Crash-free rate >99%. Analytics baseline established. |
| **v1.0.0** | iOS App Store + Google Play published. 50K+ DAU. <500ms heatmap render time at 100K flags. GDPR audit passed. SLA monitoring operational. |

---

## Key Dependencies & Blockers

| What | Blocker | Owner | Status |
|---|---|---|---|
| v0.2.1 Launch | D1/D2/D3 SQL migrations apply | Sky | Awaiting apply in Supabase Dashboard |
| v0.2.1 Launch | Edge Function security patch deploy | Sky | Built; awaiting Supabase Dashboard deploy |
| v0.3.0 Submission | TestFlight + Play Store approval | Rory + Sky | 2-4 week lead time; plan for early June |
| v1.0.0 Scale | Database indexing + query optimization | Jordan + Steve | Pending load-test analysis (2K+ flags) |
| Future (Cities) | Admin moderation dashboard | Dani + Shamus | Design pending; post-launch priority |

---

## Timeline Estimate

- **v0.2.1:** 2 weeks (Sprint 2)
- **v0.3.0 (beta):** 4 weeks (Sprint 3)
- **v1.0.0 (public):** ~10-12 weeks from Sprint 1 (end of Q2 2026)

---

**Document Status:** v1.0 · Public roadmap published for accessibility community + team reference · Updated by Quinn (Developer Advocacy) on 2026-05-29
