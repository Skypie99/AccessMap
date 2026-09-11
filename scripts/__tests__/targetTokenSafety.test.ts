/**
 * STAGE-BLOCK-03 TARGET SAFETY — a target token is one token.
 *
 * 2026-09-11 review, MUST-FIX 1. The whole target authority rested on `===`
 * against an unvalidated string, while the output was `parts.join(' ')` -- a shell
 * line that re-tokenizes when anything executes it. Both failures below were
 * MEASURED on the committed code before this fix, not imagined:
 *
 *   projectRef "kldlwszpfkdmsjrjhjym " (one trailing space)
 *     -> "supabase db push --project-ref kldlwszpfkdmsjrjhjym "
 *        an executable PRODUCTION push, past a production check that compares
 *        with ===.
 *
 *   projectRef "ctshxbykuemeqnofqcdh --linked"
 *     -> "... --project-ref ctshxbykuemeqnofqcdh --linked"
 *        a second target selector, past a check that tests array membership.
 *
 * A ref pasted from a dashboard or read from a file routinely carries whitespace,
 * so this was reachable by accident, not only by malice.
 */
import { execFileSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const PROD = 'kldlwszpfkdmsjrjhjym';
const STAGING = 'ctshxbykuemeqnofqcdh';

function call(mod: string, fn: string, ...args: unknown[]): any {
  const code =
    `import * as m from '${mod}';` +
    `const a=${JSON.stringify(args)};` +
    `let out;try{out={ok:true,v:m.${fn}(...a),t:typeof m.${fn}(...a)};}catch(e){out={ok:false,message:String(e.message)};}` +
    `console.log(JSON.stringify(out));`;
  const res = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code],
    { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
  if (!res.ok) throw new Error(res.message);
  return res;
}
const ID = './scripts/canonical-migration-identity.mjs';
const WS = './scripts/canonical-apply-workspace.mjs';

/** Every way a value stops being one token. */
const HOSTILE: [string, string][] = [
  ['trailing space', `${PROD} `],
  ['leading space', ` ${PROD}`],
  ['inner space', `${STAGING} ${PROD}`],
  ['smuggled --linked', `${STAGING} --linked`],
  ['tab', `${STAGING}\t--linked`],
  ['newline', `${STAGING}\n--linked`],
  ['flag-shaped', '--linked'],
  ['not a ref', 'not-a-project-ref'],
  ['empty', ''],
];

describe('supportedApplyCommand validates the value, not just the flag list', () => {
  it.each(HOSTILE)('refuses a projectRef with %s', (_label, ref) => {
    expect(() => call(ID, 'supportedApplyCommand', { projectRef: ref })).toThrow();
  });

  it('still refuses the production ref exactly', () => {
    expect(() => call(ID, 'supportedApplyCommand', { projectRef: PROD })).toThrow(/production project/);
  });

  it('builds for a valid staging ref, and returns a PRIMITIVE string', () => {
    const r = call(ID, 'supportedApplyCommand', { projectRef: STAGING });
    // A String object would break === for every consumer, and toBe() in every test.
    expect(r.t).toBe('string');
    expect(r.v).toBe(`supabase db push --project-ref ${STAGING} --dry-run`);
  });

  it('offers argv, so an executing caller never re-tokenizes at all', () => {
    const r = call(ID, 'supportedApplyArgv', { projectRef: STAGING, dryRun: false });
    expect(r.v).toEqual(['supabase', 'db', 'push', '--project-ref', STAGING]);
    expect(r.v).not.toContain('--linked');
  });

  it('refuses a workdir that is not one token', () => {
    expect(() => call(ID, 'supportedApplyCommand', { projectRef: STAGING, workdir: '/tmp/a b' })).toThrow(/whitespace/);
  });
});

describe('assertUnambiguousTarget inspects values, not only flag positions', () => {
  it('catches a selector smuggled inside a value', () => {
    expect(() => call(ID, 'assertUnambiguousTarget', ['--project-ref', `${STAGING} --linked`]))
      .toThrow(/Ambiguous target/);
  });

  it('still catches two selectors in flag position', () => {
    expect(() => call(ID, 'assertUnambiguousTarget', ['--linked', '--project-ref', STAGING]))
      .toThrow(/Ambiguous target/);
  });

  it('accepts exactly one explicit target', () => {
    expect(call(ID, 'assertUnambiguousTarget', ['--project-ref', STAGING]).v).toBe(true);
  });
});

describe('workspaceCommands — the entry point the staging packet actually uses', () => {
  let ws: string;
  beforeAll(() => {
    ws = call(WS, 'createWorkspaceDir', {}).v as string;
    fs.mkdirSync(path.join(ws, 'supabase', 'migrations'), { recursive: true });
  });
  afterAll(() => { try { call(WS, 'destroyWorkspace', ws); } catch { /* already gone */ } });

  it.each(HOSTILE)('refuses a projectRef with %s', (_label, ref) => {
    expect(() => call(WS, 'workspaceCommands', { workspace: ws, projectRef: ref })).toThrow();
  });

  it('refuses the production ref exactly', () => {
    expect(() => call(WS, 'workspaceCommands', { workspace: ws, projectRef: PROD })).toThrow(/production/);
  });

  it('builds for staging, names one target, and offers argv', () => {
    const { v } = call(WS, 'workspaceCommands', { workspace: ws, projectRef: STAGING });
    expect(v.apply).toContain(`--project-ref ${STAGING}`);
    expect(v.apply).not.toContain('--linked');
    expect(v.dryRun).toContain('--dry-run');
    expect(v.applyArgv).toEqual(['supabase', 'db', 'push', '--workdir', ws, '--project-ref', STAGING]);
    expect(v.dryRunArgv[v.dryRunArgv.length - 1]).toBe('--dry-run');
  });
});
