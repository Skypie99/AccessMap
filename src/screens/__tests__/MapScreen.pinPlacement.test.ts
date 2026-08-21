/**
 * SW-37 — manual pin placement, and the gate around it.
 *
 * ─── WHAT THIS PROTECTS ───────────────────────────────────────────────────
 * Placing a pin by hand is not the same capability as reporting where you are.
 * With GPS you can only file a report at your own position; with manual
 * placement you can file one anywhere. `handleMapLongPress` has always drawn
 * that line — `if (!authUser) return`, annotated "Jordan Condition 2" — and the
 * new in-sheet affordance deliberately mirrors it rather than widening it.
 *
 * Sky's call, 2026-08-20: signed-in only, gate unchanged. Widening it is a
 * privacy decision for her and Jordan, not something a fix should do in
 * passing — so this guard fails loudly if a later edit hands the control to
 * everyone by removing the conditional prop.
 *
 * (Recorded for that conversation, not acted on here: the long-press comment
 * says "guests cannot create reports", and the shipped app contradicts it —
 * `isAnon = !user`, "Submit report anonymously", and the Privacy Policy screen
 * says guests may submit anonymously in as many words.)
 *
 * ─── AND THE ROUND TRIP ───────────────────────────────────────────────────
 * Placement hides the sheet and brings it back. That must NOT run the sheet's
 * cancel path: the sheet is persistent and its fields survive only because
 * nothing resets them, so a cancel there would silently eat whatever the user
 * had already typed on the way to fixing their location. It is also the one
 * path that must stay clear of the SW-52 reset, which is bound to an explicit
 * cancel for exactly this reason.
 *
 * House idiom: static source scan (cf. keyboardClass.guard.test.ts).
 */
import fs from 'fs';
import path from 'path';

const map = fs.readFileSync(
  path.join(__dirname, '..', 'MapScreen.tsx'),
  'utf8',
);

/** The body of a `const NAME = useCallback(...)` block. */
function handlerBody(name: string): string {
  const at = map.indexOf(`const ${name} = useCallback(`);
  expect(at).toBeGreaterThan(-1); // non-vacuity: the handler must exist
  const end = map.indexOf('\n  }, [', at);
  expect(end).toBeGreaterThan(at);
  return map.slice(at, end);
}

describe('SW-37 — the manual-placement gate matches the long-press gate', () => {
  it('the long-press gate is still there (the rule this mirrors)', () => {
    // If this ever stops matching, the assertion below is mirroring a rule that
    // no longer exists and is pinning nothing.
    expect(handlerBody('handleMapLongPress')).toContain('if (!authUser) return;');
  });

  it('the sheet gets the placement control only when signed in', () => {
    expect(map).toContain('onPlaceOnMap={authUser ? handlePlaceOnMap : undefined}');
  });
});

describe('SW-37 — the placement round trip preserves the draft', () => {
  it('entering placement hides the sheet WITHOUT running its cancel path', () => {
    const body = handlerBody('handlePlaceOnMap');
    expect(body).toContain('setReportOpen(false)');
    expect(body).toContain('setPlacingPin(true)');
    // A cancel would clear the drop pin and (per SW-52) the draft with it.
    expect(body).not.toContain('setDropLocation(null)');
  });

  it('confirming adopts the map centre and returns to the report', () => {
    const body = handlerBody('handleConfirmPin');
    expect(body).toContain('getCenter()');
    expect(body).toContain('setDropLocation(centre)');
    expect(body).toContain('setReportOpen(true)');
  });

  it('a map that cannot answer leaves the location alone', () => {
    // Guessing a coordinate here would file the report somewhere the user never
    // chose, which is worse than leaving Submit disabled.
    expect(handlerBody('handleConfirmPin')).toContain('if (centre) setDropLocation(centre)');
  });

  it('cancelling placement returns to the report and changes nothing', () => {
    const body = handlerBody('handleCancelPin');
    expect(body).toContain('setReportOpen(true)');
    expect(body).not.toContain('setDropLocation');
  });
});
