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
 * This guard pins BOTH halves of the 2026-07-31 decision:
 *   · the seven small-text fill sites now use `color.ctaFill`;
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

  it('A11Y-230: the other-bubble timestamp inks with textMuted, never textSubtle (failed 4.37/3.69 on surfaceNeutral)', () => {
    const src = read('components/CommentBubble.tsx');
    expect(src).toContain('isOwn ? color.textOnBrand : color.textMuted');
    expect(src).not.toContain('color.textSubtle');
  });
});
