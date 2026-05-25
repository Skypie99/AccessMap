/**
 * Tests for src/lib/a11yText.ts — centralised accessibility-text helpers.
 *
 * These helpers exist to prevent label drift between screens (see the
 * module-level comment in a11yText.ts). The tests lock in the exact format
 * so a future label rename or a copy-paste to a new screen can't silently
 * produce a broken screen-reader announcement.
 *
 * Both functions are pure — no mocks needed.
 */

import { severityA11y, statusA11y } from '../a11yText';
import { SEVERITY_LABELS, STATUS_LABELS } from '../flags';
import type { FlagSeverity, FlagStatus } from '../../types/database';

// Mock supabase so flags.ts doesn't try to read env vars at import time.
jest.mock('../supabase', () => ({ supabase: {} }));

const ALL_SEVERITIES: FlagSeverity[] = [1, 2, 3, 4, 5];
const ALL_STATUSES: FlagStatus[] = ['open', 'verified', 'resolved', 'rejected'];

// -------------------------------------------------------------------------
// severityA11y
// -------------------------------------------------------------------------
describe('severityA11y', () => {
  it('includes the numeric severity value', () => {
    for (const s of ALL_SEVERITIES) {
      expect(severityA11y(s)).toContain(String(s));
    }
  });

  it('includes the human-readable label from SEVERITY_LABELS', () => {
    for (const s of ALL_SEVERITIES) {
      expect(severityA11y(s)).toContain(SEVERITY_LABELS[s]);
    }
  });

  it('includes "of 5" so AT users know the scale', () => {
    for (const s of ALL_SEVERITIES) {
      expect(severityA11y(s)).toContain('of 5');
    }
  });

  it('returns exact spec format for severity 1 (Minor)', () => {
    expect(severityA11y(1)).toBe('severity 1 of 5, Minor');
  });

  it('returns exact spec format for severity 3 (Moderate)', () => {
    expect(severityA11y(3)).toBe('severity 3 of 5, Moderate');
  });

  it('returns exact spec format for severity 5 (Severe)', () => {
    expect(severityA11y(5)).toBe('severity 5 of 5, Severe');
  });

  it('each severity produces a distinct string', () => {
    const labels = ALL_SEVERITIES.map(severityA11y);
    const unique = new Set(labels);
    expect(unique.size).toBe(ALL_SEVERITIES.length);
  });

  it('does NOT return a lowercase-only string (AT reads label as a verb otherwise)', () => {
    for (const s of ALL_SEVERITIES) {
      // Must have at least one uppercase letter (from the label word).
      expect(severityA11y(s)).toMatch(/[A-Z]/);
    }
  });
});

// -------------------------------------------------------------------------
// statusA11y
// -------------------------------------------------------------------------
describe('statusA11y', () => {
  it('uses STATUS_LABELS (human-readable) not the raw enum value', () => {
    for (const status of ALL_STATUSES) {
      const result = statusA11y(status);
      // Must contain the human label.
      expect(result).toContain(STATUS_LABELS[status]);
    }
  });

  it('includes the word "status" as a prefix', () => {
    for (const status of ALL_STATUSES) {
      expect(statusA11y(status)).toMatch(/^status /);
    }
  });

  it('returns exact spec format for "open"', () => {
    expect(statusA11y('open')).toBe('status Open');
  });

  it('returns exact spec format for "verified"', () => {
    expect(statusA11y('verified')).toBe('status Verified');
  });

  it('returns exact spec format for "resolved"', () => {
    expect(statusA11y('resolved')).toBe('status Resolved');
  });

  it('returns exact spec format for "rejected"', () => {
    expect(statusA11y('rejected')).toBe('status Rejected');
  });

  it('does not return the raw lowercase enum (sounds like a verb to AT users)', () => {
    // e.g. "status open" would be heard as a command by screen readers.
    expect(statusA11y('open')).not.toBe('status open');
    expect(statusA11y('verified')).not.toBe('status verified');
  });

  it('each status produces a distinct string', () => {
    const labels = ALL_STATUSES.map(statusA11y);
    const unique = new Set(labels);
    expect(unique.size).toBe(ALL_STATUSES.length);
  });
});
