/**
 * Tests for src/lib/geocode.ts — the pure parsers. The network-touching
 * searchAddress() needs a fetch mock and we cover its error-degradation
 * path here too, but the bulk of the suite is parser coverage.
 *
 * What this protects against:
 *  - Nominatim returning a row missing lat/lng/display_name and us
 *    crashing or rendering a broken result.
 *  - Stringly-typed lat/lng coming through as NaN silently and pinning
 *    the map at (NaN, NaN).
 *  - A search of < 3 chars firing a wasted network request.
 *  - An AbortError surfacing as a UI alert instead of empty results.
 */

import { parseGeocodeRow, parseResults, searchAddress } from '../geocode';

describe('parseGeocodeRow', () => {
  it('parses a well-formed Nominatim row', () => {
    const row = {
      place_id: 12345,
      display_name: '1 Infinite Loop, Cupertino, CA',
      lat: '37.331741',
      lon: '-122.030333',
    };
    const out = parseGeocodeRow(row);
    expect(out).toEqual({
      id: '12345',
      displayName: '1 Infinite Loop, Cupertino, CA',
      lat: 37.331741,
      lng: -122.030333,
    });
  });

  it('returns null when display_name is missing', () => {
    expect(parseGeocodeRow({ lat: '1', lon: '2' })).toBeNull();
  });

  it('returns null when lat is missing or NaN', () => {
    expect(parseGeocodeRow({ display_name: 'x', lon: '2' })).toBeNull();
    expect(parseGeocodeRow({ display_name: 'x', lat: 'oops', lon: '2' })).toBeNull();
  });

  it('returns null when lon is missing or NaN', () => {
    expect(parseGeocodeRow({ display_name: 'x', lat: '1' })).toBeNull();
    expect(parseGeocodeRow({ display_name: 'x', lat: '1', lon: 'oops' })).toBeNull();
  });

  it('falls back to lat,lng concat when place_id is missing', () => {
    const out = parseGeocodeRow({
      display_name: 'no id',
      lat: '10',
      lon: '20',
    });
    expect(out?.id).toBe('10,20');
  });

  it('coerces a numeric place_id to a string for stable React keys', () => {
    const out = parseGeocodeRow({
      place_id: 7,
      display_name: 'x',
      lat: '1',
      lon: '2',
    });
    expect(typeof out?.id).toBe('string');
    expect(out?.id).toBe('7');
  });
});

describe('parseResults', () => {
  it('returns [] for non-array payload (e.g. an error object)', () => {
    expect(parseResults({ error: 'oops' })).toEqual([]);
    expect(parseResults(null)).toEqual([]);
    expect(parseResults('not even an array')).toEqual([]);
  });

  it('filters out malformed rows but keeps the good ones', () => {
    const payload = [
      { display_name: 'good', lat: '1', lon: '2', place_id: 1 },
      { display_name: 'no coords' },
      { lat: '3', lon: '4' }, // no display_name
      { display_name: 'good 2', lat: '5', lon: '6', place_id: 2 },
    ];
    const out = parseResults(payload);
    expect(out).toHaveLength(2);
    expect(out[0]?.displayName).toBe('good');
    expect(out[1]?.displayName).toBe('good 2');
  });
});

describe('searchAddress', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    (global as { fetch: typeof fetch }).fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('returns [] for queries shorter than 3 chars without calling fetch', async () => {
    const fetchMock = jest.fn();
    (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    expect(await searchAddress('')).toEqual([]);
    expect(await searchAddress('ab')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns parsed results on a successful fetch', async () => {
    const payload = [{ display_name: 'a', lat: '1', lon: '2', place_id: 1 }];
    (global as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    } as unknown as Response) as unknown as typeof fetch;

    const out = await searchAddress('cupertino');
    expect(out).toHaveLength(1);
    expect(out[0]?.displayName).toBe('a');
  });

  it('returns [] when fetch response is not ok', async () => {
    (global as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn(),
    } as unknown as Response) as unknown as typeof fetch;

    expect(await searchAddress('cupertino')).toEqual([]);
  });

  it('returns [] when fetch throws (network failure)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    (global as { fetch: typeof fetch }).fetch = jest
      .fn()
      .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    expect(await searchAddress('cupertino')).toEqual([]);
  });

  it('returns [] silently on AbortError without warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    (global as { fetch: typeof fetch }).fetch = jest
      .fn()
      .mockRejectedValue(abortErr) as unknown as typeof fetch;

    expect(await searchAddress('cupertino')).toEqual([]);
    // AbortError is expected during fast typing; shouldn't pollute logs.
    expect(warn).not.toHaveBeenCalled();
  });

  it('URL-encodes the query', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    } as unknown as Response);
    (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    await searchAddress('a b & c');
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('q=a%20b%20%26%20c');
  });

  it('sends the Flagstone User-Agent per Nominatim policy', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    } as unknown as Response);
    (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    await searchAddress('cupertino');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['User-Agent']).toMatch(/^Flagstone\//);
  });
});
