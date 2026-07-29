/**
 * CLASS A — R-2 (guest honesty ×4) and R-13 (web cohort ×2).
 *
 * These were picked in §SKY-3h, went unbuilt in the M-run, and were carried as
 * a counted residue rather than a false green. Run 2 built them.
 *
 * WHY SOURCE GUARDS. Every one of these six is a defect of ABSENCE — a missing
 * gate, a missing branch, a dropped call. There was nothing to observe: each of
 * them shipped with the whole suite green, because a test that does not know a
 * guard should exist cannot notice it is gone. Behavioural coverage for the
 * paths that have it lives in their own suites; what belongs here is the
 * assertion that the guard is still present at all.
 *
 * R-2 is the App Review reviewer's cold walk, as a guest. R-13 is graded
 * web-cohort (J-8) — the store artifact is the native binary — but the web
 * build is both the audit's guest-evidence proxy and potentially user-facing.
 */
import fs from 'fs';
import path from 'path';

const REPO = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, 'src', rel), 'utf8');

describe('R-2 · the guest reviewer walks in and is told the truth', () => {
  /**
   * SR-093. A guest tap fired a real write; RLS refused it; PostgREST returned
   * zero rows; `updateFlagStatus` cannot tell that apart from a concurrent edit
   * and threw FlagStatusConflictError — so the guest was told "This flag
   * changed". Nothing had changed. The app invented a concurrent edit to
   * explain a permission it had never mentioned.
   */
  const TRIAGE_CALLERS: readonly [label: string, rel: string][] = [
    ['the flag sheet', 'components/FlagDetailModal.tsx'],
    ['the Tasks card', 'screens/TasksScreen.tsx'],
  ];

  it.each(TRIAGE_CALLERS)('%s refuses a guest triage BEFORE writing', (_l, rel) => {
    const src = read(rel);
    expect(src).toContain("notify('Sign in required', 'Please sign in to verify or resolve flags.')");
  });

  /**
   * ⚠ SCOPED PER FUNCTION, and the first draft of this test was not — it
   * compared indexes across the whole file and went red against correct code,
   * because TasksScreen has THREE call sites and the flat indexOf found the
   * earliest. Chasing that down is what surfaced the third one (runBulkAction),
   * which had no gate at all: a guest in selection mode fired one RLS-denied
   * write per selected flag and got a list of raw error strings back.
   */
  const GATED_FUNCTIONS: readonly [label: string, rel: string, fn: string][] = [
    ['the flag sheet', 'components/FlagDetailModal.tsx', 'const runStatusChange'],
    ['the Tasks card', 'screens/TasksScreen.tsx', 'const setStatus'],
    ['the Tasks bulk action', 'screens/TasksScreen.tsx', 'const runBulkAction'],
  ];

  it.each(GATED_FUNCTIONS)('%s puts the gate ahead of the write, not after', (_l, rel, fn) => {
    // A gate below the write would still fire the RLS-denied round trip and
    // still surface the false conflict — the bug, with a message bolted on.
    const src = read(rel);
    const start = src.indexOf(fn);
    expect(start).toBeGreaterThan(-1);
    // A generous window from the declaration: enough to contain the gate and
    // the write, short enough not to reach the next function's.
    const body = src.slice(start, start + 4000);
    const gate = body.indexOf("'Sign in required'");
    const write = body.indexOf('await updateFlagStatus(');
    expect(gate).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(write);
  });

  it('all three triage call sites are gated — none was left behind', () => {
    // The count is the assertion. A fourth call site added without a gate
    // should make this fail rather than pass quietly.
    const tasks = read('screens/TasksScreen.tsx');
    const writes = (tasks.match(/await updateFlagStatus\(/g) ?? []).length;
    const gates = (tasks.match(/Please sign in to verify or resolve flags\./g) ?? []).length;
    expect(writes).toBe(2);
    expect(gates).toBe(2);
  });

  it('the false-conflict copy still exists — for the case where it is TRUE', () => {
    // The fix is not deleting the conflict message. A real concurrent edit must
    // still say so; only the guest path stopped borrowing it.
    expect(read('components/FlagDetailModal.tsx')).toContain("'This flag changed'");
    expect(read('screens/TasksScreen.tsx')).toContain("'This flag changed'");
  });

  /** SR-094. The reopen form used to submit into total silence for a guest. */
  it('the reopen form answers a guest instead of swallowing the submit', () => {
    const src = read('components/FlagDetailModal.tsx');
    const fn = src.slice(src.indexOf('const handleReopenSubmit'));
    expect(fn).toContain("notify('Sign in required', 'Please sign in to request a reopen.')");
    // The bare `if (!user || …) return;` is what made it silent. It must not
    // have come back alongside the message.
    expect(fn.slice(0, 900)).not.toMatch(/if \(!user \|\|/);
  });

  /** SR-095. "History not yet enabled" told reviewers the app was half-built. */
  it('the empty history state no longer claims the feature is unbuilt', () => {
    const src = read('components/StatusHistoryModal.tsx');
    const rendered = src.slice(src.indexOf('emptyWrap'));
    expect(rendered).not.toContain('not yet enabled');
    expect(rendered).not.toContain('fully set up');
    expect(src).toContain('Status changes will appear here once this flag has been verified or resolved.');
  });

  /**
   * SR-041. `setAskedForLocation(true)` on an already-true state is a no-op:
   * React bails out, nothing remounts, and after a denial the control was dead
   * for the rest of the session — a user who denied by reflex, or who granted
   * permission in Settings afterwards, had no way back.
   */
  it('"Use my location" can be tapped again after a denial', () => {
    const src = read('screens/HomeScreen.tsx');
    expect(src).toContain('setLocateNonce((n) => n + 1)');
    // The nonce only means anything if it actually forces a fresh probe.
    expect(src).toMatch(/key=\{locateNonce\}/);
    expect(src.indexOf('key={locateNonce}')).toBeGreaterThan(src.indexOf('<LocationProbe'));
  });
});

describe('R-13 · the web cohort is not assumed to be using a screen reader', () => {
  /**
   * SR-104. react-native-web's isScreenReaderEnabled resolves TRUE
   * unconditionally — verified in
   * node_modules/react-native-web/dist/exports/AccessibilityInfo/index.js.
   * The old code caught a rejection that never came, so every web visitor was
   * treated as a screen-reader user: Nearby auto-opened over the map, and
   * selecting a flag from the list stopped recentring.
   */
  it('web short-circuits before asking a question the platform always answers "yes"', () => {
    const src = read('lib/accessibility.ts');
    const hook = src.slice(src.indexOf('export function useScreenReader'));
    const guard = hook.indexOf("Platform.OS === 'web'");
    const call = hook.indexOf('AccessibilityInfo.isScreenReaderEnabled()');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(call);
  });

  it('the stale "web rejects" comment is gone — it was the reason nobody looked', () => {
    const hook = read('lib/accessibility.ts');
    expect(hook).not.toContain('Web / unsupported platforms reject');
  });

  /**
   * SR-105. `mapRef.current?.snapToRegion(region)` — the `?.` was the bug. The
   * ref is not populated on the frame the flags first land (react-leaflet
   * attaches its handle asynchronously), so the snap was silently dropped while
   * the one-time flag had already been set, retiring the fit forever. A guest
   * with no location sat on the seeded San Francisco default with their own
   * city's flags loaded and off-screen.
   */
  it('the initial fit is only marked done once it has actually happened', () => {
    const src = read('screens/MapScreen.tsx');
    const fit = src.slice(src.indexOf('const commitFit'), src.indexOf('commitFit(10)'));
    // The done-flag must sit AFTER the readiness check, not before it.
    expect(fit.indexOf('if (!mapRef.current)')).toBeLessThan(
      fit.indexOf('didInitialFitRef.current = true'),
    );
    // And the commit itself must not be optional-chained any more: reaching it
    // means the ref is non-null, so `?.` there would hide a future regression.
    expect(fit).toContain('mapRef.current.snapToRegion(region)');
  });

  it('the retry is bounded, so a map that never mounts cannot spin', () => {
    const src = read('screens/MapScreen.tsx');
    const fit = src.slice(src.indexOf('const commitFit'), src.indexOf('commitFit(10)') + 20);
    expect(fit).toMatch(/if \(attempts <= 0\) return/);
    expect(fit).toMatch(/commitFit\(attempts - 1\)/);
    expect(fit).toContain('commitFit(10)');
  });
});
