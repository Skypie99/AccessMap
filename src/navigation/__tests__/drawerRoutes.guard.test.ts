/**
 * D1 (device-tune 1) — drawer destination source contracts.
 *
 * The silent failure this guards: a drawer row whose target quietly stops
 * existing. navigationRef.navigate() to an unregistered route is a no-op in
 * release builds, and a sub-screen key without a sibling Modal renders
 * nothing — both look "wired" in the drawer and die only on device. Static
 * source scans in the house idiom (cf. perceptionGuards.test.ts): fast,
 * navigator-mount-free, and they fail the moment the contract breaks.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const navSrc = () => readFileSync(join(__dirname, '..', 'RootNavigator.tsx'), 'utf8');
const drawerSrc = () =>
  readFileSync(join(__dirname, '..', '..', 'components', 'HamburgerDrawer.tsx'), 'utf8');

describe('D1 — every drawer destination has a real target (source contracts)', () => {
  it('every onNavigate(...) tab the drawer offers is a registered Tab.Screen', () => {
    const drawer = drawerSrc();
    const nav = navSrc();
    const tabs = [...drawer.matchAll(/onNavigate\('([^']+)'\)/g)].map((m) => m[1]);
    // The drawer must keep offering at least Settings (Phase 7a moved it off
    // the tab bar — the drawer is its only entry point).
    expect(tabs).toEqual(expect.arrayContaining(['Settings']));
    for (const tab of tabs) {
      expect(nav).toMatch(new RegExp(`name="${tab}"`));
    }
  });

  it("the host's Sign in delegation lands on a registered route (Profile)", () => {
    // DrawerHost routes the guest Sign in item to the Profile tab, which
    // hosts the sign-in modal (F11).
    expect(navSrc()).toMatch(/name="Profile"/);
    expect(navSrc()).toMatch(/navigationRef\.navigate\('Profile'\)/);
  });

  it('every in-drawer navigate(key) has a sibling sub-screen Modal bound to that key', () => {
    const drawer = drawerSrc();
    const keys = [...drawer.matchAll(/=> navigate\('([^']+)'\)/g)].map((m) => m[1]);
    // The three content destinations Sky's drawer ships today.
    expect(keys).toEqual(expect.arrayContaining(['resources', 'howToHelp', 'about']));
    for (const key of keys) {
      expect(drawer).toMatch(new RegExp(`visible=\\{subScreen === '${key}'\\}`));
    }
  });

  it('the drawer Modal keeps the D1 dismissal handoff (onDismiss wired)', () => {
    // Removing this silently resurrects the dead-destinations bug on iOS:
    // the pending sub-screen would wait forever for a dismissal event.
    expect(drawerSrc()).toMatch(/onDismiss=\{presentPendingSubScreen\}/);
  });

  it('the drawer schedules no handoff clock (the race that killed D1)', () => {
    // A setTimeout-based present raced the exit latch's Modal dismissal —
    // same-frame UIKit transactions, silently dropped on device. The handoff
    // must stay event-driven.
    expect(drawerSrc()).not.toMatch(/setTimeout\([^)]*setSubScreen/);
  });
});
