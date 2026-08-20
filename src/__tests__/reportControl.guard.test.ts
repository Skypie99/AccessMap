/**
 * THE MODERATION-CONTROL CENSUS — Report (Apple 1.2(b)), Hide (1.2(c)) and W1's
 * "Flag as wrong", checked across the WHOLE production tree instead of at three
 * known anchors.
 *
 * WHY THIS EXISTS WHEN TWO SIBLING GUARDS ALREADY DO. commentHide.guard.test and
 * disputeControl.guard.test each pin ONE feature, deeply, at hardcoded anchors in
 * files they name. That shape cannot see a FOURTH surface. It is the shape that
 * let SR-092 ship as two identical bugs: the fault was fixed where somebody
 * happened to be looking, and the second call site was never enumerated, because
 * nothing enumerated anything (J2-3). This file enumerates. It walks src/, works
 * out for itself which files carry a moderation control, and applies the same
 * rules to every one it finds — so a surface added next month is AUTO-ENROLLED
 * and fails until it obeys, rather than quietly not being checked.
 *
 * WHAT IT PINS
 *   1. Every moderation surface reads its label from copy.ts and never a bare
 *      literal — so Sky's §A / BP16 rewording stays a one-line change.
 *   2. ONE encoder. `buildReportBody` has exactly two call-site files and
 *      `REPORT_BODY_PREFIX` is declared once, so no second hand-rolled envelope
 *      can drift from the parser that has to read it back.
 *   3. THE THREE LABELS ARE PAIRWISE DISTINCT. Sky corrected an agent for
 *      collapsing these controls (DECISIONS.md §SKY-3c); this is that correction
 *      made machine-checkable, restated where a reader of the census will meet it.
 *   4. THE WCAG TRIPWIRE. CommentBubble's composite-label derivation must account
 *      for EVERY action prop the component declares. Get it wrong and the failure
 *      is silent and total: a perfectly drawn button that VoiceOver cannot reach.
 *   5. One path to the sheet — both entry points go through the single
 *      `reportTarget` state, and the sheet cannot bypass the report pipeline.
 *
 * THE "Report" COLLISION, RECORDED ON PURPOSE. This app shows the word "Report"
 * in FOUR places under TWO unrelated meanings: the Apple 1.2(b) abuse control
 * (this feature), and the flag-CREATION verb on HomeScreen's pill and MapScreen's
 * FAB, which have shipped for months. The census would fail open if it ignored
 * them and fail wrongly if it demanded they single-source, so the boundary is
 * asserted explicitly below — including the assertion that the create verb must
 * NOT read REPORT_CONTROL_LABEL. Wiring them together "for consistency" is the
 * trap: Sky's rewording of the abuse control in BP16 would then silently rename
 * the button that creates a flag.
 *
 * SOURCE-SCAN IDIOM, cf. privacyLink.guard.test.ts: nothing is mounted. What is
 * being checked is wiring and single-sourcing across files, which no render test
 * can see — a render test of one surface cannot notice that a second surface
 * exists.
 */
import fs from 'fs';
import path from 'path';

import {
  DISPUTE_CONTROL_LABEL,
  HIDE_CONTROL_LABEL,
  REPORT_CONTROL_LABEL,
} from '@/lib/copy';

const SRC = path.resolve(__dirname, '..');

/** Every production .ts/.tsx under src/. Tests, mocks and fixtures excluded. */
function productionFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        // Test the directory's own name, not the joined absolute path — a checkout
        // under .claude/worktrees/ would otherwise skip all of src/.
        if (!/^(__tests__|__mocks__|node_modules)$/.test(e.name)) walk(p);
      } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
        out.push(path.relative(SRC, p).split(path.sep).join('/'));
      }
    }
  };
  walk(SRC);
  return out.sort();
}

const FILES = productionFiles();
const SOURCE = new Map(FILES.map((f) => [f, fs.readFileSync(path.join(SRC, f), 'utf8')]));
const read = (rel: string): string => {
  const src = SOURCE.get(rel);
  if (src === undefined) throw new Error(`not a production file: ${rel}`);
  return src;
};

/** Slice from `start` to the first `end` after it — a scope, not a char budget. */
function between(src: string, start: string, end: string): string {
  const i = src.indexOf(start);
  if (i < 0) throw new Error(`anchor not found: ${start}`);
  const j = src.indexOf(end, i + start.length);
  if (j < 0) throw new Error(`closing anchor not found: ${end} (after ${start})`);
  return src.slice(i, j);
}

