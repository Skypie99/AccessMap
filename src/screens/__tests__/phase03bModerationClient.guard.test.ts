import fs from 'fs';
import path from 'path';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Phase 03B moderation client guards', () => {
  const tasks = read('src/screens/TasksScreen.tsx');
  const detail = read('src/components/FlagDetailModal.tsx');
  const admin = read('src/screens/AdminScreen.tsx');
  const reports = read('src/lib/adminReports.ts');
  const picker = read('src/components/ModerationReasonPicker.tsx');

  it('pins the exact approved reject and restore confirmation bodies', () => {
    const reject =
      'It will be hidden from public views. The reporter will be notified. No points will change. An admin can restore it.';
    const restore =
      'It will return to public views. The reporter will be notified. No points will change.';

    expect(tasks).toContain(reject);
    expect(detail).toContain(reject);
    expect(admin).toContain(reject);
    expect(detail).toContain(restore);
    expect(admin).toContain(restore);
  });

  it('never claims points for owner/self verify or resolve actions', () => {
    expect(tasks).toContain("? 'Verified! No points awarded'");
    expect(tasks).toContain("? 'Resolved! No points awarded'");
    expect(tasks).not.toContain('POINTS.reporter.verify');
    expect(tasks).not.toContain('POINTS.reporter.resolve');
  });

  it('uses only server-owned moderation RPCs, never direct feedback moderation writes', () => {
    expect(reports).toContain("supabase.rpc('list_open_moderation_reports'");
    expect(reports).toContain("supabase.rpc('moderate_report'");
    expect(reports).not.toContain("supabase.from('feedback')");
    expect(reports).not.toContain('moderation_reviewed_by:');
  });

  it('mounts an explicit reason picker at every reject/restore surface', () => {
    expect(tasks).toContain('<ModerationReasonPicker');
    expect(detail).toContain('<ModerationReasonPicker');
    expect(admin.match(/<ModerationReasonPicker/g)).toHaveLength(2);
  });

  it('traps assistive-technology focus at the overlay boundary and hides each host', () => {
    const overlay = picker.slice(picker.indexOf('<View\n      style={styles.layer}'), picker.indexOf('<Pressable'));
    expect(overlay).toContain('accessibilityViewIsModal');
    expect(overlay).toContain('onAccessibilityEscape={onCancel}');
    expect(tasks).toContain('accessibilityElementsHidden={pendingReject !== null}');
    expect(detail).toContain('accessibilityElementsHidden={moderationAction !== null}');
    expect(admin.match(/accessibilityElementsHidden=\{pendingModeration !== null\}/g)).toHaveLength(2);
  });
});
