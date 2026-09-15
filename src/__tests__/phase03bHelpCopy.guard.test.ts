import fs from 'fs';
import path from 'path';

const helpSource = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'HelpModal.tsx'),
  'utf8',
);

describe('Phase 03B approved help copy', () => {
  it('includes the exact owner-approved moderation explanation', () => {
    expect(helpSource).toContain(
      'Only Flagstone admins can reject or restore reports. Rejected reports are hidden from public views and can be restored. Rejecting or restoring a report does not change points. Reporters are notified when flag-status notifications are enabled.',
    );
  });
});
