/**
 * Dynamic-Type regression GUARD — static source scan.
 *
 * The expressive overhaul's accessibility audit grouped its dynamic-type
 * findings into two clusters. jest can't render at 3x system font and measure
 * pixel overflow, so this guard encodes the two cluster RULES as a static scan
 * over the src tree and fails if a NEW violation is introduced. It is a
 * regression net, not a renderer.
 *
 * ── Cluster A — single-line titles ──────────────────────────────────────────
 *   RULE: a primary title/name must never be pinned to one line. At large
 *   dynamic-type sizes a one-line title truncates mid-word ("Accessibilit…"),
 *   so `numberOfLines={1}` on a *title* style is a defect. We flag any line
 *   that pairs `numberOfLines={1}` with a style whose name ends in `Title`
 *   (but NOT `Subtitle` — subtitles are secondary metadata and may truncate).
 *
 * ── Cluster B — fixed-height text rows ──────────────────────────────────────
 *   RULE: a style that wraps scaling text must not carry a fixed `height:`. A
 *   row sized to fit text at 1x clips it at 2x. We flag any StyleSheet entry
 *   whose name ends in a text-row suffix (Row|Label|Text|Title|Name) and whose
 *   body contains a numeric `height:` (minHeight / maxHeight / lineHeight are
 *   fine — only a hard `height:` clips).
 *
 * ── Opt-out ─────────────────────────────────────────────────────────────────
 *   Some single-line truncation is legitimate and intentional — a horizontally
 *   bounded map callout, a fixed-width chip showing one short token. Two escape
 *   hatches, both deliberate and greppable:
 *     1. Inline `// dynamic-type-ok` on (or directly above) the offending line.
 *     2. The seeded ALLOW_LIST below — the handful of pre-existing legit cases,
 *        each with a one-line justification. New code should prefer the inline
 *        comment; the allow-list exists so this guard lands GREEN today without
 *        editing source.
 *
 * Add a case to ALLOW_LIST (or an inline `// dynamic-type-ok`) only when you've
 * confirmed the text genuinely cannot overflow — never to silence a real clip.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Allow-list — pre-existing, reviewed, legitimate single-line / fixed-height
// cases. Key = `<relPathFromSrc>::<styleName>`. Seeded so the guard is green
// now; every entry carries why it is safe.
// ---------------------------------------------------------------------------
const ALLOW_LIST: Record<string, string> = {
  // Map callout header is inside a fixed-width (~width:200) bubble anchored to a
  // pin; horizontal space is hard-bounded by the marker, so one-line truncation
  // is the intended design rather than a dynamic-type clip.
  'components/PlatformMap.tsx::calloutTitle':
    'fixed-width map callout bubble — horizontally bounded by the marker',
};

// ---------------------------------------------------------------------------
// File walker — every non-test .ts/.tsx under src/.
// ---------------------------------------------------------------------------
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/(__tests__|__mocks__|\.expo|\.claude|node_modules)/.test(p)) walk(p, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const SOURCE_FILES = walk(SRC);
const rel = (abs: string) => path.relative(SRC, abs);

/** A line carries the opt-out if it, or the line directly above it, says so. */
function hasOptOut(lines: string[], idx: number): boolean {
  const here = lines[idx];
  const above = idx > 0 ? lines[idx - 1] : '';
  return /\/\/\s*dynamic-type-ok/.test(here) || /\/\/\s*dynamic-type-ok/.test(above);
}

// Title styles, excluding Subtitle (secondary metadata may truncate).
const TITLE_STYLE = /(?<!Sub)Title$/;
// Text-row style suffixes whose box wraps scaling text.
const TEXT_ROW_STYLE = /(Row|Label|Text|Title|Name)$/;

interface Violation {
  file: string;
  line: number;
  style: string;
  snippet: string;
}

