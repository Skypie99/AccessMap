/**
 * PHASE-03A STAGE-MF-07 — no tracked file may act as a project target selector.
 *
 * Phase 03A staging found `supabase/.temp/linked-project.json` tracked in git with
 * `ref` naming the PRODUCTION project. It had been committed by accident in cd9d143.
 * Every hosted command in that run passed an explicit `--project-ref`, so nothing was
 * mis-targeted — but a fresh clone carried a committed production selector and no
 * staging override, which is one CLI-precedence assumption away from production.
 *
 * The fix is NOT to repoint the file at staging: that swaps one stale dangerous target
 * for another. Per-machine link state is untracked and ignored, and the target is named
 * explicitly on every command.
 *
 * These are cheap invariants guarding an expensive mistake.
 */
import { execFileSync } from 'child_process';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');

/** Files git actually has under version control, NUL-separated so paths with spaces survive. */
function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function isIgnored(relPath: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', relPath], { cwd: ROOT });
    return true;
  } catch {
    return false;
  }
}

describe('STAGE-MF-07 — project target safety', () => {
  it('tracks no Supabase CLI per-machine link state', () => {
    const linkState = trackedFiles().filter((file) => file.startsWith('supabase/.temp/'));
    expect(linkState).toEqual([]);
  });

  it('ignores supabase/.temp/ so the link file cannot be re-committed by accident', () => {
    // The exact two paths that were tracked before this fix, plus the directory itself.
    expect(isIgnored('supabase/.temp/linked-project.json')).toBe(true);
    expect(isIgnored('supabase/.temp/cli-latest')).toBe(true);
    expect(isIgnored('supabase/.temp/anything-the-cli-writes-later.json')).toBe(true);
  });

  it('keeps every remaining production-ref mention out of target-selecting config', () => {
    // The production ref legitimately appears in SQL webhook URLs, applied migration
    // headers and historical receipts. What must never happen again is a tracked
    // MACHINE-READABLE selector — a JSON/TOML/YAML key whose value picks the project
    // a CLI will talk to. Documentation and SQL are prose to git; a selector is not.
    const PRODUCTION_REF = 'kldlwszpfkdmsjrjhjym';
    const selectorLike = /^(supabase\/\.temp\/|.*\/\.supabase\/).*\.(json|toml|ya?ml)$/;

    const offenders = trackedFiles()
      .filter((file) => selectorLike.test(file))
      .filter((file) => {
        const contents = execFileSync('git', ['show', `HEAD:${file}`], {
          cwd: ROOT,
          encoding: 'utf8',
        });
        return contents.includes(PRODUCTION_REF);
      });

    expect(offenders).toEqual([]);
  });
});
