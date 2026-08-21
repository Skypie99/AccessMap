#!/usr/bin/env python3
"""Measure a presented sheet's card geometry from the WDA tree.
Usage: sheetgeom.py <port> <anchor-label>   (anchor = an element inside the sheet, e.g. 'Close My Reports')
Prints the ancestor chain heights so the card frame is unambiguous."""
import json, subprocess, sys, os
port, anchor = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
src = subprocess.run(['python3', os.path.join(here,'wda.py'), port, 'source'],
                     capture_output=True, text=True).stdout
d = json.loads(src)
target = None
def walk(n, path):
    global target
    lbl = n.get('label') or n.get('name') or ''
    if lbl == anchor and target is None:
        target = path + [n]
    for c in n.get('children') or []:
        walk(c, path + [n])
walk(d, [])
if not target:
    print(json.dumps({"error": f"anchor not found: {anchor}"})); sys.exit(1)
screen_h = (target[0].get('rect') or {}).get('height')
chain = []
for n in target:
    r = n.get('rect') or {}
    chain.append({"type": n.get('type'), "y": r.get('y'), "h": r.get('height'), "w": r.get('width')})
# the sheet card = deepest full-width (w == screen width) container that is NOT full-height
sw = (target[0].get('rect') or {}).get('width')
card = None
for c in chain:
    if c['w'] == sw and c['h'] and c['h'] < screen_h:
        card = c
print(json.dumps({"screen_h": screen_h, "card": card,
                  "card_pct": round(100*card['h']/screen_h,1) if card else None,
                  "gap_below": screen_h-(card['y']+card['h']) if card else None,
                  "chain": chain[-8:]}, indent=1))
