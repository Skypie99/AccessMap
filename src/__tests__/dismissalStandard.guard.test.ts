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
import { stripComments } from './support/stripComments';

const SELF = path.resolve(__filename);
const SRC = path.join(__dirname, '..'); // -> src/
const APP_TSX = path.join(SRC, '..', 'App.tsx');

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------


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

/**
 * G5 FOCUS RETURN — the surfaces that hand the screen-reader cursor back to the
 * control that opened them, via `useSurfaceTrigger` (src/lib/accessibility.ts).
 *
 * Declared, not inferred, and asserted in BOTH directions: a declared surface
 * must be wired end to end, and a surface that carries `onDismiss` without
 * being declared here FAILS. That second half is the one that matters — the
 * contract is five separate edits across two files, and four of them landing is
 * indistinguishable from five at a glance.
 *
 * ON PROOF: react-native-web stubs `AccessibilityInfo.setAccessibilityFocus` to
 * an EMPTY BODY and drops `accessibilityViewIsModal`, so this whole feature has
 * ZERO web-observable delta. jest can prove the wiring exists and that the hook
 * calls setAccessibilityFocus with the right handle; only a device pass with
 * VoiceOver / TalkBack can prove the cursor moved. This assertion is a wiring
 * guard, and calling it anything more would be dressing green as shipped.
 */
const FOCUS_RETURN = [
  {
    rel: 'screens/NearbyFlagsModal.tsx',
    opener: 'screens/MapScreen.tsx',
    trigger: 'nearbyTrigger',
    handoff: true,
    why:
      'The List FAB opens it; closing it returns the cursor to that FAB. Needs ' +
      'a handoff because picking a row goes ONWARD — to the detail sheet under ' +
      'a screen reader, to the map callout when sighted.',
  },
  {
    rel: 'screens/ReportFlagModal.tsx',
    opener: 'screens/MapScreen.tsx',
    trigger: 'reportTrigger',
    handoff: true,
    why:
      'The Report FAB opens it; cancel / hardware back / the escape scrub return ' +
      'the cursor there. Needs a handoff because a SUBMIT belongs to the ' +
      '"Report filed…" live region — yanking focus would cut it off mid-utterance.',
  },
  {
    rel: 'screens/LegendModal.tsx',
    opener: 'screens/MapScreen.tsx',
    trigger: 'legendTrigger',
    handoff: false,
    why:
      'The header help button opens it; closing it returns the cursor there. No ' +
      'handoff by design — the legend is read-only, so every exit is a plain ' +
      'close and there is no onward surface to hand focus to.',
  },
] as const;

/**
 * Surfaces that carry `onDismiss` for a reason OTHER than the G5 contract, and
 * must not be read as gaps. Two of them, for two different reasons.
 *
 * 1. FlagDetailModal — SW-28. Its `onDismiss` is a CAMERA-TIMING hook, not focus
 * return. "View on Map" on the Map tab used to move the map inline, in the same
 * tick as onClose(); on iOS a full-screen Modal detaches the presenting view
 * controller's view, so MKMapView dropped animateToRegion silently and the map
 * never moved (reproduced live — every marker frame byte-identical either side
 * of the tap). The move now waits for the dismissal-COMPLETE event, which is
 * what `onDismiss` IS on iOS, which is why it is the right event and also why it
 * collides with this rule's vocabulary. Renaming cannot dodge it and should not:
 * this scan reads the real RN prop on the Modal tag, which is correct of it.
 *
 * This entry asserts NOTHING about focus return, and deliberately does not claim
 * it. FlagDetailModal has no useSurfaceTrigger pairing on the Map tab; that is a
 * pre-existing gap SW-28 did not create, and wiring an unverified focus-return
 * contract onto a surface whose VoiceOver behaviour is already queued for a real
 * device pass (Wave 1, N-1) would be worse than declaring the boundary here.
 *
 * 2. The drawer — the one surface that returns focus WITHOUT this contract.
 *
 * The drawer's focus return predates G5 and rides `DrawerContext`, because its
 * trigger lives in N different screen headers while <HamburgerDrawer> mounts
 * once at the navigator — trigger and surface sit in different subtrees, so the
 * handle has to travel through a provider. `useSurfaceTrigger` deliberately has
 * no provider and serves LOCAL pairs only.
 *
 * It is also frozen shut: assertion H pins the drawer's exact Modal prop-name
 * SET and the literal `onDismiss={presentPendingSubScreen}` — a handler name J
 * could never match, and one J must not force to be renamed. A stale entry here
 * cannot rot either: J requires it to still resolve to exactly one live surface
 * carrying `onDismiss`, and H fails independently if the drawer's tag drifts.
 *
 * Its own contract is covered by HamburgerDrawer.focus.test.tsx and
 * drawerTrigger.test.tsx. This is a BOUNDARY between two focus-return
 * mechanisms, not a coverage hole.
 */
