import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.join(__dirname, '..', '..');
function parse(tap: string, expectedPlan: number) {
  const code = `import { parseTap } from './scripts/replay-phase03a.mjs'; console.log(JSON.stringify(parseTap(${JSON.stringify(tap)}, ${expectedPlan})));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root, encoding: 'utf8',
  }));
}

describe('Phase03A genuine TAP acceptance', () => {
  it('accepts an executed exact nonzero plan', () => {
    expect(parse('1..2\nok 1 - positive\nok 2 - refusal\n', 2)).toMatchObject({
      passed: true, executed: 2, planned: 2, failed: 0, bailout: 0,
    });
  });
  it.each([
    ['failed assertion', '1..1\nnot ok 1 - failed\n', 1],
    ['missing plan', 'ok 1 - incomplete\n', 1],
    ['count mismatch', '1..2\nok 1 - incomplete\n', 2],
    ['wrong expected plan', '1..1\nok 1 - incomplete\n', 2],
    ['bailout after complete count', '1..1\nok 1 - complete\nBail out! later failure\n', 1],
    ['skip all', '1..0 # SKIP unavailable\n', 1],
    ['skipped assertion', '1..1\nok 1 # SKIP unavailable\n', 1],
    ['TODO assertion', '1..1\nnot ok 1 # TODO later\n', 1],
  ])('rejects %s rather than claiming database proof', (_name, tap, count) => {
    expect(parse(tap as string, count as number).passed).toBe(false);
  });
});
