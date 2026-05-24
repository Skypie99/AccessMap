/**
 * Group dated items into day-buckets with human-friendly section titles.
 *
 * Pure, no React, no platform code — testable in isolation. Built for the
 * Activity Feed, but useful anywhere a list needs "Today / Yesterday /
 * <day name> / <month day>" section headers.
 *
 * Bucketing rule: two items are in the same bucket if they fall on the same
 * **local-time calendar day** (Date.toDateString() comparison). Order
 * within a bucket is preserved from the input order (call sites pass
 * already-sorted data).
 */

export interface DaySection<T> {
  /** Stable key for SectionList — the bucket's calendar date as ISO yyyy-mm-dd. */
  key: string;
  /** Display title like "Today", "Yesterday", "Tuesday", or "May 12". */
  title: string;
  data: T[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Title generator for a day bucket relative to `now`.
 *
 * - Today / Yesterday: literal words.
 * - Within the last 6 days: weekday name (Tuesday, Wednesday, …).
 * - Older: locale-formatted "Month day" (or "Month day, year" if not
 *   this year).
 */
export function dayBucketTitle(bucketStart: Date, now: Date = new Date()): string {
  const today = startOfDay(now);
  const bucket = startOfDay(bucketStart);
  const diffDays = Math.round((today.getTime() - bucket.getTime()) / DAY_MS);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return bucket.toLocaleDateString(undefined, { weekday: 'long' });
  }

  const sameYear = bucket.getFullYear() === now.getFullYear();
  return bucket.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Group items by the day of `getDate(item)`. Returns sections in the
 * input order — the caller is responsible for sorting (e.g. newest first)
 * before calling.
 *
 * Items whose date is invalid (NaN) land in a "Unknown date" bucket at
 * the end, so we never silently drop data.
 */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string | Date,
  now: Date = new Date(),
): DaySection<T>[] {
  const buckets = new Map<string, { date: Date; data: T[] }>();
  const unknown: T[] = [];

  for (const item of items) {
    const raw = getDate(item);
    const date = typeof raw === 'string' ? new Date(raw) : raw;
    if (Number.isNaN(date.getTime())) {
      unknown.push(item);
      continue;
    }
    const key = isoDate(startOfDay(date));
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.data.push(item);
    } else {
      buckets.set(key, { date: startOfDay(date), data: [item] });
    }
  }

  const sections: DaySection<T>[] = [];
  for (const [key, { date, data }] of buckets) {
    sections.push({
      key,
      title: dayBucketTitle(date, now),
      data,
    });
  }
  if (unknown.length > 0) {
    sections.push({ key: '__unknown__', title: 'Unknown date', data: unknown });
  }
  return sections;
}
