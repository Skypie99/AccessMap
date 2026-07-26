/**
 * D4/C3 — the empty-local moment, and the five gates that keep it honest.
 *
 * Fixing the peek's centering (C1) exposes a case the San Francisco fallback
 * used to hide: stand somewhere nobody has reported yet and you now get a
 * correctly-centred, completely empty map. That blankness has to read as an
 * invitation rather than a broken screen — but saying "nothing here" is a claim
 * about the world, and the app is only entitled to make it under five
 * conditions at once. Each is trivially droppable in a later edit, so each is
 * pinned separately below.
 *
 * The register rule is the important one and is deliberately asserted on the
 * literal string: AccessMap can only ever know that nobody has REPORTED a
 * barrier, never that none exists. The people who depend on this app are
 * exactly the people a "no barriers here" promise would strand.
 *
 * Source contracts, for the same reason as the C1/C2 guards: HomeScreen needs a
 * navigator, a safe-area provider, a flags store and a map before it mounts.
 * The pure containment predicate is behaviour-tested in
 * src/lib/__tests__/distance.test.ts; whether the wording lands is Sky's call
 * (DECISIONS §A A-5) and whether it feels right in the hand is a device item.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const readSrc = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');
const home = readSrc('screens/HomeScreen.tsx');

const emptyLocalBlock = home.match(/const emptyLocal = useMemo\([\s\S]*?\n\s*\);/)?.[0] ?? '';

// Code with comments stripped. The register rule polices what the app SAYS, not
// prose about the rule — the comment above EMPTY_LOCAL_INVITE has to be free to
// quote the forbidden phrasing in order to forbid it.
const homeCode = home.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('D4/C3 — the five honesty gates', () => {
  it('is computed at all', () => {
    expect(emptyLocalBlock).not.toBe('');
  });

  it('requires a known centre — you cannot say "here" without one', () => {
    expect(emptyLocalBlock).toMatch(/hasCenter &&/);
  });

  it('never claims absence while the answer is still arriving', () => {
    expect(emptyLocalBlock).toMatch(/!loading &&/);
  });

  it('never claims absence over a settled failure', () => {
    // Same rule the headline already obeys (T9/F5-02): a failure is not a zero.
    expect(emptyLocalBlock).toMatch(/!error &&/);
    expect(home).toMatch(/never compute "0 barriers" on a settled failure/);
  });

  it('never claims absence over data we know is stale', () => {
    expect(emptyLocalBlock).toMatch(/!isOfflineCache &&/);
  });

  it('leaves a globally-empty database to its own designed line', () => {
    // Two voices for one silence would be worse than none: the list card
    // already says "No barriers reported yet." when there is nothing at all.
    expect(emptyLocalBlock).toMatch(/flags\.length > 0 &&/);
    expect(home).toContain('No barriers reported yet.');
  });

  it('tests against the peek’s own window, not an invented radius', () => {
    expect(emptyLocalBlock).toMatch(
      /!flags\.some\(\(f\) => regionContainsPoint\(peekRegion, \{ lat: f\.lat, lng: f\.lng \}\)\)/,
    );
  });
});

describe('D4/C3 — register: report-absence, never barrier-absence', () => {
  it('ships wording that claims only what the data can support', () => {
    expect(home).toMatch(/const EMPTY_LOCAL_INVITE = 'No reports here yet\. You could add the first\.';/);
    // The word that makes the claim survivable. Matches the whole family —
    // "report", "reports", "reported" — because the register rule is about what
    // is being claimed, not about one inflection of one word.
    expect(home).toMatch(/EMPTY_LOCAL_INVITE = '[^']*report[^']*'/);
  });

  it('never states the unqualified claim anywhere on the screen', () => {
    // The unqualified form — "No barriers" followed by a place word, with no
    // "reported" in between — is the promise the data cannot keep.
    expect(homeCode).not.toMatch(/No barriers (here|nearby|around|in this area)\b/);
    // And the shipped strings that DO speak about emptiness all qualify it.
    for (const line of homeCode.split('\n').filter((l) => /No barriers/.test(l))) {
      expect(line).toMatch(/reported/);
    }
  });

  it('records that Sky ratified it, and keeps the alternatives on the record', () => {
    expect(home).toMatch(/RATIFIED by Sky at the Phase 3 gate/);
    // The options that were NOT chosen stay in the comment: the next person to
    // touch this should see what was considered and rejected, not just the winner.
    expect(home).toMatch(/1\. 'No barriers reported here yet — be the first\.'/);
    expect(home).toMatch(/2\. 'Nobody has reported a barrier around here yet\.'/);
    expect(home).toMatch(/3\. 'No reports here yet\. You could add the first\.'   <- RATIFIED/);
  });
});

describe('D4/C3 — one const, two channels', () => {
  it('feeds the visible caption and the spoken label from the same source', () => {
    // So ratifying the copy is a one-line swap, and the channels cannot drift.
    expect(home).toMatch(/\{EMPTY_LOCAL_INVITE\}/);
    expect(home).toMatch(/`Open the full map\. \$\{EMPTY_LOCAL_INVITE\}`/);
  });

  it('leaves the peek’s ordinary name untouched when there is nothing to add', () => {
    expect(home).toMatch(/emptyLocal \? `Open the full map\. \$\{EMPTY_LOCAL_INVITE\}` : 'Open the full map'/);
  });
});

describe('D4/C3 — the caption stays one quiet line', () => {
  it('shares the C2 slot and its stage styling — no card, no glass, no icon', () => {
    const slot = home.match(/\{emptyLocal \? \([\s\S]*?\) : null\}/)?.[0] ?? '';
    expect(slot).toMatch(/style=\{styles\.peekCaption\}/);
    expect(slot).not.toMatch(/GlassSurface|<View|size=\{/);
  });

  it('can never render two messages at once', () => {
    // Mutually exclusive by construction: emptyLocal needs a centre,
    // showLocating needs the absence of one.
    expect(home).toMatch(/const showLocating = !hasCenter &&/);
    expect(emptyLocalBlock).toMatch(/hasCenter &&/);
    expect(home).toMatch(/\) : showLocating \? \(/);
  });

  it('announces politely and scales with Dynamic Type', () => {
    const slot = home.match(/\{emptyLocal \? \([\s\S]*?\) : null\}/)?.[0] ?? '';
    expect(slot.match(/accessibilityLiveRegion="polite"/g) ?? []).toHaveLength(2);
    expect(slot.match(/maxFontSizeMultiplier=\{1\.4\}/g) ?? []).toHaveLength(2);
  });
});
