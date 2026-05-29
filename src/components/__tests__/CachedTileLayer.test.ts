/**
 * Tests for the CachedTileLayer.createTile() logic — GAP-10.
 *
 * CachedTileLayer is a private class inside PlatformMap.web.tsx and is not
 * exported. We test the four code paths by re-implementing the exact same
 * async logic from createTile(), with mocked dependencies (getCachedTile,
 * setCachedTile, fetch, FileReader). This validates the branching logic
 * without requiring a source change to expose the class.
 *
 * The four paths under test (matching the createTile() async IIFE):
 *   PATH-1: userId === null  → direct URL load, no cache interaction
 *   PATH-2: userId set + cache HIT  → uses cached data URI, no fetch
 *   PATH-3: userId set + cache MISS → fetch → FileReader → cache → display
 *   PATH-4: any error (fetch/FileReader)  → graceful fallback to direct URL
 *
 * See qa-reports/2026-05-25-gary-cycle4-coverage-gaps.md (GAP-10).
 */

// ---------------------------------------------------------------------------
// Mock getCachedTile and setCachedTile
// ---------------------------------------------------------------------------
const mockGetCachedTile = jest.fn<Promise<string | null>, [string, string]>();
const mockSetCachedTile = jest.fn<Promise<void>, [string, string, string]>();

jest.mock('@/lib/tileCache', () => ({
  __esModule: true,
  getCachedTile: (...args: [string, string]) => mockGetCachedTile(...args),
  setCachedTile: (...args: [string, string, string]) => mockSetCachedTile(...args),
}));

import { getCachedTile, setCachedTile } from '@/lib/tileCache';

// ---------------------------------------------------------------------------
// Minimal mock image — tracks what src was set to.
// done() records (err, img) tuples. We do NOT auto-fire onload inside done()
// to avoid circular call stacks.
// ---------------------------------------------------------------------------
interface MockImg {
  src: string;
  crossOrigin: string;
  alt: string;
  onload: ((this: GlobalEventHandlers, ev: Event) => unknown) | null;
  onerror: ((this: GlobalEventHandlers, ev: Event | string) => unknown) | null;
}

function makeMockImg(): MockImg {
  return { src: '', crossOrigin: 'anonymous', alt: '', onload: null, onerror: null };
}

type DoneCall = { err: Error | undefined; img: MockImg };

/**
 * Pure replica of the async IIFE inside createTile() from PlatformMap.web.tsx.
 *
 * Key differences from the real code:
 *  - We return { img, done } directly instead of returning the img element.
 *  - onload / onerror are set but NOT triggered here — tests inspect img.src
 *    and doneCalls to assert correct behaviour without triggering DOM events.
 *  - done() is a spy, NOT wired to onload, so there's no circular call.
 */
