/**
 * THE KEYBOARD CLASS — a source-derived census, so a surface that hosts a text
 * input without a keyboard mechanism fails visibly instead of quietly joining
 * the gap.
 *
 * WHY THIS EXISTS. The same defect shipped three times: the keyboard covering
 * the input on FeedbackModal (fixed d2a0991), then on Search-by-address, then
 * on Watched Flags — the last two caught on a real device, not by a test. Two
 * guards were already in the repo and both missed it, for two distinct reasons
 * this file is built to close:
 *
 *   1. PRESENCE IS NOT GEOMETRY. keyboardAvoidance.guard.test.ts asserted only
 *      that a <KeyboardAvoidingView> existed. AddressSearchModal HAD one — and
 *      was even cited as the recipe source — but its KAV carried no height cap,
 *      so the card's own `maxHeight:'85%'` resolved against a content-sized
 *      parent and was inert. A percentage maxHeight only resolves against a
 *      parent with a DEFINITE height, and in a `backdrop(flex:1) → KAV →
 *      cardWrap → card` stack only the backdrop is definite. So the cap has to
 *      sit on the KAV, and this guard checks for the cap, not just the KAV.
 *
 *   2. INPUTS ARRIVE INDIRECTLY. MyWatchedModal hosts its input through the
 *      shared <SearchInputRow>, so it never matched a `TextInput` scan and was
 *      structurally invisible to the old census. This one counts <TextInput>,
 *      <SearchInputRow> and <Input> alike.
 *
 * The census is not a hand-written allowlist — that was the first hole. It is
 * parsed out of the source on every run, so a new input-hosting sheet enters it
 * automatically and has to satisfy the same rules as its siblings.
 *
 * THE TWO SANCTIONED MECHANISMS (either satisfies a sheet):
 *   Recipe F — the FeedbackModal stack: a KAV with iOS 'padding' behavior AND a
 *     percentage cap ON THE KAV, with the card/wrapper free to shrink into it.
 *   Recipe S — `automaticallyAdjustKeyboardInsets` on the body scroller, for
 *     pageSheet / full-height surfaces where a KAV would fight the layout
 *     (the FlagDetailModal A11Y-228 precedent).
 *
 * ANTI-SELF-MATCH: this file is excluded from the scan, and the literals it
 * searches for are assembled at runtime, so the sweep cannot match itself.
 *
 * RETIRED INTO THIS FILE: keyboardAvoidance.guard.test.ts (A11Y-228). Its three
 * pins — SavedPlacesModal, FilterPresetsModal, FlagDetailModal — are census rows
 * here now, held to a strictly stronger rule (it asked only whether a KAV
 * existed; this asks whether the KAV actually caps). feedbackKeyboard.guard.test.ts
 * stays: it pins the reference implementation in more depth than a census can.
 *
 * House idiom: static source scan (cf. dismissalStandard.guard.test.ts,
 * perceptionGuards.test.ts) — fast, no mount, fails the moment it breaks.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SELF = path.resolve(__filename);
const SRC = path.join(__dirname, '..'); // -> src/
const APP_TSX = path.join(SRC, '..', 'App.tsx');


function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['__tests__', '__mocks__', 'node_modules'].includes(entry.name)) continue;
      out.push(...walkTsx(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// Assembled at runtime — see ANTI-SELF-MATCH above.
const LT = '<';
const INPUT_TAGS = ['TextInput', 'SearchInputRow', 'Input'];
const SHEET_TAGS = ['Modal', 'Sheet'];
const KAV_TAG = 'KeyboardAvoidingView';
const INSETS_PROP = ['automatically', 'Adjust', 'Keyboard', 'Insets'].join('');

/** The component DEFINITIONS — they render the primitive, they don't host it. */
const DEFINITIONS = ['components/ui/Input.tsx', 'components/SearchInputRow.tsx'];

/**
 * Surfaces exempt from the sheet rule. Each needs a written reason.
 * Deliberately EMPTY: every input-hosting sheet in the app carries a mechanism.
 * An entry here is a decision to be defended, not a place to park a failure.
 */
const EXEMPT: Record<string, string> = {};

/**
 * Input-hosting SCREENS (no sheet in the file) and the mechanism each must
 * carry. A screen has no backdrop to cap against, so Recipe F's percentage cap
 * does not apply; what matters is that the focused field is reachable.
 * A new input-hosting screen is not in this table and fails loudly.
 */
const SCREEN_MECHANISM: Record<string, 'kav' | 'insets'> = {
  'screens/SignInScreen.tsx': 'kav',
  'screens/TasksScreen.tsx': 'insets',
  'screens/ProfileScreen.tsx': 'insets',
};

interface FileInfo {
  rel: string;
  src: string;
  hostsInput: boolean;
  hostsSheet: boolean;
}

function has(src: string, tag: string): boolean {
  return new RegExp(`${LT}${tag}\\b`).test(src);
}

