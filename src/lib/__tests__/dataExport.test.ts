/**
 * Tests for src/lib/dataExport.ts — the pure formatter that backs the
 * "Export my data" Settings action.
 *
 * What this protects against:
 *  - A schema change that drops the description / severity / status
 *    field silently from the export (PIPEDA "right of access" wants
 *    completeness — if a column lands in the DB it should also land
 *    here when the user asks for their data).
 *  - The feedback section quietly going missing when the table is
 *    enabled (regression on the optional-undefined branch).
 *  - Newest-first ordering breaking — would scramble the export and
 *    confuse a user comparing two exports a year apart.
 *  - Date rendering drifting with timezone — UTC is the contract.
 */

import fs from 'fs';
import path from 'path';

import { formatDataExport } from '../dataExport';
import { REPORT_BODY_PREFIX, buildReportBody } from '@/lib/reports';
import type { FlagRow } from '@/types/database';
import type { FeedbackRow } from '../dataExport';

// A friendly category labeller used in every test. Mirrors what the real
// CATEGORY_LABELS in src/lib/flags.ts does; we inject it so this test
// file doesn't pull in supabase or anything else.
const label = (cat: FlagRow['category']): string =>
  ({
    no_ramp: 'No ramp',
    broken_sidewalk: 'Broken sidewalk',
    blocked_path: 'Blocked path',
    missing_signal: 'Missing signal',
    steep_grade: 'Steep grade',
    other: 'Other',
  })[cat];

// Fixed Date so generated lines render the same on every machine.
const FIXED_DATE = new Date('2026-05-24T00:00:00.000Z');

// Helper to build a flag with sensible defaults — keeps each test focused
// on the field it's exercising rather than a wall of boilerplate.
function makeFlag(overrides: Partial<FlagRow> = {}): FlagRow {
  return {
    id: 'f1',
    user_id: 'u1',
    lat: 49.2827,
    lng: -123.1207,
    category: 'no_ramp',
    description: null,
    severity: 3,
    photo_url: null,
    status: 'open',
    created_at: '2026-05-20T10:00:00.000Z',
    ...overrides,
  };
}

function makeFeedback(overrides: Partial<FeedbackRow> = {}): FeedbackRow {
  return {
    id: 'fb1',
    category: 'bug',
    body: 'Buttons too small',
    contact_email: null,
    created_at: '2026-05-19T08:00:00.000Z',
    ...overrides,
  };
}

