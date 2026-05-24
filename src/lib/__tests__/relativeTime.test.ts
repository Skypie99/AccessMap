import { relativeTime } from '../relativeTime';

const now = new Date('2026-05-23T12:00:00Z');
function ago(seconds: number): string {
  return new Date(now.getTime() - seconds * 1000).toISOString();
}

describe('relativeTime', () => {
  it('returns "just now" for 0 seconds', () => {
    expect(relativeTime(ago(0), now)).toBe('just now');
  });

  it('returns "just now" for 30 seconds', () => {
    expect(relativeTime(ago(30), now)).toBe('just now');
  });

  it('returns "just now" for 59 seconds', () => {
    expect(relativeTime(ago(59), now)).toBe('just now');
  });

  it('returns "1m ago" for 60 seconds', () => {
    expect(relativeTime(ago(60), now)).toBe('1m ago');
  });

  it('returns "5m ago" for 5 minutes', () => {
    expect(relativeTime(ago(5 * 60), now)).toBe('5m ago');
  });

  it('returns "59m ago" for 59 minutes', () => {
    expect(relativeTime(ago(59 * 60), now)).toBe('59m ago');
  });

  it('returns "1h ago" for exactly 1 hour', () => {
    expect(relativeTime(ago(3600), now)).toBe('1h ago');
  });

  it('returns "23h ago" for 23 hours', () => {
    expect(relativeTime(ago(23 * 3600), now)).toBe('23h ago');
  });

  it('returns "1d ago" for exactly 1 day', () => {
    expect(relativeTime(ago(86400), now)).toBe('1d ago');
  });

  it('returns "29d ago" for 29 days', () => {
    expect(relativeTime(ago(29 * 86400), now)).toBe('29d ago');
  });

  it('returns a locale date string for 30 days or more', () => {
    const result = relativeTime(ago(30 * 86400), now);
    // Should NOT be "30d ago" — should be a real date string.
    expect(result).not.toBe('30d ago');
    expect(result.length).toBeGreaterThan(4); // "May 23, 2026" style
  });

  it('accepts a Date object (not just string)', () => {
    const date = new Date(now.getTime() - 2 * 60 * 1000);
    expect(relativeTime(date, now)).toBe('2m ago');
  });

  it('clock-skew guard: future timestamps return "just now"', () => {
    const future = new Date(now.getTime() + 5000).toISOString();
    expect(relativeTime(future, now)).toBe('just now');
  });
});
