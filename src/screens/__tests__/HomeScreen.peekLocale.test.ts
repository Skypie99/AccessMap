/**
 * D4/C1 — the Home map peek honors a center that arrives after mount.
 *
 * The defect this pins: `initialRegion` is read ONCE, at construction, by both
 * map halves — native hands it straight to the MapView (PlatformMap.tsx:288)
 * and web maps it to react-leaflet's `center`/`zoom` on MapContainer
 * (PlatformMap.web.tsx:1017-1018), neither of which honors a later prop change.
 * The location probe resolves AFTER mount, so the peek stayed on its San
 * Francisco fallback forever while the list beside it had already re-sorted by
 * real distance — the screen knew where the user was and the map did not.
 *
 * The mechanism under guard is a keyed REMOUNT, not an imperative snap:
 * `snapToRegion` exists on both halves but no-ops before the map is ready and
 * neither exposes a ready signal, so a snap would mean editing PROTECT-adjacent
 * PlatformMap code. Remounting honors the region at construction instead.
 *
 * Source contracts, not render tests — HomeScreen needs a navigator, a safe-area
 * provider, a flags store and a map to render, and none of that would make these
 * four facts any truer. Real camera behavior on a real GPS is a Sky device item.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const readSrc = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');
const home = readSrc('screens/HomeScreen.tsx');
const mapNative = readSrc('components/PlatformMap.tsx');
const mapWeb = readSrc('components/PlatformMap.web.tsx');

describe('D4/C1 — the peek remounts onto a post-mount center', () => {
  it('keys the peek map on the resolved center', () => {
    // The key is what forces the remount; without it the camera is frozen at
    // whatever region existed on the first paint.
    expect(home).toMatch(/<PlatformMap\s+key=\{peekMapKey\}/);
  });

  it('derives that key from the center coordinates, with a data-derived fallback branch', () => {
    expect(home).toMatch(/const peekMapKey = center\s*\?\s*`peek:\$\{center\.lat\.toFixed\(5\)\},\$\{center\.lng\.toFixed\(5\)\}`/);
    // SW-08 (Sky, 2026-08-20): the no-centre branch was the literal
    // 'peek:default', which was correct while that branch was a CONSTANT. It is
    // not one any more — it fits the loaded reports — and a constant key would
    // freeze the map on whatever it mounted with before the data arrived, which
    // is the same mount-only law this whole file works around. Same 5dp
    // rounding as the centred branch, for the same anti-churn reason.
    expect(home).toMatch(/`peek:fit:\$\{peekRegion\.latitude\.toFixed\(5\)\},\$\{peekRegion\.longitude\.toFixed\(5\)\}`/);
    expect(home).toMatch(/toFixed\(5\)/);
  });

  it('changes that key only on a DISCRETE center change, never per frame', () => {
    // `center` is `searchCenter ?? userLocation` — both plain state, so its
    // identity moves only when the probe resolves or a search is picked/cleared.
    expect(home).toMatch(/const center: LatLng \| null = searchCenter \?\? userLocation/);
    // 5dp ~ 1 m, far finer than the 0.05-degree (~5 km) peek window, so the key
    // cannot churn on jitter the user could never see.
    expect(home).toMatch(/toFixed\(5\)/);
  });

  it('memoizes the region on the center — PlatformMap is memo() and asks for it', () => {
    expect(home).toMatch(/const peekRegion = useMemo\(/);
    // The dependency array is the whole point: a fresh object literal every
    // render (what shipped before) silently defeated the memo on PlatformMap.
    // SW-08 added `flags` to it, because the no-centre branch now fits the
    // loaded reports and would otherwise be memoized against data it reads.
    // Both deps are required and neither is per-frame: `center` is plain state,
    // and `flags` comes from the store, so this still changes on a DISCRETE
    // event (probe resolve, search pick/clear, or a flags refresh) rather than
    // on every render.
    expect(home).toMatch(/FALLBACK_PEEK_REGION\),\s*\n\s*\[center, flags\],\s*\n\s*\);/);
    expect(mapNative).toMatch(/export default memo\(PlatformMap\)/);
  });
});

describe('D4/C1 — the mount-only law this works around still holds', () => {
  it('native forwards initialRegion straight to the map, with no live sync', () => {
    expect(mapNative).toMatch(/initialRegion=\{initialRegion\}/);
    // If someone ever adds an effect that re-applies initialRegion, the remount
    // becomes redundant and this guard should be revisited deliberately.
    expect(mapNative).not.toMatch(/useEffect\([\s\S]{0,400}?\[\s*initialRegion\s*\]/);
  });

  it('web feeds it to MapContainer center/zoom, which are construction-time props', () => {
    expect(mapWeb).toMatch(/center=\{\[initialRegion\.latitude, initialRegion\.longitude\]\}/);
    expect(mapWeb).toMatch(/zoom=\{deltaToZoom\(initialRegion\.latitudeDelta\)\}/);
  });
});

describe('D4/C1 — Fork 1 fence: the fallback constant does not move', () => {
  it('keeps the peek fallback at San Francisco, byte-for-byte', () => {
    // The SF -> Kelowna swap was a PARKED fork (fork-brief BRIEF 1). Centering
    // the peek correctly made that fork MORE visible, not less — and taking it
    // was Sky's call, not a side effect of a fix, so the constant was pinned.
    //
    // SKY TOOK THE FORK, 2026-08-20 (SW-08) — and the constant STILL does not
    // move, which is why this assertion survives unchanged. The answer was not
    // "swap SF for Kelowna": a second hardcoded city is the same mistake with
    // better coordinates, and it would go stale the day the app has reports
    // anywhere else. The peek now FITS THE LOADED REPORTS, and this constant
    // stays exactly where it was as the last resort for the one case that
    // cannot be fitted — no centre AND no data — where no viewport can be
    // honest anyway. See the assertion below for the fence that still binds it.
    expect(home).toMatch(/const FALLBACK_PEEK_REGION = \{\s*\n\s*latitude: 37\.7749,\s*\n\s*longitude: -122\.4194,/);
  });

  it('is reached only after a data fit has been tried', () => {
    // The fork's real content: an unlocated user should not be shown a city
    // picked at random while the app holds reports it could point at.
    expect(home).toMatch(/regionFittingPoints\(flags\.map\(/);
    expect(home).toMatch(/\?\?\s*\n?\s*FALLBACK_PEEK_REGION/);
  });

  it('never lets the fallback become a distance origin', () => {
    // The shipped honesty rule: distances render only from a real center, so a
    // fallback region can never fabricate one.
    expect(home).toMatch(/NEVER a distance origin/);
  });
});
