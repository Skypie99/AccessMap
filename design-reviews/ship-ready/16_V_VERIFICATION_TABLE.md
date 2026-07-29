# SHIP-READY — 16 · THE [V] VERIFICATION TABLE

**Date:** 2026-07-29 · Branch `shipready/3-polish-submission`, stopped on the branch · `main` untouched
**Subject:** every `[V]` claim in `15_PRIVACY_POLICY_v1.md`, checked against the codebase before one word
was rendered · **Provenance:** Opus 5, max effort

---

## Why this file exists

§SKY-8 set one rule for the privacy-policy build: *"Every `[V]` claim must be verified against the
codebase before render. Any mismatch STOPS the run and is reported; the policy is never shipped describing
an app that does not exist."* B-3 exists because the **live** policy drifted six ways from the shipped app
(`04 §A-14`). Shipping a second policy that drifted differently would have been the same defect in a new
costume.

**Result: 11 claims checked. 9 verified. 2 mismatched.** Both mismatches were reported to Sky before
anything was rendered, and both were corrected by her in the same session — recorded as **§SKY-9**. The
render then proceeded against a document that matches the binary.

This table is the evidence. Every row is a file and a line, not an assertion.

---

## §1 The table

| # | The claim, as a reader sees it | Verdict | Evidence |
|---|---|---|---|
| **V1** | "no advertising, no analytics, no crash reporting, and nothing is sold or shared" | ✅ **VERIFIED** | `package.json` carries **no** Sentry / Bugsnag / Crashlytics / Amplitude / PostHog / Firebase dependency. `src/lib/sentry.ts` is a 4-line no-op stub. **Stronger evidence than absence-of-dependency:** `src/lib/analytics.ts` — the callsites that *do* exist (`comments.ts:146` `trackEvent('comment_added')`) route into functions whose entire body is `if (__DEV__) console.log(...)`. `__DEV__` is false in a release build, so they are literally no-ops in the shipped binary. `identifyUser` is documented "intentionally not sent anywhere"; `resetUser` is "No-op: nothing identifying was ever sent." |
| **V2** | "submit barrier reports anonymously… not linked to you" | ✅ **VERIFIED** | `src/lib/flags.ts` `createAnonFlag` — the insert payload is `{lat, lng, category, severity, description, photo_url, status}`. **No `user_id` key at all**, so the column takes its NULL default. Nothing correlates the row to a device or session. |
| **V3** | "If you hide a comment, that choice is stored only on your own phone and never leaves it" | ✅ **VERIFIED** | `src/lib/hiddenContent.ts:30,35` — one AsyncStorage key, `@accessmap/hidden_content_v1`. The module imports AsyncStorage and nothing else; there is no network call in the file. Its own header states the design reason: storing it server-side "would create exactly the user↔content linkage Jordan's hard condition refuses." |
| **V4** | "What I store if you make an account… **your notification settings**…" | ❌ **MISMATCH → corrected (§SKY-9)** | Five of six tables verified: `users` (`schema.sql:36`), `flags` (`:54`), `flag_comments` (`2026-05-30_flag_comments.sql`), `feedback` (`2026-05-23_feedback_table.sql`), `push_tokens` (`2026-05-25_push_tokens.sql`). **`notification_preferences` fails**: its migration is a PROPOSE-ONLY file and there are **zero** references to the table anywhere in `src/`. Notification settings persist to **AsyncStorage** (`NotificationPrefsModal.tsx:7` "Persists to AsyncStorage via savePrefs"). Independently corroborated by SR-020 and `04 §B-12`: *"`PUSH_NOTIF_TYPES_ENABLED:false` keeps the categories screen dead because nothing reads saved prefs."* The policy claimed Sky stores something she does not. |
| **V5** | "Photos are stored on a public link" | ✅ **VERIFIED** | `supabase/schema.sql:425` — `values ('flag-photos', 'flag-photos', true)`; the third column is `public`. `:429` documents that `/object/public/flag-photos/...` resolves without RLS. |
| **V6** | "Your own location is not stored on my servers and is not sent anywhere" | ✅ **VERIFIED — strongly** | Three independent legs. (1) `src/lib/location.ts` holds position in React state only — no `AsyncStorage.setItem`, no insert. (2) `src/lib/flags.ts` `listFlags` / `listFlagsPage` / `listFlagsByUser` send **no coordinates whatsoever** — they filter on status, `created_at` and `user_id`. There is no bounding-box or radius parameter anywhere. (3) Distance is computed **client-side** (`src/lib/distance.ts:26` `haversineKm`). No RPC takes a lat/lng: the only `.rpc()` calls are `log_realtime_event`, `increment_reopen_request`, `list_monthly_leaderboard`, `increment_dispute_request`. The user's position genuinely never leaves the device. |
| **V7** | "I store a push token… Turn them off and it stops" | ✅ **VERIFIED** | `push_tokens` table exists; `SettingsScreen.tsx:317` calls `deletePushToken(user.id)` when the toggle goes off, and F49 made that throw on a failed server-side delete rather than fail quietly. |
| **V8** | "no third-party trackers in the app" | ⚠️ **VERIFIED, with two recorded caveats** | **The prose is true for the shipped iOS binary** — no tracker SDK ships (see V1). Two things the marker's own wording overstates, recorded rather than glossed: (a) the marker says "no third-party SDKs beyond Expo/Supabase", which is literally false — `react-native-maps`, `leaflet`/`react-leaflet`, `lucide-react-native` and `supercluster` are all third-party. None is a tracker. (b) **Web only:** `PlatformMap.web.tsx:703-704` fetches map tiles from `basemaps.cartocdn.com`, a third party that necessarily sees IP and viewport. Native uses `PROVIDER_DEFAULT` (`PlatformMap.tsx:287`) → Apple Maps on iOS, which the policy's "Apple sees whatever Apple normally sees" sentence covers. The App Store binary is the iOS one. |
| **V9** | "You can export your data from inside the app, in Settings" | ✅ **VERIFIED** | `SettingsScreen.tsx:662` — §Your data → "Export my data" → `handleExportPress` → `src/lib/dataExport.ts`. The section header is literally "Your data" and the screen's title is "Settings". |
| **V10** | "You can delete your account any time **in Settings**" | ❌ **MISMATCH → corrected (§SKY-9)** | The control is on **Profile**: `ProfileScreen.tsx:1743-1749` renders the "Delete Account" button; `:682` calls `deleteAccount(user.id)`. **Settings §Account contains only "Sign out"** (`SettingsScreen.tsx:677-686`) — no delete row exists there. Corroborated independently by `04 §A-2`, which describes "the in-app **Profile** → Delete Account flow". A reader following the policy would open Settings and not find it. |
| **V11** | "Photos attached to your reports may remain unless you delete the report itself first" | ✅ **VERIFIED** | Both halves. `src/lib/flags.ts:1381+` — deleting an owned flag gathers photo paths *then* deletes, and the header records that the owner path "now works end to end" under the `flag-photos owner delete` policy. And account deletion does **not** delete flags — `delete-account/index.ts:79-83` anonymises them (`UPDATE flags SET user_id = NULL`) — so their photos do survive an account deletion. |

