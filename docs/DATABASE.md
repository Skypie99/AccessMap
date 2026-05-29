# AccessMap Database Schema & Data Flow

This document describes the Supabase Postgres database, Row-Level Security policies, and Realtime subscriptions that power AccessMap.

---

## Tables

### `public.users`

Mirrors `auth.users` with profile and gamification data.

| Column | Type | Default | Constraints | Notes |
|--------|------|---------|-------------|-------|
| `id` | uuid | - | primary key, ref auth.users(id) | User's unique ID from Supabase Auth |
| `email` | text | - | not null, unique | Account email (synced from auth.users) |
| `display_name` | text | NULL | - | User's chosen name (optional) |
| `avatar_url` | text | NULL | - | Profile image URL |
| `points` | integer | 0 | not null | Gamification score; updated by triggers |
| `created_at` | timestamptz | now() | not null | Account creation timestamp |

**RLS Policies:**
- **SELECT:** Authenticated users can read all user profiles (public profiles, no private fields).
- **UPDATE:** Users can only update their own row (self-edit).

**Triggers:**
- `on_auth_user_created` — When a new user signs up via Supabase Auth, `handle_new_user()` inserts a matching row into `public.users`. This happens automatically; no app code needed.

---

### `public.flags`

Accessibility issues reported by users.

| Column | Type | Default | Constraints | Notes |
|--------|------|---------|-------------|-------|
| `id` | uuid | uuid_generate_v4() | primary key | Unique flag ID |
| `user_id` | uuid | - | not null, ref users(id) | Reporter's user ID |
| `lat` | double precision | - | not null | Latitude (WGS84) |
| `lng` | double precision | - | not null | Longitude (WGS84) |
| `category` | text | - | not null, check in enum | 'no_ramp' \| 'broken_sidewalk' \| 'blocked_path' \| 'missing_signal' \| 'steep_grade' \| 'other' |
| `severity` | smallint | - | not null, 1–5 | 1 = minor, 5 = severe |
| `description` | text | NULL | - | User's typed description |
| `photo_url` | text | NULL | - | URL to photo in flag-photos bucket |
| `status` | text | 'open' | not null, check in enum | 'open' \| 'verified' \| 'resolved' \| 'rejected' |
| `created_at` | timestamptz | now() | not null | Report timestamp |
| `updated_at` | timestamptz | now() | (trigger) | Updated by BEFORE UPDATE trigger |
| `context_tags` | text[] | NULL | - | Vocabulary tags (e.g., ['intersection', 'outdoor']) — optional until migration applied |

**Indexes:**
- `flags_user_id_idx` — Speed up queries by reporter.
- `flags_status_idx` — Speed up filtering by status.
- `flags_geo_idx` — Speed up proximity queries (lat, lng).

**RLS Policies:**

1. **SELECT (Read):** Authenticated users can see all flags (no filtering).

2. **INSERT (Create):** Authenticated users can insert a flag **only if** they set `user_id = auth.uid()` (can only report their own flags).

3. **UPDATE (Edit own):** Owners can update any column of their own flag.

4. **UPDATE (Triage status only):** Any authenticated user can change ONLY the `status` column on any flag (even flags reported by others). The policy blocks changes to other columns via a WITH CHECK that compares every non-status column against the old row:
   ```sql
   user_id = (select user_id from public.flags where id = flags.id)
   AND lat = (select lat from public.flags where id = flags.id)
   -- ... (all other columns must match the old row)
   ```
   This enforces "if you're not the owner, you can ONLY change status."

5. **DELETE (Own only):** Owners can delete their own flags.

**Triggers:**

- `on_flag_status_change` → `handle_flag_status_change()` — Fires AFTER UPDATE of the `status` column. Awards points:
  - open → verified: reporter +5, verifier (if not reporter) +2
  - open/verified → resolved: reporter +10, resolver (if not reporter) +5
  - Any other transition: no points (forward-only)

