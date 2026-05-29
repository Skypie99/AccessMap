# AccessMap Privacy Policy

**Last updated:** 2026-05-30  
**Effective:** On public launch  
**Version:** 1.0 (Draft — requires legal review before launch)

---

## Overview

AccessMap is a community tool for mapping accessibility barriers. This policy explains what we collect, why, and how to control your information.

**Short version:** We collect only what's needed to make the map work. We never sell your data. You can delete your account and all your data anytime.

---

## What We Collect

### When you browse the map (no account needed)
- **Nothing** — you can view flags without logging in, and we don't track you

### When you create an account
- **Email address** — for sign-in and optional notifications only
- **Display name** — shown on flags you verify or report (you choose this)

### When you report or verify a flag
- **Location** — the latitude/longitude where you submit the flag (placed on the map)
- **Description** — the text you write about the accessibility barrier
- **Category** — which type of barrier (ramp, parking, etc.)
- **Severity** — how much of a problem it is (1–5 scale)
- **Photos** — if you choose to add them
  - **GPS metadata is automatically removed** from all photos before they're stored
  - **Camera metadata, timestamps, and other EXIF data are stripped** before upload
  - We keep only the image itself, not the metadata

### Automatically collected
- **App usage** — which screens you visit (not what you type)
- **Device type** — iOS, Android, or web (for bug fixing only)
- **Timestamps** — when you created your account and when you take actions (for sorting and notifications)

