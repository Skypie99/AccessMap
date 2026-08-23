/**
 * FOCUS-IN STANDARD (A11Y-201 / SR-070) — every dismissable surface moves the
 * screen-reader cursor IN when it presents.
 *
 * House doctrine (src/lib/accessibility.ts → useFocusOnOpen): without an
 * explicit focus move, opening a <Modal> leaves the SR cursor stranded on the
 * control behind it — the user does not know the surface appeared (WCAG 2.4.3
 * Focus Order). G5 wired the RETURN half (focus back to the trigger on
 * dismissal, guard J); this guard pins the ENTRY half, which ship-ready found
 * (SR-070), deferred with reason, and this train closed.
 *
 * Census idiom borrowed from dismissalStandard.guard.test.ts: the surface list
 * is PARSED OUT OF THE SOURCE on every run, so a new <Modal> enters the
 * standard automatically and fails visibly if its file never adopts the hook.
 *
 * WHAT THIS PROVES AND WHAT IT CANNOT. It proves every file with live modal
 * surfaces contains at least as many useFocusOnOpen call sites as surfaces
 * (minus the documented exemptions below). It does NOT prove the returned ref
 * is attached to the right element, nor that the cursor lands — react-native-web
 * stubs setAccessibilityFocus to an empty body, so landing is device-script
 * territory (rows N-6/N-7). Same stated blind-spot class as guard J.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SELF = path.resolve(__filename);
const SRC = path.join(__dirname, '..'); // -> src/


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
  rel: string;
  line: number;
  tag: string;
}

/** Every live <Modal> open tag (dead visible={false} stubs excluded). */
function liveSurfacesByFile(): Map<string, { surfaces: Surface[]; src: string }> {
  const files = walkTsx(SRC).filter((f) => path.resolve(f) !== SELF);
  const byFile = new Map<string, { surfaces: Surface[]; src: string }>();
  for (const file of files) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const rel = path.relative(SRC, file);
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
      const tag = src.slice(i, j + 1);
      if (tag.includes('visible={false}')) continue; // dead stub (dismissal-guard ALLOWED)
      if (!byFile.has(rel)) byFile.set(rel, { surfaces: [], src });
      byFile.get(rel)!.surfaces.push({ rel, line: src.slice(0, i).split('\n').length, tag });
    }
  }
  return byFile;
}

/**
 * Surfaces whose focus-in is provided by a DIFFERENT mechanism than a
 * useFocusOnOpen call in their own file. Anchored on tag markers, never line
 * numbers; a stale entry FAILS (must match exactly one live surface) rather
 * than rotting into a silent hole — the dismissal-standard convention.
 */
const ALLOWED: { rel: string; marker: string; why: string }[] = [
  {
    rel: 'components/AddressSearchModal.tsx',
    marker: 'aria-label="Search by address"',
    why:
      'The autoFocus search input takes first responder on present — the OS ' +
      'moves SR focus with the keyboard. A title-yank 150ms later would FIGHT ' +
      'the input focus this surface exists for.',
  },
  {
    rel: 'screens/MapScreen.tsx',
    marker: 'aria-label="Name this preset"',
    why: 'autoFocus TextInput prompt — same rationale as AddressSearchModal.',
  },
  {
    rel: 'screens/MapScreen.tsx',
    marker: 'aria-label="Name this filter"',
    why: 'autoFocus TextInput prompt — same rationale as AddressSearchModal.',
  },
  {
    rel: 'screens/ProfileScreen.tsx',
    marker: 'aria-label="Sign in"',
    why:
      'The wrapper presents <SignInScreen>, which runs its own ' +
      'useFocusOnOpen on mount (the same component is the root auth wall, ' +
      'where no wrapper exists to do it).',
  },
];

