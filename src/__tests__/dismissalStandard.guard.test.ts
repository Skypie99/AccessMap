/**
 * THE DISMISSAL STANDARD — a source-derived census, so a surface added without
 * the standard fails visibly instead of quietly joining the gap.
 *
 * The census is not a hand-written list. It is parsed out of the source on
 * every run, so a new <Modal> enters it automatically and has to satisfy the
 * same rules as its 32 siblings. That is the whole point: 03's census took an
 * afternoon to compile by hand, and it was already drifting from the code
 * (three of its counts were not reproducible) before it was finished.
 *
 * WHY THE ESCAPE ASSERTION LOOKS AT A CHILD NODE. React Native's <Modal>
 * forwards an EXPLICIT allowlist of props to RCTModalHostView
 * (react-native 0.81.5, Libraries/Modal/Modal.js:326-347) with no {...props}
 * spread, and `onAccessibilityEscape` is not in it — it typechecks only
 * because ModalProps spreads ViewProps. So a handler on the <Modal> tag
 * compiles, satisfies "is the prop present", and does NOTHING. The standard
 * therefore requires it on the modal's containment node, and assertion B is
 * written to fail on exactly the mistake that would otherwise ship silently.
 *
 * House idiom: static source scan (cf. reduceMotion.modalGate.test.ts,
 * perceptionGuards.test.ts, drawerRoutes.guard.test.ts) — fast, no navigator
 * mount, and it fails the moment the contract breaks.
 *
 * ANTI-SELF-MATCH: the banned gesture identifiers are assembled at runtime and
 * this file is excluded from the scan, so the sweep cannot match itself and
 * pass by accident.
 */
import fs from 'fs';
import path from 'path';

const SELF = path.resolve(__filename);
const SRC = path.join(__dirname, '..'); // -> src/
const APP_TSX = path.join(SRC, '..', 'App.tsx');

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/** Blank out comments while preserving line numbers, so prose never matches. */
function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

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

interface Surface {
  file: string;
  rel: string;
  line: number;
  tag: string;
  /** Source from the end of the tag to EOF — where the containment node lives. */
  body: string;
}

/**
 * Extract every <Modal> open tag. Scans forward tracking brace depth so the
 * tag ends at the first '>' seen at depth 0 — which survives arrow bodies
 * (`onRequestClose={() => { if (!x) y(); }}`), ternaries
 * (`animationType={rm ? 'none' : 'slide'}`) and self-closing tags.
 */
function surfaces(): Surface[] {
  const files = [...walkTsx(SRC), APP_TSX].filter((f) => path.resolve(f) !== SELF);
  const out: Surface[] = [];
  for (const file of files) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/<Modal[\s>/]/g)) {
      const i = m.index as number;
      let depth = 0;
      let j = i;
      while (j < src.length) {
        const c = src[j];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) break;
        j++;
      }
      out.push({
        file,
        rel: path.relative(SRC, file),
        line: src.slice(0, i).split('\n').length,
        tag: src.slice(i, j + 1),
        body: src.slice(j + 1),
      });
    }
  }
  return out;
}

/** Read a prop's expression out of a tag, balancing braces. */
function prop(tag: string, name: string): string | null {
  // Quoted string attribute, e.g. animationType="none" — the drawer's designed
  // exception, since it drives its own Animated and has no motion to gate.
  const quoted = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  if (quoted) return `'${quoted[1]}'`;
  const at = tag.indexOf(`${name}={`);
  if (at === -1) {
    // Bare boolean prop (`transparent`, `accessibilityViewIsModal`).
    return new RegExp(`\\b${name}\\b(?!\\s*=)`).test(tag) ? 'true' : null;
  }
  let depth = 0;
  let j = at + name.length + 1;
  const start = j + 1;
  while (j < tag.length) {
    if (tag[j] === '{') depth++;
    else if (tag[j] === '}') {
      depth--;
      if (depth === 0) break;
    }
    j++;
  }
  return tag.slice(start, j);
}

const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * Surfaces deliberately outside the standard. Every entry must still resolve
 * to exactly one live record, so a stale exception FAILS rather than rotting
 * into a silent coverage hole. Anchored on a tag MARKER, never a line number,
 * so an edit above it cannot re-point the exemption at a different surface.
 *
 * The precedent for draining rather than accumulating exemptions is
 * dynamicTypeGuard.test.ts, whose ALLOW_LIST is empty because every historical
 * entry was fixed rather than silenced.
 */