describe('formatDataExport', () => {
  // -----------------------------------------------------------------
  // Header / profile fields
  // -----------------------------------------------------------------

  it('renders the canonical header with email and generation date', () => {
    const out = formatDataExport({
      user: { email: 'alice@example.com', display_name: 'Alice', points: 12 },
      flags: [],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('Flagstone data export for alice@example.com');
    expect(out).toContain('Generated 2026-05-24');
    expect(out).toContain('Display name: Alice');
    expect(out).toContain('Points: 12');
  });

  it('falls back to placeholders when profile fields are missing', () => {
    const out = formatDataExport({
      user: {},
      flags: [],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('Flagstone data export for (no email on file)');
    expect(out).toContain('Display name: (not set)');
    expect(out).toContain('Points: 0');
  });

  // -----------------------------------------------------------------
  // REPORTS section
  // -----------------------------------------------------------------

  it('renders an empty flags list as "(none yet)"', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('REPORTS (0 flags):');
    expect(out).toContain('  (none yet)');
  });

  it('renders a flag with all fields populated', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [
        makeFlag({
          description: 'Curb missing ramp on the south side.',
          severity: 4,
          status: 'verified',
        }),
      ],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('REPORTS (1 flags):');
    expect(out).toContain('  - 2026-05-20 · No ramp · severity 4/5 · verified');
    expect(out).toContain('    49.282700, -123.120700');
    expect(out).toContain('    Curb missing ramp on the south side.');
  });

  it('omits the description line when description is null', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [makeFlag({ description: null })],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    // We expect the date line and coord line, but no third (description) line.
    // Use a regex to assert no extra non-blank line sits between the coords
    // and the next section header.
    expect(out).toMatch(/49\.282700, -123\.120700\n\nFEEDBACK/);
  });

  it('omits the description line when description is whitespace only', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [makeFlag({ description: '   \n  ' })],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toMatch(/49\.282700, -123\.120700\n\nFEEDBACK/);
  });

  it('renders every category label correctly', () => {
    const cats: FlagRow['category'][] = [
      'no_ramp',
      'broken_sidewalk',
      'blocked_path',
      'missing_signal',
      'steep_grade',
      'other',
    ];
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: cats.map((category, i) =>
        makeFlag({
          id: `f${i}`,
          category,
          // Stagger created_at so each row is uniquely ordered (newest first).
          // The "0" pad keeps lexical order matching chronological order.
          created_at: `2026-05-${String(10 + i).padStart(2, '0')}T00:00:00.000Z`,
        }),
      ),
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('No ramp');
    expect(out).toContain('Broken sidewalk');
    expect(out).toContain('Blocked path');
    expect(out).toContain('Missing signal');
    expect(out).toContain('Steep grade');
    expect(out).toContain('Other');
  });

  it('renders every severity 1-5 correctly', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: ([1, 2, 3, 4, 5] as const).map((severity, i) =>
        makeFlag({
          id: `f${i}`,
          severity,
          created_at: `2026-05-${String(10 + i).padStart(2, '0')}T00:00:00.000Z`,
        }),
      ),
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('severity 1/5');
    expect(out).toContain('severity 2/5');
    expect(out).toContain('severity 3/5');
    expect(out).toContain('severity 4/5');
    expect(out).toContain('severity 5/5');
  });

  it('renders every status label correctly', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: (['open', 'verified', 'resolved', 'rejected'] as const).map((status, i) =>
        makeFlag({
          id: `f${i}`,
          status,
          created_at: `2026-05-${String(10 + i).padStart(2, '0')}T00:00:00.000Z`,
        }),
      ),
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('· open');
    expect(out).toContain('· verified');
    expect(out).toContain('· resolved');
    expect(out).toContain('· rejected');
  });

  it('sorts flags newest-first regardless of input order', () => {
    const oldFlag = makeFlag({
      id: 'old',
      created_at: '2026-01-01T00:00:00.000Z',
      description: 'oldest',
    });
    const newFlag = makeFlag({
      id: 'new',
      created_at: '2026-05-23T00:00:00.000Z',
      description: 'newest',
    });
    // Input is intentionally oldest-first so the sort has to do something.
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [oldFlag, newFlag],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    const newestIdx = out.indexOf('newest');
    const oldestIdx = out.indexOf('oldest');
    expect(newestIdx).toBeGreaterThan(-1);
    expect(oldestIdx).toBeGreaterThan(-1);
    expect(newestIdx).toBeLessThan(oldestIdx);
  });

  // -----------------------------------------------------------------
  // FEEDBACK section
  // -----------------------------------------------------------------

  it('renders "FEEDBACK: not enabled" when feedback is undefined', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [],
      // feedback omitted on purpose — the table hasn't been migrated.
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('FEEDBACK: not enabled');
    // And critically, it should NOT include the count form when not enabled —
    // that would mislead the user into thinking the section was empty by
    // choice (not by table absence).
    expect(out).not.toContain('FEEDBACK (0 items)');
  });

  it('renders an empty feedback array as "(none yet)"', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [],
      feedback: [],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('FEEDBACK (0 items):');
    // Two "(none yet)" lines — one under REPORTS, one under FEEDBACK.
    expect(out.match(/\(none yet\)/g)?.length).toBe(2);
  });

  it('renders feedback rows newest-first with body lines', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [],
      feedback: [
        makeFeedback({
          id: 'old',
          category: 'bug',
          body: 'oldest msg',
          created_at: '2026-01-01T00:00:00.000Z',
        }),
        makeFeedback({
          id: 'new',
          category: 'idea',
          body: 'newest msg',
          created_at: '2026-05-23T00:00:00.000Z',
        }),
      ],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('FEEDBACK (2 items):');
    expect(out).toContain('  - 2026-05-23 · idea');
    expect(out).toContain('    newest msg');
    expect(out).toContain('  - 2026-01-01 · bug');
    expect(out).toContain('    oldest msg');
    const newestIdx = out.indexOf('newest msg');
    const oldestIdx = out.indexOf('oldest msg');
    expect(newestIdx).toBeLessThan(oldestIdx);
  });

  // -----------------------------------------------------------------
  // Determinism / structure
  // -----------------------------------------------------------------

  it('produces the exact same output for the same input (deterministic)', () => {
    const input = {
      user: { email: 'a@b.c', display_name: 'A', points: 5 },
      flags: [makeFlag()],
      feedback: [makeFeedback()],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    };
    expect(formatDataExport(input)).toBe(formatDataExport(input));
  });

  it('ends with the "(End of export)" sentinel', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out.endsWith('(End of export)')).toBe(true);
  });

  it('handles a mixed real-world payload with both sections populated', () => {
    const out = formatDataExport({
      user: { email: 'sky@example.com', display_name: 'Sky', points: 27 },
      flags: [
        makeFlag({
          id: 'a',
          category: 'broken_sidewalk',
          severity: 5,
          status: 'verified',
          description: 'Heaved slab outside the bakery',
          created_at: '2026-05-22T12:00:00.000Z',
        }),
        makeFlag({
          id: 'b',
          category: 'no_ramp',
          severity: 2,
          status: 'open',
          description: null,
          created_at: '2026-05-21T09:30:00.000Z',
        }),
      ],
      feedback: [
        makeFeedback({
          id: 'fb1',
          category: 'idea',
          body: 'Would love an offline mode',
          created_at: '2026-05-20T15:00:00.000Z',
        }),
      ],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    // Sanity-check the major shape — newer flag first, both sections, totals.
    expect(out).toMatch(
      /REPORTS \(2 flags\):[\s\S]*Heaved slab outside the bakery[\s\S]*No ramp · severity 2\/5 · open[\s\S]*FEEDBACK \(1 items\):[\s\S]*Would love an offline mode[\s\S]*\(End of export\)$/,
    );
  });

  // Defensive: a malformed ISO date shouldn't crash the export — the user
  // would lose access to all their data over a single bad row.
  it('falls back gracefully on a malformed created_at', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [makeFlag({ created_at: 'not-a-date' })],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    // The raw string survives so the user can still see "something happened".
    expect(out).toContain('not-a-date');
    // And the rest of the export still renders.
    expect(out).toContain('(End of export)');
  });

  // -----------------------------------------------------------------
  // Defensive guards for non-finite points and undefined category labels
  // -----------------------------------------------------------------
  //
  // These pin the "no garbage in the export" behavior. `??` is not enough
  // for points (it lets NaN/Infinity through), and the callback for the
  // category label may return undefined for an unknown enum value down the
  // road. Both used to render literal "NaN" / "Infinity" / "undefined"
  // into the PIPEDA right-of-access output — these tests would catch a
  // regression to that state.

  it('renders Points: 0 when user.points is NaN', () => {
    const out = formatDataExport({
      user: { points: NaN },
      flags: [],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('Points: 0');
    expect(out).not.toContain('NaN');
  });

  it('renders Points: 0 when user.points is Infinity', () => {
    const out = formatDataExport({
      user: { points: Infinity },
      flags: [],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('Points: 0');
    expect(out).not.toContain('Infinity');
  });

  it('falls back to raw category when categoryLabel returns undefined', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      // Cast to bypass the union — we're simulating an unknown enum value
      // that the labeller hasn't been taught about.
      flags: [makeFlag({ category: 'mystery' as unknown as FlagRow['category'] })],
      // Returning undefined here forces the formatter's `?? f.category`
      // fallback path.
      categoryLabel: () => undefined as unknown as string,
      generatedAt: FIXED_DATE,
    });
    // The raw category string survives so the user still sees what type
    // of flag it was, even if the friendly label is missing.
    expect(out).toContain('mystery');
    expect(out).not.toContain('undefined');
  });

  it('preserves newlines in multi-line descriptions (does not strip or escape)', () => {
    // Multi-line descriptions are intentionally kept as-is. They render a
    // touch less neat (the continuation lines aren't re-indented), but the
    // user's words land in the export verbatim — losing characters would
    // be a bigger PIPEDA violation than slightly off indentation.
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [makeFlag({ description: 'first line\nsecond line' })],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('first line\nsecond line');
  });
});

