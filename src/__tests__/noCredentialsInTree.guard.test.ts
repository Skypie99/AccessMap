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

/**
 * Non-login secret labels — webhook secrets, API keys, bearer/auth tokens,
 * service-role keys.
 *
 * Detectors 1 and 2 only fire near review/demo ACCOUNT language, so this whole
 * class sat outside the guard by construction: a rotated webhook secret could
 * live in a tracked file forever and the suite stayed green. The delimiter set
 * includes `,` so a SQL header pair — `jsonb_build_object('X-…-Secret', <v>)`
 * — is reachable, and an opening quote is consumed before the value.
 */
const secretLabelled = () =>
  new RegExp(
    // NOT \b on either side. `_` is a word character, so \b can never match
    // between `_` and a letter — which would blind this to `webhook_secret`,
    // `SUPABASE_SERVICE_ROLE_KEY`, `MY_API_KEY`, `client_secret`: the dominant
    // real-world env-var shape, and the one this repo's own .env.example uses.
    `(?<![A-Za-z0-9])(${L4}|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|` +
      `service[_-]?role[_-]?key|private[_-]?key|webhook[_-]?${L4}|client[_-]?${L4})` +
      `(?![A-Za-z0-9])["'\`\\s]{0,3}[:|=,]\\s*["'\`]?([^\\s"'\`]+)`,
    'gi',
  );

/**
 * Detector 4 patterns — FORMAT-based, so they need no label at all.
 *
 * Everything above is label-driven, which means an unlabelled credential —
 * a bare service_role JWT, an `sb_secret_…` key — was invisible to the guard
 * while `.husky/pre-commit` has caught those shapes since 2026-05. That left
 * the tree-resident guard strictly weaker than the arrival gate, on exactly
 * the class it exists to cover: something committed with `--no-verify`, or
 * committed before the hook existed.
 */
