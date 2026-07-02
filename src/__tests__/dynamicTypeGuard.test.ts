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
  // Rule 2 (literal lineHeight/fontSize ratio). Both are known, deliberate,
  // and tracked — not accidental clips:
  // heroValue: 56/60 = 1.07. The Profile hero points figure; raising it to the
  //   font's box (lineHeight 74) is Tier-3 finding M5, deferred to a later pass.
  'screens/ProfileScreen.tsx::heroValue':
    'M5 hero points lineHeight (56/60) — Tier-3, deferred; fix raises it to 74',
  // addIcon: 24/28 = 1.17. A decorative "+" glyph on the fixed add-photo tile;
  //   it is a11y-hidden and its box is fixed, so it cannot clip real content.
  'components/PhotoGallery.tsx::addIcon':
    'decorative "+" glyph, a11y-hidden, on a fixed add-tile — cannot clip content',
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

// ===========================================================================
// GUARD HARDENING (app-wide visual sweep, 2026-07-01) — four new rules that
// catch the bug CLASSES the sweep root-caused. Kept in a separate block so the
// legacy Cluster A/B scanners (and their proven catches) are untouched.
//
//   Rule 1 — `flex:1` on a button-body child of a self-unsized <Pressable>. On
//            native the grow child collapses to flex-basis 0 and is pinned at
//            minHeight, clipping the label. This was Bug 1 ("Qpen the Map").
//   Rule 2 — a LITERAL lineHeight/fontSize ratio below the font's real line box
//            (Public Sans ~1.175). Token expressions (font.size.*, x+2) are
//            trusted — derived >= the box by formula — so only literals judged.
//   Rule 3 — a hard `height:` on a style APPLIED to <AppText>/<Text> (reliable,
//            name-independent subset; catches shapes Cluster B's suffix misses).
//   Rule 4 — a `horizontal` scroller whose `style` prop lacks BOTH flexGrow:0
//            and flexShrink:0 (pattern B / Bug 2). `pagingEnabled` full-screen
//            carousels are intentional pagers and are exempt.
// ===========================================================================

// Public Sans's real line box is ~1.175x the font size; a fixed lineHeight
// below this clips ascenders/descenders. 1.18 is the guard threshold.
const MIN_LINE_HEIGHT_RATIO = 1.18;

const JSX_FILES = SOURCE_FILES.filter((f) => /\.tsx$/.test(f));

// --- Brace-balanced style extraction ---------------------------------------
// The legacy Cluster B parser matches single-level `name: { ... }` only, so it
// can't see into a style that holds a nested object (e.g. a button with a
// `shadowOffset: { … }`). These helpers balance braces to read a style's FULL
// body. Cluster A/B above are intentionally NOT switched to this — keeping the
// old parser stable preserves its existing catch behavior.

/** Strip // line and /* block *\/ comments so comment prose (e.g. a comment
 *  that literally says "flex: 1") can't trip the pattern matchers below. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** From the index of an opening `{`, return the text inside its matching `}`. */
function balancedBody(src: string, openIdx: number): string {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return src.slice(openIdx + 1); // unbalanced source — return the rest defensively
}

/** Resolve `<name>: { … }` to its brace-balanced, comment-stripped body. */
function styleBodyByName(src: string, name: string): string | null {
  const m = new RegExp(`\\b${name}\\s*:\\s*\\{`).exec(src);
  if (!m) return null;
  return stripComments(balancedBody(src, m.index + m[0].length - 1));
}

interface StyleBlock {
  name: string;
  body: string;
  line: number;
}

/** Every `<name>: { … }` block (brace-balanced), with its 1-based line number. */
function allStyleBlocks(src: string): StyleBlock[] {
  const out: StyleBlock[] = [];
  const re = /\b([A-Za-z][A-Za-z0-9]*)\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    out.push({ name: m[1], body: stripComments(balancedBody(src, openIdx)), line: src.slice(0, m.index).split('\n').length });
    re.lastIndex = openIdx + 1; // walk into nested + sibling blocks
  }
  return out;
}

/** Accumulate a JSX opening tag from `lines[i]` up to its closing `>` (skips `=>`). */
function collectOpeningTag(lines: string[], i: number, max = 25): { tag: string; end: number } {
  let tag = '';
  let j = i;
  for (; j < lines.length && j < i + max; j++) {
    tag += lines[j] + '\n';
    if (/>/.test(lines[j].replace(/=>/g, ''))) break;
  }
  return { tag, end: j };
}

