#!/usr/bin/env python3
"""Apply one mutation, run the given jest files, restore byte-exactly. Report KILLED/SURVIVED."""
import hashlib, os, shutil, subprocess, sys, json

ROOT = '/Users/skypie/AccessMap-worktrees/flagstone-p04b-opus-20260921'
OUT = '/private/tmp/claude-501/-Users-skypie/c7f005ff-3be5-492e-b761-5521a334d653/scratchpad/p04b/mut'

MUTATIONS = {
  'M1_no_ui_reentrancy_lock': ('src/screens/ProfileScreen.tsx',
      "if (!user || deletionInFlightRef.current) return;", "if (!user) return;",
      ['src/screens/__tests__/ProfileScreen.deletion.test.tsx']),
  'M2_no_lib_single_flight': ('src/lib/account.ts',
      "  if (pending) return pending;\n", "",
      ['src/lib/__tests__/account.test.ts']),
  'M3_deleted_not_success': ('src/lib/account.ts',
      "if (body.status === 'deleted') return { kind: 'deleted' };",
      "if (body.status === 'deleted') return { kind: 'unconfirmed', reason: 'unexpected_status' };",
      ['src/lib/__tests__/account.test.ts', 'src/screens/__tests__/ProfileScreen.deletion.test.tsx']),
  'M4_auto_retry_network': ('src/lib/account.ts',
      "  const verdict = classifyReply(await sendDeleteAccountRequest(receipt));\n",
      "  let verdict = classifyReply(await sendDeleteAccountRequest(receipt));\n  if (verdict.kind === 'unconfirmed' && verdict.reason === 'network') verdict = classifyReply(await sendDeleteAccountRequest(receipt));\n",
      ['src/lib/__tests__/account.test.ts', 'src/screens/__tests__/ProfileScreen.deletion.test.tsx']),
  'M5_success_on_unconfirmed': ('src/screens/ProfileScreen.tsx',
      "notify('Could not confirm deletion request', e.message);",
      "notify('Account deleted', e.message);",
      ['src/screens/__tests__/ProfileScreen.deletion.test.tsx']),
  'M6_no_terminal_short_circuit': ('src/lib/account.ts',
      "  if (isConfirmedAccountDeletionReceipt(receipt)) {\n    await finishConfirmedDeletion(userId, receipt);\n    return { status: 'deleted' };\n  }\n",
      "",
      ['src/lib/__tests__/account.test.ts']),
  'M7_signin_calls_status_when_absent': ('src/screens/SignInScreen.tsx',
      "    if (!accountDeletionAsyncStatusAvailable()) {\n", "    if (false) {\n",
      ['src/screens/__tests__/SignInScreen.test.tsx']),
  'M8_no_lib_status_gate': ('src/lib/accountDeletionReceipt.ts',
      "  if (!accountDeletionAsyncStatusAvailable()) throw new AccountDeletionStatusUnavailableError();\n", "",
      ['src/lib/__tests__/accountDeletionReceipt.test.ts']),
  'M9_signout_on_unconfirmed': ('src/lib/account.ts',
      "  if (verdict.kind === 'unconfirmed') throw new AccountDeletionUnconfirmedError(verdict.reason);\n",
      "  if (verdict.kind === 'unconfirmed') { await signOut(userId); throw new AccountDeletionUnconfirmedError(verdict.reason); }\n",
      ['src/lib/__tests__/account.test.ts', 'src/screens/__tests__/ProfileScreen.deletion.test.tsx']),
  'M10_cleanup_failure_reported_as_failure': ('src/screens/ProfileScreen.tsx',
      "        notify('Account deleted', e.message);\n",
      "        notify('Could not confirm deletion request', e.message);\n",
      ['src/screens/__tests__/ProfileScreen.deletion.test.tsx']),
  'M11_requested_accepted_without_capability': ('src/lib/account.ts',
      "    if (!accountDeletionAsyncStatusAvailable()) return { kind: 'unconfirmed', reason: 'async_unavailable' };\n", "",
      ['src/lib/__tests__/account.test.ts', 'src/screens/__tests__/ProfileScreen.deletion.test.tsx']),
  'M12_modal_left_open_after_settle': ('src/screens/ProfileScreen.tsx',
      "        setDeleteAccountOpen(false);\n      }\n    }\n  }, [refreshAccountDeletionStatus, user]);",
      "      }\n    }\n  }, [refreshAccountDeletionStatus, user]);",
      ['src/screens/__tests__/ProfileScreen.deletion.test.tsx']),
}

def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()

results = {}
names = sys.argv[1:] or list(MUTATIONS)
for name in names:
    rel, old, new, tests = MUTATIONS[name]
    path = os.path.join(ROOT, rel)
    backup = os.path.join(OUT, name + '.bak')
    shutil.copy2(path, backup)
    before = sha(path)
    src = open(path).read()
    count = src.count(old)
    if count != 1:
        results[name] = f'INVALID (anchor count {count})'
        continue
    open(path, 'w').write(src.replace(old, new))
    try:
        proc = subprocess.run(['npx', '--no-install', 'jest', '--ci', *tests], cwd=ROOT,
                              capture_output=True, text=True, timeout=600)
        log = proc.stdout + proc.stderr
        open(os.path.join(OUT, name + '.log'), 'w').write(log)
        summary = [l for l in log.splitlines() if l.startswith('Tests:')]
        results[name] = ('KILLED' if proc.returncode != 0 else 'SURVIVED') + ' | ' + (summary[-1] if summary else 'no summary')
    finally:
        shutil.copy2(backup, path)
        assert sha(path) == before, f'restore failed for {rel}'
print(json.dumps(results, indent=1))
