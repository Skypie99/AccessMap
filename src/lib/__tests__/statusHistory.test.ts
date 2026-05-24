import {
  formatHistoryEntry,
  type StatusHistoryEntry,
} from '../statusHistory';

// Deterministic time callback — every entry timestamp resolves to the
// same string so we can assert on the formatted output exactly.
const fixedTime = () => '2h ago';

// Default label callback — capitalizes the raw status. Mirrors the
// shape of STATUS_LABELS without importing it (statusHistory.ts is
// imported nowhere in this test, but the callback signature must match).
const labelCap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// All 4 known statuses we care about for the matrix tests.
const STATUSES = ['open', 'verified', 'resolved', 'rejected'] as const;

function entry(
  from: string | null,
  to: string,
  overrides: Partial<StatusHistoryEntry> = {},
): StatusHistoryEntry {
  return {
    id: 'history-1',
    flag_id: 'flag-abc',
    user_id: 'user-xyz',
    from_status: from,
    to_status: to,
    created_at: '2026-05-24T10:00:00Z',
    ...overrides,
  };
}

describe('formatHistoryEntry', () => {
  describe('initial creation entry (from_status === null)', () => {
    it('renders "Reported · <time>" regardless of to_status', () => {
      expect(formatHistoryEntry(entry(null, 'open'), labelCap, fixedTime)).toBe(
        'Reported · 2h ago',
      );
    });

    it('never calls statusLabel for initial entries', () => {
      const spy = jest.fn().mockReturnValue('WRONG');
      formatHistoryEntry(entry(null, 'open'), spy, fixedTime);
      expect(spy).not.toHaveBeenCalled();
    });

    it('uses relativeTime for the timestamp', () => {
      const timeSpy = jest.fn().mockReturnValue('just now');
      const result = formatHistoryEntry(entry(null, 'open'), labelCap, timeSpy);
      expect(timeSpy).toHaveBeenCalledWith('2026-05-24T10:00:00Z');
      expect(result).toBe('Reported · just now');
    });
  });

  describe('transition entries — 4×4 matrix', () => {
    // Every from × to combination. Real-world we only ever see a subset
    // (open → verified, open → resolved, verified → resolved, etc.) but
    // the formatter shouldn't care which combos are "valid" — that's
    // the trigger's job. Verifying all 16 ensures no special-cased
    // branches sneak in later.
    STATUSES.forEach((from) => {
      STATUSES.forEach((to) => {
        it(`renders "${labelCap(from)} → ${labelCap(to)} · 2h ago" for ${from} → ${to}`, () => {
          expect(
            formatHistoryEntry(entry(from, to), labelCap, fixedTime),
          ).toBe(`${labelCap(from)} → ${labelCap(to)} · 2h ago`);
        });
      });
    });
  });

  describe('label callback variations', () => {
    it('respects a custom label resolver (uppercase)', () => {
      const upper = (s: string) => s.toUpperCase();
      expect(formatHistoryEntry(entry('open', 'verified'), upper, fixedTime)).toBe(
        'OPEN → VERIFIED · 2h ago',
      );
    });

    it('respects a custom label resolver (i18n-style mapping)', () => {
      const fr = (s: string) => {
        const map: Record<string, string> = {
          open: 'Ouvert',
          verified: 'Vérifié',
          resolved: 'Résolu',
          rejected: 'Rejeté',
        };
        return map[s] ?? s;
      };
      expect(formatHistoryEntry(entry('open', 'resolved'), fr, fixedTime)).toBe(
        'Ouvert → Résolu · 2h ago',
      );
    });

    it('falls back to raw status string when label resolver returns it unchanged', () => {
      // A future status the client doesn't know about: the resolver passes
      // it through, and the formatter renders it verbatim. No crash.
      const passthrough = (s: string) => s;
      expect(
        formatHistoryEntry(entry('open', 'archived'), passthrough, fixedTime),
      ).toBe('open → archived · 2h ago');
    });
  });

  describe('relativeTime variations', () => {
    it('uses whatever string the time callback returns', () => {
      const recent = () => 'just now';
      const oldish = () => 'May 1, 2026';
      expect(
        formatHistoryEntry(entry('open', 'verified'), labelCap, recent),
      ).toBe('Open → Verified · just now');
      expect(
        formatHistoryEntry(entry('open', 'verified'), labelCap, oldish),
      ).toBe('Open → Verified · May 1, 2026');
    });

    it('is deterministic given a deterministic callback', () => {
      const e = entry('verified', 'resolved');
      const a = formatHistoryEntry(e, labelCap, fixedTime);
      const b = formatHistoryEntry(e, labelCap, fixedTime);
      expect(a).toBe(b);
    });
  });
});