### What we never collect
- Your device's location in the background
- Contacts, camera roll, or other device data
- Payment information (we don't charge)
- Camera metadata or GPS coordinates from your photos

---

## How We Use Your Data

| Your Data | What We Do With It | Who Sees It |
|---|---|---|
| Email | Sign-in, password reset, optional notifications | Only you (not visible on the map) |
| Display name | Shown on flags you report/verify | Other app users |
| Flag location | Placed as a marker on the map | Other app users |
| Flag description + category | Shown on the map when people tap the marker | Other app users |
| Photos | Displayed in flag details (public-readable in Storage) | Other app users |
| Usage data | Fixing bugs, improving the app, understanding feature adoption | Internal team only |

**We do not:**
- Sell or share your data with third parties (except Supabase, our cloud provider, which is contractually bound)
- Use your data for advertising
- Share your email with other users
- Analyze your flag history to profile you

---

## Your Rights & Controls

### Manage Your Account
- **Edit your profile** — change display name or avatar anytime in Settings → Profile
- **Delete a flag** — remove any flag you submitted via the flag's detail screen
- **Manage notifications** — opt in/out anytime in Settings → Notifications
- **Delete your account** — Settings → Account → Delete Account
  - This deletes your email, display name, avatar, all your flags, and all associated photos
  - **This action cannot be undone**
  - Your account is removed immediately

### Data Access & Portability
- **See your data** — all your personal data is visible in the app (profile, flags, activity)
- **Export data** — contact us at [support email — Sky fills this in] to request a copy of all your data

### Privacy by Region

#### GDPR (European Union & European Economic Area)
If you're in the EU/EEA:
- **Right to access:** Request a copy of your data anytime via contact email below
- **Right to erasure** ("right to be forgotten"): Use the in-app Delete Account feature, or contact us
- **Right to restrict processing:** Contact us to restrict how we use your data
- **Right to portability:** Request your data in a portable format (CSV, JSON)
- **Right to object:** You can object to certain data uses; contact us

#### CCPA (California)
If you're in California:
- **Right to know:** Request what personal information we collect about you
- **Right to delete:** Use the in-app Delete Account feature, or contact us
- **Right to opt-out:** We do not sell personal information, so there's nothing to opt out of
- **Right to non-discrimination:** We won't discriminate against you for exercising these rights

#### PIPEDA (Canada)
If you're in Canada:
- **Right to access:** Request a copy of your personal data
- **Right to correction:** Ask us to correct inaccurate data
- **Right to complaint:** Contact the Privacy Commissioner of Canada if you believe we've violated PIPEDA

---

## How We Store & Protect Your Data

### Storage Location
- Your data is stored by **Supabase**, our cloud database provider
- Servers are located in [region — Sky specifies before launch]
- Data is **encrypted at rest** (AES-256) and **in transit** (TLS 1.2+)

### Data Retention
| Type of Data | How Long We Keep It |
|---|---|
| Account (email, display name, avatar) | Until you delete your account |
| Flags you submit | Until the flag is marked resolved + 90 days (then archived) |
| Flag photos | Until the flag is deleted |
| Notifications you receive | 30 days |
| Audit logs (for security) | 30 days |

### Backups
- We maintain automated backups of the database for disaster recovery
- Backups are deleted after 30 days
- If you delete your account, your data is removed from active backups within 7 days

---

## Sharing & Third Parties

### Your Flags Are Public
- Flag locations, descriptions, photos, and severity are **visible to anyone** who downloads the app
- Your display name is shown as the reporter/verifier on each flag
- **Your email is never shown**

### Supabase (Cloud Provider)
- We use Supabase to host our database and file storage
- Supabase sees your encrypted data; they cannot decrypt or view it
- Supabase has a [privacy policy](https://supabase.com/privacy) — we recommend you read it
- We have a Data Processing Agreement with Supabase ensuring GDPR/CCPA compliance

### No Other Sharing
- We do not share data with advertisers, analytics companies, or data brokers
- We will not sell your data under any circumstance

---

## Children & Minors

AccessMap is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we learn that we've collected data from a child under 13, we'll delete it immediately. If you believe a child under 13 has created an account, email us at [support email].

---

## Photo Privacy Details

### How Photos Are Processed

1. **When you take/select a photo:**
   - On iOS/Android: we use the device's native media library to re-process the image, removing all EXIF metadata (GPS, timestamps, camera model, etc.)
   - On web: we use canvas to re-render the image, which naturally strips all metadata
   - **Errors are handled safely** — if processing fails, we keep the original photo (we never discard your image)

2. **Before upload:**
   - We verify that metadata markers have been removed
   - If metadata is detected, the upload is rejected and you'll be notified

3. **After upload:**
   - Photos are stored in Supabase Storage with **public read access** (anyone can view them on the map)
   - Only you can delete your photos
   - Photos are encrypted in transit and at rest

### What Metadata Is Removed
- **GPS coordinates** (EXIF location data)
- **Timestamps** (DateTimeOriginal, DateTimeDigitized)
- **Camera model & make** (iPhone 15 Pro, etc.)
- **Lens information** (focal length, aperture)
- **IPTC metadata** (keywords, copyright)
- **XMP metadata** (embedded descriptions)

---

## Changes to This Policy

We may update this policy from time to time. If we make material changes, we'll:
1. Update the "Last updated" date at the top
2. Notify you via in-app message and email
3. Ask you to re-accept the new policy if required

We recommend reviewing this policy periodically.

---

## Contact & Data Requests

### Questions or Concerns?
- **Email:** [Sky fills this in — support contact]
- **Mailing address:** [Sky fills this in if needed]
- **Response time:** We aim to respond within 30 days

### Data Subject Requests (GDPR/CCPA/PIPEDA)
- **Access your data:** Email us with "Data Subject Access Request" in the subject line
- **Delete your data:** Use the in-app Delete Account feature, or email "Data Deletion Request"
- **Export your data:** Email "Data Portability Request"
- **Other privacy requests:** Email us and we'll help

---

## Compliance Notes

This Privacy Policy is designed to comply with:
- **GDPR** (EU General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)
- **PIPEDA** (Personal Information Protection and Electronic Documents Act, Canada)
- **BC PIPA** (British Columbia Personal Information Protection Act)
- **AccessMap Constitution Art. 7** (Privacy & data protection)

**Disclaimer:** This policy is a draft. Before public launch, it should be reviewed by a qualified privacy attorney to ensure legal compliance in your jurisdiction.

---

## Technical Details (for the curious)

### Database Structure
- **users table**: email (hashed for authentication), display_name, avatar_url, points (reputation score)
- **flags table**: latitude, longitude, category, severity, description, photo_url, status, user_id, created_at, updated_at
- **All user-controlled data is stored server-side** — we don't store credentials or sensitive info on your device except a session token

### Row-Level Security (RLS)
- You can only see/edit your own flags and account
- Moderators can edit flag status (verified/resolved/rejected)
- Other users see only the public flag data (location, description, photo)

### Encryption
- **In transit:** TLS 1.2+ (HTTPS)
- **At rest:** AES-256 (Supabase default)
- **Passwords:** Never stored; managed by Supabase Auth

---

## Summary

AccessMap respects your privacy. We collect the minimum data needed to help communities identify and fix accessibility barriers. You own your account and can delete it anytime. Your email stays private. Your photos are processed to remove tracking metadata. We don't sell your data.

If you have questions, we're here to help.

---

*Last reviewed: 2026-05-30*  
*Next legal review recommended: Before public launch (App Store / Google Play submission)*
