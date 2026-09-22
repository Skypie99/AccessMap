from pathlib import Path
import shutil, subprocess, json
root=Path(__file__).parent
base=root/'base'
source='src/lib/flags.ts'
owner='src/components/FlagDetailModal.tsx'
mutations={
'M1_direct_flags_delete':(source, '  throw new FlagDeletionUnavailableError();', "  await supabase.from('flags').delete();\n  throw new FlagDeletionUnavailableError();"),
'M2_admin_bypass':(source, '  throw new FlagDeletionUnavailableError();', "  if (_flagId === 'admin-target') { await supabase.from('flags').delete(); return; }\n  throw new FlagDeletionUnavailableError();"),
'M3_owner_bypass':(source, '  throw new FlagDeletionUnavailableError();', "  if (_flagId === 'owner-target') { await supabase.from('flags').delete(); return; }\n  throw new FlagDeletionUnavailableError();"),
'M4_caller_false_success':(owner, "      notify('Could not delete flag', errorMessage(e));", "      onDeleted(shownFlag.id);\n      notify('Could not delete flag', errorMessage(e));"),
'M5_photo_check_then_delete':(source, '  throw new FlagDeletionUnavailableError();', "  const { data: photos } = await supabase.from('flag_photos').select('id');\n  if (!photos?.length) await supabase.from('flags').delete();\n  throw new FlagDeletionUnavailableError();"),
}
tests=['src/lib/__tests__/flags.supabase.test.ts','src/__tests__/d1f4r3SourceClosure.guard.test.ts','src/components/__tests__/FlagDetailModal.refusal.test.tsx']
results=[]
for name,(rel,old,new) in mutations.items():
    d=root/name
    shutil.copytree(base,d,symlinks=True)
    p=d/rel
    s=p.read_text()
    assert s.count(old)==1,(name,s.count(old))
    p.write_text(s.replace(old,new,1))
    proc=subprocess.run(['./node_modules/.bin/jest','--ci','-w','3','--silent',*tests],cwd=d,capture_output=True,text=True)
    (root/f'{name}.stdout.txt').write_text(proc.stdout)
    (root/f'{name}.stderr.txt').write_text(proc.stderr)
    summary=[line.strip() for line in proc.stderr.splitlines() if line.startswith(('FAIL ','PASS ','Test Suites:','Tests:'))]
    results.append({'mutation':name,'exitCode':proc.returncode,'killed':proc.returncode!=0,'summary':summary})
(root/'results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
