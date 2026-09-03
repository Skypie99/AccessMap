# Lane G — App Store / Platform Truth Table (Flagstone Deep Audit 2026-09-02)

Status: IN PROGRESS (written incrementally; last section wins if duplicated)

Trees compared:
- CURRENT_MAIN = origin/main 70b52a30 (worktree /Users/skypie/AccessMap-deep-audit-20260902)
- SUBMITTED_BUILD_33 = f5594171e75bc5ec92a87d0392c361601ddedfba (read via `git show f5594171:<path>`)

Promise sources:
- docs/APP_STORE_REVIEWER_NOTES.md (main and f5594171 — substantively identical; only punctuation changed (":" vs " — "))
- design-reviews/name-forge/2026-08-17_rename/05_store_metadata_flagstone.md (store description, subtitle, keywords, promo text, URL fields)
- app.json (usage strings + privacyManifests) in both trees
- docs/PRIVACY_POLICY.md

Production facts (authoritative, captured by lead, read-only):
- Deployed Edge Functions: send-push-notification, notify-flag-status, delete-account (v4, 2026-05-31) only. delete-flag / account-deletion-* NOT deployed.
- Applied migration ledger ends 20260830130000 (mod1*/d1f4* NOT applied).
- public.flags keeps policies "admin delete any flag", "flags delete own", "flags_user_scoped".
- users.is_admin SELECT + all users columns UPDATE granted to authenticated (WITH CHECK pins only is_admin).
- feedback lacks moderation_* columns.
- prepare/commit/cancel_flag_photo_upload and list_monthly_leaderboard RPCs do NOT exist in production.

---

## 0. Reviewer-notes text (verbatim claims extracted)

From docs/APP_STORE_REVIEWER_NOTES.md (identical in both trees except dash punctuation):
- RN-1 (L17-18): "browse the entire map without an account — tap 'Browse without an account →' on the sign-in screen"
- RN-2 (L18): "Reporting a barrier works without an account too: from the Home tab, tap Report."
- RN-3 (L19): "Signing in is only needed to verify or resolve someone else's report, to comment, and to earn points."
- RN-4 (L26): "the map opens centered on your device location"
- RN-5 (L28): "+ button (bottom-right of the map) ... shown only to signed-in users. Location, category, severity, and description are required; photo is optional."
- RN-6 (L29): "open any flag's detail sheet and scroll to Report; reporting a flag works without an account."
- RN-7 (L29): "Comments (and their per-comment Report controls) are visible once signed in — use the test account above to review comment reporting and the block-user control."
- RN-8 (L30): "Tasks tab — shows open and verified flags as a list. Tap a card to jump back to that flag on the map."
- RN-9 (L31): "Profile tab — shows your display name, total points earned, and counts of flags reported/resolved."
- RN-10 (L39): Location: Required = Yes ("Centers the map and pre-fills report location")
- RN-11 (L40): Camera / Photos: Optional
- RN-12 (L41): Push Notifications: Optional ("Alerts when a reported flag is verified")
- RN-13 (L47): "Requires iOS 16+."
- RN-14 (L48): "All user data is stored in Supabase ... The one other recipient is OpenStreetMap's Nominatim ... no advertisers, analytics, or trackers."
- RN-15 (L49): "Photos have their EXIF metadata — including GPS — stripped before upload, and the strip fails closed"
- RN-16 (L50): test account is real; actions persist.
- RN-17 (L7-8): test-account credentials "[PROVIDED IN APP STORE CONNECT REVIEW NOTES]" (placeholder — nothing to verify in-repo).

From 05_store_metadata_flagstone.md (store description):
- SM-1 (L37): severity 1..5; six categories: no ramp, broken sidewalk, blocked path, missing signal, steep grade, other
- SM-2 (L40): "REPORT IN UNDER A MINUTE, NO ACCOUNT NEEDED ... add a note if you want ... report completely anonymously; your identity is not stored. Signed-in reporters can attach photos, and location data is stripped from every photo"
   (NOTE: description says note/description is optional; reviewer notes say description is REQUIRED — internal contradiction, see G-row)
- SM-3 (L43): "Reports start as Open. Community members verify them on the spot, or mark them resolved ... Anything reported as inappropriate is reviewed by a real person within 24 hours."
- SM-4 (L46): "No ads. No analytics. No tracking. Location is used only while the app is open ... browsing works with location off. The full plain-language privacy policy is right inside the app."
- SM-5 (L49): "Designed against WCAG 2.2 AA: screen-reader labels on every control ... dark mode, and a map legend"
- SM-6 (L52): "The first barriers are mapped in Kelowna"
- SM-7 (L75-76): Privacy Policy URL https://skypie99.github.io/AccessMap/privacy/ ; Support URL https://skypie99.github.io/AccessMap/support.html
- SM-8 (L24): keywords include "anonymous"
- SM-9 (L62): promo text "flag one in under a minute without an account. Checked by neighbours."

