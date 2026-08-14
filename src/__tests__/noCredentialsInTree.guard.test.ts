/**
 * NO CREDENTIALS IN TREE — a tracked-file census, so a credential pasted back
 * into a doc fails visibly instead of quietly riding to a public remote.
 *
 * WHY THIS EXISTS. On 2026-05-31 the App Store reviewer test-account credential
 * entered the repo in two places at once: a markdown table row in
 * `docs/APP_STORE_REVIEWER_NOTES.md`, and a comment in
 * `supabase/migrations/2026-05-31_reviewer_test_account.sql`. It sat in HEAD of
 * a PUBLIC GitHub remote for ~62 days. Two separate redactions (c51c46a,
 * f8aa4f6) cleaned it, and it was finally rotated out-of-band on 2026-08-13.
 * The failure mode was never "nobody looked" — it was that each cleanup treated
 * the finding as being about a FILE when it was about a STRING.
 *
 * WHY A TEST, GIVEN `.husky/pre-commit` ALREADY SCANS. That hook is real and
 * good, but it scans STAGED DIFFS only ("fast, zero false positives on
 * untouched files" — its own header). It cannot see a credential that is
 * already resting in the tree: one `--no-verify`, one `git add` from a branch
 * that predates the hook, one file committed before 2026-05-29, and the hook
 * never gets a look at it again. This guard closes that gap from the other
 * side — it re-reads the WHOLE tracked census on every run, so a value that got
 * past the diff gate once still cannot stay. The two are complementary: the
 * hook stops arrival, this stops residence.
 *
 * WHY COMMENTS ARE NOT STRIPPED FROM .md AND .sql. The house idiom
 * (cf. dismissalStandard.guard.test.ts) blanks comments so prose never matches.
 * That is exactly backwards for a credential scan: half of THIS repo's actual
 * leak lived in a `--` SQL comment, and the other half in markdown prose. So
 * comment-stripping is applied only to executable source (.ts/.tsx/.js/.jsx),
 * where a real credential would appear in code and a mention in a code comment
 * is discussion. Docs and SQL are scanned raw, on purpose.
 *
 * ANTI-SELF-MATCH. Every detector string is assembled at runtime from fragments
 * and this file is excluded from the census, so the sweep cannot match itself
 * and pass by accident. Nothing resembling a real secret is written here.
 *
 * FAILURE OUTPUT CARRIES NO SECRET. Offenders are reported as
 * `path:line → shape` (length + character classes) and never as the matched
 * text, so a CI log from a genuine catch does not itself become a disclosure.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SELF = path.resolve(__filename);
const REPO = path.resolve(__dirname, '..', '..');

/** The hook's `{8,}` bound, mirrored so the two gates agree on "long enough". */
const MIN_LEN = 8;
/** How far from a hit we look for account language before calling it relevant. */
const PROXIMITY = 10;

// ---------------------------------------------------------------------------
// Runtime-assembled detectors (never written contiguously in this file)
// ---------------------------------------------------------------------------

const L1 = 'pass' + 'word';
const L2 = 'pass' + 'wd';
const L3 = 'p' + 'wd';
const L4 = 'secret';

/** `<label>` then an optional quote/pipe, a `:`/`=`/`|` delimiter, then a value. */
const labelled = () => new RegExp(`\\b(${L1}|${L2}|${L3})\\b["'\`\\s]{0,3}[:|=]\\s*(\\S+)`, 'gi');

/** A markdown header cell that names a credential column. */
const columnLabel = () => new RegExp(`^\\s*(${L1}|${L2}|${L3}|${L4})\\s*$`, 'i');

/** Language that marks a hit as being about a review/demo/test login. */
const accountLanguage = () =>
  new RegExp(
    ['review' + 'er', 'demo' + '\\s+account', 'test' + '\\s+account', 'app' + '\\s+review'].join(
      '|',
    ),
    'i',
  );

/**
 * Values that are explicitly illustrative. Deliberately narrow — it matches the
 * MARKER, never a real-looking value. Kept in step with the REDACTION_MARKERS
 * list in `.husky/pre-commit`, so a value the hook would wave through does not
 * fail here (and vice versa).
 */
const placeholderish = () =>
  new RegExp(
    [
      'REDACT',
      'PROVIDED',
      'PLACEHOLDER',
      'CHANGEME',
      'ROTATED',
      'EXAMPLE',
      'TODO',
      'xxxx',
      '\\*\\*\\*',
      'process\\.env',
      'Deno\\.env',
      '\\bsecrets\\.',
      '<your-',
      'example\\.com',
    ].join('|'),
    'i',
  );

