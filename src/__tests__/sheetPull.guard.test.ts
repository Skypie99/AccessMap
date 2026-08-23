/**
 * THE PULL PRIMITIVE'S RAILS — the things that are true at a glance and wrong
 * six months later.
 *
 * SheetPull.test.tsx proves the gesture BEHAVES. This file proves the things
 * behaviour tests cannot see: that no sheet quietly lost its Close button once
 * "you can just swipe" became true, that a refactor did not tune a threshold
 * into meaninglessness, and that the gesture still routes through each
 * surface's own close handler instead of growing a second dismissal path.
 *
 * House idiom: static source scan (cf. dismissalStandard.guard.test.ts,
 * pageSheetSwipe.guard.test.ts).
 *
 * See design-reviews/map-gestures/2026-08-12/ SPEC §3.4.
 */
import fs from 'fs';
import path from 'path';
import {
  ACTIVATION_PT,
  COMMIT_FLOOR_PT,
  COMMIT_FRACTION,
  COMMIT_VELOCITY,
  COMMIT_VELOCITY_MIN_PT,
  FAIL_OFFSET_X,
} from '@/components/ui/SheetPull';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const PRIMITIVE = path.join(SRC, 'components', 'ui', 'SheetPull.tsx');


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

/**
 * Every surface that adopts the pull, DECLARED — so an adoption cannot land
 * half-wired. Asserted in both directions: a declared file must really import
 * the primitive, and a file that imports it without being declared FAILS. The
 * reverse direction is the one that matters, and it is why this list starting
 * empty is not a hole: the moment the first sheet adopts, it fails until it is
 * written down here and put through the checks below.
 *
 * `closeLabel` is the visible dismissal that must survive the gesture — Sky's
 * rule that gestures AUGMENT, never replace, expressed as a string this file
 * can actually look for.
 */
/**
 * `closeHandler` is the name the surface's OWN close path goes by. It is
 * `onClose` for every surface that has nothing to do before closing, and a named
 * wrapper for one that does — ReportFlagModal must discard the draft first
 * (SW-52: a cancelled report's photo was being published with the next one).
 * A wrapper is only accepted if it is a real named function that CALLS onClose,
 * which the assertion below checks; the thing being blocked has always been a
 * bespoke inline arrow that forks a second dismissal path, and that is still
 * blocked.
 */
const ADOPTERS: readonly { rel: string; closeLabel: string; closeHandler?: string }[] = [
  { rel: path.join('screens', 'ReportFlagModal.tsx'), closeLabel: 'Cancel and close', closeHandler: 'handleCancel' },
  { rel: path.join('components', 'FlagDetailModal.tsx'), closeLabel: 'Close flag details' },
  { rel: path.join('screens', 'LegendModal.tsx'), closeLabel: 'Close legend' },
  /*
   * THE SHARED SHEET (added 2026-08-22, art-direction Phase 3).
   *
   * The fourth adopter is not a surface, it is the PRIMITIVE — and that is the
   * point. `SheetHeader` draws the grabber, whose entire job is to advertise a
   * gesture (its own docblock says so), and the primitive wired nothing behind
   * it. On every `Sheet` consumer the pill was a promise the surface did not
   * keep: pull the bar the app just showed you and nothing happens.
   *
   * That was survivable while ChangelogModal and one Tasks sheet were the only
   * consumers. Phase 3 moved TEN more sheets in, which would have multiplied a
   * lying affordance elevenfold instead of fixing it.
   *
   * `closeLabel` is not a literal here for the same reason: the close button is
   * the primitive's own, and its label is composed (`Close ${title}`) or passed
   * by the consumer. The default expression is what this pins — deleting the
   * button is what the rule is guarding against, and the button cannot be
   * deleted from eleven surfaces at once without deleting this.
   */
  { rel: path.join('components', 'ui', 'Sheet.tsx'), closeLabel: 'closeLabel ?? `Close ${title}`' },
];