/**
 * DELEGATED SURFACES (added 2026-08-22, art-direction Phase 3).
 *
 * Ten sheets moved their shell into `components/ui/Sheet.tsx`, which runs the
 * focus-in hook ONCE for all of them. Two consequences, and they pull in
 * opposite directions, so both are handled explicitly rather than by lowering a
 * number:
 *
 *  1. Those files correctly no longer call `useFocusOnOpen`, and they correctly
 *     no longer appear in the <Modal> census — the per-file rule below is
 *     satisfied by their absence, which is right.
 *  2. The TRIPWIRE is not. It counts surfaces to notice a parser break or a
 *     mass deletion, and ten surfaces leaving at once is exactly what it should
 *     shout about. So it counts `<Sheet>` consumers too, and the estate stays
 *     the size it actually is.
 *
 * Plus one assertion the suite never had: that the primitive itself runs the
 * hook. Ten surfaces' focus-in now hangs off that single call.
 */
const SHEET_PRIMITIVE = path.join('components', 'ui', 'Sheet.tsx');

function delegatedCount(): number {
  let n = 0;
  for (const file of walkTsx(SRC)) {
    if (path.resolve(file) === SELF) continue;
    const rel = path.relative(SRC, file);
    if (rel === SHEET_PRIMITIVE) continue;
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    n += [...src.matchAll(/<Sheet[\s>/]/g)].length;
  }
  return n;
}

describe('focus-in standard — every dismissable moves the SR cursor in on open', () => {
  const byFile = liveSurfacesByFile();

  it('census parser found the estate (parser-rot tripwire)', () => {
    const modals = [...byFile.values()].reduce((n, v) => n + v.surfaces.length, 0);
    const total = modals + delegatedCount();
    // 36 live surfaces at adoption time (2026-07-31). Shrinkage below 30 means
    // the parser broke or a mass deletion happened — either way, look.
    expect(total).toBeGreaterThanOrEqual(30);
    // Neither half may empty out unnoticed.
    expect(modals).toBeGreaterThanOrEqual(20);
    expect(delegatedCount()).toBeGreaterThanOrEqual(10);
  });

  it('the primitive every delegated surface leans on runs the hook itself', () => {
    // Without this, `Sheet` could drop useFocusOnOpen and ten surfaces would
    // lose focus-in while this suite stayed green — because they no longer
    // appear in the census at all.
    const src = stripComments(fs.readFileSync(path.join(SRC, SHEET_PRIMITIVE), 'utf8'));
    expect(src).toMatch(/useFocusOnOpen\s*[<(]/);
    // Presence is not placement, and placement is what makes it work: the ref
    // has to reach the title AppText, which is where the cursor should land.
    expect(src).toContain('titleRef={titleRef}');
    expect(src).toContain('ref={titleRef}');
  });

  it('every ALLOWED entry still matches exactly one live surface', () => {
    for (const a of ALLOWED) {
      const info = byFile.get(a.rel);
      const hits = (info?.surfaces ?? []).filter((s) => s.tag.includes(a.marker));
      if (hits.length !== 1) {
        throw new Error(
          `ALLOWED entry for ${a.rel} (marker ${a.marker}) matched ${hits.length} live ` +
            `surfaces — the exemption is stale. Fix or remove it.\nReason it existed: ${a.why}`,
        );
      }
    }
  });

  it('each file has at least as many useFocusOnOpen call sites as non-exempt live surfaces', () => {
    const failures: string[] = [];
    for (const [rel, { surfaces: s, src }] of [...byFile.entries()].sort()) {
      const exempt = ALLOWED.filter(
        (a) => a.rel === rel && s.some((x) => x.tag.includes(a.marker)),
      ).length;
      const required = s.length - exempt;
      if (required <= 0) continue;
      // Call sites, not imports: `useFocusOnOpen(` or `useFocusOnOpen<T>(`.
      const calls = (src.match(/useFocusOnOpen\s*[<(]/g) ?? []).length;
      if (calls < required) {
        failures.push(
          `${rel}: ${s.length} live modal surface(s) at line(s) ${s
            .map((x) => x.line)
            .join(', ')}, ${exempt} exempt, but only ${calls} useFocusOnOpen call site(s). ` +
            `Adopt useFocusOnOpen (attach its ref to the surface title) or add a ` +
            `documented ALLOWED entry with the mechanism that replaces it.`,
        );
      }
    }
    if (failures.length) {
      throw new Error(`Focus-in standard violations:\n\n${failures.join('\n\n')}`);
    }
  });
});