const FORMAT_DETECTORS: readonly { name: string; re: () => RegExp }[] = [
  { name: 'supabase-service-jwt', re: () => /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'supabase-secret-key', re: () => new RegExp('\\bsb_' + L4 + '_[A-Za-z0-9_-]{20,}', 'g') },
  { name: 'aws-access-key-id', re: () => /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: 'pem-private-key', re: () => /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

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
function shapeOf(raw: string, opts: { allowLongHex?: boolean } = {}): string | null {
  const t = raw.replace(/^[`'"([{|,<]+/, '').replace(/[`'")\]}|,.;:>]+$/, '');

  if (t.length < MIN_LEN) return null;
  if (/\s/.test(t)) return null;

  // A pure-hex token is normally a git SHA or a content digest, so it is
  // discarded below. Detector 3 opts out of that for LONG hex, because
  // `openssl rand -hex 32` — the shape this repo's own webhook README tells
  // you to generate — is exactly 64 hex chars and would otherwise be excused
  // by the very rule meant to suppress digests.
  const isHex = /^[0-9a-f]+$/i.test(t);
  const longHexSecret = !!opts.allowLongHex && isHex;

  if (!longHexSecret && (!/[A-Za-z]/.test(t) || !/[0-9]/.test(t))) return null; // needs both classes
  if (placeholderish().test(t)) return null;
  if (/\\/.test(t)) return null; // regex/escape fragment, e.g. the hook's own pattern
  if (/[[\]{}]/.test(t)) return null; // character class / interpolation fragment
  if (/:\/\//.test(t) || /^https?/i.test(t)) return null; // URL
  if (/[/]/.test(t)) return null; // path
  if (/\.(md|te?xt|tsx?|jsx?|sql|json|ya?ml|sh|lock|toml)$/i.test(t)) return null; // filename
  if (isHex) {
    // Default path preserved byte-for-byte: 7–64 hex is a SHA/digest.
    if (!opts.allowLongHex) {
      if (/^[0-9a-f]{7,64}$/i.test(t)) return null; // git SHA / hex digest
    } else if (t.length < 32) {
      return null; // still short enough to be a SHA prefix
    }
  }
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

    // Account language gates the LOGIN detectors (1 and 2) only. It must NOT
    // gate the file, because a non-login secret never carries review/demo
    // account language — skipping the file here is precisely what made the
    // webhook / API-key / token class invisible.
    const hasAccountLanguage = nearby.test(text);

    const rel = path.relative(REPO, file);
    const scanned = isSource(file) ? stripComments(text) : text;
    const lines = scanned.split('\n');

    const relevant = (i: number) =>
      lines
        .slice(Math.max(0, i - PROXIMITY), i + PROXIMITY + 1)
        .some((l) => accountLanguage().test(l));

    // Detector 1 — an explicit label followed by a value.
    if (hasAccountLanguage) {
      lines.forEach((line, i) => {
        for (const m of line.matchAll(labelled())) {
          const shape = shapeOf(m[2]);
          if (shape && relevant(i)) out.push({ rel, line: i + 1, shape, lineText: line });
        }
      });
    }

    // Detector 2 — a markdown table COLUMN named for a credential. This is the
    // shape the pre-commit hook was blind to in 2026-05: the label is in the
    // header row, and the value sits in a row several lines below it, so no
    // single line ever contains both.
    if (hasAccountLanguage && path.extname(file) === '.md') {
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

    // Detector 3 — a non-login secret label followed by a value, anywhere in
    // the tree. Deliberately NOT gated on account language, and it accepts long
    // hex, so a rotated-but-committed webhook secret or API key is a finding
    // instead of a silent pass.
    lines.forEach((line, i) => {
      for (const m of line.matchAll(secretLabelled())) {
        const shape = shapeOf(m[2], { allowLongHex: true });
        if (shape) out.push({ rel, line: i + 1, shape, lineText: line });
      }
    });

    // Detector 4 — recognisable credential FORMATS, no label required.
    lines.forEach((line, i) => {
      if (placeholderish().test(line)) return;
      for (const { name, re } of FORMAT_DETECTORS) {
        for (const m of line.matchAll(re())) {
          out.push({ rel, line: i + 1, shape: `format:${name}, len=${m[0].length}`, lineText: line });
        }
      }
    });
  }
  return out;
}

/**
 * Findings deliberately outside the law. Every entry must still resolve to at
 * least one live finding, so a stale exception FAILS rather than rotting into a
 * silent coverage hole. Anchored on a line MARKER, never a line number, so an
 * edit above it cannot re-point the exemption at a different site.
 *
 * Held empty until 2026-09-03, following dynamicTypeGuard.test.ts: every
 * candidate before then was better handled by making `shapeOf` more precise
 * than by silencing a path. It now carries exactly ONE entry, for a file that
 * genuinely cannot be edited (see its `why`). Adding another is a decision to
 * keep a credential-shaped string in a tracked file — it should stay hard,
 * visible, and argued in review.
 */
const ALLOWED: ReadonlyArray<{ rel: string; marker: string; why: string }> = [
  {
    rel: 'supabase/migrations/20260529181141_notify_flag_status_webhook_trigger.sql',
    // The marker is the HEADER NAME on the offending line, never the value.
    marker: "'X-Webhook-Secret'",
    why:
      'IMMUTABLE HISTORICAL CARRIER. This file is not ordinary source: its own header ' +
      'records it as reconstructed verbatim from the hosted Supabase migration ledger ' +
      '(supabase_migrations.schema_migrations, version 20260529181141) during the ' +
      '2026-08-28 migration-history truth repair, and qa-reports/2026-08-28_' +
      'MigrationMapRepair_Evidence.md books it as RECONSTRUCTED in the 69/69 hosted-parity ' +
      'set. Editing the SQL to make this scanner green would falsify a file that documents ' +
      'itself as verbatim and would break the hosted<->local parity that repair established. ' +
      'The secret it carries is DEAD: rotated into Supabase Vault on 2026-06-03, and the ' +
      'literal-bearing function body was replaced by Vault indirection — supabase/schema.sql ' +
      'now defines notify_flag_status_webhook() reading vault.decrypted_secrets, so the ' +
      'canonical bootstrap carries no literal (the trigger NAME persists). Verified again ' +
      '2026-09-03: the live Vault value does not match this literal. Never reuse it; file stays. ' +
      'Canonical treatment of migration history is deferred to PHASE-02.',
  },
];

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

  it('B2 · the non-login secret detector fires on a long-hex secret', () => {
    // Detector 3's own non-vacuity proof. Both values are assembled at runtime
    // so neither is a literal in this file. The first is the shape
    // `openssl rand -hex 32` produces — the shape the old guard excused as a
    // "hex digest" — and it must now be seen when it sits next to a secret label.
    const hex64 = 'abcdef0123456789'.repeat(4);
    expect(hex64).toHaveLength(64);
    expect(shapeOf(hex64)).toBeNull(); // still a digest to every other detector
    expect(shapeOf(hex64, { allowLongHex: true })).not.toBeNull();

    const header = ['X', 'Webhook', L4.charAt(0).toUpperCase() + L4.slice(1)].join('-');
    const sqlish = `        '${header}', '${hex64}'`;
    const hits = [...sqlish.matchAll(secretLabelled())]
      .map((m) => shapeOf(m[2], { allowLongHex: true }))
      .filter(Boolean);
    expect(hits).toHaveLength(1);

    // UNDERSCORE-PREFIXED LABELS. Regression pin for the boundary bug found in
    // review on 2026-09-03: the first version anchored on \b, and `_` is a word
    // character, so `\b` could never match between `_` and the label. Every
    // env-var-shaped secret — the dominant real-world form, and the shape this
    // repo's own .env.example uses — was silently unreachable.
    const V = ['Synth', String(2026), 'Value', '9xQ'].join('');
    const mustHit = [
      `${L4}: ${V}`,
      `'X-Webhook-${L4}', '${V}'`,
      `api_key=${V}`,
      `apiKey=${V}`,
      `webhook_${L4}: ${V}`,
      `WEBHOOK_${L4.toUpperCase()}=${V}`,
      `SUPABASE_SERVICE_ROLE_KEY=${V}`,
      `MY_API_KEY=${V}`,
      `client_${L4} = ${V}`,
      `PRIVATE_KEY: ${V}`,
    ];
    const missed = mustHit.filter(
      (line) =>
        [...line.matchAll(secretLabelled())]
          .map((m) => shapeOf(m[2], { allowLongHex: true }))
          .filter(Boolean).length === 0,
    );
    expect(missed).toEqual([]);

    // A short hex string is still a SHA prefix, not a secret.
    expect(shapeOf('a1b2c3d4e5f6', { allowLongHex: true })).toBeNull();
    // …and env-var indirection must never fire.
    const envish = `${L4}: process.env.WEBHOOK_${L4.toUpperCase()}`;
    expect(
      [...envish.matchAll(secretLabelled())]
        .map((m) => shapeOf(m[2], { allowLongHex: true }))
        .filter(Boolean),
    ).toEqual([]);
  });

  it('B3 · the format detectors fire without any label at all', () => {
    // Detector 4's non-vacuity proof. Every value here is assembled at runtime
    // and INVENTED — none is a real credential, and none is a literal in this
    // file. Before 2026-09-03 the guard was purely label-based, so an unlabelled
    // service_role JWT or sb_secret_ key sat in the tree unseen while
    // .husky/pre-commit had caught those shapes since 2026-05.
    const jwt = ['eyJ' + 'hbGciOiJIUzI1NiIs', 'eyJyb2xlIjoic3ludGgifQ', 'c3ludGhldGljc2ln'].join('.');
    const sbKey = 'sb_' + L4 + '_' + 'SyntheticKeyMaterial0123456789';
    const aws = 'AKIA' + 'SYNTHETIC000EXMP';
    const pem = '-----BEGIN RSA PRIVATE KEY-----';

    for (const sample of [jwt, sbKey, aws, pem]) {
      const hit = FORMAT_DETECTORS.some((d) => d.re().test(sample));
      expect([sample.slice(0, 6), hit]).toEqual([sample.slice(0, 6), true]);
    }

    // …and an env-var reference must never fire.
    expect(
      FORMAT_DETECTORS.some((d) => d.re().test("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')")),
    ).toBe(false);
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

    // The Build 33 migration-map repair (2026-08-28) moved this out of the
    // managed migrations directory; the old path made this assertion throw
    // ENOENT instead of asserting, which is how a guard rots into a no-op.
    const migration = fs.readFileSync(
      path.join(
        REPO,
        'supabase',
        'nonmanaged',
        'destructive-data',
        '2026-05-31_reviewer_test_account.sql',
      ),
      'utf8',
    );
    expect(migration).toMatch(/App Store Connect/i);
    // Map to the same shape string assertion C uses. Comparing raw Finding
    // objects here would pretty-print `lineText` — the matched line, i.e. the
    // credential — into the CI log on failure, in exactly the scenario this
    // guard exists for. A guard must not leak the thing it catches.
    expect(
      scan([path.join(REPO, 'docs', 'APP_STORE_REVIEWER_NOTES.md')]).map(
        (f) => `${f.rel}:${f.line} → credential-shaped value (${f.shape})`,
      ),
    ).toEqual([]);
  });
});
