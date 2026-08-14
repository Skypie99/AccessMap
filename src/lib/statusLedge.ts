/**
 * statusLedge — the shared placement channel that gives the app's status voice
 * ONE designed podium (BP12 / T6, resolves F2-03).
 *
 * The problem it fixes: `LiveStatusRegion` (the persistent status pill) and
 * `FlashBanner` (the points toast) were both mounted screen-blind at the
 * identical `top: Math.max(insets.top, 56)` and identical `zIndex: 50`, so on
 * tab screens the pill sat ON TOP of the editorial header, and when both were
 * live at once they exactly superimposed.
 *
 * This is a tiny module-level pub-sub (same shape as `liveStatus.ts`) that
 * carries two facts, PUBLISHED from inside the navigator
 * (`ScreenHeader`) and READ by the App-root overlays that live OUTSIDE it:
 *
 *   1. headerHeight — the focused header's measured HEIGHT (never a live
 *      screen-Y, so the ledge is scroll-invariant). Null when the focused screen
 *      has no plain top-of-screen header (Map, or a screen that opts out) → the
 *      overlays fall back to today's exact placement.
 *   2. occupants — which status vehicles are currently on screen, so a second
 *      vehicle offsets BELOW the first instead of superimposing.
 *
 * UI-only: transient in memory, never logged or stored.
 */

import { useEffect, useSyncExternalStore } from 'react';
import { spacing } from '@/theme';

// --- placement geometry -----------------------------------------------------

/** Gap below the header band. spacing.md (12) > the header's own spacing.sm (8)
 *  top padding, so the pill always clears the header text. */
export const LEDGE_GAP = spacing.md;

/** Vertical stride between stacked vehicles. Sized to the two-line-pill worst
 *  case (pills wrap at maxWidth 92%), so slot 1 never overlaps slot 0. */
export const SLOT_STRIDE = 64;

/**
 * The one placement formula, kept PURE so it unit-tests without a renderer and
 * so each caller feeds its OWN safe-area inset (the overlays and TasksScreen
 * read insets differently on purpose — see their call sites).
 *
 * headerHeight null + slot 0 → `Math.max(insetTop, 56)`, i.e. TODAY'S placement
 * byte-for-byte (Map, guest-native, provider-less tests). That equivalence is
 * what preserves the shipped behaviour everywhere the ledge isn't active.
 */
export function computeLedgeTop(
  insetTop: number,
  headerHeight: number | null,
  slot: number,
): number {
  const base =
    headerHeight != null ? insetTop + headerHeight + LEDGE_GAP : Math.max(insetTop, 56);
  return base + Math.max(0, slot) * SLOT_STRIDE;
}

// --- store plumbing ---------------------------------------------------------

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

function subscribeLedge(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// --- (1) header clearance ---------------------------------------------------
// The focused header's height + who published it.

let headerHeight: number | null = null;
let headerOwner: string | null = null;

/**
 * Publish the focused header's measured HEIGHT. Ignores non-positive heights
 * (`onLayout` can fire a 0-height intermediate pass — mirrors ScreenHeader's own
 * `available <= 0` guard).
 */
export function publishHeaderHeight(ownerId: string, height: number): void {
  if (height <= 0) return;
  if (headerHeight === height && headerOwner === ownerId) return;
  headerHeight = height;
  headerOwner = ownerId;
  notify();
}

/**
 * Clear the header clearance — but ONLY if `ownerId` still owns it. This makes a
 * tab switch order-independent: when screen B focuses (publishes) before screen
 * A blurs (clears), A's stale clear is a no-op because B already owns the slot.
 */
export function clearHeaderHeight(ownerId: string): void {
  if (headerOwner !== ownerId) return;
  headerHeight = null;
  headerOwner = null;
  notify();
}

export function getHeaderHeight(): number | null {
  return headerHeight;
}

/** Reactive read for the App-root overlays. */
export function useHeaderHeight(): number | null {
  return useSyncExternalStore(subscribeLedge, getHeaderHeight, getHeaderHeight);
}

// --- (2) occupant arbitration -----------------------------------------------
// Which vehicles are on screen right now, by priority.

/** Stable occupant ids + their priority. Higher priority = higher on screen
 *  (slot 0). The app-wide status voice outranks the points toast, so when both
 *  show, the voice keeps the podium and the toast stacks below it. */
export const LIVE_STATUS_OCCUPANT = 'live-status';
export const FLASH_BANNER_OCCUPANT = 'flash-banner';
export const LIVE_STATUS_PRIORITY = 2;
export const FLASH_BANNER_PRIORITY = 1;

// id -> priority, for the currently-visible vehicles only.
const occupants = new Map<string, number>();

/**
 * Register a visible vehicle; returns an unregister fn (call on hide). Keyed by
 * id, so a double-register (StrictMode / re-render) can't create a duplicate.
 */
export function registerOccupant(id: string, priority: number): () => void {
  occupants.set(id, priority);
  notify();
  return () => {
    if (occupants.delete(id)) notify();
  };
}

/**
 * This vehicle's slot: how many currently-visible vehicles outrank it. Ties
 * (equal priority) break by id so the order is total and stable. Not visible →
 * 0 (callers only use the slot while they are rendering anyway).
 */
export function getOccupantSlot(id: string): number {
  const mine = occupants.get(id);
  if (mine === undefined) return 0;
  let rank = 0;
  occupants.forEach((priority, otherId) => {
    if (otherId === id) return;
    if (priority > mine || (priority === mine && otherId < id)) rank += 1;
  });
  return rank;
}

/**
 * Register `id` as a visible occupant while `active`, and return its live slot.
 * Registration is an EFFECT (never a render side-effect); the slot subscribes to
 * the store so a vehicle appearing above this one bumps it down reactively.
 */
export function useOccupantSlot(id: string, priority: number, active: boolean): number {
  useEffect(() => {
    if (!active) return;
    return registerOccupant(id, priority);
  }, [id, priority, active]);
  return useSyncExternalStore(
    subscribeLedge,
    () => getOccupantSlot(id),
    () => getOccupantSlot(id),
  );
}

/** Test-only: reset all module state between cases. */
export function __resetLedgeForTests(): void {
  headerHeight = null;
  headerOwner = null;
  occupants.clear();
  listeners.clear();
}
