/**
 * BRAND-INK AA guard (A11Y-229 / SR-112 — finally run).
 *
 * Dark `brand` (#4E89EF) with white text measures 3.42:1 — legal only for
 * LARGE text (3:1). Small white text on a brand fill therefore fails 1.4.3 in
 * dark mode. The ratified repair grammar is M-52 (UpdateBanner/Leaderboard):
 * swap the FILL to `ctaFill`, the MODE-INDEPENDENT Wayfinder Blue (#1466E0,
 * white = 5.24:1 both themes; identical to light `brand`, so light mode is
 * byte-unchanged).
 *
 * EXTENDED 2026-08-21 (art-direction Phase 0, item 0.5 / defect D7). The sweep
 * of 2026-07-31 missed FlagDetailModal's three filled verbs — Verify,
 * Directions and Save still filled themed `brand`, so in dark mode the SAME
 * verb wore #1466E0 on a Tasks card and #4E89EF in the Details sheet, and the
 * press state darkened across a palette boundary. Rule C1 of the approved plan
 * makes it explicit: white text on blue is ctaFill, full stop.
 *
 * This guard pins BOTH halves of the 2026-07-31 decision:
 *   · the small-text fill sites now use `color.ctaFill`;
 *   · the two LARGE-text sites (ReportFlagModal submit CTA 14pt bold, Home
 *     report pill 15pt bold) deliberately KEEP `color.brand` — they pass at
 *     the 3:1 large-text floor (3.42), and the submit CTA's look is signature:
 *     changing it requires Sky's mockup gate, not a sweep. If a future change
 *     flips either, this guard forces the conversation.
 *
 * Measurement of record: design-reviews/a11y-qa/2026-07-31/
 * a11yqa-brand-ink-stacks.json (arbiter exit 0, both themes).
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('A11Y-229 guard — small white text never sits on dark-failing brand fills', () => {
  it('NearbyFlagsModal active chips fill with ctaFill', () => {
    expect(read('screens/NearbyFlagsModal.tsx')).toContain(
      'chipActive: { backgroundColor: color.ctaFill }',
    );
  });

  it('ReportFlagModal active category pills fill with ctaFill — and the submit CTA stays brand (large-text pass; mockup-gated)', () => {
    const src = read('screens/ReportFlagModal.tsx');
    expect(src).toContain('pillActive: { backgroundColor: color.ctaFill }');
    expect(src).toMatch(/submitBtn: \{ backgroundColor: color\.brand/);
  });

  it('MyReportsModal active sort + status-All chips fill with ctaFill', () => {
    const src = read('components/MyReportsModal.tsx');
    expect(src).toContain('sortChipActive: { backgroundColor: color.ctaFill }');
    expect(src).toContain('statusFilterChipAllActive: { backgroundColor: color.ctaFill }');
  });

  it('HomeScreen map-peek hint + retry fill with ctaFill — and the report pill stays brand (large-text pass; judgment row N-13)', () => {
    const src = read('screens/HomeScreen.tsx');
    // Slice a fixed window from each STYLE KEY (the JSX usages of the sibling
    // names appear earlier in the file, so name-to-name slicing is empty).
    const styleBlock = (key: string) => src.slice(src.indexOf(`${key}: {`), src.indexOf(`${key}: {`) + 600);
    expect(styleBlock('mapPeekHint')).toContain('backgroundColor: color.ctaFill');
    expect(styleBlock('retryBtn')).toContain('backgroundColor: color.ctaFill');
    expect(styleBlock('reportPill')).toContain('backgroundColor: color.brand');
  });

  it('CommentBubble own-bubble fill is ctaFill (body + timestamp ride the same pair)', () => {
    expect(read('components/CommentBubble.tsx')).toContain('backgroundColor: color.ctaFill');
  });

  it('D7 / C1: every filled verb on FlagDetailModal fills with ctaFill, matching Tasks', () => {
    const src = read('components/FlagDetailModal.tsx');
    // RE-PINNED 2026-08-21 (GSP-02 §2.1). The RULE is unchanged — white on blue
    // is ctaFill, never themed `brand` — but the CENSUS is: this sheet used to
    // end in eight buttons of which two were filled (Verify AND Directions),
    // and it now has exactly ONE filled verb, whose identity follows the entry
    // point (Q2 = C). `verifyBtn` and `directionsBtn` are no longer fills:
    // `primaryBtn` is the fill, `directionsBtn` is an unpainted marker on the
    // More row. The second half of the test — that NOTHING here fills themed
    // brand — is the part that actually caught D7, and it is strengthened below
    // from three named sites to the whole file.
    for (const key of ['primaryBtn', 'saveBtn']) {
      const idx = src.indexOf(`${key}: {`);
      // Non-vacuity: a renamed style would make every assertion below vacuous.
      expect(`${key} found: ${idx > -1}`).toBe(`${key} found: true`);
      const block = src.slice(idx, idx + 120);
      expect(`${key}: ${block.includes('backgroundColor: color.ctaFill')}`).toBe(`${key}: true`);
      expect(`${key} on themed brand: ${block.includes('backgroundColor: color.brand')}`).toBe(
        `${key} on themed brand: false`,
      );
    }
    // The pressed companion has to stay on the same side of the palette
    // boundary as the rest state, at every site that fills.
    expect(
      src.split('pressed && { backgroundColor: color.ctaFillPressed }').length - 1,
    ).toBeGreaterThanOrEqual(2);
    // The class-wide half, which is what D7 actually was: NO style block in
    // this file fills themed `brand`. Stronger than the three-site list it
    // replaces — a fourth filled control cannot reintroduce the drift.
    expect(src).not.toContain('backgroundColor: color.brand,');
    expect(src).not.toContain('backgroundColor: color.brand }');
  });

  it('the sibling that made this a drift rather than a one-off still fills ctaFill', () => {
    // TasksScreen's Verify is the reference the sheet was inconsistent with.
    expect(read('screens/TasksScreen.tsx')).toContain('backgroundColor: color.ctaFill');
  });

  it('A11Y-230: the other-bubble timestamp inks with textMuted, never textSubtle (failed 4.37/3.69 on surfaceNeutral)', () => {
    const src = read('components/CommentBubble.tsx');
    expect(src).toContain('isOwn ? color.textOnBrand : color.textMuted');
    expect(src).not.toContain('color.textSubtle');
  });
});
