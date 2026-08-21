# 00 — STEP 0: THE SIMULATOR MADE REAL

## ★ COMMIT HANDSHAKE (stated before the first walk tap)
- **Walked binary built from: main @ `bc91789`** ("Merge: the guard walkers went blind whenever the repo sat under .claude/worktrees/"), 2026-08-19 22:44 PDT.
- **`bc91789` == local main == origin/main at build time** (verified clean tracked tree). It IS the current tip Sky's repo knows → **everything merged to date is in the walked binary**, including today's legal-sheets/modal-ordering fix, the anon content filter (`189bf5a`), the Flagstone rename, and the fmt/Xcode-26 build fix (`b70ca86`).
- No unmerged branch was included (Sky named none). The fmt-note branch `fix/fmt-xcode26-local-sim-2026-07-25` is docs-only vs main.

## Route taken: **ROUTE A — local Release simulator build** (Route B EAS not needed)
- The known wall (fmt 11.0.2 consteval vs Xcode 26.6 clang) is FIXED ON MAIN since today 17:02 (`b70ca86` + `plugins/withFmtXcode26Fix.js` → fmt pod at gnu++17; verified 2×gnu++17 configs in the generated Pods project — exactly the scope the note promises).
- Build: `npx expo run:ios --configuration Release --no-bundler --device <ProMax>` from the main checkout. Cold build (first-ever local iOS build on this Mac): ~75 min. Products: `.../Release-iphonesimulator/Flagstone.app` (49 MB).
- **BUILD TYPE = sim-release** (Release configuration, JS bundle embedded, no Metro). expo-dev-client pods are compiled in but Release-inert — launch went straight to the app, no dev-launcher chrome. Findings that could be build-type artifacts will still say so, but this is the closest local proxy to the store binary (perf/chrome caveats vs a device release build noted at close-out).
- Bundle identity verified: **Flagstone / com.accessmap.app / 3.0.0 / build 15** — matches app.json (name Flagstone, buildNumber 15).
- Xcode license: OK (agreed at 26.5; peer's stale hazard cleared).

## Devices (matrix)
| Device | UDID | Points | Role |
|---|---|---|---|
| iPhone 17 Pro Max | 1AFA3DED… | 440×956 @3x | LARGEST — full pass |
| iPhone 17e | 9C9D3ED6… | (verify at first shot) | SMALLEST AVAILABLE — top-flow repeat |
- **No SE-class device exists in the iOS 26.5 runtime** (smallest is 17e) — recorded as a matrix limitation, not skipped coverage. `supportsTablet:false` → no iPad, deliberate ✓.
- Both sims have the app installed (Pro Max via expo, 17e via `simctl install` of the same .app).

## ★ INTERACTION LAYER — established and PROVEN
- **idb: impossible on this Mac** — core brew formula doesn't exist (only an unrelated "companion" cask); `facebook/fb/idb-companion` requires CLT for Xcode 27.0 (admin install; not performable). The pip client additionally needs a Python-3.14 asyncio shim (written anyway: `scratchpad/idbrun`).
- **Substitute with equivalent capability: WebDriverAgent** (appium-webdriveragent, built from source with local Xcode 26.6, `TEST BUILD SUCCEEDED`). Runner live on Pro Max port 8100. Provides: `/source?format=json` = describe-all equivalent (full AX tree WITH frames → measured hit targets), W3C actions (tap/swipe/longpress), typing, alert handling. Driver: `scratchpad/wda.py`.
- **★ VERIFIED TAP (the proof):** on OnboardingCards p.1, tapped `Next. Card 1 of 5.` at its tree-measured center (373,888) → tree re-read shows `Next. Card 2 of 5.` + `Back to card 1 of 5` (enabled:1). Outcome matched intent. Earlier incidental proof: a springboard tap opened Fitness (its stray notification dialog was dismissed with Don't Allow — no Flagstone state touched).
- Console streams running per device: `logs/console-promax.log`, `logs/console-17e.log` (predicate process == "Flagstone").

## Backend
- `.env` → `https://kldlwszpfkdmsjrjhjym.supabase.co` = the LIVE production backend, baked into the bundle. **Production Law armed**: anon writes to the edge only; no authed sign-in possible by agent (password-only auth + credential prohibition) → authed surfaces are SKY-QUEUE.

## Deviations from the prompt's letter (declared)
1. idb → WebDriverAgent (same capabilities; reason above).
2. SE-class → iPhone 17e (runtime has no SE).
3. Notification-permission dialog observed at first launch belonged to **Fitness** (side-effect of the springboard tap proof), not Flagstone.