/**
 * Lines that are prose, dropped. DELIBERATELY LINE-BASED, NOT A REGEX COMMENT
 * STRIPPER — the same reasoning disputeControl.guard.test.ts records: the usual
 * `replace(block).replace(line)` recipe knows nothing about string literals, and
 * FlagDetailModal contains one whose tail opens a comment that recipe will run
 * for hundreds of lines. A guard that can blank its own subject fails OPEN.
 * Dropping whole comment lines cannot delete code.
 */
const codeLines = (s: string): string =>
  s
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');

/** Named imports pulled from one module, across multi-line import blocks. */
function namedImportsFrom(src: string, module: string): string[] {
  const names: string[] = [];
  const re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${module.replace('/', '\\/')}'`, 'g');
  for (const m of src.matchAll(re)) {
    for (const raw of m[1].split(',')) {
      const n = raw.trim().split(/\s+as\s+/)[0].trim();
      if (n) names.push(n);
    }
  }
  return names;
}

/** The file with its brace-import blocks removed, so an unused import proves nothing. */
const withoutImports = (src: string): string =>
  src.replace(/import\s*\{[^}]*\}\s*from\s*'[^']*';/g, '');

/** The three control labels, by the constant that owns each one. */
const CONTROLS = [
  ['REPORT_CONTROL_LABEL', REPORT_CONTROL_LABEL],
  ['HIDE_CONTROL_LABEL', HIDE_CONTROL_LABEL],
  ['DISPUTE_CONTROL_LABEL', DISPUTE_CONTROL_LABEL],
] as const;

/**
 * Where a bare literal would be a defect: as a JSX text node, or as an
 * accessible NAME. Built from the constants' VALUES, so when Sky rewords a
 * control in BP16 the census immediately polices the NEW word instead of
 * silently going on guarding the old one.
 */
function bareLiteralUses(src: string, word: string): string[] {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shapes: [string, RegExp][] = [
    ['JSX text node', new RegExp(`>\\s*${esc}\\s*<`)],
    ['accessibilityLabel', new RegExp(`accessibilityLabel=\\{?["']${esc}["']`)],
    ['aria-label', new RegExp(`aria-label=\\{?["']${esc}["']`)],
  ];
  return shapes.filter(([, re]) => re.test(src)).map(([name]) => name);
}

/** A moderation surface is any production file that IMPORTS a control label. */
const SURFACES = FILES.filter((f) =>
  namedImportsFrom(read(f), '@/lib/copy').some((n) => CONTROLS.some(([c]) => c === n)),
);

/**
 * The flag-CREATION "Report", which predates this feature and means something
 * else entirely. Listed, not ignored — see the collision note in the header.
 */
const CREATE_VERB_SURFACES = ['screens/HomeScreen.tsx', 'screens/MapScreen.tsx'];

