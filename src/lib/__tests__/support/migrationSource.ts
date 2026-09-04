/**
 * Resolve a canonical migration file by its SLUG rather than its full filename.
 *
 * WHY THIS EXISTS (Phase 02A): Build 33 reorganised `supabase/migrations/` into
 * the timestamped managed layout Supabase actually applies. Six guard suites
 * still read the pre-reorganisation paths, so they died at module load with
 * ENOENT — asserting nothing at all while still looking like coverage. A guard
 * that cannot open its own subject is worse than no guard: it reports green in
 * every report that counts suites rather than assertions.
 *
 * Resolving by slug means the next renumbering moves the file without silently
 * disarming the guard. If the slug genuinely disappears, the throw below names
 * what was being looked for and what is actually on disk.
 */
import fs from 'fs';
import path from 'path';

export const SUPABASE_DIR = path.join(__dirname, '..', '..', '..', '..', 'supabase');
const MIGRATIONS_DIR = path.join(SUPABASE_DIR, 'migrations');

/** Read the managed migration whose filename is `<14-digit version>_<slug>.sql`. */
export function readManagedMigration(slug: string): string {
  const names = fs.readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith('.sql'));
  const matches = names.filter((n) => /^\d{14}_(.+)\.sql$/.exec(n)?.[1] === slug);
  if (matches.length === 1) return fs.readFileSync(path.join(MIGRATIONS_DIR, matches[0]), 'utf8');
  throw new Error(
    matches.length === 0
      ? `No managed migration with slug "${slug}". Managed slugs present: ${names
          .map((n) => /^\d{14}_(.+)\.sql$/.exec(n)?.[1])
          .filter(Boolean)
          .join(', ')}`
      : `Slug "${slug}" is ambiguous across ${matches.length} files: ${matches.join(', ')}`,
  );
}

/** True when a managed migration with this slug exists. */
export function hasManagedMigration(slug: string): boolean {
  try {
    readManagedMigration(slug);
    return true;
  } catch {
    return false;
  }
}

/** Read a file from `supabase/nonmanaged/<area>/<name>` — proposed/out-of-band evidence. */
export function readNonmanaged(area: string, name: string): string {
  return fs.readFileSync(path.join(SUPABASE_DIR, 'nonmanaged', area, name), 'utf8');
}
