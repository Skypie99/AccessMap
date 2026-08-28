/**
 * SR-050 — the owner-side takedown actually removes the photo.
 *
 * `11_SR050_TAKEDOWN_GAP.md`: deleting a flag left every photo publicly
 * fetchable forever, at a URL anyone who had seen it still held. **A takedown
 * that leaves the reported photo up is not a takedown** — which is why this is
 * a leg of Apple 1.2(b), not tidiness.
 *
 * WHAT MADE THIS HARD, because the tests only make sense against it: there is
 * no path stored anywhere. `flags.photo_url` and `flag_photos.url` are public
 * URLs; the `path` half of the upload tuple is used for failed-submit cleanup
 * and discarded. There is no SELECT policy on `storage.objects`, so
 * `storage.list()` returns nothing either. Sky ruled (§SKY-6a) for a single
 * fail-closed derivation helper rather than a `storage_path` column, because
 * the column would have shipped dark until she ran SQL and would never have
 * reclaimed the photos already uploaded.
 *
 * So the assertions below are mostly about REFUSING. A derivation that returns
 * null deletes nothing, and that is the correct outcome — the failure mode of a
 * wrong guess is destroying someone else's photo, which is far worse than the
 * orphan a null leaves behind.
 */
import { FLAG_PHOTOS_BUCKET, deleteFlag, storagePathFromPublicUrl } from '../flags';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '99999999-9999-4999-8999-999999999999';
const BASE = `https://abc.supabase.co/storage/v1/object/public/${FLAG_PHOTOS_BUCKET}`;

const mockRemove = jest.fn();
const mockStorageFrom = jest.fn((_b: string) => ({ remove: mockRemove }));
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...a: unknown[]) => mockFrom(...a),
    storage: { from: (b: string) => mockStorageFrom(b) },
    auth: { getUser: () => mockGetUser() },
  },
}));

jest.mock('../analytics', () => ({
  __esModule: true,
  trackEvent: (...a: unknown[]) => mockTrackEvent(...a),
}));

/** Wires `from('flags')`, `from('flag_photos')` and the delete chain. */
function wireTables(opts: {
  photoUrl?: string | null;
  junction?: { url: string | null }[];
  deleteError?: { message: string } | null;
  /** Rows the delete reports back. [] means RLS refused it (see deleteFlag). */
  deleteRows?: { id: string }[];
}) {
  const deleteEq = jest.fn().mockReturnValue({
    select: async () => ({
      data: opts.deleteRows ?? [{ id: 'flag-1' }],
      error: opts.deleteError ?? null,
    }),
  });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'flags') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { photo_url: opts.photoUrl ?? null }, error: null }),
          }),
        }),
        delete: () => ({ eq: deleteEq }),
      };
    }
    if (table === 'flag_photos') {
      return { select: () => ({ eq: async () => ({ data: opts.junction ?? [], error: null }) }) };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { deleteEq };
}

let warn: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockRemove.mockResolvedValue({ data: null, error: null });
  mockGetUser.mockResolvedValue({ data: { user: { id: UID } } });
});
afterEach(() => warn.mockRestore());

