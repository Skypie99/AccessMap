/**
 * Prompt B B2/Fable B-UX-002 — FlagDetailModal's gallery loading/error/Retry
 * contract.
 *
 * The defect: `listFlagPhotos` used to convert a missing-relation failure to
 * `[]`, and even a genuine thrown error was only `console.warn`ed — no error
 * state existed at all. Worse, the load effect never reset `flagPhotos` when
 * switching to a different shown flag, so a failed (or slow) load for flag B
 * could leave flag A's photos rendered under flag B's details. This suite
 * proves: LOADING is a real, empty-distinct state; a thrown error renders an
 * owned, accessible banner — never "No photos"; Retry re-runs the same
 * loader and recovers in place; and switching flags synchronously clears
 * both photos and any stale error before the new load even starts, with a
 * late-arriving stale completion rejected.
 *
 * Mock scaffolding mirrors FlagDetailModal.sheetPresentation.test.tsx (every
 * I/O edge the sheet touches on open) — only `@/lib/photos` differs, made
 * controllable per test instead of fixed to `[]`.
 */
import React from 'react';
import { fireEvent, render, waitFor, act } from '@testing-library/react-native';
import FlagDetailModal from '../FlagDetailModal';
import PhotoGallery from '../PhotoGallery';
import { GALLERY_LOAD_FAILED_TEXT } from '@/lib/copy';
import type { FlagRow } from '@/types/database';

const PhotoGalleryInner = (PhotoGallery as unknown as { type: React.ComponentType }).type;

let mockAuthUser: { id: string } | null = { id: 'user-1' };
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: mockAuthUser }) }));
jest.mock('@/lib/admin', () => ({ useIsAdmin: () => false }));
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
jest.mock('@/lib/statusHistory', () => ({
  listStatusHistory: jest.fn().mockResolvedValue([]),
  formatHistoryEntry: jest.fn(() => 'Reported'),
}));
jest.mock('@/lib/watchedFlags', () => ({
  loadWatched: jest.fn().mockResolvedValue([]),
  addWatched: jest.fn(),
  removeWatched: jest.fn(),
}));
jest.mock('@/lib/recentlyViewed', () => ({ recordView: jest.fn() }));
jest.mock('@/lib/hiddenContent', () => ({
  loadHidden: jest.fn().mockResolvedValue([]),
  filterHidden: jest.fn((rows: unknown[]) => rows),
  filterBlockedAuthors: jest.fn((rows: unknown[]) => rows),
  hideContent: jest.fn(),
}));
jest.mock('@/lib/reopenRequests', () => ({
  hasRequestedReopen: jest.fn().mockResolvedValue(false),
  recordReopenRequest: jest.fn(),
}));
jest.mock('@/lib/disputeRequests', () => ({
  hasRequestedDispute: jest.fn().mockResolvedValue(false),
  recordDisputeRequest: jest.fn(),
}));
jest.mock('@/hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    loading: false,
    error: null,
    tableNotReady: false,
    addComment: jest.fn(),
    deleteComment: jest.fn(),
    refetch: jest.fn(),
  }),
}));

const mockListFlagPhotos = jest.fn();
jest.mock('@/lib/photos', () => ({
  listFlagPhotos: (...args: unknown[]) => mockListFlagPhotos(...args),
  addFlagPhoto: jest.fn(),
}));

beforeEach(() => {
  mockAuthUser = { id: 'user-1' };
  mockListFlagPhotos.mockReset();
});

const FLAG_A: FlagRow = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'someone-else',
  category: 'sidewalk',
  severity: 3,
  status: 'open',
  description: 'Cracked kerb ramp',
  lat: 49.888,
  lng: -119.496,
  photo_url: null,
  photo_alt: null,
  created_at: '2026-08-01T12:00:00.000Z',
} as unknown as FlagRow;

const FLAG_B: FlagRow = { ...FLAG_A, id: '22222222-2222-4222-8222-222222222222' };

const PHOTO_A = { url: 'https://cdn/flag-a-1.jpg', position: 0, alt_text: null };
const PHOTO_B = { url: 'https://cdn/flag-b-1.jpg', position: 0, alt_text: null };

function renderDetail(flag: FlagRow) {
  return render(
    <FlagDetailModal
      visible
      flag={flag}
      onClose={jest.fn()}
      onChanged={jest.fn()}
      onDeleted={jest.fn()}
      onViewOnMap={jest.fn()}
    />,
  );
}

describe('FlagDetailModal gallery — loading is real and empty-distinct', () => {
  it('shows a loading indicator, not the real-empty state, while the fetch is in flight', async () => {
    let resolve!: (photos: typeof PHOTO_A[]) => void;
    mockListFlagPhotos.mockReturnValue(new Promise((r) => { resolve = r; }));

    const screen = renderDetail(FLAG_A);
    expect(screen.getByLabelText('Loading photos')).toBeTruthy();
    expect(screen.queryByText(GALLERY_LOAD_FAILED_TEXT)).toBeNull();
    expect(screen.UNSAFE_queryByType(PhotoGalleryInner)).toBeNull();

    await act(async () => {
      resolve([PHOTO_A]);
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.UNSAFE_getByType(PhotoGalleryInner)).toBeTruthy());
  });
});

