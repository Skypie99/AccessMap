/**
 * liveStatus.test.ts — the message-targeted clear (B10 / L7-07).
 *
 * The live-status region is a single shared slot used by both the data flow
 * (S10 submit-confirm, S11 "still trying") and now the web locate-failure
 * (B10). `clearLiveStatusMessage` lets one flow dismiss ITS OWN banner without
 * clobbering another flow that has since taken the slot — the property that
 * keeps a locate retry from wiping an unrelated "still trying".
 */
import {
  __resetLiveStatus,
  clearLiveStatusMessage,
  setLiveStatus,
  subscribeLiveStatus,
} from '../liveStatus';

describe('clearLiveStatusMessage (B10)', () => {
  beforeEach(() => __resetLiveStatus());

  function latest() {
    let seen: { message: string } | null | undefined;
    const unsub = subscribeLiveStatus((s) => {
      seen = s;
    });
    unsub();
    return seen ?? null;
  }

  it('clears the slot when the current message matches', () => {
    setLiveStatus({ message: "Couldn't find your location", tone: 'info' });
    clearLiveStatusMessage("Couldn't find your location");
    expect(latest()).toBeNull();
  });

  it('is a no-op when a different flow now owns the slot (no clobber)', () => {
    // A locate failure showed, then an S11 "still trying" replaced it.
    setLiveStatus({ message: "Couldn't find your location", tone: 'info' });
    setLiveStatus({ message: 'Still trying — check your signal', tone: 'info' });
    // A late locate-success tries to clear ITS message — must not touch S11's.
    clearLiveStatusMessage("Couldn't find your location");
    expect(latest()?.message).toBe('Still trying — check your signal');
  });

  it('is a no-op (no throw) when the slot is already idle', () => {
    expect(() => clearLiveStatusMessage('anything')).not.toThrow();
    expect(latest()).toBeNull();
  });
});