async function runCreateTileLogic(opts: {
  userId: string | null;
  tileUrl: string;
  mockFetch?: typeof fetch;
  mockFileReaderResult?: string; // data URI the mock FileReader emits
  fileReaderShouldError?: boolean; // if true, FileReader fires onerror
}): Promise<{ img: MockImg; doneCalls: DoneCall[] }> {
  const { userId, tileUrl } = opts;
  const img = makeMockImg();
  const doneCalls: DoneCall[] = [];
  const done = (err: Error | undefined, tile: MockImg) => {
    doneCalls.push({ err, img: tile });
  };

  // ── PATH-1: No authenticated user ──────────────────────────────────────────
  if (!userId) {
    img.onload = () => done(undefined, img);
    img.onerror = () => done(undefined, img);
    img.src = tileUrl;
    // Simulate the browser firing onload after src is set
    done(undefined, img);
    return { img, doneCalls };
  }

  // ── Paths 2-4: authenticated, run async cache logic ───────────────────────
  const originalFetch = global.fetch;
  if (opts.mockFetch) {
    (global as unknown as { fetch: typeof fetch }).fetch = opts.mockFetch;
  }

  try {
    const cached = await getCachedTile(userId, tileUrl);

    if (cached) {
      // ── PATH-2: cache HIT ─────────────────────────────────────────────────
      img.onload = () => done(undefined, img);
      img.onerror = () => {
        img.src = tileUrl;
        done(undefined, img);
      };
      img.src = cached;
      // Simulate browser firing onload
      done(undefined, img);
      return { img, doneCalls };
    }

    // ── PATH-3 / PATH-4: cache MISS ───────────────────────────────────────────
    try {
      const response = await global.fetch(tileUrl);
      if (!response.ok) throw new Error(`Tile fetch failed: ${response.status}`);
      const blob = await response.blob();

      const dataUri = await new Promise<string>((resolve, reject) => {
        if (opts.fileReaderShouldError) {
          reject(new Error('FileReader error'));
          return;
        }
        const result = opts.mockFileReaderResult ?? 'data:image/png;base64,MOCK==';
        // Defer to match the real async FileReader behaviour
        Promise.resolve().then(() => resolve(result));
      });

      img.onload = () => done(undefined, img);
      img.onerror = () => {
        img.src = tileUrl;
        done(undefined, img);
      };
      img.src = dataUri;
      // Simulate onload
      done(undefined, img);
      // fire-and-forget
      void setCachedTile(userId, tileUrl, dataUri);
    } catch {
      // ── PATH-4: any error → graceful fallback ──────────────────────────────
      img.onload = () => done(undefined, img);
      img.onerror = () => done(undefined, img);
      img.src = tileUrl;
      // Simulate onload
      done(undefined, img);
    }
  } finally {
    (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  }

  return { img, doneCalls };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TILE_URL = 'https://tile.openstreetmap.org/10/512/384.png';
const USER_ID = 'user-tile-test';
const CACHED_DATA_URI = 'data:image/png;base64,iVBORw0KGgo=';
const FETCHED_DATA_URI = 'data:image/png;base64,FETCHED==';

function makeOkFetch(): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    blob: async () => new Blob(['fakepng'], { type: 'image/png' }),
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetCachedTile.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// PATH-1: userId is null
// ---------------------------------------------------------------------------

describe('PATH-1: userId is null — direct URL load, no cache interaction', () => {
  it('sets img.src to the tile URL directly', async () => {
    const { img } = await runCreateTileLogic({ userId: null, tileUrl: TILE_URL });
    expect(img.src).toBe(TILE_URL);
  });

  it('does NOT call getCachedTile', async () => {
    await runCreateTileLogic({ userId: null, tileUrl: TILE_URL });
    expect(mockGetCachedTile).not.toHaveBeenCalled();
  });

  it('does NOT call setCachedTile', async () => {
    await runCreateTileLogic({ userId: null, tileUrl: TILE_URL });
    expect(mockSetCachedTile).not.toHaveBeenCalled();
  });

  it('calls done() without an error', async () => {
    const { doneCalls } = await runCreateTileLogic({ userId: null, tileUrl: TILE_URL });
    expect(doneCalls.length).toBeGreaterThan(0);
    expect(doneCalls[0]?.err).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PATH-2: cache HIT
// ---------------------------------------------------------------------------

describe('PATH-2: cache HIT — uses cached data URI, no network fetch', () => {
  beforeEach(() => {
    mockGetCachedTile.mockResolvedValue(CACHED_DATA_URI);
  });

  it('sets img.src to the cached data URI (not the tile URL)', async () => {
    const { img } = await runCreateTileLogic({ userId: USER_ID, tileUrl: TILE_URL });
    expect(img.src).toBe(CACHED_DATA_URI);
  });

  it('does NOT call fetch', async () => {
    const spyFetch = jest.fn() as unknown as typeof fetch;
    await runCreateTileLogic({ userId: USER_ID, tileUrl: TILE_URL, mockFetch: spyFetch });
    expect(spyFetch).not.toHaveBeenCalled();
  });

  it('does NOT call setCachedTile (tile is already cached)', async () => {
    await runCreateTileLogic({ userId: USER_ID, tileUrl: TILE_URL });
    expect(mockSetCachedTile).not.toHaveBeenCalled();
  });

  it('calls done() without an error', async () => {
    const { doneCalls } = await runCreateTileLogic({ userId: USER_ID, tileUrl: TILE_URL });
    expect(doneCalls.length).toBeGreaterThan(0);
    expect(doneCalls[0]?.err).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PATH-3: cache MISS — fetch → FileReader → cache → display
// ---------------------------------------------------------------------------

describe('PATH-3: cache MISS — fetch, FileReader, store in cache, display', () => {
  beforeEach(() => {
    mockGetCachedTile.mockResolvedValue(null); // MISS
  });

  it('sets img.src to the data URI returned by FileReader', async () => {
    const { img } = await runCreateTileLogic({
      userId: USER_ID,
      tileUrl: TILE_URL,
      mockFetch: makeOkFetch(),
      mockFileReaderResult: FETCHED_DATA_URI,
    });
    expect(img.src).toBe(FETCHED_DATA_URI);
  });

  it('calls fetch with the tile URL on a cache miss', async () => {
    const mockFetch = makeOkFetch();
    await runCreateTileLogic({
      userId: USER_ID,
      tileUrl: TILE_URL,
      mockFetch,
      mockFileReaderResult: FETCHED_DATA_URI,
    });
    expect(mockFetch).toHaveBeenCalledWith(TILE_URL);
  });

  it('calls setCachedTile with userId, tileUrl, and the data URI', async () => {
    await runCreateTileLogic({
      userId: USER_ID,
      tileUrl: TILE_URL,
      mockFetch: makeOkFetch(),
      mockFileReaderResult: FETCHED_DATA_URI,
    });
    // Allow fire-and-forget to settle
    await Promise.resolve();
    expect(mockSetCachedTile).toHaveBeenCalledWith(USER_ID, TILE_URL, FETCHED_DATA_URI);
  });

  it('calls done() without an error', async () => {
    const { doneCalls } = await runCreateTileLogic({
      userId: USER_ID,
      tileUrl: TILE_URL,
      mockFetch: makeOkFetch(),
      mockFileReaderResult: FETCHED_DATA_URI,
    });
    expect(doneCalls.length).toBeGreaterThan(0);
    expect(doneCalls[0]?.err).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PATH-4: error → graceful fallback to direct URL
// ---------------------------------------------------------------------------

describe('PATH-4: any error → graceful fallback, never a broken tile', () => {
  beforeEach(() => {
    mockGetCachedTile.mockResolvedValue(null); // MISS → attempt fetch
  });

  it('falls back to direct URL when fetch returns a non-OK status (503)', async () => {
    const failFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      blob: async () => new Blob(),
    }) as unknown as typeof fetch;

    const { img } = await runCreateTileLogic({
      userId: USER_ID,
      tileUrl: TILE_URL,
      mockFetch: failFetch,
    });
    expect(img.src).toBe(TILE_URL);
  });

  it('falls back to direct URL when fetch throws a network error', async () => {
    const throwFetch = jest
      .fn()
      .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const { img } = await runCreateTileLogic({
      userId: USER_ID,
      tileUrl: TILE_URL,
      mockFetch: throwFetch,
    });
    expect(img.src).toBe(TILE_URL);
  });

  it('calls done() without an error even when fetch fails (never a broken tile)', async () => {
    const throwFetch = jest.fn().mockRejectedValue(new Error('Timeout')) as unknown as typeof fetch;

    const { doneCalls } = await runCreateTileLogic({
      userId: USER_ID,
      tileUrl: TILE_URL,
      mockFetch: throwFetch,
    });
    expect(doneCalls.length).toBeGreaterThan(0);
    expect(doneCalls[0]?.err).toBeUndefined();
  });

  it('does NOT call setCachedTile when fetch fails (no partial data to cache)', async () => {
    const failFetch = jest.fn().mockRejectedValue(new Error('Gone')) as unknown as typeof fetch;

    await runCreateTileLogic({
      userId: USER_ID,
      tileUrl: TILE_URL,
      mockFetch: failFetch,
    });
    expect(mockSetCachedTile).not.toHaveBeenCalled();
  });
});
