# AccessMap — Tasks Glass: MERGED → your TestFlight build

**2026-07-03** · `main` is now at **`f0c47fc`** (fast-forwarded from `46481ce`, pure linear, no merge commit).
Merged: the full visual sweep + SeverityBadge AA fix + Candidate C "Deep Field" glass — **all in one commit chain, one build ships them together.**
Verified green **on main**: typecheck 0 · jest 1737/108 · lint 0 err/77 warn · `expo export` web+iOS exit 0 · fence clean (2 independent agents) · contrast recomputed 100/100 · C-lite ships.
**NOT pushed. NOT built.** Both are yours.

---

## 1 — Fire the TestFlight build (1-click copy)

```bash
cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive
```

- ~15–20 min. Uses the **`testflight`** profile (`distribution: store`, Release, prod env → Supabase keys injected). This is the last-successful path (build 16).
- You should already be logged in (`npx eas-cli login` if not). Run from `~/AccessMap`, never `~`.

**After the build succeeds, submit to TestFlight (1-click copy):**

```bash
cd ~/AccessMap && npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

*(Optional pre-build sanity — already passing here, but harmless to re-run: `cd ~/AccessMap && npm run typecheck && npx expo export --platform ios`.)*

---

## 2 — ★ What to check on your phone (so the credit is well-spent)

This build EXISTS for the one call no agent can make — the feel of it in your hand:

1. **Scroll smoothness, full glass — THE gate.** Seed 50 rows if you can; the real 4-row list at minimum. **If it hitches → long-press the Tasks header title (~1s)** → "Glass effects: Lite" → re-feel. It persists; flip back the same way. (C-lite is confirmed in the binary, not `__DEV__`-gated.)
2. **Material feel, light AND dark** — dark in a dark room: the field should **glow, not glare**.
3. **VoiceOver order:** header → notices → select → search → chips → sort → banner → cards; the C-lite flip announces "Glass effects reduced/full".
4. **320pt width + ×1.6 text:** chrome grows, list padding follows, action rows stack — no clipped labels.
5. **Reduce Transparency ON** (Settings → Accessibility → Display): every pane goes designed-opaque (banner = soft blue card, blue border), zero smears.
6. **Pull-to-refresh** spinner lands **below** the chrome, not under it.
7. **Doubles as the deferred verification:** EXIF-strip on a real photo report + VoiceOver pass (the two on-device items carried over from earlier).

---

## 3 — Two small decisions this build teed up (not blocking)

- **`ui/Button.tsx`** — zero call sites today. Adopt (lab's rec) or delete. Your call.
- **If full glass disappoints on device** → C-lite is one long-press away; the losing mode gets a cleanup commit later.

---

## 4 — Safety notes

- **Branches kept as anchors:** `overhaul/tasks-glass` (f0c47fc), `fix/visual-sweep` (92a2be6), `fix/severity-badge-aa` (92a2be6). Don't delete until you're happy post-device.
- **Rollback if ever needed:** `git reset --hard 46481ce` (main's pre-merge point).
- **Push** (`git push origin main`) and any **web deploy** are separate, and yours.