describe('storagePathFromPublicUrl — the one carve-out, and it fails closed', () => {
  it('recovers the object key from a normal public URL', () => {
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1700000000000.jpg`, UID)).toBe(
      `${UID}/1700000000000.jpg`,
    );
  });

  it('ignores a query string and a fragment — both are plausible on a CDN', () => {
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1.jpg?width=200&t=9`, UID)).toBe(`${UID}/1.jpg`);
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1.jpg#frag`, UID)).toBe(`${UID}/1.jpg`);
  });

  it('decodes percent escapes so an encoded key is not deleted under the wrong name', () => {
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/my%20photo.jpg`, UID)).toBe(
      `${UID}/my photo.jpg`,
    );
  });

  /**
   * ⚠ THE ASSERTIONS THAT MATTER MOST. Each of these is a shape we do not
   * understand, and the only safe answer to "which object is this?" when you do
   * not know is to delete nothing.
   */
  it('refuses a URL that is not a public flag-photos object', () => {
    expect(storagePathFromPublicUrl('https://example.com/some/photo.jpg', UID)).toBeNull();
    expect(storagePathFromPublicUrl(`${BASE.replace('/public/', '/sign/')}/${UID}/1.jpg`, UID)).toBeNull();
    expect(storagePathFromPublicUrl('', UID)).toBeNull();
  });

  it('refuses a URL with the marker but nothing after it', () => {
    expect(storagePathFromPublicUrl(`${BASE}/`, UID)).toBeNull();
  });

  it('refuses a malformed percent escape rather than guessing', () => {
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/%E0%A4%A.jpg`, UID)).toBeNull();
  });

  it("refuses another user's folder — never delete on a guess", () => {
    // Storage RLS would refuse this server-side too. Belt and braces: a client
    // that tries is a bug, and this turns it into a visible one.
    expect(storagePathFromPublicUrl(`${BASE}/${OTHER}/1.jpg`, UID)).toBeNull();
  });

  /** Sky's amendment: "a null return must be LOUD". */
  it('every refusal warns AND emits an event — a silent null hides the hole', () => {
    storagePathFromPublicUrl('https://example.com/x.jpg', UID);
    expect(warn).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith('storage_path_derivation_failed', {
      reason: 'marker_absent',
    });
  });

  it('the event carries no URL and no ids — the URL embeds the owner uid', () => {
    storagePathFromPublicUrl(`${BASE}/${OTHER}/1.jpg`, UID);
    const props = mockTrackEvent.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(Object.keys(props)).toEqual(['reason']);
    expect(JSON.stringify(props)).not.toContain(OTHER);
    expect(JSON.stringify(props)).not.toContain(UID);
  });
});

