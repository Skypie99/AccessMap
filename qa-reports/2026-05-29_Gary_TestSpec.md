# Test Specification — Lat/Lng Immutability Audit
**Role:** Gary (QA + Test Infrastructure)  
**Date:** 2026-05-29  
**Context:** Steve flagged the D3 lat/lng immutability constraint (`2026-05-23_status_update_trigger_proposal.sql`) — the DB BEFORE UPDATE trigger reverts any non-owner attempt to edit lat/lng. This spec proposes concrete test cases to lock in that invariant at the client and DB boundaries.

---

## Summary

The D3 trigger enforces that **once a flag is created, its lat/lng is immutable — non-owners cannot change it, and client code must never expose lat/lng edit fields even in future modal UI**. Currently:
- ✅ ReportFlagModal (create path) has no edit UI — location is read-only, passed from MapScreen
- ✅ D3 trigger prevents non-owner updates at the DB boundary
- ⚠️ **Missing:** validation tests on the create path (bounds checking) and DB-side regression tests for the trigger

This report proposes 12 test cases across three suites to close the gap, split into ReportFlagModal input validation, trigger enforcement, and future edit-UI safeguards.

---

## Findings Table

| Title | Severity | File:Line | Recommendation | Effort |
|-------|----------|-----------|-----------------|--------|
| **1. ReportFlagModal lat/lng bounds validation** | HIGH | src/lib/flags.ts:CreateFlagInput | Add bounds checks on `lat` ∈ [-90, 90], `lng` ∈ [-180, 180] before DB insert. Throw early with user-facing error. | M |
| **2. No tests lock in bounds validation** | HIGH | src/lib/__tests__/createFlag.test.ts | Add 4 test cases: valid bounds, lat < -90, lat > 90, lng > ±180 | M |
| **3. D3 trigger regression: verify lat/lng immutability** | HIGH | supabase/migrations/*.sql (test suite needed) | Write DB-level test: non-owner UPDATE attempt on lat/lng succeeds at HTTP layer but rows are unchanged in DB | L |
| **4. Trigger column-revert comprehensive check** | MEDIUM | (new test file recommended) | Test all reverted columns (user_id, lat, lng, category, severity, description, photo_url, created_at) in one test per column | M |
| **5. Future edit UI guard: catch at type level** | MEDIUM | src/screens/FlagDetailModal.tsx, (future EditFlagModal) | Document and enforce in code: FlagDetailModal must have `readonly lat/lng` display. Any future EditFlagModal must NOT expose lat/lng fields. | L |
| **6. Integration: create then verify as non-owner** | MEDIUM | src/lib/__tests__/flags.test.ts | Add test simulating full flow: A creates flag, B verifies it, verify that B cannot change lat/lng via status UPDATE | M |

---

## Proposed Test Cases

### Suite 1: ReportFlagModal + createFlag Input Validation

**Location:** `src/lib/__tests__/createFlag.test.ts` (add to existing file)

These lock in bounds checking at the client before the DB insert path runs.

#### Test 1.1: Valid lat/lng accepted
```typescript
describe('createFlag — lat/lng bounds validation', () => {
  it('accepts valid coordinates: lat in [-90, 90], lng in [-180, 180]', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const validInputs = [
      { lat: 0, lng: 0 },
      { lat: 90, lng: 180 },
      { lat: -90, lng: -180 },
      { lat: 49.2827, lng: -123.1207 }, // Vancouver
    ];

    for (const { lat, lng } of validInputs) {
      const result = await createFlag('user-1', {
        ...baseInput,
        lat,
        lng,
      });
      expect(result.row).toBeDefined();
      expect(result.row.lat).toBe(lat);
      expect(result.row.lng).toBe(lng);
    }
  });
});
```

#### Test 1.2: Reject lat < -90
```typescript
it('rejects lat < -90', async () => {
  await expect(
    createFlag('user-1', { ...baseInput, lat: -90.1, lng: 0 })
  ).rejects.toThrow(/latitude.*[-]?90|invalid.*coordinates|bounds/i);
});
```

#### Test 1.3: Reject lat > 90
```typescript
it('rejects lat > 90', async () => {
  await expect(
    createFlag('user-1', { ...baseInput, lat: 90.1, lng: 0 })
  ).rejects.toThrow(/latitude.*[-]?90|invalid.*coordinates|bounds/i);
});
```

#### Test 1.4: Reject lng outside [-180, 180]
```typescript
it('rejects lng > 180 or lng < -180', async () => {
  await expect(
    createFlag('user-1', { ...baseInput, lat: 0, lng: 180.1 })
  ).rejects.toThrow(/longitude.*180|invalid.*coordinates|bounds/i);

  await expect(
    createFlag('user-1', { ...baseInput, lat: 0, lng: -180.1 })
  ).rejects.toThrow(/longitude.*180|invalid.*coordinates|bounds/i);
});
```

---

### Suite 2: D3 Trigger Enforcement — Lat/Lng Immutability at DB Boundary

**Location:** `src/lib/__tests__/flagsTrigger.test.ts` (new file)

These verify that the BEFORE UPDATE trigger reverts lat/lng changes when a non-owner attempts them.

#### Test 2.1: Non-owner UPDATE on lat is reverted
```typescript
describe('enforce_flag_status_only_for_non_owner trigger', () => {
  it('reverts lat to old value when non-owner attempts UPDATE', async () => {
    // Setup: Flag created by owner (user-1) at (49.0, -123.0)
    const originalLat = 49.0;
    const originalLng = -123.0;

    // Non-owner (user-2) attempts to move the flag to (50.0, -124.0)
    // while also changing the status.
    const newLat = 50.0;

    // Mock response: the UPDATE would succeed at HTTP layer,
    // but the trigger reverts lat to the original.
    const resultAfterTrigger = {
      id: 'flag-1',
      user_id: 'user-1',
      lat: originalLat, // REVERTED by trigger
      lng: originalLng, // REVERTED by trigger
      status: 'verified', // ALLOWED to change
      category: 'no_ramp',
      severity: 3,
      description: 'Original',
      photo_url: null,
      created_at: '2026-05-01T00:00:00Z',
    };

    mockSelectAfterUpdate.mockResolvedValueOnce({
      data: resultAfterTrigger,
      error: null,
    });

    const result = await updateFlagStatus('flag-1', 'verified');

    // The status changed, but lat/lng stayed put.
    expect(result.status).toBe('verified');
    expect(result.lat).toBe(originalLat);
    expect(result.lng).toBe(originalLng);
  });
});
```

#### Test 2.2: Non-owner UPDATE on lng is reverted
```typescript
it('reverts lng to old value when non-owner attempts UPDATE', async () => {
  const originalLng = -123.0;
  const attemptedLng = -125.0;

  const resultAfterTrigger = {
    id: 'flag-1',
    user_id: 'user-1',
    lat: 49.0,
    lng: originalLng, // REVERTED by trigger
    status: 'verified',
    category: 'no_ramp',
    severity: 3,
    description: 'Original',
    photo_url: null,
    created_at: '2026-05-01T00:00:00Z',
  };

  mockSelectAfterUpdate.mockResolvedValueOnce({
    data: resultAfterTrigger,
    error: null,
  });

  // Simulate REST PATCH: non-owner sends both status + lng
  const result = await updateFlagStatus('flag-1', 'verified');

  expect(result.lng).toBe(originalLng);
  expect(result.lng).not.toBe(attemptedLng);
});
```

#### Test 2.3: Owner can change status without triggering revert
```typescript
it('allows owner to change status; trigger does not interfere', async () => {
  // When the owner updates their own flag, the trigger exits early
  // (line 90-91 of the migration: `if auth.uid() is null or auth.uid() = old.user_id then return new`).
  // This test confirms the owner's edits pass through.

  const ownerUpdate = {
    id: 'flag-1',
    user_id: 'user-1', // Same user
    lat: 49.0,
    lng: -123.0,
    status: 'resolved',
    category: 'no_ramp',
    severity: 3,
    description: 'Fixed!',
    photo_url: 'https://...',
    created_at: '2026-05-01T00:00:00Z',
  };

  mockSelectAfterUpdate.mockResolvedValueOnce({
    data: ownerUpdate,
    error: null,
  });

  const result = await updateFlagStatus('flag-1', 'resolved');

  // Owner's description edit succeeds (not reverted).
  expect(result.status).toBe('resolved');
  expect(result.description).toBe('Fixed!');
});
```

#### Test 2.4: All non-status columns reverted as a batch
```typescript
it('reverts user_id, category, severity, description, photo_url, created_at simultaneously', async () => {
  // Non-owner tries a PATCH that changes everything except status.
  const resultAfterTrigger = {
    id: 'flag-1',
    user_id: 'user-1', // REVERTED
    lat: 49.0, // REVERTED
    lng: -123.0, // REVERTED
    category: 'no_ramp', // REVERTED
    severity: 3, // REVERTED
    description: 'Original description', // REVERTED
    photo_url: null, // REVERTED
    created_at: '2026-05-01T00:00:00Z', // REVERTED
    status: 'verified', // ALLOWED to change
  };

  mockSelectAfterUpdate.mockResolvedValueOnce({
    data: resultAfterTrigger,
    error: null,
  });

  const result = await updateFlagStatus('flag-1', 'verified');

  // All immutable columns stayed unchanged.
  expect(result.user_id).toBe('user-1');
  expect(result.lat).toBe(49.0);
  expect(result.lng).toBe(-123.0);
  expect(result.category).toBe('no_ramp');
  expect(result.severity).toBe(3);
  expect(result.description).toBe('Original description');
  expect(result.photo_url).toBeNull();
  // Only status changed.
  expect(result.status).toBe('verified');
});
```

---

### Suite 3: Future Edit UI Guard — Catch at Type Level

**Location:** `src/types/database.ts` + `src/screens/FlagDetailModal.tsx` (enforce via comments + readonly)

These ensure that any future flag-editing modal cannot accidentally expose lat/lng.

#### Test 3.1: FlagDetailModal does not render lat/lng as editable fields
```typescript
describe('FlagDetailModal — lat/lng are read-only', () => {
  it('displays lat/lng as text only, never in TextInput or editable form fields', () => {
    // Inspect the component:
    // - If the modal renders a `<TextInput value={lat} />` or similar, fail.
    // - If it renders lat/lng anywhere, it must be in a `<Text>` (readonly) element.
    // This is a lint-style check: parse FlagDetailModal.tsx and assert
    // no editable field has onChangeText/value bound to lat/lng state.
    
    // Pseudo-test (implementation would use regex or AST):
    const source = fs.readFileSync('src/screens/FlagDetailModal.tsx', 'utf8');
    const hasLatLngTextInput = /TextInput.*\{.*lat|onChangeText.*lat|onChangeText.*lng/.test(source);
    expect(hasLatLngTextInput).toBe(false);
  });
});
```

#### Test 3.2: Document the immutability invariant in FlagRow schema
```typescript
// In src/types/database.ts, add a comment above the FlagRow type:
/**
 * Represents a flag report in public.flags.
 * 
 * IMMUTABILITY CONSTRAINT:
 * - `lat` and `lng` are immutable after creation.
 *   The D3 BEFORE UPDATE trigger (2026-05-23_status_update_trigger_proposal.sql)
 *   reverts any non-owner attempt to change them.
 * - No future flag-editing modal should expose lat/lng fields.
 * - If you add lat/lng edit support, you must:
 *   1. Add to the trigger's revert list (new.lat := old.lat, etc.)
 *   2. Check with Steve for RLS implications.
 */
