/**
 * D4/C4 — the standing geo-privacy fence.
 *
 * Phase 3 taught Home to use the user's location for real: the map peek now
 * follows it, and an emptiness claim is computed from it. That is exactly the
 * kind of change that, iterated a few times by a future well-meaning edit,
 * turns into "just send the coordinates to the server so the query can filter
 * by distance" — which would be a privacy regression that no existing test
 * would catch, because everything would still work.
 *
 * So the properties that make the current design safe are written down here as
 * assertions rather than left as a fact about today's code. All five held
 * BEFORE Phase 3 and must hold after it; this suite is pure-additive and
 * revert-safe in any order.
 *
 * The claim being fenced, in one line: the user's position is read on the
 * device, used on the device, and never transmitted, persisted, or watched.
 *
 * (Const. Art. 9.6 — privacy-sensitive prompts are user-initiated. Jordan's
 * standing note applies: this is an engineering fence, not a legal opinion.)
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}
const allSources = walk(SRC);

describe('geo-privacy fence — the location never reaches the server', () => {
  const flags = read('lib/flags.ts');
  const store = read('lib/flagsStore.tsx');

  it('no query filters flags by the viewer’s coordinates', () => {
    // A geo predicate would mean shipping the user's position to Supabase on
    // every fetch. The list is filtered by status and ordered by recency; all
    // distance work happens locally on rows we already have.
    for (const [name, src] of [['flags.ts', flags], ['flagsStore.tsx', store]] as const) {
      expect(`${name}:${/\.(gte|lte|gt|lt)\(\s*['"](lat|lng)['"]/.test(src)}`).toBe(`${name}:false`);
      expect(`${name}:${/ST_DWithin|st_dwithin/.test(src)}`).toBe(`${name}:false`);
      expect(`${name}:${/geography\(/.test(src)}`).toBe(`${name}:false`);
      expect(`${name}:${/earth_box|<->/.test(src)}`).toBe(`${name}:false`);
    }
  });

  it('the flags select stays a status/recency query', () => {
    expect(flags).toMatch(/\.in\('status', statuses\)/);
    expect(flags).toMatch(/\.order\('created_at', \{ ascending: false \}\)/);
  });
});

describe('geo-privacy fence — the OS prompt has exactly three sites', () => {
  it('only location.ts, MapScreen and OnboardingCards may ask', () => {
    const askers = allSources
      .filter((f) => /requestForegroundPermissionsAsync/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(SRC.length + 1))
      .sort();
    expect(askers).toEqual([
      'components/OnboardingCards.tsx',
      'lib/location.ts',
      'screens/MapScreen.tsx',
    ]);
  });

  it('Home never prompts — it reads an already-granted position or nothing', () => {
    const home = read('screens/HomeScreen.tsx');
    expect(home).not.toMatch(/from 'expo-location'/);
    expect(home).not.toMatch(/requestForegroundPermissionsAsync/);
    // The silent probe is gated on permission that already exists...
    expect(home).toMatch(/requireExistingPermission=\{!askedForLocation\}/);
    // ...and on web, where the browser always prompts, it isn't mounted at all
    // until the user explicitly asks.
    expect(home).toMatch(/const probeEnabled = Platform\.OS !== 'web' \|\| askedForLocation/);
  });

  it('Tasks and Profile use the existing-permission-only location path', () => {
    const tasks = read('screens/TasksScreen.tsx');
    const profile = read('screens/ProfileScreen.tsx');
    for (const [name, src] of [['TasksScreen.tsx', tasks], ['ProfileScreen.tsx', profile]] as const) {
      expect(`${name}:${/requireExistingPermission:\s*true/.test(src)}`).toBe(`${name}:true`);
      expect(`${name}:${/requestForegroundPermissionsAsync/.test(src)}`).toBe(`${name}:false`);
    }
  });

  it('passive web consumers query permission before reading geolocation', () => {
    const location = read('lib/location.ts');
    const permissionQuery = location.indexOf("navigator.permissions?.query({ name: 'geolocation' })");
    const positionRead = location.indexOf('navigator.geolocation.getCurrentPosition(');
    expect(permissionQuery).toBeGreaterThan(-1);
    expect(positionRead).toBeGreaterThan(permissionQuery);
  });
});

describe('geo-privacy fence — read once, never watched, never kept', () => {
  it('nothing anywhere subscribes to a continuous position stream', () => {
    const watchers = allSources
      .filter((f) => /watchPositionAsync|watchPosition\(/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(SRC.length + 1));
    expect(watchers).toEqual([]);
  });

  it('Home persists nothing and talks to no backend', () => {
    const home = read('screens/HomeScreen.tsx');
    expect(home).not.toMatch(/AsyncStorage/);
    expect(home).not.toMatch(/from '@\/lib\/supabase'/);
    expect(home).not.toMatch(/supabase\./);
  });

  it('the coordinates Home holds live only in component state', () => {
    const home = read('screens/HomeScreen.tsx');
    expect(home).toMatch(/const \[userLocation, setUserLocation\] = useState<LatLng \| null>\(null\)/);
    expect(home).toMatch(/const \[searchCenter, setSearchCenter\] = useState<LatLng \| null>\(null\)/);
  });
});
