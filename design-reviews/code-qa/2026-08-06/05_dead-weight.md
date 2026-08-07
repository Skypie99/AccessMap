# LENS 4 — DEAD WEIGHT · code-qa 2026-08-06 · `[F5/2026-08-06]`

**Method:** scripted export-reference sweep over all `src/lib` exports (app refs counted excluding tests, so test-only-alive code surfaces — the jest-mock-resolution trap is noted per item), feature-flag consultation census, commented-out-code heuristics (0 hits — every match was prose), asset-reference sweep, root-artifact audit. Layering check: **zero** upward imports from `src/lib` — the architecture is clean.

## Findings

### DEAD-1 · MEDIUM — Three of four feature flags gate nothing (one of them claims to gate GUEST access)
**Surface:** `src/lib/featureFlags.ts:14-35`.
**Evidence:** consultation census — `PUSH_NOTIF_TYPES_ENABLED` has a real consumer (SettingsScreen:267, Sky Decision 2 — KEEP). `HEATMAP_ENABLED`, `PUSH_NOTIFICATIONS_ENABLED`, `GUEST_SIGNIN_ENABLED`: **zero `isEnabled`/`useFeatureFlag` sites repo-wide.** All three features shipped ungated. Worst is `GUEST_SIGNIN_ENABLED: false` whose comment still describes a pre-audit world ("before the full guest-auth flow has been audited") — guest mode has since shipped and been store-walked. A reader (or reviewer) could read this flag as evidence guest access is off, or flip it expecting effect. False-confidence config, the stale-flag class this lens exists for.
**Disposition:** Phase B — remove the three dead keys + their DEFAULTS rows and stale comments (keep the store + the one live flag). Guard: typecheck (`FeatureFlagKey` union shrinks) + the featureFlags test file updated deliberately.

### DEAD-2 · LOW — `flagsRealtime.ts` (54 lines) is a superseded module, alive only in its own test
**Evidence:** zero app imports (only a prose mention in `reportTemplates.ts:24`); one test file references it. History: the 2026-05-23 "realtime merge logic belongs in a pure helper" pattern was superseded by the D4 filtered-broadcast design (2026-05-28), which re-fetches the full row inside `flagsStore.tsx:544-583` instead of merging payloads.
**Disposition:** Phase B — delete module + its test suite in one commit; run FULL gates + confirm no jest mock resolves the path (the mock-resolution trap); record the test-count delta.

### DEAD-3 · LOW — `apply-migrations.js` (52 lines, tracked, referenced nowhere)
**Evidence:** prints two hardcoded SQL files (one being the single May-25 `flag_edit_rls` migration) with dashboard paste instructions. Harmless (no DB connection — verified by reading it), but the name suggests it applies things, its content is frozen at May, and the migrations story has since moved to the drift-capture/artifact-packet system (`security-audit/…/00_SKY_APPLIED_ARTIFACTS.md`). Also carries emoji console output, off-house.
**Disposition:** Phase B — delete; the artifact-packet workflow is the living replacement. (If Sky wants a helper here it should read the packet, not a hardcoded May file → QUESTIONS only if she says keep.)

### DEAD-4 · LOW — Six orphaned category SVGs
**Evidence:** `assets/icons/category/{crosswalk,curb,other,pothole,ramp,sidewalk}.svg` referenced nowhere (code, app.json, README). Category visuals ship as unicode glyphs (`CATEGORY_ICONS`) and the custom-path `CategoryIcon.tsx` — these files predate both. `react-native-svg` itself is ALIVE (LogoMark, CategoryIcon) — only the files are orphaned.
**Disposition:** Phase B — delete the six files (or move under `designs/` if Sky wants the source art kept → QUESTIONS-lite; default delete, they're regenerable vector primitives).

### DEAD-5 · LOW — Twin dead export + its comment value
**Evidence:** `CreateAnonFlagInput` (`flags.ts:1277-1287`) — zero references anywhere incl. tests; its used twin is `AnonFlagInput` (:1730). BUT the dead one carries the better docs (photo/context-tag exclusion rationale with spec citation).
**Disposition:** Phase B — delete the interface, **move its two WHY comments onto `AnonFlagInput`** (the Protected-Comment Law applied to a deletion: the fence survives, the dead symbol doesn't). Cross-ref DUP-1.

### DEAD-6 · LOW — `deleteFlagPhoto` is exported, uncalled, and half-promises an Edge Function that doesn't exist
**Evidence:** `photos.ts:80-90`; callers: none (only a comment mention in `types/database.ts:225`). Its doc line "Storage blob cleanup is deferred to an Edge Function" describes infrastructure that was never built (only `delete-account` exists) — if a caller ever appears, removal would silently leak public blobs (the SR-050 class, pre-staged).
**Disposition:** Phase B — delete the function (and the types comment mention), OR keep + fix honestly if Sky plans per-photo removal UI → QUESTIONS-lite; default delete (smallest honest state).

### Recorded, no action (already owned elsewhere)
- `_to_delete/` root dir — untracked quarantined git lock files from past incidents; already named for deletion. → QUESTIONS (one keystroke, Sky's).
- Stale untracked `ios/` prebuild — KNOWN PL-4. `dist/`, `coverage/` — gitignored build products (verified `git check-ignore`).
- Branch prunes (`fix/tasksflagcard-date-flake` would delete 6 live tests, `fix/noscript-fallback`) — KNOWN, APP_STORE_TODO 1.3; **never bare `git gc`** stands.
- `sentry.ts` no-op stub — KNOWN (kept deliberately; policy mismatch is Sky's TODO).
- `STATUS_COLORS` light-only legacy map — documented keep (test mocks + non-themed use, migration note in place).

**FINISHED** — lens 4 complete. 1 Med · 5 Low. No unused deps found via import sweep (every package.json dependency traced to imports or config); `npm outdated` deliberately NOT run (unattended read-only posture — version currency goes to the debt census as unmeasured).