---

## §2 The mechanism note on V10 that the marker got half right

The V10 marker reads *"users FK is ON DELETE SET NULL, per SR-117"*. The reader-facing sentence it guards —
*"Reports and comments you contributed may stay in the app with your name removed"* — **is true**. The
mechanism behind it is two different things, and only one is a SET NULL FK:

- **Comments** — genuinely `ON DELETE SET NULL`. `2026-07-27_drift_capture_flag_comments_user_id.sql:19`
  captured live as `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`, ratified as SR-117
  Option A.
- **Reports (flags)** — **`ON DELETE CASCADE`** (`schema.sql:56`). They survive not because of the FK but
  because `supabase/functions/delete-account/index.ts:79-83` runs an explicit
  `UPDATE flags SET user_id = NULL` **before** deleting the auth user, so the cascade finds nothing to
  delete. If that step ever failed the function returns 500 and the account is not deleted (`:28`), so the
  two can never get out of step.

The outcome the policy describes is correct either way. This is recorded because a future reader auditing
"is the FK really SET NULL?" would find CASCADE on `flags` and reasonably conclude the policy was lying.
It is not — the anonymisation is just done in the edge function rather than the schema.

---

## §3 What the gate actually caught

Both mismatches were **user-facing** and both were the exact failure mode B-3 names:

- **V10 sent a reader to the wrong screen** to exercise a legal right. Someone following the policy to
  delete their account would open Settings, find Sign out and Export my data, and conclude the app had
  removed the feature. That is the "policy describing a different app" defect, in a document Apple's
  reviewers cross-read against the nutrition labels.
- **V4 over-claimed collection** — it said Sky stores something that never leaves the phone. Less harmful
  than under-disclosure, but it is still a false statement about data handling, and it would have had to be
  reconciled against `§A-Sheet-A`'s label answers at submission time.

Neither would have been caught by a render test, a typecheck, or a lint pass. Both were caught by reading
the code the sentence claimed to describe.

---

## §4 Provenance

Every row above was verified by direct read of the working tree at `b200eb0` on 2026-07-29. No claim in this
table is inherited from an earlier document; where an earlier document agrees (`04 §A-2`, `04 §A-14`,
SR-020, SR-117) it is cited as corroboration, not as the source.

**Nothing was merged, submitted, or applied to the database.**