---

### `public.push_tokens`

Expo push notification tokens (one per user, upserted on each app launch).

| Column | Type | Default | Constraints | Notes |
|--------|------|---------|-------------|-------|
| `user_id` | uuid | - | primary key, ref users(id) | User receiving notifications |
| `token` | text | - | not null | Expo push token (PII under PIPEDA) |
| `created_at` | timestamptz | now() | not null | Token registration time |

**RLS Policies:**
- **SELECT:** Users can only read their own token.
- **INSERT/UPDATE:** Users can only insert/update their own token.

**Security Note:** Push tokens are PII under PIPEDA (Canada). The app only collects them after showing a privacy explanation to the user.

---

### `public.feedback`

User-submitted feedback (optional until migration is applied).

| Column | Type | Default | Constraints | Notes |
|--------|------|---------|-------------|-------|
| `id` | uuid | uuid_generate_v4() | primary key | Unique feedback ID |
| `user_id` | uuid | NULL | ref users(id) | Nullable so anonymous feedback is allowed |
| `category` | text | - | not null, check in enum | 'bug' \| 'idea' \| 'love' \| 'other' |
| `body` | text | - | not null | User's message |
| `contact_email` | text | NULL | - | Email for follow-up (optional) |
| `platform` | text | NULL | - | 'ios' \| 'android' \| 'web' |
| `created_at` | timestamptz | now() | not null | Submission timestamp |

**RLS Policies:**
- **SELECT:** None (app does not read feedback back).
- **INSERT:** Users can insert feedback with `user_id = auth.uid()` OR `user_id IS NULL` (anonymous).

---

### `storage.flag-photos`

Bucket holding user-uploaded flag photos.

**Access Control:**
- **Public read:** Anyone can view photos (URL is `https://<project>.supabase.co/storage/v1/object/public/flag-photos/<path>`).
- **Authenticated upload:** Only signed-in users can upload.
- **Path-based RLS:** Photos must be uploaded to `<userId>/<timestamp>.<ext>`. Storage policy enforces `auth.uid()` = first path segment (owner-only).
- **Owner-only delete:** Users can only delete their own photos.

**Rationale:** The path-based enforcement keeps the RLS logic in one place (the policy) without needing per-row metadata columns.

---

## Data Flow Examples

### Scenario 1: User Reports a Flag

```
1. User opens MapScreen → sees map + current flags
   [FlagsProvider has loaded flags from DB on app boot]

2. User taps "Report" FAB → ReportFlagModal opens
   
3. User enters:
   - category = 'no_ramp'
   - severity = 4
   - description = "No wheelchair ramp at main entrance"
   - (optional) photo from camera/library
   
4. App calls stripExifNative(photo) to remove GPS metadata (privacy)
   
5. App calls uploadFlagPhoto(userId, photoUri)
   → Storage: flag-photos/<userId>/<timestamp>.jpg
   → Receives photo_url = "https://.../storage/v1/object/public/flag-photos/..."
   
6. App calls createFlag({
     user_id: userId,
     lat: currentLat,
     lng: currentLng,
     category: 'no_ramp',
     severity: 4,
     description: "...",
     photo_url: "..."
   })
   → Supabase RLS checks: auth.uid() === user_id ✓
   → INSERT into public.flags (status defaults to 'open')
   
7. Realtime broadcasts { id, status: 'open' } to all connected clients
   
8. FlagsProvider sees the broadcast → refreshes its cache
   
9. MapScreen re-renders → new marker appears on the map
```

### Scenario 2: Another User Verifies the Flag