// ---------------------------------------------------------------------------
// Rule 1 — flex:1 on a button-body child of an unsized Pressable (Bug 1).
// ---------------------------------------------------------------------------
const SIZING_KEY = /\b(width|height|minHeight|flex|flexBasis|aspectRatio):/;

/** True if the Pressable pins its own size (inline, or via a referenced style). */
function pressableSizesItself(tag: string, src: string): boolean {
  if (SIZING_KEY.test(tag)) return true;
  for (const s of tag.matchAll(/styles\.([A-Za-z0-9]+)/g)) {
    const body = styleBodyByName(src, s[1]);
    if (body && SIZING_KEY.test(body)) return true;
  }
  return false;
}

/** True if the style is a "button body" with a bare `flex: 1` (Bug 1's shape). */
function isButtonBody(body: string): boolean {
  if (!/(?<![A-Za-z])flex:\s*1\b/.test(body)) return false; // bare flex:1, not flexGrow
  if (/flexDirection:\s*['"]row['"]/.test(body)) return false; // row layouts are legit
  return /paddingVertical:|borderRadius:|alignItems:/.test(body);
}

function scanRule1(): Violation[] {
  const out: Violation[] = [];
  for (const abs of JSX_FILES) {
    const r = rel(abs);
    const src = fs.readFileSync(abs, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!/<Pressable\b/.test(lines[i])) continue;
      const { tag, end } = collectOpeningTag(lines, i);
      if (pressableSizesItself(tag, src)) continue;
      // Inspect the FIRST button-body child tag in the next ~10 lines.
      for (let k = end + 1; k < lines.length && k <= end + 10; k++) {
        const cm = lines[k].match(/<(LinearGradient|View|ImageBackground|Animated\.View)\b/);
        if (!cm) continue;
        const childTag = lines.slice(k, Math.min(k + 6, lines.length)).join('\n');
        const sm = childTag.match(/style=\{styles\.([A-Za-z0-9]+)\}/);
        if (sm) {
          const body = styleBodyByName(src, sm[1]);
          if (body && isButtonBody(body) && !hasOptOut(lines, k) && !ALLOW_LIST[`${r}::${sm[1]}`]) {
            out.push({ file: r, line: k + 1, style: sm[1], snippet: `${cm[1]} with flex:1 inside a self-unsized Pressable` });
          }
        }
        break; // only the first child tag matters for this shape
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rule 2 — literal lineHeight/fontSize ratio below the real line box.
// ---------------------------------------------------------------------------
/** Returns the offending ratio if BOTH values are literal numbers and < box. */
function literalRatioViolation(body: string): number | null {
  const fsm = body.match(/(?<![A-Za-z.])fontSize:\s*(\d+(?:\.\d+)?)/);
  const lhm = body.match(/(?<![A-Za-z.])lineHeight:\s*(\d+(?:\.\d+)?)/);
  if (!fsm || !lhm) return null; // not a literal pair — token exprs are trusted
  const size = parseFloat(fsm[1]);
  const line = parseFloat(lhm[1]);
  if (size <= 0) return null;
  const ratio = line / size;
  return ratio < MIN_LINE_HEIGHT_RATIO ? ratio : null;
}

function scanRule2(): Violation[] {
  const out: Violation[] = [];
  for (const abs of SOURCE_FILES) {
    const r = rel(abs);
    const src = fs.readFileSync(abs, 'utf8');
    const lines = src.split('\n');
    for (const blk of allStyleBlocks(src)) {
      const ratio = literalRatioViolation(blk.body);
      if (ratio === null) continue;
      if (hasOptOut(lines, blk.line - 1)) continue;
      if (ALLOW_LIST[`${r}::${blk.name}`]) continue;
      out.push({ file: r, line: blk.line, style: blk.name, snippet: `${blk.name}: lineHeight/fontSize = ${ratio.toFixed(3)} < ${MIN_LINE_HEIGHT_RATIO}` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rule 3 — hard height on a style applied to <AppText>/<Text> (reliable subset).
// ---------------------------------------------------------------------------
/** Style names referenced in any <AppText>/<Text> opening tag. (<TextInput excluded). */
function styleNamesOnTextTags(src: string): Set<string> {
  const names = new Set<string>();
  for (const m of src.matchAll(/<(?:AppText|Text)\b[^>]*>/g)) {
    for (const s of m[0].matchAll(/styles\.([A-Za-z0-9]+)/g)) names.add(s[1]);
  }
  return names;
}

/** A hard `height:` > 2 (min/max/lineHeight and hairline 1–2 excluded). */
function hardHeightOver2(body: string): boolean {
  const m = body.match(/(?<![A-Za-z])height:\s*(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) > 2 : false;
}

function scanRule3(): Violation[] {
  const out: Violation[] = [];
  for (const abs of JSX_FILES) {
    const r = rel(abs);
    const src = fs.readFileSync(abs, 'utf8');
    const lines = src.split('\n');
    for (const name of styleNamesOnTextTags(src)) {
      const body = styleBodyByName(src, name);
      if (!body || !hardHeightOver2(body)) continue;
      const idx = src.search(new RegExp(`\\b${name}\\s*:\\s*\\{`));
      const line = idx >= 0 ? src.slice(0, idx).split('\n').length : 0;
      if (line && hasOptOut(lines, line - 1)) continue;
      if (ALLOW_LIST[`${r}::${name}`]) continue;
      out.push({ file: r, line, style: name, snippet: `${name}: hard height on a <Text>/<AppText> style` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rule 4 — horizontal scroller whose style lacks flexGrow:0 + flexShrink:0.
// ---------------------------------------------------------------------------
/** Inner text of the tag's `style={ … }` attribute (brace-balanced), or ''. */
function styleAttrText(tag: string): string {
  const idx = tag.search(/\bstyle=\{/);
  if (idx < 0) return '';
  const braceStart = tag.indexOf('{', idx);
  return stripComments(balancedBody(tag, braceStart));
}

/** The style-attr text plus the bodies of any styles.X it references. */
function resolveScrollerStyle(tag: string, src: string): string {
  const attr = styleAttrText(tag);
  let text = attr;
  for (const s of attr.matchAll(/styles\.([A-Za-z0-9]+)/g)) {
    const body = styleBodyByName(src, s[1]);
    if (body) text += ' ' + body;
  }
  return text;
}

function scannerPins(style: string): boolean {
  return /flexGrow:\s*0\b/.test(style) && /flexShrink:\s*0\b/.test(style);
}

function scanRule4(): Violation[] {
  const out: Violation[] = [];
  for (const abs of JSX_FILES) {
    const r = rel(abs);
    const src = fs.readFileSync(abs, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const cm = lines[i].match(/<(ScrollView|FlatList)\b/);
      if (!cm) continue;
      const { tag } = collectOpeningTag(lines, i);
      if (!/\bhorizontal\b/.test(tag)) continue;
      if (/\bpagingEnabled\b/.test(tag)) continue; // intentional full-screen pager
      if (scannerPins(resolveScrollerStyle(tag, src))) continue;
      if (hasOptOut(lines, i)) continue;
      out.push({ file: r, line: i + 1, style: cm[1], snippet: `horizontal ${cm[1]} style missing flexGrow:0 + flexShrink:0 (pattern B)` });
    }
  }
  return out;
}

describe('Dynamic-Type guard — Rule 1: flex:1 button body in an unsized Pressable', () => {
  it('no button-body child pins flex:1 inside a self-unsized Pressable (Bug 1)', () => {
    const violations = scanRule1();
    expect(
      violations.length === 0
        ? null
        : `\nFound ${violations.length} collapsing button body/ies (flex:1 grow child pinned at minHeight on native).\n` +
            `Fix: drop flex:1 from the button-body style, or size the Pressable itself.\n${format(violations)}`,
    ).toBeNull();
  });
});

describe('Dynamic-Type guard — Rule 2: sub-line-box literal lineHeight', () => {
  it('no style pins a literal lineHeight/fontSize below the font box (< 1.18)', () => {
    const violations = scanRule2();
    expect(
      violations.length === 0
        ? null
        : `\nFound ${violations.length} style(s) whose literal lineHeight is below the font's line box — text clips.\n` +
            `Fix: raise lineHeight to >= 1.18x fontSize (or use a token), or ALLOW_LIST with a reason.\n${format(violations)}`,
    ).toBeNull();
  });
});

describe('Dynamic-Type guard — Rule 3: hard height on text elements', () => {
  it('no style applied to <AppText>/<Text> carries a hard height (name-independent)', () => {
    const violations = scanRule3();
    expect(
      violations.length === 0
        ? null
        : `\nFound ${violations.length} <Text>/<AppText> style(s) with a hard height — scaled text will clip.\n` +
            `Fix: use minHeight instead of height, or // dynamic-type-ok / ALLOW_LIST with a reason.\n${format(violations)}`,
    ).toBeNull();
  });
});

describe('Dynamic-Type guard — Rule 4: horizontal scroller flex pinning (pattern B)', () => {
  it('every horizontal scroller pins flexGrow:0 + flexShrink:0 on its style (Bug 2)', () => {
    const violations = scanRule4();
    expect(
      violations.length === 0
        ? null
        : `\nFound ${violations.length} horizontal scroller(s) that can be crushed by a bounded flex parent.\n` +
            `Fix: set { flexGrow: 0, flexShrink: 0 } on the ScrollView/FlatList *style* prop (padding goes in contentContainerStyle).\n${format(violations)}`,
    ).toBeNull();
  });
});

describe('Dynamic-Type guard — Rule self-tests (the net catches the original fish)', () => {
  // Rule 1 — Bug 1's actual shape: a bare flex:1 button body + an unsized Pressable.
  it('Rule 1 flags Bug 1: flex:1 button body inside an unsized Pressable', () => {
    const preFixPrimaryBtn =
      'flex: 1, paddingVertical: 20, borderRadius: 16, alignItems: "center", minHeight: 44, shadowOffset: { width: 0, height: 4 }';
    const bug1Pressable = '<Pressable onPress={onDone} style={({ pressed }) => [pressed && { opacity: 0.88 }]}>';
    expect(isButtonBody(preFixPrimaryBtn)).toBe(true);
    expect(pressableSizesItself(bug1Pressable, '')).toBe(false);
  });

  it('Rule 1 does NOT flag a legit flex:1 text-wrap (no padding/radius, or a row)', () => {
    expect(isButtonBody('flex: 1, color: "#111"')).toBe(false); // plain text wrap
    expect(isButtonBody('flex: 1, flexDirection: "row", alignItems: "center"')).toBe(false); // row
    // A Pressable that sizes itself (minHeight) is never a candidate.
    expect(pressableSizesItself('<Pressable style={styles.signInBtn}>', 'signInBtn: { minHeight: 56 }')).toBe(true);
  });

  // Rule 4 — Bug 2's actual shape: categoryScroll WITHOUT the flex pins.
  it('Rule 4 flags Bug 2: a horizontal scroller whose style omits the flex pins', () => {
    const preFix = resolveScrollerStyle(
      '<ScrollView horizontal style={styles.categoryScroll}>',
      'categoryScroll: { paddingTop: 8, paddingBottom: 8 }',
    );
    expect(scannerPins(preFix)).toBe(false);
  });

  it('Rule 4 does NOT flag the fixed shape, and exempts pagingEnabled pagers', () => {
    const fixed = resolveScrollerStyle(
      '<ScrollView horizontal style={styles.categoryScroll}>',
      'categoryScroll: { flexGrow: 0, flexShrink: 0 }',
    );
    expect(scannerPins(fixed)).toBe(true);
    // pagingEnabled carousels are intentional full-screen pagers.
    expect(/\bpagingEnabled\b/.test('<ScrollView horizontal pagingEnabled style={styles.pager}>')).toBe(true);
  });

  // Rule 2/3 — literal-ratio + hard-height predicates are live.
  it('Rule 2 catches a sub-box literal ratio but trusts token expressions', () => {
    expect(literalRatioViolation('fontSize: 16, lineHeight: 18')).toBeCloseTo(1.125, 3); // 18/16 < 1.18
    expect(literalRatioViolation('fontSize: 16, lineHeight: 20')).toBeNull(); // 1.25 >= 1.18
    expect(literalRatioViolation('fontSize: font.size.xl, lineHeight: font.size.xl + 2')).toBeNull(); // token expr
  });

  it('Rule 3 catches a hard height that Cluster B\'s suffix regex would miss', () => {
    // `badgeCount` doesn't end in Row|Label|Text|Title|Name, so Cluster B skips
    // it — but if it renders text with a hard height it still clips at 2x.
    expect(hardHeightOver2('width: 24, height: 24, borderRadius: 12')).toBe(true);
    expect(hardHeightOver2('minHeight: 44, lineHeight: 20')).toBe(false); // min/lineHeight are fine
    expect(TEXT_ROW_STYLE.test('badgeCount')).toBe(false); // proves the Cluster B gap
    expect(styleNamesOnTextTags('<AppText style={styles.badgeCount}>1</AppText>').has('badgeCount')).toBe(true);
  });
});
