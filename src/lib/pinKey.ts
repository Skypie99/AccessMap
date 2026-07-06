import type { FlagRow } from '@/types/database';

/**
 * Content-derived key for the native custom teardrop markers (S14 / PROTECT-15).
 *
 * The teardrop marker sets `tracksViewChanges={false}`, so it snapshots on mount
 * and only re-renders when its React key changes. The key must therefore carry
 * every input that changes the PIXELS — severity fill, anon ring, resolved glyph,
 * category glyph — plus the flag id. Opacity (focus dimming) stays a native
 * Marker prop, so it updates WITHOUT a re-snapshot and is deliberately NOT keyed.
 * Nothing time-derived (e.g. created_at) enters the key, so the steady state
 * never re-rasterizes.
 */
export function pinKey(f: FlagRow): string {
  return `${f.id}|${f.severity}|${f.user_id === null ? 'x' : 'o'}|${f.status === 'resolved' ? 'r' : ''}|${f.category}`;
}
