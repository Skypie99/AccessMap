/**
 * SW-28 — "View on Map" from a flag's detail sheet must actually move the map.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * On the Map tab, FlagDetailModal's "View on Map" called `animateTo` inline, in
 * the same tick as `onClose()`. On iOS a full-screen RN Modal detaches the
 * PRESENTING view controller's view, so MKMapView drops `animateToRegion` on
 * the floor — silently. No throw, no warning, no move.
 *
 * Reproduced live on an iPhone 17 Pro Max (sim-release, 2026-08-20) by
 * censusing every marker frame either side of the tap:
 *
 *   before   Broken sidewalk [201,472]   No ramp [350,69]   Steep grade [482,652]
 *   after    Broken sidewalk [201,472]   No ramp [350,69]   Steep grade [482,652]
 *
 * Byte-identical. No pan, no zoom, despite the move requesting a
 * latitudeDelta of 0.005 from a fully zoomed-out city view.
 *
 * The same `animateTo`, on the same map ref, works perfectly from the Tasks
 * card, from Profile, and from an `accessmap://flag/{id}` deep link. Those three
 * share one property this path did not have: their move runs from a route-param
 * effect AFTER arrival — that is, after the sheet is gone. So the fix is not a
 * different animateTo, it is the same animateTo at the moment the working paths
 * already use. RN fires `Modal.onDismiss` on iOS only, which is exactly the
 * platform that needs it; everywhere else the map is never detached.
 *
 * ─── WHY THE EXISTING TESTS MISSED IT ─────────────────────────────────────
 * Nothing about the JS was wrong. The handler ran, the ref was live, the region
 * was correct, and `onViewOnMap` fired — a render test asserting "the button
 * calls its handler" passed then and passes now. What broke was a UIKit fact
 * about WHEN the call landed, which no assertion about the call itself can see.
 * So this suite pins the two structural properties that put the call in the
 * right moment, and deliberately does NOT re-assert that the button works.
 */
import fs from 'fs';
import path from 'path';

import React from 'react';
import { Modal } from 'react-native';
import { render } from '@testing-library/react-native';

import FlagDetailModal from '@/components/FlagDetailModal';
import type { FlagRow } from '@/types/database';

const SRC = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

// ---------------------------------------------------------------------------
// Mocks — every I/O edge the sheet touches on open, stubbed to its quietest
// successful shape. Mirrors FlagDetailModal.sheetPresentation.test.tsx; nothing
// here asserts on them.
// ---------------------------------------------------------------------------
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

jest.mock('@/lib/statusHistory', () => ({
  listStatusHistory: jest.fn().mockResolvedValue([]),
  formatHistoryEntry: jest.fn(() => 'Reported'),
}));

jest.mock('@/lib/photos', () => ({
  listFlagPhotos: jest.fn().mockResolvedValue([]),
  addFlagPhoto: jest.fn(),
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

const FLAG: FlagRow = {
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

describe('SW-28 — the sheet exposes the moment the map is safe to move', () => {
  it('FlagDetailModal forwards onDismiss to its own Modal', () => {
    // Without this the parent has no dismissal-COMPLETE event to hang the
    // camera move on, and inline is the only option left — which is the bug.
    const onDismiss = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <FlagDetailModal
        visible
        flag={FLAG}
        onClose={jest.fn()}
        onChanged={jest.fn()}
        onDeleted={jest.fn()}
        onViewOnMap={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    const visibleModals = UNSAFE_getAllByType(Modal).filter((m) => m.props.visible);
    expect(visibleModals.length).toBeGreaterThan(0);
    // The sheet's own Modal — its lifecycle wrapper resets pull translation,
    // then forwards the dismissal-complete event that re-attaches the map.
    const sheetModal = visibleModals.find((m) => typeof m.props.onDismiss === 'function');
    expect(sheetModal).toBeDefined();
    sheetModal?.props.onDismiss();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('SW-28 — the Map tab spends that moment instead of moving inline', () => {
  const src = read('screens/MapScreen.tsx');

  /** The body of a `const NAME = useCallback((…) => { … }, [deps]);` block. */
  function handlerBody(name: string): string {
    const at = src.indexOf(`const ${name} = useCallback(`);
    expect(at).toBeGreaterThan(-1); // non-vacuity: the handler must exist
    const end = src.indexOf('\n  }, [', at);
    expect(end).toBeGreaterThan(at);
    return src.slice(at, end);
  }

  it('the "View on Map" handler does not move the camera itself', () => {
    // The whole defect in one assertion: this ran animateTo inline, under a
    // presented modal, where iOS throws the call away.
    expect(handlerBody('handleDetailViewOnMap')).not.toContain('animateTo');
  });

  it('it still highlights the marker eagerly (the half that always worked)', () => {
    // Plain state survives the dismissal, so it must NOT be deferred — deferring
    // it would trade one silent no-op for another.
    expect(handlerBody('handleDetailViewOnMap')).toContain('setFocusedFlagId');
  });

  it('the camera move is reachable from the dismissal handler', () => {
    expect(handlerBody('handleDetailDismissed')).toContain('centerOnFlag');
    expect(handlerBody('centerOnFlag')).toContain('animateTo');
  });

  it('the pending focus is spent exactly once', () => {
    // A dismissal that was NOT a "View on map" tap must not re-move the camera
    // under the user, so the handler has to clear what it consumes.
    const body = handlerBody('handleDetailDismissed');
    expect(body).toMatch(/pendingDetailFocus\.current\s*=\s*null/);
  });

  it('the sheet on this screen is actually wired to that handler', () => {
    // Otherwise every assertion above pins a handler nothing ever calls.
    expect(src).toContain('onDismiss={handleDetailDismissed}');
  });
});
