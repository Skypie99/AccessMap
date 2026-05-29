# AccessMap Privacy Policy

**Last updated:** 2026-05-29 (Jordan privacy-gap draft)
**Effective:** On public launch  
**Version:** 1.1 (Draft — requires legal review before launch)

> **DRAFT — NOT LEGAL ADVICE.** This document was revised by Jordan (AI privacy advisor, Claude Corp) to address three pre-launch gaps identified in the 2026-05-29 Cluster 3 privacy review. It has NOT been reviewed by a qualified privacy attorney. Sky must complete all `[SKY TO CONFIRM: ...]` placeholders before this policy can be published. Nothing in this document constitutes legal advice.

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

> **Important — disability and accessibility information:** When you submit a flag, the combination of your account identity, the flag's location, and the accessibility category (for example, "no wheelchair ramp" or "inaccessible parking") may allow others — or AccessMap itself — to infer information about your disability status or mobility needs. This type of information is considered **sensitive personal information** under Canadian privacy law (PIPEDA and BC PIPA) and is treated as a **special category** of data under GDPR. You submit this information **voluntarily and publicly** — flags are visible to all users of the app. Before submitting a flag, please consider that doing so may disclose, or allow the inference of, information about a disability or accessibility requirement. If you do not wish this inference to be possible, you may use the app to view flags without submitting your own.

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

## Sensitive Personal Information — Disability and Accessibility Data

> **DRAFT SECTION — Not legal advice. Requires review by a qualified privacy attorney before publication.**

AccessMap is an accessibility-mapping app. By design, the data you submit describes accessibility barriers, which may reveal — or allow others to infer — information about your disability status or mobility needs.

### What this means for you

When you submit a flag, you are voluntarily sharing:
- A **precise geographic location** (latitude/longitude)
- An **accessibility category** (e.g., "wheelchair ramp missing," "accessible parking unavailable," "elevator broken")
- A **free-text description** of an accessibility barrier
- Optionally, a **photo** of the barrier

Together, these data points can allow the inference that you or someone you assist has a disability or accessibility requirement. This is **not a bug** — it is how the app works. But it is important that you understand this before submitting.

### How we protect this information

| Protection | What AccessMap Does |
|---|---|
| EXIF metadata stripping | All GPS coordinates are removed from photos before upload (see Photo Privacy section) |
| Email not shown on flags | Your email address is never displayed on public flags — only your display name |
| No profiling | We do not build disability profiles or infer disability status for advertising or third-party purposes |
| Data minimization | We collect only location, category, severity, and description — the minimum needed to place the flag on the map |
| Encrypted at rest and in transit | All data stored by Supabase is encrypted (AES-256 at rest, TLS in transit) |
| RLS (Row-Level Security) | Your account data is only accessible to you; other users see only the public flag data |

### What we cannot protect against

Flags are **publicly visible to all app users**. When you submit a flag, anyone using AccessMap can see:
- The flag's location on the map
- The accessibility category and description
- Your display name as the submitter

If someone knows your display name and sees your submitted flags, they could infer information about where you go and what accessibility needs you or someone you support may have.

**If you do not want this inference to be possible, you should not submit flags.** You can use AccessMap to view flags submitted by others without ever creating an account or submitting data yourself.

### Legal classification of this data

Under Canadian law:
- **PIPEDA (federal):** Information about a person's disability or health condition is "sensitive personal information" and requires heightened protection and explicit consent for collection, use, and disclosure.
- **BC PIPA (British Columbia):** Similar heightened-sensitivity protections apply.

Under GDPR (if applicable):
- Information from which disability status can be inferred is a **"special category" of personal data** under Article 9 and requires either explicit consent or another specific legal basis to process.

AccessMap collects this information based on your voluntary, informed submission of flag data. By submitting a flag describing an accessibility barrier at a specific location, you consent to that information being stored and publicly displayed as described in this policy.

[SKY TO CONFIRM: Does the app currently present any consent screen or modal before the first flag submission that explains this sensitivity? If not, consider adding one before App Store submission. This is not legally required under PIPEDA for voluntary user submissions, but is considered best practice and would reduce privacy risk. Consult legal counsel.]

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
- Servers are located in **[SKY TO CONFIRM: Supabase project region, e.g. `ca-central-1` (Canada), `us-east-1` (United States), or `eu-west-1` (Ireland/EU). Check your Supabase project dashboard under Settings → General → Region.]**
- Data is **encrypted at rest** (AES-256) and **in transit** (TLS 1.2+)

> **Cross-border data transfer notice (PIPEDA / BC PIPA):** If servers are located outside Canada (for example, in the United States), your personal information — including flag locations, descriptions, and account details — is transferred to and stored in that country. Foreign governments, courts, or law enforcement may be entitled to access your data under the laws of that country, which may differ from Canadian law. By using AccessMap, you consent to this transfer. [SKY TO CONFIRM: if servers are in Canada (`ca-central-1`), this cross-border notice may not be required — confirm with legal counsel.] If servers are in the US, Supabase is subject to US law including potential CLOUD Act requests. Given that AccessMap stores disability-adjacent data (flag categories indicating accessibility barriers), users should be aware that this sensitivity is not automatically recognized under US law in the same way it is under PIPEDA or BC PIPA.

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

**Data Processing Agreement (DPA) with Supabase:**
[SKY TO CONFIRM: Has a Data Processing Agreement been signed with Supabase? Enter one of the following:]
- **If YES:** "We have executed a Data Processing Agreement (DPA) with Supabase, Inc. dated [SKY TO CONFIRM: DPA execution date], which governs how Supabase processes personal data on our behalf and ensures compliance with GDPR, PIPEDA, and applicable Canadian privacy law."
- **If NO (DPA not yet signed):** "We are in the process of executing a Data Processing Agreement (DPA) with Supabase, Inc. Until this agreement is in place, we rely on Supabase's standard privacy policy and terms of service. A DPA is required before public launch if AccessMap targets EU users or if required by applicable law."

> **Jordan note (advisory only):** Supabase offers a standard DPA for GDPR compliance. For Canadian law (PIPEDA / BC PIPA), a DPA is not strictly required by statute, but is strongly advisable when a third party processes personal data on your behalf. If AccessMap is Canada-only with no EU targeting, the DPA is a best-practice safeguard rather than a strict legal requirement — but still recommended. This requires confirmation by a qualified privacy attorney before launch.

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
