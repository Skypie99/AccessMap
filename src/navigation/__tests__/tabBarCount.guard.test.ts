/**
 * The tab bar must announce the number of tabs it actually shows — and the same
 * number to everyone.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * Censused live on the sim walk (2026-08-19 guest, 2026-08-20 signed in as an
 * admin), against a bar with THREE visible tabs:
 *
 *   guest / non-admin ....... "Home, tab, 1 of 5"
 *   signed-in admin ......... "Home, tab, 1 of 6"
 *
 * @react-navigation/bottom-tabs (7.16.2) builds that label itself, in
 * BottomTabBar:
 *
 *   `${label}, tab, ${index + 1} of ${routes.length}`
 *
 * and `routes.length` is every registered <Tab.Screen>, including the three
 * that render `tabBarButton: () => null` (FullMap, Settings, Admin).
 * `tabBarItemStyle: { display: 'none' }` does not affect it either. The only
 * escape hatch the library offers is `tabBarAccessibilityLabel`, which
 * short-circuits the generated string.
 *
 * SW-13 predicted the admin case from the guest one; the authed pass confirmed
 * it. SW-38 is the consequence: because `Admin` is registered only when
 * `useIsAdmin()` resolves true, the count is a ROLE ORACLE — a listener beside
 * the user can hear whether the account is an admin, and can hear it flip 5 -> 6
 * as the async check lands.
 *
 * ─── WHAT THIS ENFORCES ───────────────────────────────────────────────────
 *   1. The announced count comes from ONE list of visible tabs, so it cannot
 *      drift from the bar again.
 *   2. Every visible tab passes tabBarAccessibilityLabel.
 *   3. No hidden route does — a hidden route with a label would put a phantom
 *      tab back into the announcement.
 *   4. The hidden routes still render no button (the reason they were excluded).
 *
 * House idiom: static source scan. No test in this repo mounts <Tab.Navigator>,
 * and the label is produced inside node_modules at runtime, so a render test
 * would be asserting the library's behaviour rather than ours.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.join(__dirname, '..', 'RootNavigator.tsx'),
  'utf8',
);

/** The `<Tab.Screen ... />` element for one route name. */
function screenTag(name: string): string {
  const start = src.indexOf(`name="${name}"`);
  if (start === -1) return '';
  const open = src.lastIndexOf('<Tab.Screen', start);
  const end = src.indexOf('/>', start);
  return open === -1 || end === -1 ? '' : src.slice(open, end);
}

const VISIBLE = ['Home', 'Tasks', 'Profile'];
const HIDDEN = ['FullMap', 'Settings', 'Admin'];

describe('SW-13 + SW-38 — the announced tab count', () => {
  it('is derived from a single list of the tabs that have buttons', () => {
    expect(src).toMatch(/const VISIBLE_TABS = \['Home', 'Tasks', 'Profile'\] as const;/);
    // The count must be read off that list, never written as a literal — a
    // literal is exactly how "of 5" outlived the move to three tabs.
    expect(src).toMatch(/of \$\{VISIBLE_TABS\.length\}/);
    expect(src).not.toMatch(/, tab, \$\{[^}]*\} of [0-9]/);
  });

  it.each(VISIBLE)('%s passes tabBarAccessibilityLabel', (name) => {
    const tag = screenTag(name);
    // Non-vacuity: the screen has to exist for the assertion to mean anything.
    expect(tag).toContain(`name="${name}"`);
    expect(tag).toContain(`tabBarAccessibilityLabel: tabLabel('${name}')`);
  });

  it.each(HIDDEN)('%s does NOT — a hidden route must not rejoin the count', (name) => {
    const tag = screenTag(name);
    expect(tag).toContain(`name="${name}"`);
    expect(`${name}: ${tag.includes('tabBarAccessibilityLabel')}`).toBe(`${name}: false`);
  });

  it.each(HIDDEN)('%s still renders no tab button at all', (name) => {
    expect(screenTag(name)).toContain('tabBarButton: () => null');
  });

  it('every tab in VISIBLE_TABS is a real registered screen', () => {
    // Guards the other direction: a name that never became a <Tab.Screen> would
    // inflate the count exactly the way the hidden routes used to.
    for (const name of VISIBLE) expect(screenTag(name)).toContain('component=');
  });

  it('overrides on iOS only, because that is the only platform the library labels', () => {
    // On Android and web the library leaves accessibilityLabel undefined and the
    // child text is announced. Returning undefined there keeps that behaviour
    // instead of inventing a new announcement on platforms the walk never saw.
    expect(src).toMatch(/if \(Platform\.OS !== 'ios'\) return undefined;/);
  });
});