function census(): FileInfo[] {
  const files = [...walkTsx(SRC), APP_TSX].filter((f) => path.resolve(f) !== SELF);
  return files.map((file) => {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const rel = path.relative(SRC, file).split(path.sep).join('/');
    return {
      rel,
      src,
      hostsInput: !DEFINITIONS.includes(rel) && INPUT_TAGS.some((t) => has(src, t)),
      hostsSheet: SHEET_TAGS.some((t) => has(src, t)),
    };
  });
}

/**
 * Extract every <KeyboardAvoidingView ...> open tag's attribute text. Scans
 * forward tracking brace depth so the tag ends at the first '>' at depth 0 —
 * which survives arrow bodies and ternaries in props.
 */
function kavTags(src: string): string[] {
  const out: string[] = [];
  const open = `${LT}${KAV_TAG}`;
  let i = src.indexOf(open);
  while (i !== -1) {
    let depth = 0;
    let j = i + open.length;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    out.push(src.slice(i, j));
    i = src.indexOf(open, j);
  }
  return out;
}

/** Pull the `style={...}` expression out of a tag's attribute text. */
function styleExpr(tag: string): string | null {
  const at = tag.indexOf('style={');
  if (at === -1) return null;
  let depth = 0;
  let j = at + 'style='.length;
  const start = j;
  for (; j < tag.length; j++) {
    if (tag[j] === '{') depth++;
    else if (tag[j] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return tag.slice(start, j + 1);
}

/** Does this style expression resolve to a percentage maxHeight cap? */
function hasCap(styleText: string, fileSrc: string): boolean {
  const pct = /maxHeight:\s*'\d+%'/;
  // (a) inline literal on the tag itself
  if (pct.test(styleText)) return true;
  // (b) a named style — resolve `styles.NAME` against the file's StyleSheet
  for (const m of styleText.matchAll(/styles\.(\w+)/g)) {
    const block = styleBlock(fileSrc, m[1]);
    if (block && pct.test(block)) return true;
  }
  return false;
}

/**
 * The body of `NAME: { … }` inside a StyleSheet, brace-balanced.
 *
 * ⚠ This used to be a regex anchored on `\n\s{4}\},` — a block that closes on
 * its own line at exactly four spaces. That is how most of this codebase writes
 * a style, so it worked; but a ONE-LINE block (`kav: { maxHeight: '90%' },`)
 * never matched, and the resolver returned "no cap" for a style that has one.
 * A false negative here is the dangerous direction — it reads as a missing
 * mechanism — and it fired the moment the shared Sheet primitive wrote its KAV
 * style on one line (2026-08-22). Balancing braces removes the formatting
 * dependency entirely, so neither layout can fool it.
 */
function styleBlock(src: string, name: string): string | null {
  const at = new RegExp(`\\b${name}:\\s*\\{`).exec(src);
  if (!at) return null;
  let depth = 0;
  let j = at.index + at[0].length - 1;
  const start = j + 1;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, j);
    }
  }
  return null;
}

function iosPadding(tag: string): boolean {
  return /behavior=\{[^}]*'padding'/.test(tag);
}

/**
 * RECIPE D — DELEGATED (added 2026-08-22, art-direction Phase 3).
 *
 * Four input-hosting sheets moved their chrome into `components/ui/Sheet.tsx`
 * and now opt into the mechanism with `keyboardAvoiding` instead of mounting a
 * KAV of their own. Scanning their files for `<KeyboardAvoidingView` therefore
 * finds nothing, and the old rule read that as "no mechanism at all" — which is
 * the guard doing its job, because from where it stood that is exactly what it
 * looked like.
 *
 * The re-pin does NOT just wave those four through. Delegation is only as good
 * as the thing delegated to, so this pairs two checks:
 *   (a) the consumer really opts in (`keyboardAvoiding` on its <Sheet> tag), and
 *   (b) the PRIMITIVE really implements Recipe F — iOS padding behavior and a
 *       resolvable percentage cap on the KAV it mounts.
 *
 * (b) is new coverage. Before the move, nothing in this suite looked at the
 * primitive at all; four separate implementations were each checked, and the
 * shared one that replaced them was invisible. So the class is now guarded in
 * one more place than it was, not one fewer.
 */
const SHEET_PRIMITIVE = 'components/ui/Sheet.tsx';
const DELEGATED_PROP = 'keyboardAvoiding';

/** Every `<Sheet ...>` open tag's attribute text in a consumer file. */
function sheetTags(src: string): string[] {
  const out: string[] = [];
  const open = `${LT}Sheet`;
  let i = src.indexOf(open);
  while (i !== -1) {
    // Skip `<SheetHeader`, `<SheetPull` and friends — word boundary only.
    if (/[\s>/]/.test(src[i + open.length] ?? '')) {
      let depth = 0;
      let j = i + open.length;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) break;
      }
      out.push(src.slice(i, j));
    }
    i = src.indexOf(open, i + open.length);
  }
  return out;
}

