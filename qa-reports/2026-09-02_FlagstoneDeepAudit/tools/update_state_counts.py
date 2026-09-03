#!/usr/bin/env python3
"""Recompute the FINDINGS_* counter block in AUDIT_STATE.md from the FINDINGS_LEDGER.md index table.
Audit helper only — never imported by product code. Usage: python3 tools/update_state_counts.py
"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
ledger = (root / 'FINDINGS_LEDGER.md').read_text()
state_p = root / 'AUDIT_STATE.md'
state = state_p.read_text()
rows = []
for line in ledger.splitlines():
    m = re.match(r'^\|\s*(FDA-\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$', line)
    if m:
        rows.append(dict(id=m.group(1), title=m.group(2), status=m.group(3), severity=m.group(4), category=m.group(5), state=m.group(6)))
sev = {k: 0 for k in ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'NOTE']}
fp = 0
cat = {'UI': 0, 'A11Y': 0, 'FUNC': 0, 'PRIVSEC': 0, 'PERF': 0, 'APPSTORE': 0, 'RELEASE': 0}
for r in rows:
    if 'FALSE_POSITIVE' in r['status']:
        fp += 1
        continue
    s = r['severity'].split('/')[0].strip().upper()
    if s in sev: sev[s] += 1
    c = r['category'].lower()
    if 'ui' in c.split('/') or 'visual' in c: cat['UI'] += 1
    if 'a11y' in c or 'accessib' in c: cat['A11Y'] += 1
    if 'functional' in c: cat['FUNC'] += 1
    if 'security' in c or 'privacy' in c: cat['PRIVSEC'] += 1
    if 'perf' in c: cat['PERF'] += 1
    if 'app-store' in c: cat['APPSTORE'] += 1
    if 'release' in c: cat['RELEASE'] += 1
total = len(rows) - fp
repl = {
    'FINDINGS_TOTAL': total, 'BLOCKER': sev['BLOCKER'], 'HIGH': sev['HIGH'], 'MEDIUM': sev['MEDIUM'], 'LOW': sev['LOW'], 'NOTE': sev['NOTE'],
    'FALSE_POSITIVE': fp, 'UI_FINDINGS': cat['UI'], 'ACCESSIBILITY_FINDINGS': cat['A11Y'], 'FUNCTIONAL_FINDINGS': cat['FUNC'],
    'PRIVACY_SECURITY_FINDINGS': cat['PRIVSEC'], 'PERFORMANCE_FINDINGS': cat['PERF'], 'APP_STORE_FINDINGS': cat['APPSTORE'], 'RELEASE_FINDINGS': cat['RELEASE'],
}
for k, v in repl.items():
    state = re.sub(rf'^{k}:.*$', f'{k}: {v}', state, flags=re.M)
state_p.write_text(state)
print('rows', len(rows), repl)
