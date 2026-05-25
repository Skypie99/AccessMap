/**
 * Tests for src/lib/shareFlag.ts — the pure formatter that builds the
 * plain-text body sent to the OS share sheet from FlagDetailModal.
 *
 * Pure function, so no mocks needed. We pin the exact string shape because
 * the share message is user-facing copy — any drift means a recipient sees
 * something different in Messages/Mail/etc. than what we intend.
 *
 * What this protects against:
 *  - Coordinate drift (we want 5 decimals — ~1m precision, matches the
 *    rest of the app; more is GPS noise, less puts the link on the wrong
 *    street).
 *  - A blank paragraph sneaking in when description is empty/whitespace.
 *  - A category losing its human label and leaking the enum key
 *    (e.g. "no_ramp" instead of "No ramp") into a shared message.
 *  - The Severity/Status header losing its labels.
 */

import { formatFlagShareText } from '../shareFlag';
import { CATEGORY_LABELS } from '../flags';
import type { FlagCategory, FlagRow, FlagSeverity, FlagStatus } from '@/types/database';

jest.mock('../supabase', () => ({ supabase: {} }));

// Helper: build a minimal flag-slice the formatter accepts. Defaults give us
// a known baseline so each test only declares what it's varying.
const makeFlag = (
  overrides: Partial<Pick<
    FlagRow,
    'category' | 'severity' | 'lat' | 'lng' | 'status' | 'description'
  >> = {},
): Pick<FlagRow, 'category' | 'severity' | 'lat' | 'lng' | 'status' | 'description'> => ({
  category: 'no_ramp',
  severity: 3,
  lat: 37.331741,
  lng: -122.030333,
  status: 'open',
  description: null,
  ...overrides,
});

const labelOf = (cat: FlagCategory) => CATEGORY_LABELS[cat];

describe('formatFlagShareText', () => {
  it('produces the documented shape when description is missing', () => {
    const out = formatFlagShareText(makeFlag(), labelOf);
    expect(out).toBe(
      [
        'No ramp',
        'Severity: 3/5',
        'At 37.33174, -122.03033',
        'Status: open',
        '',
        'Reported via AccessMap.',
      ].join('\n'),
    );
  });

  it('includes the description as its own paragraph when present', () => {
    const out = formatFlagShareText(
      makeFlag({ description: 'Curb is crumbling on the south corner.' }),
      labelOf,
    );
    expect(out).toBe(
      [
        'No ramp',
        'Severity: 3/5',
        'At 37.33174, -122.03033',
        'Status: open',
        '',
        'Curb is crumbling on the south corner.',
        '',
        'Reported via AccessMap.',
      ].join('\n'),
    );
  });

  it('treats whitespace-only description as missing (no blank paragraph)', () => {
    // Without this guard, a flag with description "   " would render an
    // empty paragraph between the header and the footer.
    const out = formatFlagShareText(
      makeFlag({ description: '   \n  \t  ' }),
      labelOf,
    );
    expect(out).not.toContain('  '); // no leaked spaces from the empty desc
    expect(out).toBe(
      [
        'No ramp',
        'Severity: 3/5',
        'At 37.33174, -122.03033',
        'Status: open',
        '',
        'Reported via AccessMap.',
      ].join('\n'),
    );
  });

  it('uses the human category label for every category', () => {
    const cases: { category: FlagCategory; expected: string }[] = [
      { category: 'no_ramp', expected: 'No ramp' },
      { category: 'broken_sidewalk', expected: 'Broken sidewalk' },
      { category: 'blocked_path', expected: 'Blocked path' },
      { category: 'missing_signal', expected: 'Missing signal' },
      { category: 'steep_grade', expected: 'Steep grade' },
      { category: 'other', expected: 'Other' },
    ];
    for (const { category, expected } of cases) {
      const out = formatFlagShareText(makeFlag({ category }), labelOf);
      // First line is the label — must NOT be the raw enum key.
      expect(out.split('\n')[0]).toBe(expected);
      expect(out).not.toContain(category);
    }
  });

  it('renders every severity 1-5 with the /5 suffix', () => {
    const severities: FlagSeverity[] = [1, 2, 3, 4, 5];
    for (const severity of severities) {
      const out = formatFlagShareText(makeFlag({ severity }), labelOf);
      expect(out).toContain(`Severity: ${severity}/5`);
    }
  });

  it('renders each of the four status values verbatim', () => {
    const statuses: FlagStatus[] = ['open', 'verified', 'resolved', 'rejected'];
    for (const status of statuses) {
      const out = formatFlagShareText(makeFlag({ status }), labelOf);
      expect(out).toContain(`Status: ${status}`);
    }
  });

  it('rounds latitude and longitude to 5 decimal places (~1m precision)', () => {
    // Noisier coords than 5 decimals — should be truncated to match the
    // rest of the app's coordinate display.
    const out = formatFlagShareText(
      makeFlag({ lat: 37.3317419876, lng: -122.0303339991 }),
      labelOf,
    );
    expect(out).toContain('At 37.33174, -122.03033');
    // Make sure the trailing-digit noise is gone — would land on the
    // wrong block otherwise.
    expect(out).not.toContain('37.3317419876');
    expect(out).not.toContain('-122.0303339991');
  });

  it('pads short coordinates out to 5 decimals (no integer shortening)', () => {
    // toFixed(5) pads zeros — a flag at "lat 0" should render "0.00000",
    // not "0". Keeps the format predictable.
    const out = formatFlagShareText(
      makeFlag({ lat: 0, lng: 0 }),
      labelOf,
    );
    expect(out).toContain('At 0.00000, 0.00000');
  });

  it('preserves the sign on negative coordinates', () => {
    const out = formatFlagShareText(
      makeFlag({ lat: -33.8688, lng: 151.2093 }),
      labelOf,
    );
    expect(out).toContain('At -33.86880, 151.20930');
  });

  it('ends with "Reported via AccessMap." — no trailing newline', () => {
    // Some share sheets render a trailing newline as an awkward blank
    // line. Pin the ending to keep the message tight.
    const out = formatFlagShareText(
      makeFlag({ description: 'Anything.' }),
      labelOf,
    );
    expect(out.endsWith('Reported via AccessMap.')).toBe(true);
    expect(out.endsWith('\n')).toBe(false);
  });

  it('handles null description (the DB default for blank reports)', () => {
    // FlagRow.description is `string | null` — make sure the formatter
    // doesn't choke on the null case.
    const out = formatFlagShareText(
      makeFlag({ description: null }),
      labelOf,
    );
    expect(out).not.toContain('null');
    expect(out).toContain('Reported via AccessMap.');
  });

  it('honors the injected categoryLabel function (decoupled from CATEGORY_LABELS)', () => {
    // The injected-function pattern lets a future localizer swap labels
    // without touching this module. Verify it actually flows through.
    const out = formatFlagShareText(
      makeFlag({ category: 'no_ramp' }),
      () => 'CUSTOM_LABEL',
    );
    expect(out.split('\n')[0]).toBe('CUSTOM_LABEL');
  });
});
