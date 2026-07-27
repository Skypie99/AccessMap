/**
 * R-12 / SR-015 — the documented ship commands must actually be able to ship.
 *
 * `deploy:testflight` was broken two ways at once, and neither is visible
 * until you spend a paid build and watch the submit step fail:
 *
 *   1. it passed `eas submit --profile preview`, and eas.json defines exactly
 *      one submit profile, `production`;
 *   2. it chained `build:preview`, whose profile is `distribution: "internal"`
 *      — an internal-distribution build CANNOT be submitted to App Store
 *      Connect at all. Meanwhile `build.testflight` (`distribution: "store"`)
 *      sat orphaned, referenced by no script.
 *
 * So this guard checks both halves for every deploy script, not just the one
 * that was reported: the submit profile must exist, and the build profile it
 * chains must be store-distribution.
 */
import fs from 'fs';
import path from 'path';

const REPO = path.join(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const eas = JSON.parse(fs.readFileSync(path.join(REPO, 'eas.json'), 'utf8'));

const deployScripts = Object.entries(pkg.scripts as Record<string, string>).filter(([name]) =>
  name.startsWith('deploy:'),
);

/** Resolve a build profile through eas.json's `extends` chain. */
function resolveBuildProfile(name: string): Record<string, unknown> {
  const seen = new Set<string>();
  let out: Record<string, unknown> = {};
  let cur: string | undefined = name;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const profile = eas.build?.[cur];
    if (!profile) break;
    out = { ...profile, ...out }; // child wins over parent
    cur = profile.extends;
  }
  return out;
}

describe('R-12 (SR-015) — deploy scripts resolve to real, submittable profiles', () => {
  it('finds deploy scripts to guard (sanity: the scan is not vacuous)', () => {
    expect(deployScripts.length).toBeGreaterThanOrEqual(2);
  });

  it.each(deployScripts)('%s submits with a profile that exists in eas.json', (_name, cmd) => {
    const submitProfile = /eas submit[^&|]*--profile\s+(\S+)/.exec(cmd)?.[1];
    expect(submitProfile).toBeDefined();
    expect(Object.keys(eas.submit ?? {})).toContain(submitProfile);
  });

  it.each(deployScripts)('%s builds with a store-distribution profile', (_name, cmd) => {
    // The chained build comes from `npm run build:x`; follow it to its profile.
    const chained = /npm run (build:[\w-]+)/.exec(cmd)?.[1];
    expect(chained).toBeDefined();
    const buildCmd = pkg.scripts[chained as string] as string;
    expect(buildCmd).toBeDefined();
    const buildProfile = /--profile\s+(\S+)/.exec(buildCmd)?.[1];
    expect(buildProfile).toBeDefined();
    // `internal` distribution cannot reach App Store Connect. This is the
    // half the original report missed.
    expect(resolveBuildProfile(buildProfile as string).distribution).toBe('store');
  });
});
