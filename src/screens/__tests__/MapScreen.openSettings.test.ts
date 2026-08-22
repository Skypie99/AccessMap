/**
 * D26 — a denial the app cannot re-ask.
 *
 * ─── THE DEFECT ───────────────────────────────────────────────────────────
 * iOS answers a second permission request with silence once the user has said
 * no: `canAskAgain` goes false, `requestForegroundPermissionsAsync` returns
 * denied without showing anything, and every control that says "turn on
 * location" is pointing at a door that no longer opens. The app's own copy was
 * still promising an in-app fix — "Use the recenter button to turn on
 * location" — to exactly the cohort for whom that button can do nothing.
 *
 * ─── THE FENCE, and why it matters ────────────────────────────────────────
 * The remedy is deliberately NARROWER than "location denied". A user who can
 * still be re-asked keeps today's wording and today's recenter button, because
 * for them the in-app route is the true one; swapping their button for a trip
 * to the OS settings pane would be a worse answer, not a better one. So every
 * assertion below is about the LOCKED state specifically.
 *
 * Source-scan idiom: this codebase defers full MapScreen renders to
 * Detox/Playwright (see MapScreen.heatmap.test.tsx), so these sit on stable
 * semantic anchors like MapScreen.arrival.test.ts and qaMergeConsolidation.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const map = fs.readFileSync(path.join(SRC, 'MapScreen.tsx'), 'utf8');

describe('the gate — denied AND the OS will not ask again', () => {
  it('reads canAskAgain from the request, not just the status', () => {
    expect(map).toContain(
      'const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();',
    );
    expect(map).toContain('setPermissionLocked(canAskAgain === false);');
  });

  it('reads it on ARRIVAL too, so an earlier session’s denial is honoured', () => {
    expect(map).toMatch(
      /status === 'denied' && canAskAgain === false\) \{\s*\n\s*setPermissionLocked\(true\);/,
    );
  });

  it('is a state of its own, never conflated with plain denial', () => {
    expect(map).toContain('const [permissionLocked, setPermissionLocked] = useState(false);');
    expect(map).toContain('const [permissionDenied, setPermissionDenied] = useState(false);');
    // A grant clears both.
    expect(map).toMatch(/setPermissionDenied\(false\);\s*\n\s*setPermissionLocked\(false\);/);
  });

  it('is platform-fenced — the web has no settings pane to open', () => {
    expect(map).toContain(
      "const canOpenSettings = Platform.OS === 'ios' || Platform.OS === 'android';",
    );
  });
});

describe('the three controls that were pointing at a closed door', () => {
  it('the denied banner offers the route that still works', () => {
    expect(map).toMatch(
      /\{permissionLocked && canOpenSettings && \(\s*\n\s*<Pressable\s*\n\s*onPress=\{\(\) => void Linking\.openSettings\(\)\}/,
    );
    // WCAG 2.5.3: the visible word leads the accessible name.
    expect(map).toContain('accessibilityLabel="Open Settings"');
    expect(map).toMatch(/<AppText variant="label" style=\{styles\.bannerLinkText\}>Open Settings<\/AppText>/);
  });

  it('the link carries the 44pt box itself', () => {
    expect(map).toMatch(/bannerLink: \{[\s\S]{0,240}?minHeight: a11y\.minTargetSize/);
  });

  it('the recenter button stops pretending it can recenter', () => {
    expect(map).toMatch(
      /permissionLocked && canOpenSettings\s*\n\s*\? \(\) => void Linking\.openSettings\(\)\s*\n\s*: requestLocation/,
    );
    expect(map).toMatch(
      /permissionLocked && canOpenSettings \? 'Open Settings' : 'Recenter on me'/,
    );
  });

  it('the Report FAB hint stops promising an in-app fix', () => {
    expect(map).toContain(
      'Dimmed until location is on. Turn it on in Settings, then report a flag here.',
    );
    // Non-vacuity + the fence: the in-app sentence SURVIVES for the cohort it
    // is still true for.
    expect(map).toContain(
      'Dimmed until location is on. Use the recenter button to turn on location, then report a flag here.',
    );
  });

  it('nothing changes for a user who can still be re-asked', () => {
    // Every one of the three swaps is guarded by the locked state; none of them
    // keys off `permissionDenied` alone.
    const swaps = map.match(/permissionLocked && canOpenSettings/g) ?? [];
    expect(swaps.length).toBeGreaterThanOrEqual(4);
    expect(map).not.toMatch(/permissionDenied && canOpenSettings/);
  });
});
