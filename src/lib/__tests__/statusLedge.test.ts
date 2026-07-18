/**
 * statusLedge tests — the shared placement channel for the status voice (BP12 /
 * T6). Pure module logic, no renderer needed.
 *
 * What this locks in:
 *   1. computeLedgeTop collapses to TODAY'S placement (`Math.max(insetTop, 56)`)
 *      when there is no header — the equivalence that preserves shipped
 *      behaviour on Map / guest-native / provider-less tests.
 *   2. A published header docks the pill below it (insetTop + height + gap), and
 *      each occupied slot adds one stride so vehicles never superimpose.
 *   3. Header clearance ignores 0-height passes and is owner-guarded (a tab
 *      switch is order-independent).
 *   4. Occupants rank by priority — the app-wide status voice keeps the podium,
 *      the points toast stacks below it.
 */

import {
  FLASH_BANNER_OCCUPANT,
  FLASH_BANNER_PRIORITY,
  LEDGE_GAP,
  LIVE_STATUS_OCCUPANT,
  LIVE_STATUS_PRIORITY,
  SLOT_STRIDE,
  __resetLedgeForTests,
  clearHeaderHeight,
  computeLedgeTop,
  getHeaderHeight,
  getOccupantSlot,
  publishHeaderHeight,
  registerOccupant,
} from '../statusLedge';

describe('statusLedge', () => {
  beforeEach(() => __resetLedgeForTests());
  afterEach(() => __resetLedgeForTests());

  describe('computeLedgeTop', () => {
    it("with no header → today's placement Math.max(insetTop, 56)", () => {
      expect(computeLedgeTop(0, null, 0)).toBe(56);
      expect(computeLedgeTop(80, null, 0)).toBe(80);
    });

    it('with a header → insetTop + height + LEDGE_GAP (docks below it)', () => {
      expect(computeLedgeTop(47, 120, 0)).toBe(47 + 120 + LEDGE_GAP);
      // Docked lower than the old fixed top:56.
      expect(computeLedgeTop(0, 120, 0)).toBeGreaterThan(56);
    });

    it('each slot adds one SLOT_STRIDE; a negative slot clamps to 0', () => {
      expect(computeLedgeTop(0, null, 1)).toBe(56 + SLOT_STRIDE);
      expect(computeLedgeTop(0, 100, 1)).toBe(100 + LEDGE_GAP + SLOT_STRIDE);
      expect(computeLedgeTop(0, null, -3)).toBe(56);
    });
  });

  describe('header clearance', () => {
    it('publishes a positive height and reads it back', () => {
      publishHeaderHeight('home', 120);
      expect(getHeaderHeight()).toBe(120);
    });

    it('ignores non-positive heights (the 0-height intermediate layout pass)', () => {
      publishHeaderHeight('home', 0);
      expect(getHeaderHeight()).toBeNull();
      publishHeaderHeight('home', -5);
      expect(getHeaderHeight()).toBeNull();
    });

    it('only the current owner may clear (tab-switch clobber guard)', () => {
      publishHeaderHeight('home', 120);
      clearHeaderHeight('someone-else'); // stale blur from another screen → no-op
      expect(getHeaderHeight()).toBe(120);
      clearHeaderHeight('home');
      expect(getHeaderHeight()).toBeNull();
    });
  });

  describe('occupant arbitration', () => {
    it('ranks the status voice above the points toast, and closes the gap on unregister', () => {
      const unLive = registerOccupant(LIVE_STATUS_OCCUPANT, LIVE_STATUS_PRIORITY);
      const unFlash = registerOccupant(FLASH_BANNER_OCCUPANT, FLASH_BANNER_PRIORITY);
      expect(getOccupantSlot(LIVE_STATUS_OCCUPANT)).toBe(0);
      expect(getOccupantSlot(FLASH_BANNER_OCCUPANT)).toBe(1);
      unLive(); // the voice leaves → the toast rises to the top slot
      expect(getOccupantSlot(FLASH_BANNER_OCCUPANT)).toBe(0);
      unFlash();
    });

    it('a lone occupant takes slot 0 regardless of its priority', () => {
      registerOccupant(FLASH_BANNER_OCCUPANT, FLASH_BANNER_PRIORITY);
      expect(getOccupantSlot(FLASH_BANNER_OCCUPANT)).toBe(0);
    });

    it('an unregistered id reports slot 0', () => {
      expect(getOccupantSlot('never-registered')).toBe(0);
    });

    it('registering the same id twice does not create a duplicate slot', () => {
      registerOccupant(LIVE_STATUS_OCCUPANT, LIVE_STATUS_PRIORITY);
      registerOccupant(LIVE_STATUS_OCCUPANT, LIVE_STATUS_PRIORITY);
      registerOccupant(FLASH_BANNER_OCCUPANT, FLASH_BANNER_PRIORITY);
      expect(getOccupantSlot(FLASH_BANNER_OCCUPANT)).toBe(1);
    });
  });

  it('__resetLedgeForTests clears header height and occupants', () => {
    publishHeaderHeight('x', 100);
    registerOccupant('a', 1);
    __resetLedgeForTests();
    expect(getHeaderHeight()).toBeNull();
    expect(getOccupantSlot('a')).toBe(0);
  });
});