describe('FlagDetailModal gallery — a thrown error is owned, accessible, and never "No photos"', () => {
  it('renders the fixed failure copy as both visible text and accessible name, not the empty placeholder', async () => {
    mockListFlagPhotos.mockRejectedValueOnce(new Error('column flag_photos.object_key does not exist'));

    const screen = renderDetail(FLAG_A);
    await waitFor(() => expect(screen.getByText(GALLERY_LOAD_FAILED_TEXT)).toBeTruthy());
    expect(screen.getByLabelText(GALLERY_LOAD_FAILED_TEXT)).toBeTruthy();
    // Never the real-empty placeholder's label, on a failure.
    expect(screen.queryByLabelText('No photos attached')).toBeNull();
    expect(screen.UNSAFE_queryByType(PhotoGalleryInner)).toBeNull();
  });

  it('Retry re-runs the same loader and recovers in place, clearing the error', async () => {
    mockListFlagPhotos
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([PHOTO_A]);

    const screen = renderDetail(FLAG_A);
    const retry = await screen.findByLabelText(GALLERY_LOAD_FAILED_TEXT);

    fireEvent.press(retry);
    await waitFor(() => expect(screen.UNSAFE_getByType(PhotoGalleryInner)).toBeTruthy());
    expect(screen.queryByText(GALLERY_LOAD_FAILED_TEXT)).toBeNull();
    expect(screen.UNSAFE_getByType(PhotoGalleryInner).props.photos).toEqual([PHOTO_A]);
    expect(mockListFlagPhotos).toHaveBeenCalledTimes(2);
  });

  it('a repeated failure keeps showing the same owned error, not a crash or false success', async () => {
    mockListFlagPhotos.mockRejectedValue(new Error('still down'));

    const screen = renderDetail(FLAG_A);
    const retry = await screen.findByLabelText(GALLERY_LOAD_FAILED_TEXT);
    fireEvent.press(retry);

    await waitFor(() => expect(mockListFlagPhotos).toHaveBeenCalledTimes(2));
    expect(screen.getByText(GALLERY_LOAD_FAILED_TEXT)).toBeTruthy();
  });
});

describe('FlagDetailModal gallery — real empty stays exactly as before', () => {
  it('a genuinely empty gallery for a non-owner renders neither the error nor a placeholder', async () => {
    mockListFlagPhotos.mockResolvedValueOnce([]);

    const screen = renderDetail(FLAG_A);
    await waitFor(() => expect(mockListFlagPhotos).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(GALLERY_LOAD_FAILED_TEXT)).toBeNull();
    expect(screen.queryByLabelText('Loading photos')).toBeNull();
    expect(screen.UNSAFE_queryByType(PhotoGalleryInner)).toBeNull();
  });
});

describe('FlagDetailModal gallery — switching flags never shows a stale flag\'s photos or error', () => {
  it('a late-arriving load for the PREVIOUS flag is rejected once a new flag is shown', async () => {
    let resolveA!: (photos: typeof PHOTO_A[]) => void;
    const pendingA = new Promise<typeof PHOTO_A[]>((r) => { resolveA = r; });
    mockListFlagPhotos.mockImplementation((flagId: string) =>
      flagId === FLAG_A.id ? pendingA : Promise.resolve([PHOTO_B]),
    );

    const screen = renderDetail(FLAG_A);
    expect(screen.getByLabelText('Loading photos')).toBeTruthy();

    // Switch to flag B before flag A's fetch ever resolves.
    screen.rerender(
      <FlagDetailModal
        visible
        flag={FLAG_B}
        onClose={jest.fn()}
        onChanged={jest.fn()}
        onDeleted={jest.fn()}
        onViewOnMap={jest.fn()}
      />,
    );
    await waitFor(() => expect(screen.UNSAFE_getByType(PhotoGalleryInner)).toBeTruthy());
    expect(screen.UNSAFE_getByType(PhotoGalleryInner).props.photos).toEqual([PHOTO_B]);

    // Flag A's stale load now arrives late — it must be rejected, not
    // overwrite flag B's already-rendered photos.
    await act(async () => {
      resolveA([PHOTO_A]);
      await Promise.resolve();
    });
    expect(screen.UNSAFE_getByType(PhotoGalleryInner).props.photos).toEqual([PHOTO_B]);
  });

  it('switching flags synchronously clears a shown error before the new load starts', async () => {
    mockListFlagPhotos.mockImplementation((flagId: string) =>
      flagId === FLAG_A.id
        ? Promise.reject(new Error('flag A failed'))
        : new Promise(() => {}), // flag B: left pending, only the immediate clear is asserted
    );

    const screen = renderDetail(FLAG_A);
    await screen.findByText(GALLERY_LOAD_FAILED_TEXT);

    screen.rerender(
      <FlagDetailModal
        visible
        flag={FLAG_B}
        onClose={jest.fn()}
        onChanged={jest.fn()}
        onDeleted={jest.fn()}
        onViewOnMap={jest.fn()}
      />,
    );
    // Flag A's error must not survive the switch, even before flag B settles.
    expect(screen.queryByText(GALLERY_LOAD_FAILED_TEXT)).toBeNull();
    expect(screen.getByLabelText('Loading photos')).toBeTruthy();
  });
});