```
1. User B opens MapScreen, sees User A's flag
   
2. User B taps the flag marker → FlagDetailModal opens
   Shows: category, severity, description, photo, current status
   
3. User B taps "Verify" button
   
4. App calls updateFlagStatus(flagId, 'verified', userId: B)
   → Supabase RLS check: status update policy allows any authenticated user
      to change ONLY status (all other columns must match old row) ✓
   → UPDATE public.flags SET status = 'verified' WHERE id = flagId
   
5. Trigger on_flag_status_change fires:
   → OLD.status = 'open', NEW.status = 'verified'
   → Reporter (A): points += 5
   → Actor (B, not reporter): points += 2
   → UPDATE public.users SET points = points + 5 WHERE id = A
   → UPDATE public.users SET points = points + 2 WHERE id = B
   
6. Realtime broadcasts { id: flagId, status: 'verified' }
   
7. All connected clients update their flag list
   → Flag color changes to green (verified)
   → TasksScreen badge decrements (fewer open flags)
   
8. User A sees a FlashBanner: "Your flag was verified! +5 points"
   (via `App.tsx` points polling logic)
   
9. User B sees the +2 points reflected in ProfileScreen (next refresh)
```

### Scenario 3: Owner Edits Their Own Flag

```
1. User A (reporter) opens their flag → FlagDetailModal
   
2. User A taps "Edit" → description form opens
   User A types a new description
   
3. App calls updateFlagDescription(flagId, newDescription)
   → UPDATE public.flags 
     SET description = newDescription 
     WHERE id = flagId
   
4. RLS check: user is the owner (auth.uid() === user_id) ✓
   
5. Updated flag appears in map (no Realtime broadcast for this edit,
   so the update is visible only to this client unless they refresh)
   
   [Note: Only status changes trigger Realtime broadcasts to save bandwidth]
```

---

## Row-Level Security (RLS) Explained

RLS is Postgres' native permission system. Every query runs as the authenticated user, and Postgres checks the RLS policy before allowing the operation.

**How it works:**

```sql
-- Policy: "Users can only read profiles"
CREATE POLICY "users readable by authenticated"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);  -- USING = condition must be true to return the row
```

When User A runs `SELECT * FROM public.users`, Postgres evaluates the USING clause for every row. Since USING is `true`, all rows are returned.

**More complex example (triage policy):**

```sql
-- Policy: "Any authenticated user can update status, but no other columns"
CREATE POLICY "flags status update by any authenticated"
  ON public.flags FOR UPDATE
  TO authenticated
  USING (true)  -- Allow the update to run
  WITH CHECK (  -- But only if the NEW row passes these checks
    user_id = (select user_id from public.flags where id = flags.id)
    AND lat = (select lat from public.flags where id = flags.id)
    -- ... all other columns must match the old row
  );
```

The WITH CHECK clause compares the new row against the old row in the database. If any non-status column differs, the update is rejected.

---

## Realtime Subscriptions

The app subscribes to changes on the `flags` table:

```typescript
supabase
  .channel('flags')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'flags' }, 
    (payload) => {
      // payload = { old: {...}, new: {id, status}, eventType: 'UPDATE' }
      // Only id + status are broadcast to save bandwidth
      handleFlagUpdated(payload.new);
    })
  .subscribe();
```

**What's broadcast:**
- `id` — which flag changed
- `status` — the new status

**Why not all columns?**
- Reduces bandwidth and latency
- Status is the only user-facing field that changes frequently
- Other edits (description, photo) are less common and don't need live broadcast

**Lifecycle:**
- Subscribe on app boot (in `FlagsProvider`)
- Unsubscribe on app close
- If offline, Realtime queues updates; when online again, the app refetches to catch up

---

## Triggers & Points Logic

### The Points Trigger

File: `supabase/schema.sql`, function `handle_flag_status_change()`.

**Runs:** AFTER UPDATE of the `status` column on `flags`.

**Logic:**