// ---------------------------------------------------------------------------
// Census
// ---------------------------------------------------------------------------

const BINARY = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.pdf', '.zip', '.gz',
  '.ttf', '.otf', '.woff', '.woff2', '.p8', '.p12', '.mobileprovision', '.keystore',
]);

const IGNORED_DIRS = new Set(['node_modules', '.git', 'Pods', 'coverage', 'dist', '.expo', '.claude']);

/**
 * Tracked files only. `git ls-files` is the source of truth because "tracked"
 * is precisely the population that can reach the public remote — the ~150
 * untracked working-tree artifacts in this repo are local scratch and are not
 * this guard's business. Falls back to a filesystem walk so the suite still
 * runs in an exported tree with no git metadata.
 */
function census(): string[] {
  let files: string[];
  try {
    files = execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
      .map((rel) => path.join(REPO, rel));
  } catch {
    files = walk(REPO);
  }
  return files.filter(
    (f) => path.resolve(f) !== SELF && !BINARY.has(path.extname(f).toLowerCase()) && fs.existsSync(f),
  );
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      out.push(...walk(path.join(dir, entry.name)));
    } else {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** Blank out comments while preserving line numbers. Source files only. */
function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

const isSource = (f: string) => ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(f));

// ---------------------------------------------------------------------------
// Shape test
// ---------------------------------------------------------------------------

/**
 * Describe a token if — and only if — it could actually be a credential.
 * Returns a SHAPE (never the token) so failures stay non-disclosing.
 */
