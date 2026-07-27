/**
 * W1 — "Flag as wrong", as a set of source invariants.
 *
 * WHY A SOURCE SCAN. The failures worth catching here are not "did the pill
 * draw". They are placement, gating and honesty failures that a render test
 * would report as green:
 *
 *   · the pill drifting into the secondary row next to Report — the exact
 *     collapse of accuracy and abuse that §SKY-3c corrects;
 *   · the dedup check dropped or moved after the RPC, which at
 *     DISPUTE_THRESHOLD = 2 lets ONE person carry any flag to the threshold by
 *     reopening the sheet and pressing again;
 *   · the per-device record written on a vote the server discarded, burning
 *     this device's only vote on a no-op;
 *   · a `null` or `0` answer reported as success — the F38 lie, which the
 *     reopen flow this one mirrors still tells on its own null branch;
 *   · the count leaking into the UI as a countdown to a `Disputed` badge that
 *     is not shipped on any surface;
 *   · a guest-visible pill, whose every press is a guaranteed 42501 because the
 *     RPC is granted to `authenticated` only (the SR-093 dead-control class).
 *
 * SCOPE, STATED PLAINLY: this ships the CONTROL and the counter. It does not
 * ship a `Disputed` treatment — `dispute_requests` is absent from `FlagRow` and
 * from every select() in flags.ts, so nothing can read it. The last describe
 * pins that gap open rather than letting a future reader assume W1 is closed.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const modal = read('components/FlagDetailModal.tsx');
const copy = read('lib/copy.ts');

/**
 * Lines that are prose, dropped. Several invariants below are about the ABSENCE
 * of a symbol, and both this file and the files it scans name every symbol they
 * forbid — in comments explaining why it is forbidden.
 *
 * DELIBERATELY LINE-BASED, NOT A REGEX COMMENT STRIPPER. The obvious
 * `replace(block).replace(line)` recipe — the one dismissalStandard.guard.test,
 * dynamicTypeGuard.test and postgrestEmbed.guard.test all use — does not know
 * about string literals, and FlagDetailModal contains a web MIME filter string
 * whose last two characters open a comment that recipe will happily run for
 * hundreds of lines. A guard that can blank half its own subject fails OPEN,
 * which is the one way a guard must never fail. Dropping whole comment lines
 * cannot delete code, so the worst case here is a missed comment, not a missed
 * violation.
 */
const codeLines = (s: string): string =>
  s
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');

/** Slice from `start` to the first `end` after it — a scope, not a char budget. */
function between(src: string, start: string, end: string): string {
  const i = src.indexOf(start);
  if (i < 0) throw new Error(`anchor not found: ${start}`);
  const j = src.indexOf(end, i + start.length);
  if (j < 0) throw new Error(`closing anchor not found: ${end} (after ${start})`);
  return src.slice(i, j);
}

describe('W1 — the pill sits in the TRIAGE row, not beside Report (§SKY-3c)', () => {
  it('the control is inside the footer actionRow', () => {
    // The triage row opens AFTER the body ScrollView closes, so the render half
    // of it is everything from that tag to the end of the JSX.
    const open = modal.indexOf('<View style={styles.actionRow}>');
    expect(open).toBeGreaterThan(modal.indexOf('</ScrollView>'));
    const triage = between(modal, '<View style={styles.actionRow}>', 'const makeStyles');
    expect(triage).toContain('styles.disputeBtn');
    // …and it keeps the company §SKY-3c assigns it.
    expect(triage).toContain('styles.verifyBtn');
    expect(triage).toContain('styles.resolveBtn');
    expect(triage).toContain('styles.rejectBtn');
  });

  it('the secondary row is untouched — Report stays the only moderation pill there', () => {
    const secondary = between(modal, '<View style={styles.secondaryRow}>', 'styles.commentsSection');
    expect(secondary).toContain('{REPORT_CONTROL_LABEL}');
    expect(secondary).not.toMatch(/dispute/i);
    expect(secondary).not.toContain('DISPUTE_CONTROL_LABEL');
  });

  it('the three controls remain three separate treatments, in three places', () => {
    // Report: recessive muted outline in the secondary row.
    expect(modal).toContain('borderColor: color.inkGlassMuted');
    // Flag as wrong: the reopen dialect, in the triage row.
    expect(modal).toContain('disputeBtn: {');
    // Hide is not on this surface at all — it is per comment row.
    expect(modal).not.toContain('HIDE_CONTROL_LABEL');
    // No style key styles two of them at once.
    expect(modal).not.toMatch(/reportBtn: \{[^}]*disputeBtn/);
  });
});

