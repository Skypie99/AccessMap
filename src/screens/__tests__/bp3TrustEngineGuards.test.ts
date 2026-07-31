/**
 * BP3 (R2 / T4 + T8) trust-engine guards.
 *
 * Locks the two working moments so a future edit can't silently regress them:
 *  - T4: every ReportFlagModal Pressable answers the finger with a
 *    FILL-COMPOSITED pressed dim (color.borderPressed — never a group opacity,
 *    which would collapse label-vs-fill contrast below AA); the pickers tick on
 *    finger-DOWN; triage commits with impact('medium')+notify('success') at the
 *    shared commit point and notify('error') on the failure path.
 *  - T8: the FlagCard / Home / Legend spoken layer routes through the taught
 *    a11yText grammar (no raw enums), each action names its flag, the Legend
 *    digit is decorative (decorativeProps → RN-web stops doubling it), and the
 *    severity-4 photo nudge speaks the taught SEVERITY_LABELS, not "major".
 *
 * Pressed-fill LEGIBILITY is measured by the arbiter sibling
 * design-reviews/r2-audit/tools/r2-report-ack-stacks.json (contrast-check.mjs,
 * exit 0). End-to-end feel is a Sky device check (R2-D1). These are the fast
 * in-CI source contracts + the composed-label behaviour.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const readSrc = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');
const reportModal = readSrc('screens/ReportFlagModal.tsx');
const tasksScreen = readSrc('screens/TasksScreen.tsx');
const homeScreen = readSrc('screens/HomeScreen.tsx');
const legendModal = readSrc('screens/LegendModal.tsx');

describe('T4 — ReportFlagModal answers the finger (source contract)', () => {
  it('the pressed dim is fill-composited (borderPressed), never a group opacity', () => {
    // The house idiom: a backgroundColor swap that leaves label ink at full
    // opacity. A group `opacity` here would collapse label/fill contrast (the
    // absorbed skeptic FIX). borderPressed is arbiter-proven AA in both schemes.
    expect(reportModal).toMatch(/chipPressed:\s*\{\s*backgroundColor:\s*color\.borderPressed\s*\}/);
    expect(reportModal).not.toMatch(/chipPressed:\s*\{[^}]*opacity/);
  });

  it('all 10 Pressables carry a pressed treatment (9 chipPressed + the Submit scrim)', () => {
    const chipPressedUses = reportModal.match(/pressed && styles\.chipPressed/g) ?? [];
    expect(chipPressedUses.length).toBe(9);
    expect(reportModal).toMatch(/styles\.submitPressedScrim/);
  });

  it('the selection tick fires on finger-DOWN — and ONLY from the two pickers', () => {
    const onPressIn = reportModal.match(/onPressIn=\{\(\) => hapticSelection\(\)\}/g) ?? [];
    expect(onPressIn.length).toBe(2);
    // The only two hapticSelection() CALLS are those press-in handlers; the
    // import binding has no parens, so a stray release-time tick would show up.
    const calls = reportModal.match(/hapticSelection\(\)/g) ?? [];
    expect(calls.length).toBe(2);
  });

  it('Submit keeps its shipped success notify (untouched)', () => {
    expect(reportModal).toMatch(/hapticNotify\('success'\)/);
  });
});

describe('T4 — TasksScreen triage speaks the commit vocabulary (source contract)', () => {
  const applyStatusChange = tasksScreen.slice(
    tasksScreen.indexOf('const applyStatusChange'),
    tasksScreen.indexOf('const setStatus'),
  );
  // Sliced to the NEXT declaration rather than a fixed +1600 characters.
  // R-2/SR-093 added a guest gate at the top of setStatus and pushed the catch
  // block past the old window, so the guard went red for a function whose
  // behaviour had not changed — a character count is not a scope. Anchoring on
  // the real boundary means the assertion keeps meaning the same thing however
  // the body grows.
  const setStatusStart = tasksScreen.indexOf('const setStatus');
  const setStatusEnd = tasksScreen.indexOf('const handleViewOnMap', setStatusStart);
  const setStatus = tasksScreen.slice(setStatusStart, setStatusEnd);

  it('the commit point fires impact(medium) + notify(success) inside applyStatusChange', () => {
    expect(applyStatusChange).toMatch(/hapticImpact\('medium'\)/);
    expect(applyStatusChange).toMatch(/hapticNotify\('success'\)/);
  });

  it('the slice really is setStatus — a bad window would pass vacuously', () => {
    // Both boundaries must have been found, or `slice` silently yields
    // something that still satisfies a positive match by accident.
    expect(setStatusStart).toBeGreaterThan(-1);
    expect(setStatusEnd).toBeGreaterThan(setStatusStart);
    expect(setStatus).toMatch(/updateFlagStatus\(/);
  });

  it('the failure path fires notify(error) in the setStatus catch', () => {
    expect(setStatus).toMatch(/catch \(e\) \{[\s\S]*?hapticNotify\('error'\)/);
  });

  it('the three commit actions are silent on press (haptic none); Details keeps selection', () => {
    const noneCount = (tasksScreen.match(/haptic: 'none'/g) ?? []).length;
    expect(noneCount).toBe(3);
    expect(tasksScreen).toMatch(/haptic: 'selection'/);
    expect(tasksScreen).toMatch(/haptic=\{a\.haptic\}/); // threaded into the button
  });
});

describe('T8 — one spoken voice (source contract)', () => {
  it('FlagCard composes via severityA11y + statusA11y, not the raw enums', () => {
    expect(tasksScreen).toMatch(/severityA11y\(flag\.severity\)/);
    expect(tasksScreen).toMatch(/statusA11y\(flag\.status\)/);
    // the raw-enum compositions the helpers exist to replace must not survive
    expect(tasksScreen).not.toMatch(/severity \$\{flag\.severity\}, \$\{flag\.status\}/);
    expect(tasksScreen).not.toMatch(/severity \$\{flag\.severity\}\./);
  });

  it('each triage action names its flag (category + conditional distance)', () => {
    expect(tasksScreen).toMatch(
      /const actionSubject = `\$\{CATEGORY_LABELS\[flag\.category\]\}\$\{distanceInfo \? `, \$\{distanceInfo\.label\}` : ''\}`/,
    );
    expect(tasksScreen).toMatch(/Verify this flag — \$\{actionSubject\}/);
  });

  it('Home keeps the status word when distance renders (F4-10)', () => {
    // SR-042: the SPOKEN label now uses speakDistance ("297 meters away"),
    // not the visible abbreviation ("297 m") — the point of this assertion is
    // that the status word survives alongside the distance, which it does.
    expect(homeScreen).toMatch(/statusA11y\(item\.f\.status\)\}, \$\{speakDistance\(item\.km\)\}/);
  });

  it('the Legend severity digit is decorative — now via the SeverityDisc primitive (F4-01)', () => {
    // BP10 / T5 moved the digit into <SeverityDisc>, which is decorative by
    // default (it applies decorativeProps so RN-web / VoiceOver don't double-read
    // the digit; the row View still carries the authored label). The primitive's
    // own decorative contract is guarded in bp10SeverityGrammarGuards.test.tsx.
    expect(legendModal).toMatch(/import \{ SeverityDisc \}/);
    expect(legendModal).toMatch(/<SeverityDisc\s+severity=\{s\}/);
    expect(legendModal).not.toMatch(/styles\.sevDot/);
  });

  it('the severity-4 photo nudge speaks the taught label, not the invented "major"', () => {
    expect(reportModal).not.toMatch(/\? 'severe' : 'major'/);
    const interp = reportModal.match(/SEVERITY_LABELS\[severity\]\.toLowerCase\(\)/g) ?? [];
    expect(interp.length).toBe(3);
  });
});
