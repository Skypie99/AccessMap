/**
 * MapScreenLocateFailure.test.ts — B10 (L7-07) source invariants.
 *
 * `Alert.alert` is a no-op shim on react-native-web, so a web "locate me"
 * failure used to be fully silent — nothing visible, nothing spoken. B10 routes
 * the WEB failure through the persistent LiveStatusRegion (visible + live) with
 * a Retry, while native keeps its working, announced dialog.
 *
 * Like reportFabFreshLocation.test.ts these are SOURCE-LEVEL invariants (a full
 * MapScreen render pulls maps/navigation/location context); they pin the fix's
 * semantic anchors so it survives refactors but trips if the web branch reverts
 * to the silent Alert.alert.
 */
import * as fs from 'fs';
import * as path from 'path';

const map = fs.readFileSync(path.join(__dirname, '..', 'MapScreen.tsx'), 'utf8');

/** A window of `len` chars from the first occurrence of `anchor`. */
function around(haystack: string, anchor: string, len = 700): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('B10 — web locate-failure gets a visible + spoken outcome', () => {
  it('imports the shared live-status channel', () => {
    expect(map).toContain("import { setLiveStatus } from '@/lib/liveStatus'");
  });

  it('branches the locate-failure by platform', () => {
    const block = around(map, 'B10 (L7-07): Alert.alert is a no-op');
    expect(block).toContain("Platform.OS === 'web'");
  });

  it('routes the web failure through LiveStatusRegion with a Retry', () => {
    const block = around(map, 'B10 (L7-07): Alert.alert is a no-op');
    expect(block).toContain('setLiveStatus(');
    expect(block).toContain("Couldn't find your location");
    expect(block).toContain("label: 'Retry'");
    // Retry re-runs the locate via the stable ref (not a self-referential dep).
    expect(block).toContain('requestLocationRef.current()');
  });

  it('keeps the native Alert.alert dialog (works + announced there)', () => {
    // Globally unique to this catch's else branch (a different message than the
    // preset-save Alert), so assert on the whole file rather than a window.
    expect(map).toContain('Alert.alert("Couldn\'t find your location", errorMessage(e))');
  });
});