const ALLOWED = [
  {
    rel: 'components/FlagDetailModal.tsx',
    marker: 'visible={false}',
    why:
      'Dead null-stub (03 headline correction). The early return renders ' +
      '<Modal visible={false} …/>, which never presents, so it carries no ' +
      'affordances by design. Removing the stub is fine; removing this entry ' +
      'without removing the stub is not.',
  },
] as const;

const isAllowed = (s: Surface) =>
  ALLOWED.some((a) => s.rel === a.rel && s.tag.includes(a.marker));

/**
 * Surfaces whose containment node lives in a DIFFERENT file from their
 * <Modal>. Declared rather than inferred, because "look in another file" is
 * exactly the kind of loophole that would let a real gap hide.
 */
const CROSS_FILE = [
  {
    rel: 'screens/ProfileScreen.tsx',
    marker: 'visible={signInOpen}',
    containedIn: 'screens/SignInScreen.tsx',
    /** The prop the parent passes its close handler through. */
    viaProp: 'onClose',
    why:
      'ProfileScreen declares the Modal but renders <SignInScreen/> as its ' +
      'child, and SignInScreen owns the accessibilityViewIsModal root. That ' +
      'root is shared with the case where SignInScreen IS the auth wall (no ' +
      'Modal at all), which is why its escape handler is `onClose` — undefined ' +
      'on the wall, so the wall correctly stays undismissable.',
  },
] as const;

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