describe('deleteFlag removes the flag AND its photos', () => {
  it('deletes a single legacy photo_url', async () => {
    wireTables({ photoUrl: `${BASE}/${UID}/legacy.jpg` });
    await deleteFlag('flag-1');
    expect(mockStorageFrom).toHaveBeenCalledWith(FLAG_PHOTOS_BUCKET);
    expect(mockRemove).toHaveBeenCalledWith([`${UID}/legacy.jpg`]);
  });

  it('deletes EVERY photo on a multi-photo flag, deduping the shared one', async () => {
    // A flag's first photo legitimately appears in both places, so the legacy
    // column and the junction overlap. Passing the same key twice to remove()
    // is not harmful but it is sloppy, and a dedupe bug here would be invisible.
    wireTables({
      photoUrl: `${BASE}/${UID}/a.jpg`,
      junction: [
        { url: `${BASE}/${UID}/a.jpg` },
        { url: `${BASE}/${UID}/b.jpg` },
        { url: `${BASE}/${UID}/c.jpg` },
      ],
    });
    await deleteFlag('flag-1');
    const paths = mockRemove.mock.calls[0][0] as string[];
    expect([...paths].sort()).toEqual([`${UID}/a.jpg`, `${UID}/b.jpg`, `${UID}/c.jpg`]);
  });

  it('gathers the URLs BEFORE deleting the row — afterwards they are gone', async () => {
    const order: string[] = [];
    const deleteEq = jest.fn().mockReturnValue({
      select: async () => {
        order.push('row-delete');
        return { data: [{ id: 'flag-1' }], error: null };
      },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'flags') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                order.push('read-photo-url');
                return { data: { photo_url: `${BASE}/${UID}/a.jpg` }, error: null };
              },
            }),
          }),
          delete: () => ({ eq: deleteEq }),
        };
      }
      return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
    });
    mockRemove.mockImplementation(async () => {
      order.push('storage-remove');
      return { data: null, error: null };
    });

    await deleteFlag('flag-1');
    expect(order).toEqual(['read-photo-url', 'storage-remove', 'row-delete']);
  });

  it('skips Storage entirely for a flag with no photos', async () => {
    wireTables({ photoUrl: null, junction: [] });
    await deleteFlag('flag-1');
    expect(mockRemove).not.toHaveBeenCalled();
  });

  /**
   * The ADMIN path. `flag-photos owner delete` is owner-only, so an admin
   * taking down someone else's flag gets the row deleted and the Storage delete
   * refused. That is the half a Sky-applied migration closes (§C-12); until
   * then this must degrade rather than throw, because the row delete is the
   * contract AdminScreen surfaces to the user.
   */
  it('does not delete the row when Storage refuses the photo', async () => {
    const { deleteEq } = wireTables({ photoUrl: `${BASE}/${UID}/a.jpg` });
    mockRemove.mockResolvedValue({ data: null, error: { message: 'new row violates RLS' } });
    await expect(deleteFlag('flag-1')).rejects.toMatchObject({ message: 'new row violates RLS' });
    expect(mockRemove).toHaveBeenCalled();
    expect(deleteEq).not.toHaveBeenCalled();
  });

  it('does not delete the row when the photo lookup itself throws', async () => {
    mockGetUser.mockRejectedValue(new Error('auth down'));
    const { deleteEq } = wireTables({ photoUrl: `${BASE}/${UID}/a.jpg` });
    await expect(deleteFlag('flag-1')).rejects.toThrow('auth down');
    expect(deleteEq).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('a failed row delete still throws — that error is the user-visible one', async () => {
    wireTables({ photoUrl: null, junction: [], deleteError: { message: 'RLS violation' } });
    await expect(deleteFlag('flag-1')).rejects.toMatchObject({ message: 'RLS violation' });
    // The row survived, so its photos must NOT be swept.
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('deletes nothing when a URL cannot be derived — an orphan beats a wrong delete', async () => {
    wireTables({ photoUrl: 'https://cdn.example.com/opaque/key', junction: [] });
    await deleteFlag('flag-1');
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith('storage_path_derivation_failed', {
      reason: 'marker_absent',
    });
  });
});

describe('the carve-out stayed narrow (§SKY-6a)', () => {
  it('is the only URL→path derivation in the codebase', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const SRC = path.join(__dirname, '..', '..');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
        return /\.tsx?$/.test(e.name) ? [p] : [];
      });

    // The marker literal is what a second parser would have to contain.
    //
    // Security audit 2026-07-31: the canonical definition moved from `flags.ts`
    // to `remoteImageUrl.ts` so the render-side allow-list (TB-3/IO-3) and the
    // SR-050 path derivation share ONE source of truth instead of two copies
    // that could drift. `flags.ts` now imports `STORAGE_PUBLIC_PREFIX`. The
    // invariant this test protects is unchanged and just as strict: exactly one
    // file in `src/` may contain the literal, and it is the one named here.
    const OWNER = `${path.sep}remoteImageUrl.ts`;
    const offenders = walk(SRC).filter(
      (f) => !f.endsWith(OWNER) && fs.readFileSync(f, 'utf8').includes('/storage/v1/object/public/'),
    );
    expect(offenders).toEqual([]);
  });
});

/**
 * A REFUSED DELETE MUST NOT LOOK LIKE A COMPLETED ONE.
 *
 * Postgres RLS does not raise on a denied DELETE — it filters the row out and
 * reports success over zero rows. So before `.select('id')`, a caller with no
 * right to a flag got a clean resolve: `onDeleted()` fired, the UI dropped the
 * row, and the user was told their takedown worked while the flag sat untouched
 * in the table. These pin the distinction.
 */
describe('deleteFlag tells a refusal apart from a success', () => {
  it('throws the house permission error when the delete matched no rows', async () => {
    wireTables({ photoUrl: null, junction: [], deleteRows: [] });
    await expect(deleteFlag('flag-1')).rejects.toMatchObject({ code: '42501' });
  });

  it('leaves the photos alone when the row delete was refused', async () => {
    wireTables({ photoUrl: `${BASE}/${UID}/a.jpg`, deleteRows: [] });
    await expect(deleteFlag('flag-1')).rejects.toMatchObject({ code: '42501' });
    // Exact cleanup is intentionally consumed before the relational delete so
    // a cascade cannot erase canonical cleanup evidence before it is used.
    expect(mockRemove).toHaveBeenCalledWith([`${UID}/a.jpg`]);
  });

  it('resolves normally when the delete reports the row back', async () => {
    wireTables({ photoUrl: null, junction: [], deleteRows: [{ id: 'flag-1' }] });
    await expect(deleteFlag('flag-1')).resolves.toBeUndefined();
  });
});