/**
 * HIGH-1 — the two surfaces diverge, and the divergence is the feature.
 *
 * `MyFeedbackModal` hides `[REPORT]%` rows; this export keeps them. Sky ruled
 * that deliberately in §SKY-6: exports must be complete, and raw data in a data
 * export is honest. The risk this guards is a future tidy-up that "makes the
 * export consistent with My Feedback" and, in doing so, quietly narrows what a
 * person is told about themselves in response to a subject-access request.
 *
 * The envelope is built by the REAL `buildReportBody`, not a fixture string, so
 * this cannot drift from what actually lands in the table.
 */
describe('the PIPEDA export keeps report rows (§SKY-6)', () => {
  const REPORT_ROW = makeFeedback({
    id: 'rep',
    category: 'other',
    body: buildReportBody(
      { kind: 'comment', id: '11111111-1111-4111-8111-111111111111', flagId: '22222222-2222-4222-8222-222222222222' },
      'This comment is abusive.',
      'harassment',
    ),
    created_at: '2026-07-28T00:00:00.000Z',
  });

  it('renders the report row in full, envelope included', () => {
    const out = formatDataExport({
      user: { email: 'a@b.c' },
      flags: [],
      feedback: [REPORT_ROW],
      categoryLabel: label,
      generatedAt: FIXED_DATE,
    });

    expect(out).toContain('FEEDBACK (1 items):');
    expect(out).toContain(REPORT_BODY_PREFIX);
    expect(out).toContain('This comment is abusive.');
  });

  it('does not filter by body prefix at any point in the formatter', () => {
    // The formatter is pure and takes whatever it is handed — the filtering
    // decision lives at the CALL SITE, which is what keeps the two surfaces
    // able to differ at all. A prefix test appearing in here would silently
    // override the call-site choice for every caller at once.
    const src = fs.readFileSync(path.join(__dirname, '..', 'dataExport.ts'), 'utf8');
    const code = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/startsWith\s*\(/);
    expect(code).not.toMatch(/excludeBodyPrefix/);
  });
});
