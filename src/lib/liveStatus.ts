/**
 * Shared "live status" channel for the persistent-mounted success / escalation
 * banner (S10 + S11). A tiny module-level pub-sub — the same shape as
 * `announce.ts` — so it can be driven from lib code (`flagsStore.tsx`'s data
 * race) AND from components (`ReportFlagModal` submit) alike, and rendered once
 * by `<LiveStatusRegion/>` mounted above the auth/session branch in `App.tsx`
 * (so the guest-web cohort — the whole point of S10 — gets it too).
 *
 * Why a persistent-mounted region and not `FlashBanner`: FlashBanner returns
 * `null` until it has text (`FlashBanner.tsx`), so its `aria-live` node mounts
 * INTO the DOM with text already present — the exact case browser screen
 * readers frequently fail to announce. `<LiveStatusRegion/>` keeps its live
 * region mounted and only MUTATES its text, which is the mechanism that
 * reliably announces on web (the same reason the severity echo line works).
 *
 * This is a UI-only channel: transient in memory, never logged or stored.
 */

export type LiveStatusTone = 'success' | 'info';

export interface LiveStatusAction {
  /** Button label, e.g. "Retry". */
  label: string;
  onPress: () => void;
}

export interface LiveStatus {
  message: string;
  /** Pill colour: 'success' → green (submit confirmed), 'info' → brand blue
   *  (calm "still trying"). Both reuse the shipped FlashBanner tones — no new
   *  token, so the contrast arbiter is untouched. */
  tone: LiveStatusTone;
  /** Optional inline action (e.g. Retry a stalled read). Omit for a passive
   *  confirmation. */
  action?: LiveStatusAction;
  /** Auto-dismiss after N ms (S10 success). Omit to persist until an explicit
   *  clear (S11's "still trying", which ends when the read settles). */
  autoDismissMs?: number;
  /** Monotonic id so two identical messages back-to-back still register as a
   *  change and re-announce. NOT a timestamp (kept deterministic for tests). */
  key: number;
}

type Listener = (status: LiveStatus | null) => void;

const listeners = new Set<Listener>();
let current: LiveStatus | null = null;
let seq = 0;

function publish(): void {
  listeners.forEach((l) => l(current));
}

/**
 * Subscribe a renderer (the mounted `<LiveStatusRegion/>`). Emits the current
 * value immediately so a late-mounting region is in sync, then on every change.
 * Returns an unsubscribe fn.
 */
export function subscribeLiveStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

/** Show a status (or pass `null` to clear). Bumps a monotonic key so an
 *  identical message re-announces. */
export function setLiveStatus(next: Omit<LiveStatus, 'key'> | null): void {
  if (next == null) {
    current = null;
  } else {
    seq += 1;
    current = { ...next, key: seq };
  }
  publish();
}

/** Clear the current status (return to the idle, empty-but-mounted region). */
export function clearLiveStatus(): void {
  current = null;
  publish();
}

/** Clear the current status ONLY if it still shows `message`. Lets one flow
 *  dismiss its OWN banner without clobbering another flow that has since taken
 *  the shared slot — e.g. a locate retry dismissing its own "Couldn't find your
 *  location" error, but never an S11 "still trying" that replaced it. */
export function clearLiveStatusMessage(message: string): void {
  if (current?.message === message) {
    current = null;
    publish();
  }
}

/** Test-only: reset module state between tests. */
export function __resetLiveStatus(): void {
  current = null;
  seq = 0;
  listeners.clear();
}
