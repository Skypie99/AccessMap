import {
  buildNotificationForTransition,
  parseFlagStatusPreference,
  parseWebhookBody,
  type FlagRecord,
} from '../../supabase/functions/notify-flag-status/notification';
import { readFileSync } from 'fs';
import { join } from 'path';

const flag = (overrides: Partial<FlagRecord> = {}): FlagRecord => ({
  id: 'flag-1',
  user_id: 'user-1',
  status: 'open',
  category: 'no_ramp',
  last_moderation_reason_code: null,
  ...overrides,
});

describe('Phase 03B status notification semantics', () => {
  it.each([
    ['duplicate', 'Duplicate'],
    ['not_accessibility_barrier', 'Not an accessibility barrier'],
    ['inaccurate', 'Inaccurate'],
    ['abusive_or_spam', 'Abusive or spam'],
    ['other', 'Other'],
  ])('uses the approved public rejection label for %s', (reasonCode, reasonLabel) => {
    expect(buildNotificationForTransition(
      flag({ status: 'rejected', last_moderation_reason_code: reasonCode }),
      flag({ status: 'open' }),
    )).toEqual({
      title: 'Report rejected',
      body: `Your report was rejected after moderation review. Reason: ${reasonLabel}. Your points were not changed.`,
    });
  });

  it.each([null, 'internal_note', ''])('does not expose an unapproved rejection reason (%s)', (reasonCode) => {
    expect(buildNotificationForTransition(
      flag({ status: 'rejected', last_moderation_reason_code: reasonCode }),
      flag({ status: 'open' }),
    )).toBeNull();
  });

  it('uses the exact approved restore copy only for rejected to open', () => {
    expect(buildNotificationForTransition(
      flag({ status: 'open' }),
      flag({ status: 'rejected' }),
    )).toEqual({
      title: 'Report restored',
      body: 'Your report was restored after another review and is visible again. Your points were not changed.',
    });

    expect(buildNotificationForTransition(flag({ status: 'open' }), flag({ status: 'verified' })))
      .toBeNull();
  });

  it('preserves the existing verified and resolved notifications', () => {
    expect(buildNotificationForTransition(flag({ status: 'verified' }), flag())).toEqual({
      title: 'The community backed you up',
      body: 'Your No ramp report was verified by another member. Great catch — thank you.',
    });
    expect(buildNotificationForTransition(flag({ status: 'resolved' }), flag({ status: 'verified' })))
      .toEqual({
        title: 'Issue marked resolved',
        body: "Someone fixed the No ramp you reported. That's real impact — thank you.",
      });
  });

  it('reads the public reason field without requiring it for old payloads', () => {
    expect(parseWebhookBody({
      record: { id: 'flag-1', user_id: 'user-1', status: 'rejected', category: 'other' },
      old_record: { id: 'flag-1', user_id: 'user-1', status: 'open', category: 'other' },
    })?.record.last_moderation_reason_code).toBeNull();
  });

  it('honors the existing flag status preference and its default', () => {
    expect(parseFlagStatusPreference(true)).toBe(true);
    expect(parseFlagStatusPreference(false)).toBe(false);
    expect(parseFlagStatusPreference([])).toBeNull();
    expect(parseFlagStatusPreference({ flag_status_updates: true })).toBeNull();
  });

  it('uses the least-privilege preference RPC instead of direct table access', () => {
    const source = readFileSync(
      join(process.cwd(), 'supabase/functions/notify-flag-status/index.ts'),
      'utf8',
    );
    expect(source).toContain('/rest/v1/rpc/flag_status_notifications_enabled');
    expect(source).not.toContain('/rest/v1/notification_preferences?');
  });
});
