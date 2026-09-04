/**
 * The legacy URL helper still protects failed-upload cleanup. Ordinary report
 * deletion moved to the server-authorized canonical route in D1F4R3, so these
 * tests also pin that it no longer treats URL parsing as delete authority.
 */
import { deleteFlag, storagePathFromPublicUrl } from '../flags';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '99999999-9999-4999-8999-999999999999';
const BASE = 'https://abc.supabase.co/storage/v1/object/public/flag-photos';
const mockInvoke = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));
jest.mock('../analytics', () => ({
  __esModule: true,
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

let warn: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockInvoke.mockResolvedValue({ data: { status: 'deleted' }, error: null });
});
afterEach(() => warn.mockRestore());

describe('storagePathFromPublicUrl — the one legacy cleanup carve-out', () => {
  it('recovers an exact path from the normal fixed public object form', () => {
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1700000000000.jpg`, UID)).toBe(`${UID}/1700000000000.jpg`);
  });

  it('ignores query and fragment components that are not part of the object key', () => {
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1.jpg?width=200&t=9`, UID)).toBe(`${UID}/1.jpg`);
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/1.jpg#frag`, UID)).toBe(`${UID}/1.jpg`);
  });

  it('refuses unrecognized, malformed, and foreign-user URL shapes', () => {
    expect(storagePathFromPublicUrl('https://example.com/some/photo.jpg', UID)).toBeNull();
    expect(storagePathFromPublicUrl(`${BASE}/${UID}/%E0%A4%A.jpg`, UID)).toBeNull();
    expect(storagePathFromPublicUrl(`${BASE}/${OTHER}/1.jpg`, UID)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('emits no URL or identifier when a derivation refusal is recorded', () => {
    storagePathFromPublicUrl(`${BASE}/${OTHER}/1.jpg`, UID);
    expect(mockTrackEvent).toHaveBeenCalledWith('storage_path_derivation_failed', { reason: 'foreign_folder' });
    expect(JSON.stringify(mockTrackEvent.mock.calls.at(-1)?.[1])).not.toContain(UID);
    expect(JSON.stringify(mockTrackEvent.mock.calls.at(-1)?.[1])).not.toContain(OTHER);
  });
});

describe('D1F4R3 ordinary report deletion', () => {
  it('uses the canonical server route instead of a client Storage remove', async () => {
    await deleteFlag('00000000-0000-4000-8000-000000000001');
    expect(mockInvoke).toHaveBeenCalledWith('delete-flag', {
      body: { flagId: '00000000-0000-4000-8000-000000000001' },
    });
  });

  it('does not treat a generic route success as a completed deletion', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'error' }, error: null });
    await expect(deleteFlag('00000000-0000-4000-8000-000000000002')).rejects.toThrow('confirmed terminal result');
  });
});