const delegates = (src: string) =>
  sheetTags(src).some((t) => new RegExp(`\\b${DELEGATED_PROP}\\b`).test(t));

// ---------------------------------------------------------------------------

describe('THE KEYBOARD CLASS — every input-hosting surface carries a mechanism', () => {
  const all = census();

  it('the census actually found surfaces (guard against a silent empty scan)', () => {
    expect(all.length).toBeGreaterThan(40);
    expect(all.filter((f) => f.hostsInput).length).toBeGreaterThanOrEqual(16);
  });

  it('sees inputs that arrive INDIRECTLY (the hole that hid MyWatchedModal)', () => {
    const watched = all.find((f) => f.rel === 'components/MyWatchedModal.tsx');
    expect(watched).toBeDefined();
    // It renders no <TextInput> of its own — only <SearchInputRow>.
    expect(watched!.hostsInput).toBe(true);
  });

  const sheets = all.filter((f) => f.hostsInput && f.hostsSheet && !(f.rel in EXEMPT));

  it.each(sheets.map((f) => [f.rel, f] as const))(
    '%s — input-hosting sheet carries Recipe F (capped KAV) or Recipe S',
    (rel, info) => {
      if (info.src.includes(INSETS_PROP)) return; // Recipe S satisfies it outright.
      if (info.rel !== SHEET_PRIMITIVE && delegates(info.src)) return; // Recipe D — proven below.

      const tags = kavTags(info.src);
      expect(tags.length).toBeGreaterThan(0); // no mechanism at all

      for (const tag of tags) {
        expect(iosPadding(tag)).toBe(true);
        const style = styleExpr(tag);
        expect(style).not.toBeNull();
        // THE ASSERTION THAT WOULD HAVE CAUGHT AddressSearchModal:
        // a KAV without a resolvable percentage cap is not a mechanism.
        expect(hasCap(style!, info.src)).toBe(true);
      }
      expect(rel).toBeTruthy();
    },
  );

  const screens = all.filter((f) => f.hostsInput && !f.hostsSheet);

  it('every input-hosting SCREEN is listed in the mechanism table', () => {
    const unlisted = screens.map((f) => f.rel).filter((r) => !(r in SCREEN_MECHANISM));
    expect(unlisted).toEqual([]);
  });

  it.each(Object.entries(SCREEN_MECHANISM))('%s — carries its declared mechanism', (rel, want) => {
    const info = all.find((f) => f.rel === rel);
    expect(info).toBeDefined();
    if (want === 'insets') {
      expect(info!.src.includes(INSETS_PROP)).toBe(true);
    } else {
      expect(kavTags(info!.src).some(iosPadding)).toBe(true);
    }
  });

  it('Recipe D — the primitive every delegate leans on really implements Recipe F', () => {
    // The other half of the delegation. Without this, `keyboardAvoiding` could
    // become a no-op in the primitive and four sheets would go silently
    // unprotected while this suite stayed green.
    const primitive = all.find((f) => f.rel === SHEET_PRIMITIVE);
    expect(primitive).toBeDefined();
    // It has to actually take the prop, or a consumer's opt-in means nothing.
    expect(primitive!.src).toContain(`${DELEGATED_PROP}?: boolean;`);
    const tags = kavTags(primitive!.src);
    expect(tags.length).toBe(1);
    expect(iosPadding(tags[0])).toBe(true);
    const style = styleExpr(tags[0]);
    expect(style).not.toBeNull();
    expect(hasCap(style!, primitive!.src)).toBe(true);
  });

  it('Recipe D — every delegate is a real, live consumer (the list drains)', () => {
    // Same drain discipline as the dismissal standard's ALLOWED: a file that
    // stops delegating must stop being counted, and the count itself is the
    // tripwire against a silent mass opt-out.
    const found = all
      .filter((f) => f.rel !== SHEET_PRIMITIVE && delegates(f.src))
      .map((f) => f.rel)
      .sort();
    expect(found).toEqual([
      'components/FeedbackModal.tsx',
      'components/FilterPresetsModal.tsx',
      'components/MyReportsModal.tsx',
      'components/MyWatchedModal.tsx',
      'components/ReportContentModal.tsx',
      'components/SavedPlacesModal.tsx',
    ]);
    // And each one really hosts an input — otherwise the prop is cargo.
    for (const rel of found) expect(all.find((f) => f.rel === rel)!.hostsInput).toBe(true);
  });

  it('every exemption carries a written reason', () => {
    for (const [rel, why] of Object.entries(EXEMPT)) {
      expect(typeof why).toBe('string');
      expect(why.length).toBeGreaterThan(30);
      expect(all.some((f) => f.rel === rel)).toBe(true);
    }
  });
});