// ---------------------------------------------------------------------------
// Cluster A scan — numberOfLines={1} on a *Title style.
// ---------------------------------------------------------------------------
function scanClusterA(): Violation[] {
  const out: Violation[] = [];
  for (const abs of SOURCE_FILES) {
    if (!/\.tsx$/.test(abs)) continue; // JSX only
    const r = rel(abs);
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      if (!/numberOfLines=\{1\}/.test(ln)) return;
      const styleNames = [...ln.matchAll(/styles\.([A-Za-z0-9]+)/g)].map((m) => m[1]);
      for (const style of styleNames) {
        if (!TITLE_STYLE.test(style)) continue;
        if (hasOptOut(lines, i)) continue;
        if (ALLOW_LIST[`${r}::${style}`]) continue;
        out.push({ file: r, line: i + 1, style, snippet: ln.trim().slice(0, 100) });
      }
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cluster B scan — fixed numeric height: inside a text-row-named StyleSheet
// entry. Matches single-level `name: { ... }` blocks (RN styles don't nest).
// ---------------------------------------------------------------------------
function scanClusterB(): Violation[] {
  const out: Violation[] = [];
  const styleBlock = /\b([A-Za-z][A-Za-z0-9]*)\s*:\s*\{([^{}]*)\}/g;
  for (const abs of SOURCE_FILES) {
    const r = rel(abs);
    const src = fs.readFileSync(abs, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = styleBlock.exec(src)) !== null) {
      const style = m[1];
      const body = m[2];
      if (!TEXT_ROW_STYLE.test(style)) continue;
      // hard numeric height, not min/max/lineHeight
      const hm = body.match(/(?<![A-Za-z])height:\s*[0-9]/);
      if (!hm) continue;
      const lineNo = src.slice(0, m.index).split('\n').length;
      const lines = src.split('\n');
      // opt-out can sit on the style's opening line or the matched height line.
      const heightLineIdx = lineNo - 1 + body.slice(0, hm.index).split('\n').length - 1;
      if (hasOptOut(lines, lineNo - 1) || hasOptOut(lines, heightLineIdx)) continue;
      if (ALLOW_LIST[`${r}::${style}`]) continue;
      out.push({ file: r, line: lineNo, style, snippet: `${style}: { …height… }` });
    }
  }
  return out;
}

function format(vs: Violation[]): string {
  return vs.map((v) => `  ${v.file}:${v.line}  [${v.style}]  ${v.snippet}`).join('\n');
}

describe('Dynamic-Type guard — Cluster A: single-line titles', () => {
  it('no *Title style is pinned to numberOfLines={1} (WCAG 1.4.4)', () => {
    const violations = scanClusterA();
    expect(
      violations.length === 0
        ? null
        : `\nFound ${violations.length} title(s) pinned to one line — titles must wrap under large fonts.\n` +
            `Fix: drop numberOfLines, raise it (>=2), add an inline // dynamic-type-ok if truncation is truly intended,\n` +
            `or seed ALLOW_LIST with a justification.\n${format(violations)}`,
    ).toBeNull();
  });
});

describe('Dynamic-Type guard — Cluster B: fixed-height text rows', () => {
  it('no text-row style carries a fixed height: (it would clip scaled text)', () => {
    const violations = scanClusterB();
    expect(
      violations.length === 0
        ? null
        : `\nFound ${violations.length} text-row style(s) with a fixed height — scaled text will clip.\n` +
            `Fix: use minHeight instead of height, or add // dynamic-type-ok / ALLOW_LIST with a reason.\n${format(
              violations,
            )}`,
    ).toBeNull();
  });
});

describe('Dynamic-Type guard — self-tests (the scanners actually scan)', () => {
  it('walks a non-trivial slice of the source tree', () => {
    // Sanity floor: if the walker silently returns nothing, the guard above is
    // vacuously green. AccessMap has dozens of source files.
    expect(SOURCE_FILES.length).toBeGreaterThan(20);
  });

  it('excludes test and mock files from the scan', () => {
    expect(SOURCE_FILES.some((f) => /\.test\.tsx?$/.test(f))).toBe(false);
    expect(SOURCE_FILES.some((f) => /__mocks__/.test(f))).toBe(false);
  });

  it('every ALLOW_LIST key still points at a real file (no stale entries)', () => {
    for (const key of Object.keys(ALLOW_LIST)) {
      const relPath = key.split('::')[0];
      expect(fs.existsSync(path.join(SRC, relPath))).toBe(true);
    }
  });

  it('TITLE_STYLE matches Title but NOT Subtitle', () => {
    expect(TITLE_STYLE.test('calloutTitle')).toBe(true);
    expect(TITLE_STYLE.test('rowTitle')).toBe(true);
    expect(TITLE_STYLE.test('nearestBtnSubtitle')).toBe(false);
  });

  it('Cluster A regex would catch a synthetic title violation', () => {
    // Prove the matcher is live: a fabricated offending line must be flagged by
    // the same predicates the scanner uses.
    const offending = '<AppText style={styles.screenTitle} numberOfLines={1}>';
    const hasN1 = /numberOfLines=\{1\}/.test(offending);
    const style = [...offending.matchAll(/styles\.([A-Za-z0-9]+)/g)].map((m) => m[1])[0];
    expect(hasN1 && TITLE_STYLE.test(style)).toBe(true);
  });

  it('Cluster B regex would catch a synthetic fixed-height text row', () => {
    const block = 'cardTitle: { fontSize: 16, height: 20 }';
    const m = /\b([A-Za-z][A-Za-z0-9]*)\s*:\s*\{([^{}]*)\}/.exec(block);
    expect(m).not.toBeNull();
    const style = m![1];
    const body = m![2];
    expect(TEXT_ROW_STYLE.test(style)).toBe(true);
    expect(/(?<![A-Za-z])height:\s*[0-9]/.test(body)).toBe(true);
  });

  it('the opt-out comment suppresses a would-be violation', () => {
    const lines = [
      '// dynamic-type-ok — bounded chip',
      '<AppText style={styles.fooTitle} numberOfLines={1}>',
    ];
    expect(hasOptOut(lines, 1)).toBe(true);
  });
});