const FOCUS_RETURN_EXEMPT = [
  {
    rel: 'components/FlagDetailModal.tsx',
    handler: 'onDismiss={onDismiss}',
  },
  {
    rel: 'components/HamburgerDrawer.tsx',
    handler: 'onDismiss={presentPendingSubScreen}',
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

  it('F · swipe is UIKit-native, or the ONE ratified pull primitive — nothing else', () => {
    // ─── AMENDED 2026-08-12, with Sky's sign-off ─────────────────────────────
    // design-reviews/map-gestures/2026-08-12/SPEC.md §3.2; she ruled option A on
    // that run's QUESTIONS.md Q3. This is the deliberate amendment that ruling
    // required — the law was never to be worked around silently.
    //
    // The original text read "no custom gesture code anywhere", because 03 §2.6
    // reasoned that a gesture responder over the map's box-none overlay reopens
    // a settled law. THAT REASONING IS INTACT and is now asserted directly and
    // more strictly, in F2 below: the map estate admits no handler of any kind.
    //
    // What narrowed: the pageSheet class (Nearby, Resources, How-to-help) gets
    // its swipe from UIKit via `allowSwipeDismissal` — still zero custom code.
    // But the transparent half-sheets (Report and friends) are JS-drawn cards
    // with no UIKit dismissal to unlock, so pull-to-dismiss there needs a real
    // handler. It gets exactly ONE file, allowlisted by path below; a second
    // importer fails this sweep, which is the whole point of allowlisting a path
    // instead of relaxing the ban.
    //
    // PanResponder / GestureDetector / Swipeable stay banned EVERYWHERE — the
    // allowlisted file included. Both of the first two do their per-frame work
    // on the JS thread (this app has no Reanimated), and the primitive is
    // deliberately core-Animated-with-native-driver only.
    //
    // Identifiers assembled at runtime so this file never matches itself.
    const ALWAYS = ['Pan' + 'Responder', 'Gesture' + 'Detector', 'Swipe' + 'able'];
    const PULL_HANDLER = 'Pan' + 'Gesture' + 'Handler';
    /** Drain discipline, same rule as ALLOWED: one path, and it must be real. */
    const PULL_PRIMITIVE = path.join('components', 'ui', 'SheetPull.tsx');

    const offenders: string[] = [];
    for (const file of [...walkTsx(SRC), APP_TSX]) {
      if (path.resolve(file) === SELF) continue;
      const rel = path.relative(SRC, file);
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      for (const b of ALWAYS) {
        if (new RegExp(`\\b${b}\\b`).test(src)) offenders.push(`${rel} → ${b}`);
      }
      if (rel !== PULL_PRIMITIVE && new RegExp(`\\b${PULL_HANDLER}\\b`).test(src)) {
        offenders.push(`${rel} → ${PULL_HANDLER} outside the one allowlisted primitive`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('F2 · the map estate admits NO gesture handler of any kind', () => {
    // The load-bearing half of the old law F, now stated on its own terms so it
    // cannot be diluted by a future amendment to the sheet rule above. The map's
    // pinch/pan belongs to the platform SDK and its overlay is box-none; a
    // handler mounted anywhere in this estate would fight one or both.
    const ESTATE = [
      path.join(SRC, 'screens', 'MapScreen.tsx'),
      path.join(SRC, 'components', 'PlatformMap.tsx'),
      path.join(SRC, 'components', 'PlatformMap.web.tsx'),
    ];
    // Substring, not word-boundary: this catches PanGestureHandler,
    // GestureHandlerRootView, and anything else handler-shaped in one rule.
    const HANDLER_SHAPED = 'Gesture' + 'Handler';
    const ALWAYS = ['Pan' + 'Responder', 'Gesture' + 'Detector', 'Swipe' + 'able'];
    const offenders: string[] = [];
    for (const file of ESTATE) {
      expect(fs.existsSync(file)).toBe(true); // non-vacuous: the estate is real
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      if (src.includes(HANDLER_SHAPED)) {
        offenders.push(`${path.relative(SRC, file)} → ${HANDLER_SHAPED}`);
      }
      for (const b of ALWAYS) {
        if (new RegExp(`\\b${b}\\b`).test(src)) {
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
    //
    // A11Y-217 / SR-115 — READ THIS BEFORE TRUSTING `aria-label` BELOW. That
    // prop is REAL ON WEB and DEAD ON NATIVE: RN's Modal forwards an explicit
    // allowlist to RCTModalHostView (Modal.js:326-347) and neither
    // `aria-label` nor `accessibilityLabel` is in it — the same seam that makes
    // `onAccessibilityEscape` a silent no-op here (assertion B2). So this line
    // pins a prop that names the dialog in a browser and nowhere else.
    //
    // It STAYS, and the scope is now ratified rather than accidental: on iOS
    // and Android a dialog is not named by a container attribute at all — it is
    // named by what VoiceOver/TalkBack lands on when the surface presents. As
    // of A11Y-201 that is guaranteed for every dismissable in the estate: each
    // one adopts useFocusOnOpen and lands the cursor on its own
    // accessibilityRole="header" title (focusOnOpen.guard.test.ts enforces it,
    // class-wide). Moving these names onto the containment View instead would
    // have ADDED dead props, not removed them: an accessibilityLabel on a View
    // that is not `accessible` is inert (that is A11Y-218's whole finding).
    //
    // In short: web reads the attribute, native reads the focused header, and
    // both paths are now guarded. What is NOT proven here is the utterance —
    // device rows N-6/N-7.
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

  it('J · focus return is wired end to end, and nothing else claims onDismiss', () => {
    // Sky's picked scope, minus the fourth. FlagDetailModal is RE-DEFERRED with
    // its reason rather than counted green: every one of its four openers is
    // already focus-managed or unmounts its own trigger (the pin callout closes
    // on present · the Nearby row path deliberately leaves the list mounted so
    // the platform already restores · TasksScreen's card is a React.memo row in
    // a virtualized SectionList, where one shared ref is won by the last-mounted
    // card · ProfileScreen's handleDetailClose REOPENS the list modal, which
    // runs its own useFocusOnOpen, so a restore would fight it). Raising this to
    // 4 without answering all four of those is the failure this number blocks.
    expect(FOCUS_RETURN).toHaveLength(3);

    const offenders: string[] = [];

    // (a) FORWARD — every declared surface is wired end to end. Five separate
    // strings in the opener, because five is what the contract actually costs:
    // the hook, the ref, the capture, the restore, and the Android stand-in.
    // Miss `onDismiss` and the return is dead on iOS and web; miss `release()`
    // and it is dead on Android. Both halves are asymmetric and both are
    // invisible to a device-blind gate, which is why presence is checked here
    // rather than trusted. Presence is NOT placement, though: this cannot see
    // that `nearbyTrigger.release()` sits in Nearby's onClose rather than
    // somewhere else in a 3000-line file. A cross-wire is the residual hole,
    // and it is a device row (D-B11), not a claim this file makes.
    for (const d of FOCUS_RETURN) {
      const hits = live.filter((s) => s.rel === d.rel);
      if (hits.length !== 1) {
        offenders.push(`${d.rel} → resolves to ${hits.length} live surfaces, expected 1`);
        continue;
      }
      const s = hits[0];

      // Parity, in the spirit of assertion B: the Modal must FORWARD the prop.
      // An ad-hoc arrow here would typecheck, render, and quietly break the
      // opener's contract, since only `onDismiss` is what the opener passes.
      const od = norm(prop(s.tag, 'onDismiss'));
      if (od !== 'onDismiss') {
        offenders.push(
          `${d.rel}:${s.line} → Modal onDismiss=${od || '(absent)'}, expected the forwarded prop`,
        );
      }
      const surfaceSrc = stripComments(fs.readFileSync(s.file, 'utf8'));
      if (!surfaceSrc.includes('onDismiss?: () => void;')) {
        offenders.push(`${d.rel} → Props do not declare 'onDismiss?: () => void;'`);
      }

      // Comments STRIPPED, so a commented-out line can never satisfy the check.
      const opener = stripComments(fs.readFileSync(path.join(SRC, d.opener), 'utf8'));
      const required = [
        `const ${d.trigger} = useSurfaceTrigger`,
        `ref={${d.trigger}.ref}`,
        `${d.trigger}.register();`,
        `onDismiss={${d.trigger}.restore}`,
        `${d.trigger}.release();`,
        // Only the surfaces that hand focus ONWARD; requiring it of the legend
        // would demand dead code, and dead code is how a guard loses its teeth.
        ...(d.handoff ? [`${d.trigger}.markHandoff();`] : []),
      ];
      for (const need of required) {
        if (!opener.includes(need)) {
          offenders.push(`${d.opener} → missing \`${need}\` for ${d.rel}`);
        }
      }
    }

    // (b) REVERSE — nothing else claims onDismiss. A fourth adoption cannot
    // land half-wired: it fails here until it is declared above, and declaring
    // it above puts it through (a).
    const declared = new Set<string>(FOCUS_RETURN.map((d) => d.rel));
    const exempt = new Set<string>(FOCUS_RETURN_EXEMPT.map((e) => e.rel));
    for (const s of live) {
      if (!prop(s.tag, 'onDismiss')) continue;
      if (declared.has(s.rel) || exempt.has(s.rel)) continue;
      offenders.push(`${s.rel}:${s.line} → carries onDismiss but is not declared in FOCUS_RETURN`);
    }

    // (c) REVERSE, THE OTHER HALF — every `useSurfaceTrigger` call site in the
    // repo belongs to a declared opener, and there are exactly as many as there
    // are declared surfaces.
    //
    // (b) alone is not enough, and the hole is the exact mirror of the one it
    // catches: it keys on `onDismiss`, so an adoption wired with the hook, the
    // ref, register() and release() but NO onDismiss is skipped at the `continue`
    // above — green here, dead on iOS and web, alive only on Android. (b) also
    // only ever reads the openers NAMED in FOCUS_RETURN, so a trigger declared
    // in TasksScreen or ProfileScreen is invisible to it entirely.
    //
    // Counting the hook's call sites closes both: a new one fails until it is
    // declared, and declaring it forces it through (a), which requires all five
    // strings including onDismiss. The `.tsx` walk plus App.tsx is the same
    // census this file already builds, so nothing new has to be trusted.
    const HOOK = 'useSurfaceTrigger';
    const openers = new Set<string>(FOCUS_RETURN.map((d) => d.opener));
    let callSites = 0;
    for (const f of [...walkTsx(SRC), APP_TSX]) {
      const rel = path.relative(SRC, f);
      const src = stripComments(fs.readFileSync(f, 'utf8'));
      // `= useSurfaceTrigger` is the declaration form; the import alone is not a
      // call site, and neither is a mention inside a docblock (comments stripped).
      const hits = src.split(`= ${HOOK}`).length - 1;
      if (hits === 0) continue;
      callSites += hits;
      if (!openers.has(rel)) {
        offenders.push(`${rel} → declares ${HOOK} but is not an opener in FOCUS_RETURN`);
      }
    }
    if (callSites !== FOCUS_RETURN.length) {
      offenders.push(
        `${HOOK} → ${callSites} call site(s) for ${FOCUS_RETURN.length} declared surface(s); every adoption must be declared`,
      );
    }

    // The exemption drains rather than accumulates, same rule as ALLOWED.
    for (const e of FOCUS_RETURN_EXEMPT) {
      const hits = live.filter((s) => s.rel === e.rel && s.tag.includes(e.handler));
      if (hits.length !== 1) {
        offenders.push(`${e.rel} → exemption resolves to ${hits.length} live surfaces, expected 1`);
      }
    }

    expect(offenders).toEqual([]);
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
