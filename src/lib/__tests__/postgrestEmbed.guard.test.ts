/**
 * B-7 / SR-092 — no bare PostgREST embed of `users` may return to the codebase.
 *
 * WHY THIS EXISTS. `flag_comments` reaches `users` by two paths: the direct
 * `flag_comments.user_id` FK, and a many-to-many derived from `comment_votes`
 * (which carries FKs to BOTH tables). PostgREST refuses an ambiguous embed with
 * PGRST201 / HTTP 300. So the day `2026-05-30_trust_score_system.sql` created
 * comment_votes, every comment read and write in production started failing —
 * and jest stayed green the whole time, because supabase is mocked and nothing
 * asserted the select string. This is a static source scan for exactly that
 * reason: it does not need a server, and it fails the moment the bug returns.
 *
 * Idiom: the house grep-guard shape (cf. reduceMotion.modalGate.test.ts) —
 * a non-vacuity sanity test, then an offenders array asserted toEqual([]) so
 * the failure message names the file and the offending literal.
 *
 * ANTI-SELF-MATCH: the banned fragment is ASSEMBLED at runtime from pieces, so
 * this file's own source never contains it contiguously, and the scan excludes
 * its own path. Without both, the sweep would match the guard itself and the
 * test could never fail honestly.
 */
import fs from 'fs';
import path from 'path';

const SELF = path.resolve(__filename);
const SRC = path.join(__dirname, '..', '..'); // -> src/

// Assembled, never written contiguously. Reads: users(
const BARE_EMBED = ['user', 's', '('].join('');
// The disambiguated forms PostgREST itself suggests: a constraint hint or a
// column hint. Either is fine; only the un-hinted form is banned.
const HINTED = ['user', 's', '!'].join('');

function walkSource(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__' || entry.name === 'node_modules') {
        continue;
      }
      out.push(...walkSource(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** Strip // and block comments so prose mentioning the old embed is not a hit. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Every single- or double-quoted string literal in the (comment-free) source. */
function stringLiterals(src: string): string[] {
  return (src.match(/'[^'\n]*'|"[^"\n]*"/g) ?? []).map((s) => s.slice(1, -1));
}

describe('B-7 (SR-092) — PostgREST embeds stay disambiguated', () => {
  const files = walkSource(SRC).filter((f) => path.resolve(f) !== SELF);

  it('finds select() call sites to guard (sanity: the scan is looking at code)', () => {
    const withSelect = files.filter((f) => fs.readFileSync(f, 'utf8').includes('.select('));
    // If this ever hits 0 the paths/regex drifted and the guard is vacuous.
    expect(withSelect.length).toBeGreaterThan(5);
  });

  it('no string literal embeds `users` without a disambiguating hint', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      for (const literal of stringLiterals(src)) {
        if (literal.includes(BARE_EMBED)) {
          offenders.push(`${path.relative(SRC, file)} → "${literal}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the comments select still carries a hint (the guard is not passing by absence)', () => {
    const src = fs.readFileSync(path.join(SRC, 'lib', 'comments.ts'), 'utf8');
    expect(src).toContain(HINTED);
  });
});