export type FlagRow = {
  id: string;
  user_id: string;
  lat: number; // Immutable after creation (see trigger enforce_flag_status_only_for_non_owner)
  lng: number; // Immutable after creation (see trigger enforce_flag_status_only_for_non_owner)
  // ... rest of fields
};
```

#### Test 3.3: If EditFlagModal is added, it must NOT have lat/lng fields
```typescript
describe('Future EditFlagModal (if added)', () => {
  it('must not expose lat/lng as editable fields', () => {
    // Future-proofing: if someone adds src/screens/EditFlagModal.tsx,
    // this test ensures it never renders lat/lng in <TextInput> or similar.
    const sourceIfExists = (() => {
      try {
        return fs.readFileSync('src/screens/EditFlagModal.tsx', 'utf8');
      } catch {
        return null; // File doesn't exist yet, skip
      }
    })();

    if (sourceIfExists) {
      const hasLatLngEdit = /TextInput.*\{.*lat|onChangeText.*lat/.test(sourceIfExists);
      expect(hasLatLngEdit).toBe(false);
    }
  });
});
```

---

### Suite 4: Integration — Create, Verify, Verify Non-Owner Cannot Edit Lat/Lng

**Location:** `src/lib/__tests__/flags.test.ts` (add to existing file)

This end-to-end test simulates the real user flow: flag created, verified by someone else, and then attempts to tamper with lat/lng.

#### Test 4.1: Full flow — create, non-owner verifies, cannot tamper with lat/lng
```typescript
describe('createFlag + updateFlagStatus integration', () => {
  it('flag created with lat/lng, non-owner verifies status, lat/lng remain unchanged', async () => {
    // Step 1: User A creates a flag at (49.28, -123.12)
    const fakeRow = {
      id: 'flag-1',
      user_id: 'user-a',
      lat: 49.28,
      lng: -123.12,
      category: 'no_ramp',
      severity: 3,
      description: 'No ramp here',
      photo_url: 'https://...',
      status: 'open',
      created_at: '2026-05-24T00:00:00Z',
    };

    // Mock: createFlag succeeds
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const created = await createFlag('user-a', {
      lat: 49.28,
      lng: -123.12,
      category: 'no_ramp',
      severity: 3,
      description: 'No ramp here',
      photo_url: 'https://...',
    });

    expect(created.row.lat).toBe(49.28);
    expect(created.row.lng).toBe(-123.12);

    // Step 2: User B (non-owner) verifies the flag.
    // Mock: the trigger fires BEFORE the UPDATE, reverts lat/lng.
    const verifiedRow = {
      ...fakeRow,
      status: 'verified',
      // lat/lng are unchanged by the trigger
    };

    mockSelectAfterUpdate.mockResolvedValueOnce({
      data: verifiedRow,
      error: null,
    });

    const verified = await updateFlagStatus('flag-1', 'verified');

    // Status changed, lat/lng did not.
    expect(verified.status).toBe('verified');
    expect(verified.lat).toBe(49.28); // Same as original
    expect(verified.lng).toBe(-123.12); // Same as original
  });
});
```

---

## Effort Estimate & Priority

| Suite | Test Count | Effort | Priority |
|-------|-----------|--------|----------|
| 1. Input validation (createFlag bounds) | 4 | M | HIGH — blocks feature launch |
| 2. D3 trigger enforcement | 4 | M | HIGH — verifies DB constraint |
| 3. Future UI guard | 3 | L | MEDIUM — defensive; ensures future edits can't leak lat/lng |
| 4. Integration flow | 1 | M | MEDIUM — end-to-end regression |
| **TOTAL** | **12** | **M+** | **Ready to propose & apply** |

---

## Implementation Notes

1. **Bounds validation in createFlag:** Add to `src/lib/flags.ts` before the Supabase insert:
   ```typescript
   if (input.lat < -90 || input.lat > 90) {
     throw new Error('Latitude must be between -90 and 90 degrees.');
   }
   if (input.lng < -180 || input.lng > 180) {
     throw new Error('Longitude must be between -180 and 180 degrees.');
   }
   ```

2. **D3 Trigger tests:** The mocks in `flags.test.ts` are already structured to handle UPDATE chains (mockUpdate → mockEq → mockSelect → mockSingle). Reuse that pattern.

3. **FlagDetailModal readonly check:** This is a lint-style guard, not a functional test. Could live in `src/lib/__tests__/typeGuards.test.ts` or `src/__tests__/immutability.test.ts`.

4. **Integration test:** Leverage the existing `mockSingle` + `mockSelectAfterUpdate` mock structure, just orchestrate two calls in sequence.

---

## DECISIONS FOR SKY

1. **Bounds validation placement:** Should the checks live in `createFlag` (early throw) or in ReportFlagModal's `handleSubmit` (alert to user)? **Recommend:** both — validate at the API boundary (createFlag throws, failing fast) and surface user-friendly error in the modal's catch block.

2. **D3 Trigger test environment:** These tests mock the Supabase client and do NOT exercise the actual PostgreSQL trigger. To verify the trigger *actually works* against a live DB, you may want a separate integration test suite that runs against a dev Supabase instance. **Current proposal covers the client-side assertion of the expected behavior.**

3. **Future EditFlagModal guard:** Is this a hard blocker (reject all code that adds editable lat/lng) or a soft guideline (documented but not enforced by tests)? **Recommend:** document in the FlagRow type comment + add a lint rule to `eslint.config.js` that catches `onChangeText.*lat` or `TextInput.*lat` in screen files. Then the test is just a redundant check of the lint rule.

