export interface FlagRecord {
  id: string;
  user_id: string;
  status: string;
  category: string;
  last_moderation_reason_code: string | null;
}

export interface WebhookBody {
  record: FlagRecord;
  old_record: FlagRecord;
}

export interface NotificationCopy {
  title: string;
  body: string;
}

// These are the only public labels approved for rejection notifications. Never
// echo a raw database value: moderation details outside this allowlist may be
// internal, malformed, or unsafe for a user-facing push notification.
export const REJECTION_REASON_LABELS: Readonly<Record<string, string>> = {
  duplicate: 'Duplicate',
  not_accessibility_barrier: 'Not an accessibility barrier',
  inaccurate: 'Inaccurate',
  abusive_or_spam: 'Abusive or spam',
  other: 'Other',
};

// Inline copy of the client-side CATEGORY_LABELS. Edge Functions cannot import
// from src/, so keep this list in sync with src/lib/flags.ts.
const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  no_ramp: 'No ramp',
  broken_sidewalk: 'Broken sidewalk',
  blocked_path: 'Blocked path',
  missing_signal: 'Missing signal',
  steep_grade: 'Steep grade',
  other: 'Other',
};

export function extractFlagRecord(value: unknown): FlagRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record['user_id'] !== 'string' || typeof record['status'] !== 'string') {
    return null;
  }

  return {
    id: typeof record['id'] === 'string' ? record['id'] : '',
    user_id: record['user_id'],
    status: record['status'],
    category: typeof record['category'] === 'string' ? record['category'] : '',
    last_moderation_reason_code:
      typeof record['last_moderation_reason_code'] === 'string'
        ? record['last_moderation_reason_code']
        : null,
  };
}

export function parseWebhookBody(body: unknown): WebhookBody | null {
  if (typeof body !== 'object' || body === null) return null;
  const value = body as Record<string, unknown>;
  const record = extractFlagRecord(value['record']);
  const oldRecord = extractFlagRecord(value['old_record']);
  if (!record || !oldRecord) return null;
  return { record, old_record: oldRecord };
}

/**
 * Build copy only for approved status transitions. A rejected notification
 * requires an allowlisted reason; returning null prevents raw/internal details
 * from being exposed if the webhook payload is malformed or from an old schema.
 */
export function buildNotificationForTransition(
  record: FlagRecord,
  oldRecord: FlagRecord,
): NotificationCopy | null {
  if (record.status === 'rejected') {
    const reasonLabel = record.last_moderation_reason_code
      ? REJECTION_REASON_LABELS[record.last_moderation_reason_code]
      : undefined;
    if (!reasonLabel) return null;

    return {
      title: 'Report rejected',
      body: `Your report was rejected after moderation review. Reason: ${reasonLabel}. Your points were not changed.`,
    };
  }

  if (record.status === 'open' && oldRecord.status === 'rejected') {
    return {
      title: 'Report restored',
      body: 'Your report was restored after another review and is visible again. Your points were not changed.',
    };
  }

  if (record.status !== 'verified' && record.status !== 'resolved') return null;

  const rawLabel = record.category
    ? (CATEGORY_LABELS[record.category] ?? record.category.replace(/_/g, ' '))
    : '';
  const label = rawLabel && rawLabel.toLowerCase() !== 'other'
    ? rawLabel
    : 'accessibility issue';

  if (record.status === 'verified') {
    return {
      title: 'The community backed you up',
      body: `Your ${label} report was verified by another member. Great catch — thank you.`,
    };
  }

  return {
    title: 'Issue marked resolved',
    body: `Someone fixed the ${label} you reported. That's real impact — thank you.`,
  };
}

/**
 * A missing preferences row represents the table defaults, so status pushes
 * remain enabled. Any unexpected response is rejected by the caller.
 */
export function parseFlagStatusPreference(payload: unknown): boolean | null {
  return typeof payload === 'boolean' ? payload : null;
}