describe('W1 — the gate is dead-control prevention, not preference (SR-093)', () => {
  it('all four clauses are spelled, in one place', () => {
    expect(modal).toContain(
      "DISPUTE_ENABLED && !!user && !isOwn && (status === 'open' || status === 'verified')",
    );
  });

  it('a guest never sees it — the RPC is granted to `authenticated` only', () => {
    // `!!user`, not a truthy coercion elsewhere: the pill must not render for a
    // signed-out reader, whose every press would be a 42501.
    const gate = between(modal, 'const canDispute =', ';');
    expect(gate).toContain('!!user');
  });

  it('the row cannot render the pill out of existence', () => {
    // canDispute implies canReject today; listing it anyway means a later edit
    // to the triage gates cannot silently drop the pill's container.
    expect(modal).toContain('{(canVerify || canResolve || canReject || isOwn || canDispute) && (');
  });

  it('the pill is replaced by the answer — the two are never on screen together', () => {
    expect(modal).toContain('{canDispute && disputeNotice === null && (');
    expect(modal).toContain('{disputeNotice !== null && (');
  });

  it('the answer belongs to the flag on screen, so it cannot print over the next one', () => {
    expect(modal).toContain(
      "const disputeNotice = disputeMessage?.flagId === shownFlag.id ? disputeMessage.text : null;",
    );
    // And it is cleared on both the close and the flag-swap resets.
    expect(modal.match(/setDisputeMessage\(null\);/g)).toHaveLength(2);
  });
});

