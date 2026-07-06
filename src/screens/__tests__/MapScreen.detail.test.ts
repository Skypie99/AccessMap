/**
 * S3 — Trust instrumentation (P3). The app already built a full, SR-complete
 * trust ledger (FlagDetailModal) and hid it three taps deep, reachable only
 * from Tasks/Profile. S3 wires it to the two surfaces where a user actually
 * bets an outing on a badge — the map pin callout and the Nearby list — with
 * ONE change and two entry points:
 *
 *   (1) the pin callout gains an "Open details" affordance + a created_at
 *       freshness line (ends the L3-12 callout cul-de-sac);
 *   (2) under a screen reader, the Nearby list's onSelectFlag opens the
 *       focus-managed detail sheet instead of a silent map recenter (ends the
 *       L6-05 accessible dead-end).
 *
 * This codebase defers full MapScreen renders to Detox/Playwright (see
 * MapScreen.heatmap.test.tsx), and the native react-native-maps Callout press +
 * VoiceOver/TalkBack focus traversal are NEEDS-SKY-DEVICE. So — like
 * MapScreen.arrival.test.ts — these are source invariants on stable semantic
 * anchors. FORK 5 (Sky): S3 is the READ side only — no verifier count, no guest
 * "flag as wrong" write; those invariants are asserted below too.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const readScreen = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const readComp = (rel: string) =>
  fs.readFileSync(path.join(SRC, '..', 'components', rel), 'utf8');

/** A window of `len` chars from the first occurrence of `anchor`. */
function around(haystack: string, anchor: string, len = 320): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('S3 source invariants — MapScreen integration hub', () => {
  const map = readScreen('MapScreen.tsx');

  it('mounts the already-built FlagDetailModal via the shared lazy chunk', () => {
    expect(map).toContain(
      "const FlagDetailModal = React.lazy(() => import('@/components/FlagDetailModal'));",
    );
    const mount = around(map, 'visible={selectedFlag !== null}', 400);
    expect(mount).toContain('flag={selectedFlag}');
    expect(mount).toContain('onClose={() => setSelectedFlag(null)}');
    expect(mount).toContain('onChanged={handleDetailChanged}');
    expect(mount).toContain('onViewOnMap={handleDetailViewOnMap}');
  });

  it('holds selectedFlag as per-screen state (NOT the shared-modals pool)', () => {
    expect(map).toContain('const [selectedFlag, setSelectedFlag] = useState<FlagRow | null>(null);');
  });

  it('the pin callout opens the sheet via the onOpenDetails prop on <PlatformMap>', () => {
    expect(map).toContain('onOpenDetails={setSelectedFlag}');
  });

  it('the Nearby onSelectFlag branches on the screen reader: SR → detail sheet, sighted → map recenter', () => {
    const sel = around(map, 'onSelectFlag={(flag) => {', 1400);
    expect(sel).toContain('if (screenReaderOn) {');
    expect(sel).toContain('setSelectedFlag(flag);');
    // Sighted path preserved, upgraded to the robust retry helper (not the old 350ms timeout).
    expect(sel).toContain('setNearbyOpen(false);');
    expect(sel).toContain('retryShowCallout(mapRef.current, flag.id, () => false);');
    expect(sel).not.toContain('setTimeout(() => mapRef.current?.showCallout');
  });

  it('keeps the map flag store in sync WITHOUT copying Tasks’ removeFlag-on-resolve/reject', () => {
    const changed = around(map, 'const handleDetailChanged', 340);
    expect(changed).toContain('patchFlag(updated.id, { ...updated });');
    expect(changed).toContain('refreshFlags().catch(() => {});');
    // The map shows user-selected statuses — a resolved flag can still be a
    // valid marker, so this handler must NEVER removeFlag.
    expect(changed).not.toContain('removeFlag');
  });

  it('"View on map" recenters locally (we are already on the Map tab) — no cross-tab navigate', () => {
    const view = around(map, 'const handleDetailViewOnMap', 320);
    expect(view).toContain('retryShowCallout(mapRef.current, flag.id, () => false);');
    expect(view).not.toContain('navigation.navigate');
  });

  it('FORK 5 read-side only: no verifier COUNT display, no guest "flag as wrong" write', () => {
    expect(map).not.toContain('Verified by');
    expect(map).not.toContain('flag as wrong');
  });
});

describe('S3 source invariants — NearbyFlagsModal (PROTECT-1 + honest hint)', () => {
  const modal = readScreen('NearbyFlagsModal.tsx');

  it('PROTECT-1: the one-breath SR accessibilityLabel format is UNCHANGED', () => {
    expect(modal).toContain('`${CATEGORY_LABELS[item.category]}, severity ${item.severity}`');
    expect(modal).toContain('`. Status ${item.status}.`');
    expect(modal).toContain('accessibilityLabel={a11yLabel}');
  });

  it('the hint is now honest — opens details, no longer claims it centers the map', () => {
    expect(modal).toContain(`accessibilityHint="Opens this flag's details"`);
    expect(modal).not.toContain('Closes the list and centers the map on this flag');
  });
});

describe('S3 source invariants — native callout (PlatformMap.tsx)', () => {
  const native = readComp('PlatformMap.tsx');

  it('threads the onOpenDetails prop and imports relativeTime', () => {
    expect(native).toContain('onOpenDetails?: (flag: FlagRow) => void;');
    expect(native).toContain("import { relativeTime } from '@/lib/relativeTime';");
  });

  it('the whole Callout is the tap target (Android snapshot → Callout.onPress)', () => {
    expect(native).toContain(
      '<Callout tooltip onPress={onOpenDetails ? () => onOpenDetails(f) : undefined}>',
    );
  });

  it('the callout shows a freshness line + an "Open details" affordance', () => {
    expect(native).toContain('Reported {relativeTime(f.created_at)}');
    expect(native).toContain('Open details ›');
  });
});

describe('S3 source invariants — web popup (PlatformMap.web.tsx)', () => {
  const web = readComp('PlatformMap.web.tsx');

  it('threads onOpenDetails to ClusteredMarkers and imports relativeTime', () => {
    expect(web).toContain('onOpenDetails?: (flag: FlagRow) => void;');
    expect(web).toContain('onOpenDetails={onOpenDetails}');
    expect(web).toContain("import { relativeTime } from '@/lib/relativeTime';");
  });

  it('the popup shows a freshness line + a real "Open details" button', () => {
    expect(web).toContain('Reported {relativeTime(flag.created_at)}');
    expect(web).toContain('onClick={() => onOpenDetails(flag)}');
    expect(web).toContain('Open details');
  });
});