/** Every (surface, control) pair the census discovered — the it.each matrix. */
const SURFACE_CONTROLS: [string, string, string][] = SURFACES.flatMap((f) =>
  CONTROLS.filter(([c]) => namedImportsFrom(read(f), '@/lib/copy').includes(c)).map(
    ([c, word]): [string, string, string] => [f, c, word],
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// 0 — the census is not vacuous
//
// Every describe below runs over a DISCOVERED list. A walk that silently found
// nothing (a moved directory, a tightened exclude) would make this whole file
// pass while checking exactly zero things, which is the one failure mode a
// census has that a hardcoded-anchor guard does not.
// ─────────────────────────────────────────────────────────────────────────────
describe('0 — the census found its subjects', () => {
  it('the walk reaches a real tree', () => {
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES).toContain('lib/copy.ts');
    expect(FILES).toContain('components/FlagDetailModal.tsx');
    // …and excludes the tests that scan it, or the counts below would be noise.
    expect(FILES.some((f) => f.includes('__tests__'))).toBe(false);
  });

  it('the moderation surfaces are exactly the three that ship a control today', () => {
    // THE CENSUS LINE. A new surface must be added here consciously — and it is
    // enrolled in every per-surface rule below the moment it imports a label,
    // whether or not anyone remembers to update this list.
    expect(SURFACES).toEqual([
      'components/CommentBubble.tsx',
      'components/FlagDetailModal.tsx',
      'components/ReportContentModal.tsx',
    ]);
  });

  it('the matrix has a row per control per surface', () => {
    // FlagDetailModal carries Report + Flag as wrong; CommentBubble carries
    // Report + Hide; ReportContentModal reuses Report as its own title.
    expect(SURFACE_CONTROLS).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1 — every label is single-sourced
// ─────────────────────────────────────────────────────────────────────────────
describe('1 — every moderation surface reads its label from copy.ts', () => {
  it.each(SURFACE_CONTROLS)('%s renders %s, not a hardcoded word', (rel, constant) => {
    // Present OUTSIDE the import block: an unused import single-sources nothing.
    expect(withoutImports(read(rel))).toContain(constant);
  });

  it.each(SURFACE_CONTROLS)('%s never writes %s\'s word as a literal', (rel, _c, word) => {
    // Sky's final wording lands in DECISIONS §A / BP16 as a one-line edit to
    // copy.ts. One literal anywhere forks the string and the edit stops working.
    expect(bareLiteralUses(read(rel), word)).toEqual([]);
  });

  it.each(SURFACES)('%s carries no accessibilityHint on a moderation control', (rel) => {
    // THE HONESTY FENCE, as a whole-surface rule. Every hint that would actually
    // help on one of these controls ("we'll review this", "this removes it",
    // "marks the flag disputed") is a moderation promise or an unshipped
    // outcome. A missing hint is NOT a WCAG failure — the accessible NAME
    // carries the meaning. Scoped to the Pressable that owns the label, so the
    // surrounding surface keeps every hint it already ships.
    const src = read(rel);
    for (const [constant] of CONTROLS) {
      let from = 0;
      for (;;) {
        const at = src.indexOf(`accessibilityLabel={${constant}`, from);
        if (at < 0) break;
        // The control's own props end at its closing `>`.
        const close = src.indexOf('>', at);
        expect(src.slice(at, close)).not.toContain('accessibilityHint');
        from = at + 1;
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 — the word "Report" means two things, and they stay apart
// ─────────────────────────────────────────────────────────────────────────────
describe('2 — the create-a-flag "Report" is a different control, and stays one', () => {
  it.each(CREATE_VERB_SURFACES)('%s still shows the flag-creation verb', (rel) => {
    // Recorded so the collision is visible rather than discovered by surprise.
    // Both disambiguate in the accessible NAME already ("Report a barrier",
    // "Report a flag here"), so the clash is visual only.
    expect(read(rel)).toMatch(/>\s*Report\s*</);
  });

  it.each(CREATE_VERB_SURFACES)('%s does NOT read the abuse label (%#)', (rel) => {
    // THE TRAP. Single-sourcing these "for consistency" would mean Sky's BP16
    // rewording of the 1.2(b) control silently renames the button that creates
    // a flag. Different meaning, different string, on purpose.
    expect(namedImportsFrom(read(rel), '@/lib/copy')).not.toContain('REPORT_CONTROL_LABEL');
    expect(SURFACES).not.toContain(rel);
  });

  it('no OTHER production file carries a bare moderation literal', () => {
    // The fail-closed half. A new surface that hardcodes one of the three words
    // is caught here even though it imports nothing and enrolls nowhere.
    const known = new Set([...SURFACES, ...CREATE_VERB_SURFACES]);
    const offenders = FILES.filter((f) => !known.has(f)).flatMap((f) =>
      CONTROLS.flatMap(([, word]) =>
        bareLiteralUses(read(f), word).map((shape) => `${f}: ${word} as ${shape}`),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 — ONE encoder (the J2-3 / SR-092 lesson)
// ─────────────────────────────────────────────────────────────────────────────
describe('3 — there is exactly one report envelope', () => {
  it('buildReportBody is called from exactly two production files', () => {
    // The module that owns it, and the surface that submits. A third call site
    // is the shape SR-092 shipped in: fix one, miss the other, ship two
    // identical bugs. `parseReportBody` has to read back whatever any of them
    // wrote, so a hand-rolled third encoder is a parser bug waiting for a row.
    const callers = FILES.filter((f) => /\bbuildReportBody\s*\(/.test(codeLines(read(f))));
    expect(callers).toEqual(['components/ReportContentModal.tsx', 'lib/reports.ts']);
  });

  it('both call sites hand it a ReportTarget — neither builds a header by hand', () => {
    // `[REPORT] v1 target=…` assembled anywhere but inside buildReportBody is a
    // second encoder wearing the first one's clothes.
    const handRolled = FILES.filter((f) =>
      /\[REPORT\]\s*v\d/.test(codeLines(read(f)).replace(/HEADER_RE[\s\S]{0,200}/, '')),
    );
    expect(handRolled).toEqual([]);
  });

  it('REPORT_BODY_PREFIX is declared exactly once', () => {
    const declarers = FILES.filter((f) => /export const REPORT_BODY_PREFIX\b/.test(read(f)));
    expect(declarers).toEqual(['lib/reports.ts']);
  });

  it('no file outside reports.ts writes the sentinel as a literal', () => {
    const offenders = FILES.filter(
      (f) => f !== 'lib/reports.ts' && /['"`]\[REPORT\]/.test(codeLines(read(f))),
    );
    expect(offenders).toEqual([]);
  });

  it('the prose stripper drops comments, not the subject', () => {
    // Three assertions above run through codeLines and are absence-checks: they
    // would all pass vacuously if it returned an empty string.
    const code = codeLines(read('lib/reports.ts'));
    expect(code).toContain('export function buildReportBody');
    expect(code.length).toBeGreaterThan(read('lib/reports.ts').length / 4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4 — the three controls are three controls
// ─────────────────────────────────────────────────────────────────────────────
describe('4 — the labels are pairwise distinct (§SKY-3c, restated here)', () => {
  /*
   * SKY'S GOVERNING STATEMENT, verbatim from DECISIONS.md §SKY-3c: the three
   * controls are DISTINCT AND MUST NOT BE COLLAPSED. She caught an agent
   * offering "Hide" as a wording for the report control and put the correction
   * on the record. They answer three different questions:
   *
   *   "Flag as wrong" — is this flag ACCURATE?      (W1, product judgement)
   *   "Report"        — is this content ABUSIVE?    (Apple 1.2(b))
   *   "Hide"          — do I want to SEE this?      (Apple 1.2(c), device-local)
   *
   * This is the correction made machine-checkable, sitting where a reader of the
   * census will meet it. Do not weaken it.
   */
  const LABELS = CONTROLS.map(([, word]) => word);

  it('no two labels are the same word', () => {
    expect(new Set(LABELS.map((l) => l.trim().toLowerCase())).size).toBe(LABELS.length);
  });

  it('no label contains another — "Report" vs "Report abuse" is one control, not two', () => {
    const collapses = LABELS.flatMap((a) =>
      LABELS.filter((b) => b !== a && a.toLowerCase().includes(b.toLowerCase())).map(
        (b) => `${JSON.stringify(a)} contains ${JSON.stringify(b)}`,
      ),
    );
    expect(collapses).toEqual([]);
  });

  it('every label is a real word, and each is marked PROPOSED in copy.ts', () => {
    for (const [constant, word] of CONTROLS) {
      expect(word.trim()).not.toBe('');
      // The honesty fence: none of these is final until Sky's §A pass. The
      // JSDoc that says so must survive any edit to the constant it documents.
      const doc = between(read('lib/copy.ts'), '/**', `export const ${constant}`);
      expect(doc).toContain("Sky's final wording lands in DECISIONS §A / BP16.");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5 — THE WCAG TRIPWIRE
// ─────────────────────────────────────────────────────────────────────────────
describe('5 — CommentBubble counts EVERY action in its composite label', () => {
  /*
   * `accessible={true}` on the row collapses every descendant into ONE VoiceOver
   * node, and a child Pressable inside a collapsed node cannot be reached or
   * activated AT ALL. So the row may be composite only when it renders no
   * action. This derivation was once spelled `!onDelete` — correct only while
   * delete was the only action. Left that way, Report and Hide would have drawn
   * perfectly and been invisible to screen readers: no crash, no failing render
   * test, no visual difference. That exact regression is what this pins.
   *
   * Derived from the PROPS INTERFACE rather than from a list of three names, so
   * a fourth action auto-enrols and fails until it is counted.
   */
  const BUBBLE = 'components/CommentBubble.tsx';
  const bubble = read(BUBBLE);

  const ACTION_PROPS = [
    ...between(bubble, 'interface CommentBubbleProps {', '\n}').matchAll(
      /^\s*(on[A-Z]\w*)\?:/gm,
    ),
  ].map((m) => m[1]);

  const compositeExpr = (() => {
    const m = /const useCompositeLabel = ([^;]+);/.exec(bubble);
    if (!m) throw new Error(`useCompositeLabel derivation not found in ${BUBBLE}`);
    return m[1].trim();
  })();

  const gateOf = (prop: string) => `show${prop.slice(2)}`;

  it('the interface still declares the actions this rule is about', () => {
    // Anti-vacuity: the it.each below runs zero cases if the parse silently
    // returns nothing, and a zero-case it.each is a green test that checks air.
    // FOUR as of 2026-08-18 — Block (Apple 1.2(c)) joined the row. The census is
    // ordered by declaration, and the rule this guard protects is that EVERY
    // action prop is counted by `useCompositeLabel`; a fifth must land here too.
    expect(ACTION_PROPS).toEqual(['onDelete', 'onReport', 'onHide', 'onBlock']);
  });

  it('the old single-action spelling is gone', () => {
    // The literal regression, named. `= !onDelete;` is the derivation that made
    // the row composite whenever delete was absent — i.e. on exactly the rows
    // Report and Hide ship on.
    expect(bubble).not.toContain('= !onDelete;');
  });

  it.each(
    // it.each needs a non-empty list to assert anything; the guard above pins it.
    ACTION_PROPS.map((p): [string, string] => [p, gateOf(p)]),
  )('%s has a %s gate that also decides ownership', (prop, gate) => {
    expect(bubble).toMatch(new RegExp(`const ${gate} = [^;]*!!${prop};`));
    // Every action on this row is ownership-scoped: Delete on your own comment,
    // Report and Hide on everybody else's. A gate that ignores isOwn would put
    // "Report" on your own bubble, or Delete on someone else's.
    expect(bubble).toMatch(new RegExp(`const ${gate} = [^;]*isOwn[^;]*;`));
  });

  it('the composite flag is exactly the conjunction of every gate', () => {
    // Both directions matter. A MISSING term draws an unreachable button; an
    // EXTRA term makes a bubble non-composite with no button to show for it,
    // losing its one clean read for nothing.
    const terms = compositeExpr.split('&&').map((t) => t.trim()).sort();
    expect(terms).toEqual(ACTION_PROPS.map((p) => `!${gateOf(p)}`).sort());
  });

  it('the visible label branches on isOwn, never on which action is present', () => {
    // Report ships on OTHER people's comments. A label keyed on the action would
    // say "Your comment" there — a lie about authorship, told only to
    // screen-reader users.
    const m = /const textNodeLabel = ([\s\S]*?);\n/.exec(bubble);
    expect(m).not.toBeNull();
    const expr = m![1];
    expect(expr).toContain('isOwn');
    for (const prop of ACTION_PROPS) expect(expr).not.toContain(prop);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 — one path to the sheet, one pipeline under it
// ─────────────────────────────────────────────────────────────────────────────
describe('6 — both entry points reach the sheet through one state', () => {
  const HOST = 'components/FlagDetailModal.tsx';
  const modal = read(HOST);

  it('ReportContentModal is mounted in exactly one production file', () => {
    const hosts = FILES.filter((f) => /<ReportContentModal\b/.test(read(f)));
    expect(hosts).toEqual([HOST]);
  });

  it('the flag pill and the comment row both set the SAME reportTarget', () => {
    const setters = [...modal.matchAll(/setReportTarget\(\{[\s\S]*?\}\)/g)].map((m) => m[0]);
    expect(setters).toHaveLength(2);
    // One per target kind — and nothing else opens the sheet.
    expect(setters.filter((s) => s.includes("kind: 'flag'"))).toHaveLength(1);
    expect(setters.filter((s) => s.includes("kind: 'comment'"))).toHaveLength(1);
    // The comment report carries its parent flag: C-8 deletes by comment id, but
    // the flag id is what survives if the comment is gone before triage reads it.
    expect(setters.find((s) => s.includes("kind: 'comment'"))).toContain('flagId:');
  });

  it('visibility is DERIVED from the target — there is no second boolean', () => {
    // "cleared target" and "closed sheet" must be ONE fact. A parallel `open`
    // flag is how a sheet ends up visible with a null target, or holding the
    // previous comment's id.
    expect(modal).toContain('visible={reportTarget !== null}');
    expect(modal).toContain('target={reportTarget}');
    expect(modal).not.toMatch(/const \[report(Open|Visible|Sheet|Modal)\b/);
  });

  it('no undeclared second report path exists', () => {
    const importers = FILES.filter((f) =>
      namedImportsFrom(read(f), '@/lib/reports').includes('submitContentReport'),
    );
    expect(importers).toEqual(['components/ReportContentModal.tsx']);
  });

  it('the sheet submits through the pipeline and cannot bypass the envelope', () => {
    // It reaches the DB through submitContentReport (which maps feedbackStore's
    // 'skipped' to a FAILURE) and the mailto half through sendFeedback carrying
    // the same buildReportBody envelope. A direct submitFeedback or supabase
    // call would file an un-prefixed row that triage cannot find and
    // parseReportBody cannot read.
    const sheet = read('components/ReportContentModal.tsx');
    expect(namedImportsFrom(sheet, '@/lib/reports')).toEqual(
      expect.arrayContaining(['submitContentReport', 'buildReportBody']),
    );
    expect(sheet).not.toContain('submitFeedback');
    expect(sheet).not.toMatch(/from '@\/lib\/feedbackStore'/);
    expect(sheet).not.toMatch(/from '@\/lib\/supabase'/);
  });
});