function shapeOf(raw: string): string | null {
  const t = raw.replace(/^[`'"([{|,<]+/, '').replace(/[`'")\]}|,.;:>]+$/, '');

  if (t.length < MIN_LEN) return null;
  if (/\s/.test(t)) return null;
  if (!/[A-Za-z]/.test(t) || !/[0-9]/.test(t)) return null; // needs both classes
  if (placeholderish().test(t)) return null;
  if (/\\/.test(t)) return null; // regex/escape fragment, e.g. the hook's own pattern
  if (/[[\]{}]/.test(t)) return null; // character class / interpolation fragment
  if (/:\/\//.test(t) || /^https?/i.test(t)) return null; // URL
  if (/[/]/.test(t)) return null; // path
  if (/\.(md|te?xt|tsx?|jsx?|sql|json|ya?ml|sh|lock|toml)$/i.test(t)) return null; // filename
  if (/^[0-9a-f]{7,64}$/i.test(t)) return null; // git SHA / hex digest
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return null; // ISO date
  if (/^v?\d+[.\d]*$/i.test(t)) return null; // version number

  const classes = [
    /[a-z]/.test(t) && 'lower',
    /[A-Z]/.test(t) && 'upper',
    /[0-9]/.test(t) && 'digit',
    /[^A-Za-z0-9]/.test(t) && 'symbol',
  ]
    .filter(Boolean)
    .join('+');
  return `len=${t.length}, ${classes}`;
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

interface Finding {
  rel: string;
  line: number;
  shape: string;
  lineText: string;
}

/** Split a markdown table row into trimmed cells. */
const cells = (row: string) =>
  row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

const isTableRow = (s: string) => /^\s*\|/.test(s) && s.includes('|', 1);
const isDivider = (s: string) => /^\s*\|[\s:|-]+$/.test(s);

function scan(files: string[]): Finding[] {
  const out: Finding[] = [];
  const nearby = accountLanguage();

  for (const file of files) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue; // unreadable / binary-ish
    }
    if (text.includes('\0')) continue;
    if (!nearby.test(text)) continue; // no review/demo-account language anywhere: not our law

    const rel = path.relative(REPO, file);
    const scanned = isSource(file) ? stripComments(text) : text;
    const lines = scanned.split('\n');

    const relevant = (i: number) =>
      lines
        .slice(Math.max(0, i - PROXIMITY), i + PROXIMITY + 1)
        .some((l) => accountLanguage().test(l));

    // Detector 1 — an explicit label followed by a value.
    lines.forEach((line, i) => {
      for (const m of line.matchAll(labelled())) {
        const shape = shapeOf(m[2]);
        if (shape && relevant(i)) out.push({ rel, line: i + 1, shape, lineText: line });
      }
    });

    // Detector 2 — a markdown table COLUMN named for a credential. This is the
    // shape the pre-commit hook was blind to in 2026-05: the label is in the
    // header row, and the value sits in a row several lines below it, so no
    // single line ever contains both.
    if (path.extname(file) === '.md') {
      for (let i = 0; i < lines.length; i++) {
        if (!isTableRow(lines[i])) continue;
        const idx = cells(lines[i]).findIndex((c) => columnLabel().test(c));
        if (idx === -1) continue;
        for (let j = i + 1; j < lines.length && isTableRow(lines[j]); j++) {
          if (isDivider(lines[j])) continue;
          const cell = cells(lines[j])[idx];
          if (!cell) continue;
          const shape = shapeOf(cell);
          if (shape && relevant(j)) out.push({ rel, line: j + 1, shape, lineText: lines[j] });
        }
      }
    }
  }
  return out;
}

/**
 * Findings deliberately outside the law. Every entry must still resolve to at
 * least one live finding, so a stale exception FAILS rather than rotting into a
 * silent coverage hole. Anchored on a line MARKER, never a line number, so an
 * edit above it cannot re-point the exemption at a different site.
 *
 * Empty by design, following dynamicTypeGuard.test.ts: every candidate so far
 * was better handled by making `shapeOf` more precise than by silencing a path.
 * Adding an entry here is a decision to keep a credential-shaped string in a
 * tracked file — it should be hard, visible, and argued in review.
 */
const ALLOWED: ReadonlyArray<{ rel: string; marker: string; why: string }> = [];

const isAllowed = (f: Finding) =>
  ALLOWED.some((a) => f.rel === a.rel && f.lineText.includes(a.marker));

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

describe('no credentials in tree', () => {
  const files = census();
  const all = scan(files);
  const live = all.filter((f) => !isAllowed(f));

  it('A · the census is real (sanity: the scan is not vacuous)', () => {
    // If git ls-files ever silently returns nothing, every other assertion in
    // this file would pass by scanning an empty set. Pin the floor.
    expect(files.length).toBeGreaterThan(500);
    expect(files.some((f) => f.endsWith('APP_STORE_REVIEWER_NOTES.md'))).toBe(true);
    expect(files.some((f) => f.endsWith('2026-05-31_reviewer_test_account.sql'))).toBe(true);
  });

  it('B · the detector still fires on a credential-shaped value', () => {
    // The permanent, self-contained proof that this guard is non-vacuous: a
    // synthetic value assembled at runtime (so it is not a literal in this
    // file) must be recognised, and the placeholders we rely on must not be.
    const synthetic = ['Sample', 'Demo', String(2026), '!'].join('');
    expect(shapeOf(synthetic)).not.toBeNull();

    const label = L1.charAt(0).toUpperCase() + L1.slice(1);
    const row = `| ${label} | ${synthetic} |`;
    const hit = [...row.matchAll(labelled())].map((m) => shapeOf(m[2])).filter(Boolean);
    expect(hit).toHaveLength(1);

    // …and the pointer text that replaced the real value must NOT fire.
    expect(shapeOf('[PROVIDED IN APP STORE CONNECT REVIEW NOTES]')).toBeNull();
    expect(shapeOf('${{ secrets.EXPO_APPLE_PASSWORD }}')).toBeNull();
    expect(shapeOf('(secure)')).toBeNull();
  });

  it('C · no tracked file carries a credential-shaped literal next to account language', () => {
    // The core law. Values are never echoed — only location and shape — so a
    // real catch does not leak the thing it caught into the CI log.
    const offenders = live.map((f) => `${f.rel}:${f.line} → credential-shaped value (${f.shape})`);
    expect(offenders).toEqual([]);
  });

  it('D · every allowlist entry still corresponds to a live finding', () => {
    const stale = ALLOWED.filter(
      (a) => !all.some((f) => f.rel === a.rel && f.lineText.includes(a.marker)),
    ).map((a) => `${a.rel} → marker no longer found; remove this entry`);
    expect(stale).toEqual([]);
  });

  it('E · the two historical carriers still point at App Store Connect', () => {
    // A regression pin on the exact two files that leaked. They are allowed to
    // say the account exists; they are not allowed to say what it is.
    const notes = fs.readFileSync(
      path.join(REPO, 'docs', 'APP_STORE_REVIEWER_NOTES.md'),
      'utf8',
    );
    expect(notes).toMatch(/App Store Connect/i);

    const migration = fs.readFileSync(
      path.join(REPO, 'supabase', 'migrations', '2026-05-31_reviewer_test_account.sql'),
      'utf8',
    );
    expect(migration).toMatch(/App Store Connect/i);
    expect(scan([path.join(REPO, 'docs', 'APP_STORE_REVIEWER_NOTES.md')])).toEqual([]);
  });
});
