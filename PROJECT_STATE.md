# PROJECT_STATE — Flagstone
_Last compiled: 2026-06-20 by /new-window_

> **Renamed 2026-08-17:** the app ships as **Flagstone** (working title AccessMap through 2026-08). Everything below predates the rename and still says AccessMap. That is correct history, left as-is per the snapshot banner.

> ⚠️ **ARCHIVED SNAPSHOT (banner added 2026-08-06, code-qa DEBT-3/Q-8).** Everything below pins main `45bca1a` — five trains ago. The living state is **`APP_STORE_TODO.md`** (the ship chain) + each train's `design-reviews/<train>/` close-out. Regenerate with `/new-window` when Sky wants this file current; nothing below was edited.

## Current Status
**The full editorial visual transformation (Phases 7a→13) is COMPLETE + LIVE on `origin/main` `45bca1a`** (all batches Sky-authorized, merged via Rory `--no-ff`, pushed; local == origin). AccessMap's identity flipped from the old dark-navy-chrome to **fully light editorial in light mode** (light headers + light frosted tab bar + light content + glass) / **cohesively dark in dark mode**. Every phase passed: typecheck 0 · lint 0 errors · **1722 tests** · **fence intact** (zero data/auth/EXIF/RLS/RPC/points-trigger changes — presentation/nav/theme only). Now in **change-cycle mode**: Sky reviews the live demo on her phone and requests specific per-screen overhauls; agent builds on `overhaul/phase<N>-*` branches, Rory safe-merges, Sky says "push".

## Context Snapshot
After Phases 1–6 (polish/a11y) shipped, Sky said the build "looked EXACTLY the same" and wanted a **bold, visible identity change** — not more subtle polish. Direction: **clean editorial + iOS frosted glass**. Worked as a long change-cycle (build a phase → verify in the Chromium web preview → Rory safe-merge → Sky-authorized push), all behind the hard data/privacy fence. Mid-stream Sky lifted the per-phase device gate ("keep going on phases, one big EAS build later") and explicitly authorized pushes once each batch was "different enough." Live demo: https://accessmap.skypistudio.com (guest mode — Profile/Leaderboard are sign-in-only).

## Recent Outcomes
- **Phase 7a** — editorial Home wired as the Home tab (full map → hidden `FullMap` route; deep links repointed); **3-tab nav** (Home·Tasks·Profile; Settings/Admin → hamburger drawer via new `drawerContext`); fixed 4 built-HomeScreen defects (hardcoded-SF fake distances → fence-safe location + honest "Recent" mode; two masked nav bugs; missing loading/error/offline states); working address search; native frosted glass tab-bar groundwork. `preferences` `'Map'→'Home'` migration.
- **Phase 7b** — extracted shared `ui/ScreenHeader`; editorial type on Profile / Leaderboard / Onboarding / FlagCard-modals / web splash.
- **Phase 7c** — Tasks triage-card polish (title + padding).
- **Phase 8** — flipped the app **header** dark-navy → clean **light editorial** in light mode (dark preserved); new palette-adaptive tokens `headerBg/headerFg/headerBtnBg/headerBorder`.
- **Phase 9** — Profile hero dark gradient → **light editorial stat card** (big brand-blue points number; avatar/points/tier logic untouched).
- **Phase 10** — map chrome (action-bar tool tray + "N flags nearby" status pill) → frosted `GlassSurface`.
- **Phase 11** — crafted press feel (`PressableScale`) on map FABs + the 7 action-bar buttons; Leaderboard header → left-aligned editorial; `ScreenHeader` default title 34→40.
- **Phase 12** — flipped the **bottom tab bar** dark → **light frosted** in light mode (dark preserved); new palette-adaptive tokens `tabBarGlassFloor/tabBarBlurTint`; AA-safe tints (active `#0F53BE`, inactive `#6B7280`).
- **Phase 13** — full **Tasks-screen overhaul** on Sky's device feedback: headerless + editorial `ScreenHeader` (like Home), **removed the min-severity filter row** entirely, compact "Select multiple", **clean cards** (dropped raw lat/lng coords + monospace meta → "Severity 4 · 15d ago"), clean rounded-pill action buttons (status colors kept).
- Backup tags recorded per merge: `backup/pre-phase<N>-merge-2026-06-*`. Memory `project_accessmap.md` kept current throughout.

## Next Actions (Sky-side / change-cycle)
1. **Sky** — review the live demo on her phone (https://accessmap.skypistudio.com; ~1–3 min after a push, hard-refresh for cache) and point at the next screen/detail to overhaul. Agent continues the change-cycle on `overhaul/phase<N>-*` branches.
2. **Carry-over (Sky-side, unchanged):** the one **EAS TestFlight build + submit** (folds in the deferred on-device a11y/VoiceOver/Dynamic-Type pass for ALL the new editorial surfaces) · verify EAS Supabase env before build · rotate reviewer password before App Store · points-value drift decision (live 10/3/15/7 vs stale docs 5/2/10/5) · privacy-copy sign-off + ResourcesScreen `TODO(Sky)` URLs.

## Open Risks
- **Live-but-device-unverified** — the entire editorial transformation is LIVE on the web demo but NOT device/VoiceOver-verified (Sky deferred a11y/testing until she's happy with the look). The **native frosted glass** (tab bar + map chrome) cannot be certified in the Chromium web preview (`expo-blur` is native-only). Rollback per phase via the `backup/pre-phase<N>-merge` tags (e.g. `git reset --hard 5f17bd9` undoes Phase 13).
- **Pre-existing web-only FlagCard nested-`<button>` console warnings** — harmless on native; NOT introduced this session.
- **Carry-over:** EAS Supabase env unverified · POINTS-VALUES-DRIFT · reviewer password in public git history.