```sql
IF OLD.status = 'open' AND NEW.status = 'verified' THEN
  reporter_bonus := 5;    -- Reporter gets +5
  actor_bonus := 2;       -- Verifier gets +2
ELSIF OLD.status IN ('open', 'verified') AND NEW.status = 'resolved' THEN
  reporter_bonus := 10;   -- Reporter gets +10
  actor_bonus := 5;       -- Resolver gets +5
ELSE
  return new;             -- No other transitions award points (no refunds)
END IF;

IF reporter_bonus > 0 THEN
  UPDATE public.users SET points = points + reporter_bonus
  WHERE id = NEW.user_id;  -- Update the reporter
END IF;

IF actor_bonus > 0 AND auth.uid() IS NOT NULL AND auth.uid() != NEW.user_id THEN
  UPDATE public.users SET points = points + actor_bonus
  WHERE id = auth.uid();   -- Update the actor (verifier/resolver)
END IF;
```

**Key details:**
- **Forward-only:** Reversing (verified → open) or rejecting (open → rejected) awards nothing.
- **Self-action:** If the reporter is also the verifier, only the reporter bonus is awarded (no double dip).
- **Security definer:** The function runs with elevated privileges so it can update ANY user's points without RLS blocking it.

### Tying Points to UI

In `TasksScreen.tsx`, when a user changes a flag's status, the app displays:
```typescript
const delta = { 2: '+2', 5: '+5', 10: '+10' }[pointsAwarded];
setFlash(`Flag verified! ${delta} points`);
```

**⚠️ Keep these values in sync** — if the trigger award amounts change (in `supabase/schema.sql`), update the strings in the screen.

---

## Optional Columns (Feature Gates)

Some columns are **optional until a migration runs**. This allows rolling out features without breaking apps that haven't migrated yet.

| Column | Table | Gated By | Default Behavior |
|--------|-------|----------|------------------|
| `updated_at` | flags | 2026-05-23_data_layer_hardening.sql | NULL on old rows; new rows get now() via trigger |
| `context_tags` | flags | 2026-05-24_flag_context_tags.sql | NULL; when set, holds up to 5 vocabulary strings |

Apps tolerate NULL values (TS types mark them as optional), so old clients can work with new servers and vice versa.

---

## Testing Queries

### List all open flags (read by any user)

```sql
SELECT id, lat, lng, severity, description, status
FROM public.flags
WHERE status = 'open'
ORDER BY created_at DESC;
```

### List flags reported by a user

```sql
SELECT id, lat, lng, category, severity, status, created_at
FROM public.flags
WHERE user_id = '<user-id>'
ORDER BY created_at DESC;
```

### Award points to a user (admin only)

```sql
UPDATE public.users
SET points = points + 10
WHERE id = '<user-id>';
```

### Check RLS (as a specific user)

```
-- In Supabase SQL editor, click "Run as" → pick a user
-- Then run queries; RLS will be applied
SELECT * FROM public.flags LIMIT 5;
```

---

## Security & Privacy

1. **EXIF stripping:** Photos are stripped of GPS metadata before upload via `stripExifNative()` (native) or `stripExifWeb()` (web).
2. **PIPEDA (Canada):** Push tokens are PII; the app only collects them after explaining privacy (see `showPushExplanation()`).
3. **RLS:** All tables use RLS. Unauthenticated users can read data from the web (via explicit public policies) but cannot modify.
4. **Trigger security:** Points triggers run as `SECURITY DEFINER` so they can update users table without RLS blocking.
5. **Storage path-based RLS:** Photos can only be uploaded to a user's own folder (`<userId>/<file>`).

---

## Next Steps

- To add a new table, update `supabase/schema.sql` and define TS types in `src/types/database.ts`.
- To add an RLS policy, follow the naming pattern: `"<table> <action> <condition>"` (e.g., `"flags update own"`).
- To add a trigger, put it in `supabase/schema.sql` with a named function and idempotent CREATE OR REPLACE.
- To gate a feature on a migration, add a new migration file in `supabase/migrations/` and mark the TS type as optional until the migration is applied.

See **docs/CONTRIBUTING.md** for how to apply migrations locally.
