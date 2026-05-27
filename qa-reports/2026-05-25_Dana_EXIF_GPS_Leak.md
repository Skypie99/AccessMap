# AccessMap — Privacy Finding: EXIF GPS Location Metadata

**Date:** 2026-05-25  
**Finder:** Dana (Privacy Audit)  
**Type:** PRIVACY FINDING — Pre-Launch Gate  
**Severity:** CRITICAL  
**Status:** OPEN — Requires decision and routing to Steve (security) + Shamus (client UI)

---

## Finding Summary

Flag photos uploaded to AccessMap carry EXIF metadata, including GPS location coordinates. This exposes user home/work addresses and other sensitive movement patterns that users may not be aware they're sharing.

**Impact:**
- Users uploading photos of accessibility barriers (e.g., from home or work) inadvertently expose their location to any system that can read EXIF data
- Privacy violation aligns with core user concern (accessibility users are often targeted populations)
- Pre-launch blocker per Art. 7 (privacy pillar)

---

## Technical Details

**Source:** Flag photos stored in Supabase Storage. No client-side EXIF stripping on upload.

**Attack surface:** EXIF metadata persists in stored file; accessible to:
- Supabase admin dashboard
- Any third-party service that reads files from the bucket
- Downloads/shares of flag photos (user may not realize coordinates are attached)

**Affected assets:**
- `POST /flags` upload endpoint (no EXIF stripping)
- Supabase Storage bucket configuration (no metadata policies)
- Flag photo downloads (EXIF headers returned as-is)

---

## Options

**A: Strip EXIF on upload (recommended)**
- Client-side: Use `exif-js` or similar to detect and warn user, then re-encode image
- Server-side: Use ImageMagick/libvips to strip EXIF before storing in Supabase
- Cost: +5–10 hours backend (Supabase Edge Function or migration)
- Rollback: Easy — re-upload original images without EXIF stripping is reversible

**B: Disallow file uploads entirely**
- Remove photo upload feature from MVP
- Cost: 0 hours
- Trade-off: Reduces accessibility reporting fidelity

**C: Add user warning during upload**
- Modal: "This photo may contain location metadata. Consider removing sensitive data before uploading."
- Cost: +1 hour UI
- Risk: Warning alone doesn't prevent leak; users may ignore or not understand

---

## Decisions for Sky

| # | Decision | Blocking | Route |
|---|---|---|---|
| D1 | Approve Option A (EXIF stripping) | YES — pre-launch gate | Steve (security review) + Shamus (client UI changes) |
| D2 | If not A, which alternative (B or C)? | YES — pre-launch gate | Steve + Shamus |

---

## DECISIONS FOR SKY

**BLOCKER:** This is a privacy pillar finding (Const. Art. 7). AccessMap launch cannot proceed without addressing it. Option A (EXIF stripping) is technically straightforward and preserves feature scope. Recommend Option A + routing to Steve for security sign-off and Shamus for client-side integration.

---

## Next Steps

Pending Sky decision → Steve (security audit of stripping approach) → Shamus (update upload UI + Edge Function) → qa-report artifact for Design Compiler review.
