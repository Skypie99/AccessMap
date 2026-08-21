#!/usr/bin/env python3
"""Minimal WebDriverAgent driver for the Flagstone sim walk.
Usage: wda.py <port> <cmd> [args...]
Commands:
  status
  session                      -> prints session id (creates if needed, cached per port)
  source                       -> full element tree JSON to stdout
  census                       -> interactive-element census (type,label,rect) JSON
  tap X Y
  doubletap X Y
  longpress X Y [seconds]
  swipe X1 Y1 X2 Y2 [seconds]
  type TEXT                    -> types into focused element
  screen                       -> window size
"""
import json, sys, urllib.request, pathlib

CACHE = pathlib.Path("/private/tmp/claude-501/-Users-skypie/80694a25-eae8-431c-b5ed-c8d8b1d9abaa/scratchpad/wda-sessions.json")

def req(port, method, path, body=None, timeout=30):
    url = f"http://127.0.0.1:{port}{path}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
                               headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode())

def load_sessions():
    try: return json.loads(CACHE.read_text())
    except Exception: return {}

def save_sessions(s): CACHE.write_text(json.dumps(s))

def get_session(port):
    s = load_sessions()
    sid = s.get(str(port))
    if sid:
        try:
            req(port, "GET", f"/session/{sid}/window/size", timeout=5)
            return sid
        except Exception:
            pass
    out = req(port, "POST", "/session", {"capabilities": {"alwaysMatch": {}}}, timeout=60)
    sid = out.get("sessionId") or out.get("value", {}).get("sessionId")
    s[str(port)] = sid
    save_sessions(s)
    return sid

INTERACTIVE = {"Button","Cell","TextField","SecureTextField","Switch","Slider",
               "SegmentedControl","Link","SearchField","Stepper","PageIndicator",
               "Picker","PickerWheel","TabBar","CheckBox","Toggle","MenuItem",
               "TextView"}

def walk(node, out, depth=0):
    t = node.get("type","")
    rect = node.get("rect") or {}
    entry = {
        "type": t, "label": node.get("label"), "name": node.get("name"),
        "value": node.get("value"), "enabled": node.get("isEnabled"),
        "visible": node.get("isVisible"),
        "rect": [rect.get("x"), rect.get("y"), rect.get("width"), rect.get("height")],
        "depth": depth,
    }
    accessible = node.get("isAccessible")
    if t in INTERACTIVE or (accessible and t not in ("Other","Window","Application")):
        out.append(entry)
    # RN Pressables sometimes surface as Other with a label + accessible
    elif t == "Other" and accessible and (node.get("label") or node.get("name")):
        entry["type"] = "Other(accessible)"
        out.append(entry)
    for ch in node.get("children", []) or []:
        walk(ch, out, depth+1)


def find_el(port, sid, pred):
    out = req(port, "POST", f"/session/{sid}/elements",
              {"using": "predicate string", "value": pred}, timeout=60)
    els = out.get("value") or []
    if not els: raise SystemExit(f"NO ELEMENT for predicate: {pred}")
    eid = els[0].get("ELEMENT") or list(els[0].values())[0]
    return eid

def main():
    port, cmd = sys.argv[1], sys.argv[2]
    if cmd == "status":
        print(json.dumps(req(port, "GET", "/status", timeout=10)["value"].get("state","?")))
        return
    if cmd == "source":
        out = req(port, "GET", "/source?format=json", timeout=60)
        print(json.dumps(out["value"]))
        return
    if cmd == "census":
        out = req(port, "GET", "/source?format=json", timeout=60)
        acc = []
        walk(out["value"], acc)
        print(json.dumps(acc, indent=1))
        return
    if cmd == "screen":
        sid = get_session(port)
        print(json.dumps(req(port, "GET", f"/session/{sid}/window/size")["value"]))
        return
    sid = get_session(port)
    if cmd == "session":
        print(sid); return
    if cmd in ("tap","doubletap","longpress"):
        x, y = float(sys.argv[3]), float(sys.argv[4])
        if cmd == "tap":
            actions = [{"type":"pointer","id":"f1","parameters":{"pointerType":"touch"},
                        "actions":[{"type":"pointerMove","duration":0,"x":x,"y":y},
                                   {"type":"pointerDown","button":0},
                                   {"type":"pause","duration":80},
                                   {"type":"pointerUp","button":0}]}]
        elif cmd == "doubletap":
            seq=[]
            for _ in range(2):
                seq += [{"type":"pointerMove","duration":0,"x":x,"y":y},
                        {"type":"pointerDown","button":0},{"type":"pause","duration":60},
                        {"type":"pointerUp","button":0},{"type":"pause","duration":80}]
            actions=[{"type":"pointer","id":"f1","parameters":{"pointerType":"touch"},"actions":seq}]
        else:
            dur = int(float(sys.argv[5]) * 1000) if len(sys.argv) > 5 else 700
            actions=[{"type":"pointer","id":"f1","parameters":{"pointerType":"touch"},
                      "actions":[{"type":"pointerMove","duration":0,"x":x,"y":y},
                                 {"type":"pointerDown","button":0},
                                 {"type":"pause","duration":dur},
                                 {"type":"pointerUp","button":0}]}]
        req(port, "POST", f"/session/{sid}/actions", {"actions": actions}, timeout=120)
        print("OK")
        return
    if cmd == "swipe":
        x1,y1,x2,y2 = map(float, sys.argv[3:7])
        dur = int(float(sys.argv[7])*1000) if len(sys.argv) > 7 else 350
        actions=[{"type":"pointer","id":"f1","parameters":{"pointerType":"touch"},
                  "actions":[{"type":"pointerMove","duration":0,"x":x1,"y":y1},
                             {"type":"pointerDown","button":0},
                             {"type":"pause","duration":120},
                             {"type":"pointerMove","duration":dur,"x":x2,"y":y2},
                             {"type":"pointerUp","button":0}]}]
        req(port, "POST", f"/session/{sid}/actions", {"actions": actions}, timeout=120)
        print("OK")
        return
    if cmd == "eltap":
        eid = find_el(port, sid, sys.argv[3])
        req(port, "POST", f"/session/{sid}/element/{eid}/click", {}, timeout=120)
        print("OK"); return
    if cmd == "clear":
        eid = find_el(port, sid, sys.argv[3])
        req(port, "POST", f"/session/{sid}/element/{eid}/clear", {}, timeout=120)
        print("OK"); return
    if cmd == "settext":
        eid = find_el(port, sid, sys.argv[3])
        req(port, "POST", f"/session/{sid}/element/{eid}/clear", {}, timeout=120)
        req(port, "POST", f"/session/{sid}/element/{eid}/value", {"value": list(sys.argv[4])}, timeout=180)
        print("OK"); return
    if cmd == "home":
        req(port, "POST", f"/session/{sid}/wda/pressButton", {"name": "home"}, timeout=120)
        print("OK")
        return
    if cmd == "type":
        text = sys.argv[3]
        req(port, "POST", f"/session/{sid}/wda/keys", {"value": list(text), "frequency": 12}, timeout=180)
        print("OK")
        return
    print(f"unknown cmd {cmd}", file=sys.stderr); sys.exit(2)

if __name__ == "__main__":
    main()