describe('W1 — dedup is required, and ordered', () => {
  const handler = between(modal, 'const handleDispute = async', '  return (');

  it('the device check runs BEFORE the RPC, and short-circuits', () => {
    const check = handler.indexOf('await hasRequestedDispute(user.id, flagId)');
    const rpc = handler.indexOf('await requestFlagDispute(flagId)');
    expect(check).toBeGreaterThan(-1);
    expect(rpc).toBeGreaterThan(check);
    expect(handler).toContain('say(DISPUTE_ALREADY_RECORDED_MESSAGE);');
  });

  it('the record is written only AFTER a counted vote — never on null or 0', () => {
    const record = handler.indexOf('await recordDisputeRequest(user.id, flagId)');
    expect(record).toBeGreaterThan(handler.indexOf('if (newCount === null) {'));
    expect(record).toBeGreaterThan(handler.indexOf('if (newCount === 0) {'));
    // Exactly one write site — a second one would be a second spent vote.
    expect(handler.match(/recordDisputeRequest\(/g)).toHaveLength(1);
  });

  it('the flag id is captured once and reused, not re-read after each await', () => {
    expect(handler).toContain('const flagId = shownFlag.id;');
    expect(handler).not.toMatch(/await requestFlagDispute\(shownFlag\.id\)/);
  });
});

describe('W1 — a vote that did not land is never reported as one (the F38 lesson)', () => {
  const handler = between(modal, 'const handleDispute = async', '  return (');

  it('null (RPC missing) is a FAILURE, not the reopen flow\'s "sent for review"', () => {
    expect(handler).toContain('notify(DISPUTE_FAILED_TITLE, FEATURE_UNAVAILABLE);');
    // The sentence the reopen flow says on this branch must not appear here.
    expect(handler).not.toMatch(/sent for review/i);
    expect(handler).not.toContain('say(DISPUTE_RECORDED_MESSAGE);\n        return;');
  });

  it('0 (discarded by the server) says the flag moved, not that doubt was recorded', () => {
    expect(handler).toContain('say(DISPUTE_STALE_MESSAGE);');
  });

  it('a throw surfaces through notify(), not Alert.alert (a no-op on web)', () => {
    expect(handler).toContain('notify(DISPUTE_FAILED_TITLE, errorMessage(e));');
    expect(handler).not.toContain('Alert.alert');
  });

  it('the doubt vote changes no status and closes no sheet', () => {
    // A dispute is a signal, not a verdict: the three triage verbs beside it
    // call updateFlagStatus, and this one must not.
    expect(handler).not.toContain('updateFlagStatus');
    expect(handler).not.toContain('onClose()');
    expect(handler).not.toContain('onChanged(');
  });

  it('every answer is announced as well as shown (WCAG 4.1.3), through one helper', () => {
    expect(handler).toContain('AccessibilityInfo.announceForAccessibility(text);');
    // ONE writer of the message state, so the visible sentence and the spoken
    // one cannot drift: three answers, one `say`, no second setter.
    expect(handler).toContain('const say = (text: string) => {');
    expect(handler.match(/setDisputeMessage\(\{ flagId, text \}\)/g)).toHaveLength(1);
    expect(handler.match(/\bsay\(DISPUTE_/g)).toHaveLength(3);
    expect(handler).not.toMatch(/AccessibilityInfo\.announceForAccessibility\((?!text\))/);
  });
});

describe('W1 — the honesty fence on the control itself', () => {
  const pill = between(modal, '{canDispute && disputeNotice === null && (', '{isOwn && (');

  it('carries NO accessibilityHint — every useful hint here is a promise', () => {
    // "Marks this flag as disputed" describes a treatment that is not shipped.
    // A missing hint is not a WCAG failure; the accessible NAME carries it.
    expect(pill).not.toContain('accessibilityHint');
    expect(pill).toContain('accessibilityLabel={DISPUTE_CONTROL_LABEL}');
  });

  it('reads its visible word from copy.ts, never a literal', () => {
    expect(pill).toContain('{DISPUTE_CONTROL_LABEL}');
    expect(pill).not.toMatch(/>\s*Flag as wrong\s*</);
    expect(copy).toContain("export const DISPUTE_CONTROL_LABEL = 'Flag as wrong';");
  });

  it('cannot be double-pressed, and reports its own busy state', () => {
    expect(pill).toContain('disabled={busy || disputeBusy}');
    expect(pill).toContain('busy: disputeBusy');
  });
});

describe('W1 is PARTIAL — the count is recorded, never displayed', () => {
  it('no surface reads dispute_requests — there is no Disputed badge', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!/(__tests__|__mocks__|node_modules)/.test(p)) walk(p);
        } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
          files.push(p);
        }
      }
    };
    walk(SRC);

    // Prose lines dropped first: disputes.ts and database.ts both name the
    // column legitimately in comments. What must not exist is a READ — a
    // property access, or the column named inside a select() string.
    const readers = files.filter((f) =>
      /\bdispute_requests\b/.test(codeLines(fs.readFileSync(f, 'utf8'))),
    );
    expect(readers).toEqual([]);
  });

  it('the modal never renders the RPC\'s return value', () => {
    const handler = between(modal, 'const handleDispute = async', '  return (');
    expect(handler).toContain('const newCount = await requestFlagDispute(flagId);');
    // newCount is compared, never interpolated into anything the user sees.
    expect(modal).not.toMatch(/\$\{newCount\}/);
    expect(modal).not.toContain('{newCount}');
    // No threshold arithmetic — the reopen flow's "N more needed" shape must
    // not reappear here, because the badge it would count down to is unshipped.
    // Checked at the IMPORT, which is the only door the constant can come
    // through and cannot be satisfied by a comment mentioning it.
    expect(modal).toContain(
      "import { DISPUTE_ENABLED, requestFlagDispute } from '@/lib/disputes';",
    );
    expect(modal).not.toMatch(/import[^;]*DISPUTE_THRESHOLD/);
    // Sanity: the helper drops prose, not the subject. Two absence-assertions
    // above run through it, and both would pass vacuously on an empty string.
    const code = codeLines(modal);
    expect(code).toContain('const handleDispute = async');
    expect(code.length).toBeGreaterThan(modal.length / 2);
    expect(code).not.toContain('DISPUTE_THRESHOLD');
  });

  it('the reopen control is untouched by this work', () => {
    expect(modal).toContain('accessibilityLabel="Request flag reopen"');
    expect(modal).toContain('const handleReopenSubmit = async');
    expect(modal).toContain("import { hasRequestedReopen, recordReopenRequest } from '@/lib/reopenRequests';");
  });
});
