/**
 * An enabled-LOOKING control must never answer a tap with nothing.
 *
 * ─── THE FINDING ──────────────────────────────────────────────────────────
 * SW-49. On the sim walk the push toggle ignored two consecutive taps right
 * after Settings mounted — no state change, no alert, and zero
 * `handlePushToggle error` lines in the whole console log. A control experiment
 * ruled out the driver: the "Notify on Open" switch toggled reliably in the same
 * session, and the push switch itself worked on a later attempt.
 *
 * The walk recorded the SYMPTOM and explicitly said the mechanism was a
 * hypothesis to confirm. Confirmed:
 *
 *   AuthProvider's context begins at { user: null, loading: true } and resolves
 *   getSession() asynchronously. SettingsScreen destructured only `{ user }` and
 *   never `loading`, so for the frames before that resolves, a SIGNED-IN user's
 *   push row is in a state indistinguishable from a guest's — `disabled`, and
 *   `handlePushToggle` returning through `if (!user || pushBusy) return;`, which
 *   is the one silent path in that handler.
 *
 * That is also SW-20 from the other side: for a guest the same window never
 * closes. Same row, same missing dim, same missing explanation — one bug.
 *
 * The authed pass saw this shape three times (push switch, severity buttons,
 * the Verify button), so it is treated as a class, not an incident.
 *
 * ─── WHAT WAS ACTUALLY WRONG, PER SITE ────────────────────────────────────
 * The two handlers the brief named were already honest: `handlePushToggle`'s
 * Switch is REPLACED by an ActivityIndicator while `pushBusy` (so that half of
 * its guard can never be hit), and `runStatusChange`'s five triage buttons swap
 * in spinners too. The defect was in their NEIGHBOURS — controls sharing the
 * same busy flag with no visual treatment at all:
 *
 *   FlagDetailModal   11 controls `disabled={busy}` and pixel-identical to live,
 *                     Close (✕) included — the sheet could not be dismissed and
 *                     nothing said why.
 *   ReportFlagModal   severity discs, category pills, template chips and tag
 *                     chips all `disabled={submitting}` with `submitting` absent
 *                     from every style array.
 *   ProfileScreen     the realtime Switch, `disabled={savingRealtime}`, no dim.
 *
 * ─── THE HOUSE PATTERN THIS RESTORES ──────────────────────────────────────
 * `SettingsRow` has always done it right: `disabled && styles.rowDisabled`
 * (opacity 0.6) plus a busy spinner. The push row is the ONE row in that file
 * that does not go through SettingsRow, which is exactly how it missed both.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('SW-49 + SW-20 — the Settings push row', () => {
  const src = read('screens/SettingsScreen.tsx');

  it('reads auth LOADING, not just the user — the mount window is the bug', () => {
    expect(src).toContain('const { user, loading: authLoading } = useAuth();');
    expect(src).toMatch(/const pushLocked = authLoading \|\| !user;/);
  });

  it('dims while it cannot act, using the same style SettingsRow uses', () => {
    // RE-PINNED (GSP-06, board 07). The push row no longer hand-copies the
    // house treatment beside SettingsRow — it IS a SettingsRow, with the Switch
    // in the component's trailing control slot. So the dim is not a style
    // spelled out at the call site any more; it is the component's own
    // `disabled` branch, reached by the same `pushBusy || pushLocked`
    // expression this suite already pins below. That is SW-20/SW-49's actual
    // remedy — "it missed the house treatment because it was not a house row" —
    // made structural instead of repaired by hand.
    expect(src).toMatch(/disabled=\{pushBusy \|\| pushLocked\}/);
    expect(src).toMatch(/disabled && styles\.rowDisabled/);
    // Non-vacuity: that style must exist and actually be a dim.
    expect(src).toMatch(/rowDisabled: \{ opacity: 0\.6 \}/);
  });

  it('explains itself to a signed-out user, in the row AND in the hint', () => {
    // Two channels, one string, so they cannot drift: the subtitle a sighted
    // user reads and the accessibilityHint a screen-reader user hears.
    expect(src).toContain('PUSH_SIGNED_OUT_SUBTITLE');
    expect(src.match(/PUSH_SIGNED_OUT_SUBTITLE/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('does NOT tell a user to sign in before it knows whether they are', () => {
    // While auth is resolving we have no answer, so the row waits. Only a
    // settled "no account" earns the explainer.
    expect(src).toMatch(/const pushNeedsAccount = !authLoading && !user;/);
  });

  it('the switch is still disabled for the whole locked window', () => {
    expect(src).toContain('disabled={pushBusy || pushLocked}');
    expect(src).toContain('disabled: pushBusy || pushLocked');
  });
});

describe('SW-49 class — FlagDetailModal shares one `busy` across sixteen controls', () => {
  const src = read('components/FlagDetailModal.tsx');

  it('has a disabled style at all', () => {
    expect(src).toMatch(/btnDisabled: \{ opacity: 0\.5 \}/);
  });

  it.each([
    ['closeBtn', 'the sheet could not be dismissed and nothing said so'],
    ['editBtn', ''],
    ['cancelBtn', ''],
    ['saveBtn', ''],
    ['reopenBtn', ''],
    ['viewMapBtn', ''],
    ['directionsBtn', ''],
    ['shareBtn', ''],
    ['historyBtn', ''],
    ['reportBtn', ''],
  ])('%s shows that it is inert', (styleName) => {
    const line = src
      .split('\n')
      .find((l) => l.includes(`styles.${styleName},`) && l.includes('pressed'));
    // Non-vacuity: the control has to exist.
    expect(`${styleName} found: ${Boolean(line)}`).toBe(`${styleName} found: true`);
    expect(`${styleName}: ${line?.includes('busy && styles.btnDisabled')}`).toBe(
      `${styleName}: true`,
    );
  });

  it('the watch button too (its own flag as well as busy)', () => {
    expect(src).toContain('(busy || watchSaving) && styles.btnDisabled');
  });

  it('the triage verbs keep their spinners rather than only gaining a dim', () => {
    // These were already honest. A dim INSTEAD of a spinner would be a
    // downgrade — the spinner says "working", the dim only says "not now".
    //
    // RE-PINNED 2026-08-21 (GSP-02 §2.1). Five pills in four fills became one
    // filled primary (`primaryBtn`), one ghost segmented control whose cells
    // are generated from a list (`segmentCell`), and a Delete that moved to the
    // More row. The style NAMES moved; the rule did not, and all three of these
    // still swap in an ActivityIndicator while `busy`.
    for (const name of ['primaryBtn', 'segmentCell', 'deleteBtn']) {
      const idx = src.indexOf(`styles.${name},`);
      expect(`${name} found: ${idx > -1}`).toBe(`${name} found: true`);
      expect(src.slice(idx, idx + 900)).toContain('ActivityIndicator');
    }
  });
});

describe('SW-49 class — ReportFlagModal while a report uploads', () => {
  const src = read('screens/ReportFlagModal.tsx');

  it('has a disabled style, distinct from the not-yet-available one', () => {
    expect(src).toMatch(/chipDisabled: \{ opacity: 0\.5 \}/);
    // tagChipDisabled means "seasonal tags aren't live yet" — a different and
    // permanent statement. Collapsing them would lose that.
    expect(src).toMatch(/tagChipDisabled: \{/);
  });

  it.each(['sevBtn', 'pill', 'templateChip', 'tagChip'])(
    '%s dims while submitting',
    (styleName) => {
      // Find the style array containing this style, then look for the term.
      const idx = src.indexOf(`styles.${styleName},`);
      expect(idx).toBeGreaterThan(-1);
      const arrayEnd = src.indexOf(']}', idx);
      expect(src.slice(idx, arrayEnd)).toContain('submitting && styles.chipDisabled');
    },
  );
});

describe('SW-49 class — ProfileScreen realtime toggle', () => {
  const src = read('screens/ProfileScreen.tsx');

  it('dims while the preference is being written', () => {
    expect(src).toContain('savingRealtime && styles.toggleRowBusy');
    expect(src).toMatch(/toggleRowBusy: \{ opacity: 0\.6 \}/);
  });

  it('and the handler still guards re-entrancy — the dim is the affordance, not the fix', () => {
    expect(src).toContain('if (savingRealtime) return;');
  });
});
