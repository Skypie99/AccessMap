/**
 * BP17 / T20 — the four-dialog tier lands identically (fade + shadow.e3).
 *
 * The ratified dialog tier — the Map "Name this preset" / "Name this filter"
 * prompts + ProfileScreen's tier-explainer + delete-account confirm — already
 * shares fill / radius / centering / scrim. T20 closes the last two craft
 * deltas so it is four-of-four:
 *   - entrance: all four use the RM-gated FADE (the Map pair already did; the
 *     Profile pair migrated slide -> fade in T20).
 *   - depth: all four cards carry shadow.e3 (the shared Map nameCard gained it).
 *
 * Static source guard so a future edit can't silently re-split the tier. The RM
 * ternary discipline itself is guarded globally by reduceMotion.modalGate.test.ts;
 * ProfileScreen uses `reduceMotion`, MapScreen uses `reducedMotion`.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', '..');
const profile = fs.readFileSync(path.join(SRC, 'screens', 'ProfileScreen.tsx'), 'utf8');
const map = fs.readFileSync(path.join(SRC, 'screens', 'MapScreen.tsx'), 'utf8');

describe('BP17 / T20 — four-dialog tier unified (fade + shadow.e3)', () => {
  it('ProfileScreen delete-account dialog uses the RM-gated fade entrance', () => {
    expect(profile).toMatch(
      /visible=\{deleteAccountOpen\}\s*\n\s*animationType=\{reduceMotion \? 'none' : 'fade'\}/,
    );
  });

  it('ProfileScreen tier-explainer dialog uses the RM-gated fade entrance', () => {
    expect(profile).toMatch(
      /visible=\{tierExplainerOpen\}\s*\n\s*animationType=\{reduceMotion \? 'none' : 'fade'\}/,
    );
  });

  it('neither Profile tier dialog regressed to slide', () => {
    expect(profile).not.toMatch(
      /visible=\{deleteAccountOpen\}\s*\n\s*animationType=\{reduceMotion \? 'none' : 'slide'\}/,
    );
    expect(profile).not.toMatch(
      /visible=\{tierExplainerOpen\}\s*\n\s*animationType=\{reduceMotion \? 'none' : 'slide'\}/,
    );
  });

  it('the shared Map name-prompt card carries shadow.e3 (four-of-four depth)', () => {
    // ...shadow.e3 sits inside the nameCard style block (before its closing brace).
    expect(map).toMatch(/nameCard:\s*\{[^}]*\.\.\.shadow\.e3/);
    // Both name prompts render the shared styles.nameCard object.
    const uses = map.match(/style=\{styles\.nameCard\}/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
  });

  it('both Map name prompts use the RM-gated fade entrance', () => {
    const fades = map.match(/animationType=\{reducedMotion \? 'none' : 'fade'\}/g) ?? [];
    expect(fades.length).toBeGreaterThanOrEqual(2);
  });
});