describe('SheetPull · the rails', () => {
  const primitiveSrc = stripComments(fs.readFileSync(PRIMITIVE, 'utf8'));

  it('the thresholds are real numbers in sane bands, not zeroes or infinities', () => {
    // The two failure shapes this blocks: a threshold refactored to 0 (the sheet
    // dismisses on the lightest touch — the trap) and one refactored huge (the
    // gesture is dead and nobody notices, because nothing errors).
    expect(ACTIVATION_PT).toBeGreaterThanOrEqual(8);
    expect(ACTIVATION_PT).toBeLessThanOrEqual(24);
    expect(COMMIT_FRACTION).toBeGreaterThan(0.15);
    expect(COMMIT_FRACTION).toBeLessThanOrEqual(0.5);
    expect(COMMIT_FLOOR_PT).toBeGreaterThanOrEqual(80);
    expect(COMMIT_FLOOR_PT).toBeLessThanOrEqual(200);
    expect(COMMIT_VELOCITY).toBeGreaterThanOrEqual(400);
    expect(COMMIT_VELOCITY).toBeLessThanOrEqual(1200);
    expect(COMMIT_VELOCITY_MIN_PT).toBeGreaterThan(0);
    expect(FAIL_OFFSET_X).toBeGreaterThan(0);
    // A flick must still travel less than a full deliberate drag, or the
    // velocity path is decorative.
    expect(COMMIT_VELOCITY_MIN_PT).toBeLessThan(COMMIT_FLOOR_PT);
  });

  it('the primitive gates its motion on the user preference', () => {
    expect(primitiveSrc).toContain('useReducedMotion');
    // Both settle paths have to branch, not just one: a spring-back that still
    // bounces under reduce-motion is the same violation as an animated exit.
    expect(primitiveSrc).toMatch(/if\s*\(reducedMotion\)/);
  });

  it('the primitive spends motion tokens, never bare durations', () => {
    // `duration: 180` would satisfy every other check here and silently drift
    // from DESIGN.md §8's scale.
    const bareDuration = /duration:\s*\d/.exec(primitiveSrc);
    expect(bareDuration?.[0] ?? null).toBeNull();
    expect(primitiveSrc).toContain('motion.duration.');
    expect(primitiveSrc).toContain('motion.spring.');
  });

  it('the drag runs on the native thread', () => {
    // useNativeDriver:false would still pass every behaviour test and every
    // other assertion here, while making the sheet stutter whenever JS is busy
    // — which, on the Report sheet, is exactly when flags are loading.
    expect(primitiveSrc).toContain('useNativeDriver: true');
    expect(primitiveSrc).not.toContain('useNativeDriver: false');
  });

  it('every adopter is declared, and every declared adopter really adopts', () => {
    const offenders: string[] = [];
    const declared = new Set(ADOPTERS.map((a) => a.rel));

    for (const file of walkTsx(SRC)) {
      const rel = path.relative(SRC, file);
      if (rel === path.join('components', 'ui', 'SheetPull.tsx')) continue;
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      // RENDERS the handler, not merely imports from its module. Twelve files
      // now import `useAtTop` from here — that hook mounts no gesture, it only
      // tells one whether the body is scrolled to its top, and treating an
      // import as an adoption would make this list a list of everything
      // (2026-08-22).
      if (!/<SheetPull[\s>/]/.test(src)) continue;
      if (!declared.has(rel)) {
        offenders.push(`${rel} → adopts SheetPull but is not declared in ADOPTERS`);
      }
    }
    for (const a of ADOPTERS) {
      const full = path.join(SRC, a.rel);
      if (!fs.existsSync(full)) {
        offenders.push(`${a.rel} → declared but the file does not exist`);
        continue;
      }
      if (!/<SheetPull[\s>/]/.test(stripComments(fs.readFileSync(full, 'utf8')))) {
        offenders.push(`${a.rel} → declared but does not adopt SheetPull`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the gesture routes through each surface OWN close handler', () => {
    // The same-handler law, inherited from dismissalStandard assertion B. A
    // bespoke arrow here would typecheck and render, and would quietly skip the
    // focus-return choreography (`release()` / `restore()`) that lives in
    // onClose — leaving a screen-reader user's cursor stranded after a swipe.
    //
    // A NAMED wrapper is allowed (see ADOPTERS) but does not get a free pass: it
    // has to be a real function in that file and it has to call onClose, so the
    // choreography is inherited rather than re-implemented. An inline arrow
    // still fails, which is the shape this rule was written against.
    const offenders: string[] = [];
    for (const a of ADOPTERS) {
      const src = stripComments(fs.readFileSync(path.join(SRC, a.rel), 'utf8'));
      const handler = a.closeHandler ?? 'onClose';
      if (!new RegExp(`onDismiss=\\{${handler}\\}`).test(src)) {
        offenders.push(`${a.rel} → SheetPull onDismiss is not the surface's ${handler}`);
      }
      if (a.closeHandler) {
        const decl = new RegExp(`const ${a.closeHandler} = \\([^)]*\\) => \\{([\\s\\S]*?)\\n  \\};`).exec(src);
        if (!decl) {
          offenders.push(`${a.rel} → ${a.closeHandler} is not a named function in this file`);
        } else if (!decl[1].includes('onClose()')) {
          offenders.push(`${a.rel} → ${a.closeHandler} does not call onClose()`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('NO adopter traded its close button for the gesture', () => {
    // Sky's rule as a test. It matters most for the people who never feel the
    // gesture at all: under VoiceOver the pull does not exist, so the button IS
    // the dismissal. Deleting it because "you can swipe now" would remove the
    // only door for the users this app is built for.
    const offenders: string[] = [];
    for (const a of ADOPTERS) {
      const src = stripComments(fs.readFileSync(path.join(SRC, a.rel), 'utf8'));
      if (!src.includes(a.closeLabel)) {
        offenders.push(`${a.rel} → lost its close affordance ("${a.closeLabel}")`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * THE GRABBER MUST NOT LIE (art-direction Phase 3, 2026-08-22).
 *
 * `SheetHeader` draws a pill whose only job is to advertise a drag. Phase 3
 * moved ten sheets onto the primitive, which handed ten more surfaces that
 * advertisement — so the primitive now wires `SheetPull` behind it, once, for
 * every adopter present and future.
 *
 * That fix has a hazard of its own, and it is the reason this suite grows
 * rather than the fix simply landing: `SheetPull` activates on a DOWNWARD drag
 * past its threshold. On a sheet whose body is scrolled away from its top, an
 * unwired pull would dismiss the sheet when the user meant to scroll back up.
 * `atTop` is what prevents it — the handler is `enabled={enabled && atTop}` —
 * and a consumer that forgets it turns a scroll into a dismissal.
 *
 * So: any `Sheet` consumer with a vertical scroller MUST pass `atTop`. This is
 * a wiring guard; whether the gesture FEELS right is a device row.
 */
describe('SheetPull · the shared Sheet keeps its grabber honest', () => {
  const SHEET_PRIMITIVE = path.join('components', 'ui', 'Sheet.tsx');
  /** Vertical scrollers. A horizontal one cannot fight this gesture — the pan
   *  declares `failOffsetX`, so a sideways drag never claims it. */
  const VERTICAL = /<(ScrollView|FlatList|SectionList|VirtualizedList)\b(?![^>]*\bhorizontal\b)/;

  it('the primitive wires the gesture to its own onClose', () => {
    const src = stripComments(fs.readFileSync(path.join(SRC, SHEET_PRIMITIVE), 'utf8'));
    expect(src).toContain('<SheetPull');
    expect(src).toContain('onDismiss={onClose}');
    // …and it hands the consumer the two controls that make it safe.
    expect(src).toContain('atTop={atTop}');
    expect(src).toContain('simultaneousHandlers={scrollRef}');
  });

  it('every Sheet consumer with a vertical scroller passes atTop', () => {
    // Scoped to the SHEET's own span, not the file's. TasksScreen renders two
    // Sheets that hold no scroller of their own while the screen behind them
    // is a SectionList — a file-wide scan reads that as a hazard and it is not
    // one. `atTop` defaults to true, which is correct for a sheet whose body
    // cannot scroll away from its top.
    const offenders: string[] = [];
    for (const file of walkTsx(SRC)) {
      const rel = path.relative(SRC, file);
      if (rel === SHEET_PRIMITIVE) continue;
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      for (const m of src.matchAll(/<Sheet[\s>/]/g)) {
        const open = m.index as number;
        const close = src.indexOf('</Sheet>', open);
        // A self-closing or unmatched Sheet has no body to scroll.
        if (close === -1) continue;
        const span = src.slice(open, close);
        if (!VERTICAL.test(span)) continue;
        if (!/\batTop=\{/.test(span)) {
          offenders.push(
            `${rel} → a <Sheet> with a vertical scroller in its body never ` +
              `passes atTop. A downward drag partway down that content will ` +
              `DISMISS the sheet instead of scrolling back up. Wire useAtTop().`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('and the census is not vacuous — the estate really does adopt Sheet', () => {
    let consumers = 0;
    for (const file of walkTsx(SRC)) {
      if (path.relative(SRC, file) === SHEET_PRIMITIVE) continue;
      if (/<Sheet[\s>/]/.test(stripComments(fs.readFileSync(file, 'utf8')))) consumers++;
    }
    // 12 at the time of writing (10 adopted in Phase 3 + Changelog + Tasks).
    expect(consumers).toBeGreaterThanOrEqual(10);
  });
});