describe('the dismissal standard', () => {
  const all = surfaces();
  const live = all.filter((s) => !isAllowed(s));

  it('A · finds the modal estate (sanity: the scan is not vacuous)', () => {
    expect(all.length).toBeGreaterThanOrEqual(30);
  });

  it('B · every surface dismisses on the escape gesture, with the SAME handler', () => {
    // The core law. Parity, not presence: a drifting handler is a bug that
    // "the prop is there" would never catch.
    //
    // Pairing rule: a surface owns the escape handlers that appear after its
    // own tag and before the next <Modal> in the same file. That scoping is
    // what stops a sibling modal further down the file from satisfying its
    // neighbour's obligation.
    const offenders: string[] = [];
    for (const [i, s] of live.entries()) {
      const orc = norm(prop(s.tag, 'onRequestClose'));
      if (!orc) {
        offenders.push(`${s.rel}:${s.line} → no onRequestClose`);
        continue;
      }

      const cross = CROSS_FILE.find((c) => c.rel === s.rel && s.tag.includes(c.marker));
      let scope: string;
      if (cross) {
        // Byte-parity is the WRONG test across a component boundary: the child
        // sees the handler as a prop name, not as the parent's arrow. So check
        // the bridge instead — the parent must hand the child the very same
        // expression it gives onRequestClose, and the child must escape to
        // that prop. Together those two facts are the parity.
        const parent = stripComments(fs.readFileSync(s.file, 'utf8'));
        const passed = norm(
          prop(parent.slice(parent.indexOf(s.tag) + s.tag.length), cross.viaProp),
        );
        expect(`${s.rel} bridge → ${passed}`).toBe(`${s.rel} bridge → ${orc}`);
        scope = stripComments(fs.readFileSync(path.join(SRC, cross.containedIn), 'utf8'));
        const at2 = scope.indexOf('onAccessibilityEscape');
        const esc2 = at2 === -1 ? '' : norm(prop(scope.slice(at2), 'onAccessibilityEscape'));
        if (esc2 !== cross.viaProp) {
          offenders.push(`${s.rel}:${s.line} → escapes to '${esc2}', expected '${cross.viaProp}'`);
        }
        continue;
      } else {
        const next = live[i + 1];
        scope = next && next.file === s.file ? s.body.slice(0, s.body.indexOf(next.tag)) : s.body;
      }

      const at = scope.indexOf('onAccessibilityEscape');
      if (at === -1) {
        offenders.push(`${s.rel}:${s.line} → no onAccessibilityEscape on its containment node`);
        continue;
      }
      const esc = norm(prop(scope.slice(at), 'onAccessibilityEscape'));
      if (esc !== orc) offenders.push(`${s.rel}:${s.line} → ORC=${orc} ESC=${esc}`);
    }
    expect(offenders).toEqual([]);
  });

  it('B2 · the escape handler is never on the <Modal> tag, where RN drops it', () => {
    // This is the assertion that catches the plausible-looking mistake.
    const offenders = live
      .filter((s) => /onAccessibilityEscape/.test(s.tag))
      .map((s) => `${s.rel}:${s.line} → prop is on <Modal>; RN's forwarding allowlist drops it`);
    expect(offenders).toEqual([]);
  });

  it('C · every surface is still reduced-motion gated', () => {
    // The positive twin of reduceMotion.modalGate.test.ts, which only proves
    // the ABSENCE of a bare literal. This proves the presence of the gate.
    const offenders: string[] = [];
    for (const s of live) {
      const anim = norm(prop(s.tag, 'animationType'));
      const gated = /\?\s*'none'\s*:/.test(anim) || anim === "'none'" || anim === '"none"';
      if (!gated) offenders.push(`${s.rel}:${s.line} → animationType=${anim || '(absent)'}`);
    }
    expect(offenders).toEqual([]);
  });

  it('D · Android hardware back stays covered class-wide', () => {
    // onRequestClose is what serves the hardware back button. Assertion B
    // already requires it, so this states the guarantee explicitly.
    const offenders = live
      .filter((s) => !prop(s.tag, 'onRequestClose'))
      .map((s) => `${s.rel}:${s.line}`);
    expect(offenders).toEqual([]);
  });

  it('E · full-screen surfaces add no swipe gesture', () => {
    const full = live.filter((s) => /presentationStyle="fullScreen"/.test(s.tag));
    expect(full.length).toBeGreaterThan(0);
    const banned = ['Pan' + 'Responder', 'Gesture' + 'Detector', 'Swipe' + 'able'];
    const offenders: string[] = [];
    for (const s of full) {
      const src = fs.readFileSync(s.file, 'utf8');
      for (const b of banned) if (new RegExp(`\\b${b}\\b`).test(src)) offenders.push(`${s.rel} → ${b}`);
    }
    expect(offenders).toEqual([]);
  });

  it('F · swipe stays UIKit-only — no custom gesture code anywhere', () => {
    // 03 §2.6 reasoned this out rather than assuming it: adding a gesture
    // responder over the map's box-none overlay reopens a settled law.
    // Identifiers assembled at runtime so this file never matches itself.
    const banned = ['Pan' + 'Responder', 'Gesture' + 'Detector', 'Swipe' + 'able'];
    const offenders: string[] = [];
    for (const file of [...walkTsx(SRC), APP_TSX]) {
      if (path.resolve(file) === SELF) continue;
      const src = fs.readFileSync(file, 'utf8');
      for (const b of banned) {
        if (new RegExp(`\\b${b}\\b`).test(stripComments(src))) {
          offenders.push(`${path.relative(SRC, file)} → ${b}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('G · the map keeps its box-none overlay law', () => {
    // Cheap insurance: SR-033 records the law as comment-enforced only, jest
    // cannot see a regression at most sites, and this phase edits MapScreen.
    const src = fs.readFileSync(path.join(SRC, 'screens', 'MapScreen.tsx'), 'utf8');
    expect((src.match(/pointerEvents="box-none"/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it('H · the drawer takes exactly one new prop and nothing else', () => {
    // The drawer is device-tune-shipped and PRESERVE VERBATIM. Set equality on
    // the prop NAMES means any addition or removal fails by name.
    const drawer = live.find((s) => s.rel === 'components/HamburgerDrawer.tsx');
    expect(drawer).toBeDefined();
    const tag = (drawer as Surface).tag;
    const names = [...tag.matchAll(/([\w-]+)=/g)].map((m) => m[1]).sort();
    expect(names).toEqual(['animationType', 'aria-label', 'onDismiss', 'onRequestClose', 'visible']);
    // The exact string drawerRoutes.guard.test.ts greps for — restated here so
    // a reader of this file sees the constraint without chasing it.
    expect(tag).toContain('onDismiss={presentPendingSubScreen}');
    // The panel — not the Modal — is where the drawer's escape lives.
    const panel = (drawer as Surface).body;
    expect(panel).toContain('onAccessibilityEscape={closeDrawer}');
  });

  it('I · every allow-list entry still resolves to exactly one live surface', () => {
    for (const a of ALLOWED) {
      const hits = all.filter((s) => s.rel === a.rel && s.tag.includes(a.marker));
      expect(`${a.rel} → ${hits.length}`).toBe(`${a.rel} → 1`);
    }
    // Keep the list short and deliberate.
    expect(ALLOWED).toHaveLength(1);
  });
});
