/**
 * Web Share API utility — browser-only.
 *
 * Provides a thin, testable wrapper around navigator.share and the
 * navigator.clipboard fallback. Used by FlagDetailModal (and any future
 * screen that needs to share content on the web build) so the platform
 * branching lives in one place rather than inline at each call site.
 *
 * Both functions guard with `typeof navigator !== 'undefined'` so they are
 * safe to import on native (SSR-style guard) — they simply return false /
 * false there, and the caller's Platform.OS === 'web' gate ensures they are
 * never actually invoked on native.
 */

export interface WebShareData {
  title?: string;
  text: string;
  url?: string;
}

/**
 * Share content via the Web Share API, with clipboard fallback.
 *
 * Returns `true` if sharing or copying succeeded, `false` if:
 *  - the user cancelled (AbortError)
 *  - neither navigator.share nor navigator.clipboard is available
 *
 * Throws only on unexpected errors from navigator.share (not AbortError,
 * not clipboard failures — those are swallowed and return false).
 *
 * @param data   Title, text, and optional URL to share.
 * @returns      `true` on success, `false` on cancel / unavailable.
 *               When `false` is returned after a clipboard attempt the
 *               caller can still distinguish by checking `navigator.share`:
 *               if it existed and we returned false, the user cancelled;
 *               if it didn't exist and we returned false, clipboard failed.
 */
export async function webShare(data: WebShareData): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  // navigator.share — native browser share dialog (Chrome Android, Safari,
  // Chrome/Edge on mobile). Not available on Firefox desktop or older Safari.
  if (typeof (navigator as Navigator).share === 'function') {
    try {
      await (navigator as Navigator).share(data);
      return true;
    } catch (err) {
      // User cancelled — not an error we surface.
      if (err instanceof Error && err.name === 'AbortError') return false;
      throw err;
    }
  }

  // Clipboard fallback — write the URL if present, otherwise the text body.
  const copyText = data.url ?? data.text;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(copyText);
      return true;
    } catch {
      // Clipboard permission denied or API unavailable — silent fallback.
      return false;
    }
  }

  return false;
}

/**
 * Returns true when the current environment has at least one sharing
 * mechanism available (navigator.share or navigator.clipboard).
 *
 * Use this to decide whether to render a Share button at all.
 */
export function canWebShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    typeof (navigator as Navigator).share === 'function' ||
    typeof navigator.clipboard?.writeText === 'function'
  );
}
