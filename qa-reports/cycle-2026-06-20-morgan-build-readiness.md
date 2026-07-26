# Morgan — AccessMap iOS EAS Build-Readiness Check — 2026-06-20

```yaml
model_tier: opus-4.8 (Sky-invoked /morgan, surge window active to 2026-06-21 12:00)
mode: ACTIVE (direct /morgan)
coherence_score: 0.98
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
verdict: GO (build will succeed) — one Sky-side env prerequisite
```

**VERDICT: 🟢 GO** — the AccessMap iOS EAS TestFlight build will succeed. All six build determinants pass. The only prerequisite is a Sky-side **env check** (not a code blocker — the build compiles regardless, but the app launches blank if the prod Supabase env vars are missing).

---

## §1 Dependency Graph
nodes:
- build/preflight#git-sync (Morgan, verify) — local==origin==45bca1a
- build/preflight#gate-chain (Morgan, verify) — typecheck/lint/test
- build/preflight#bundle-proxy (Morgan, verify) — `expo export --platform ios`
- build/preflight#native-deps (Morgan, verify) — expo-blur lock/install/autolink
- build/preflight#eas-config (Morgan, verify) — eas.json + app.json
- build/preflight#api-leak (Morgan, verify) — no unguarded web API in native path
- sky/eas#env-check (Sky, verify) — prod Supabase env present in EAS
- sky/eas#build (Sky, run) — eas build testflight
- sky/eas#submit (Sky, run) — eas submit production

edges:
- sky/eas#build → build/preflight#* (gate: all six preflight nodes GREEN) ✓ met
- sky/eas#build → sky/eas#env-check (gate: prod env present — else blank app)
- sky/eas#submit → sky/eas#build (gate: build artifact exists)

## §2 Reason for Ordering
- **Bundle export is the truest local proxy for the EAS JS phase** — it ran Hermes over the full module graph and resolved everything incl. `expo-blur`/`BlurView` and all new editorial files (6.2 MB `.hbc`, 0 unresolved). Cites prior `qa-reports/2026-05-29_Rory_EAS_Setup.md` (managed-workflow build model).
- **expo-blur must be lock-pinned + autolinkable** — managed workflow means EAS runs `prebuild` fresh and autolinks native modules; a stale committed `ios/` Podfile would be the only way to miss the pod, and there is **no committed `ios/`** (managed). Const. Art. 1 fence: editorial work is presentation-only, so the only new native surface is `BlurView`.
- **Env check ordered before build** — `EXPO_PUBLIC_*` vars inline at build time from the EAS environment named in the profile (`environment: production`); missing = compiles-but-blank. Standing carry-over task `sky-verify-eas-supabase-env`.
- **Sequential build discipline** — `LEARNINGS:2026-05-25 — Sequential merge/build discipline`: never run a build while a merge/working-tree change is in flight. Currently clean (the only dirty files are inert `/new-window` docs), so the build is a safe single op.
- **Jordan-trigger check (Const. Art. 7.6):** none fire — this is a build-verification of already-merged presentation/nav/theme code; no location/disability/PII/RLS/external-API/persistence change. Jordan skip per Const. 4.5.4.

## §3 Blocked Nodes
- {node: sky/eas#env-check, why: EAS prod Supabase env vars (`EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`) not verifiable by an agent — they live in EAS, not the repo, type: MISSING_INPUT, unblock: `npx eas-cli env:list --environment production` shows both present}
- {node: sky/eas#build, why: agents cannot run EAS/App Store (Const. Art. 1 external-side-effect), type: DECISION_FOR_SKY, unblock: Sky runs the build command from ~/AccessMap}

## §4 Checkpoint References
- {name: main-synced, role: Rory, artifact: commit:45bca1a, qa-report: new-window-2026-06-20.md:13}
- {name: gate-chain-green, role: Gary, artifact: commit:45bca1a (typecheck 0 · lint 0err/90warn · test 1722 pass/0 fail), qa-report: this file}
- {name: ios-bundle-proxy-clean, role: Rory, artifact: expo export ios → AppEntry .hbc 6.2 MB, 0 unresolved modules, qa-report: this file}
- {name: native-dep-ok, role: Rory, artifact: expo-blur@15.0.8 in package-lock + node_modules + autolinked (no plugin), qa-report: this file}
- {name: eas-config-intact, role: Rory, artifact: eas.json testflight=store/appVersionSource=remote/ascAppId 6774709116 + app.json com.accessmap.app/v3.0.0/ITSAppUsesNonExemptEncryption=false, qa-report: this file}

## §5 Duplication Report
No duplications detected this cycle.

## §6 State Snapshot
- PROJECT_STATE.md current as of 2026-06-20 (compiled by /new-window this session). Build-readiness = GREEN added here; no structural state change.
- DECISIONS_LOG.md: no new structural decision (verification only).
- TASK_GRAPH.json: `sky-eas-build` stays `ready`; `sky-verify-eas-supabase-env` stays `pending` (the gating prerequisite).

---

## The six build determinants — detail

| # | Check | Result |
|---|---|---|
| 1 | Git sync | `local == origin == HEAD == 45bca1a`; tree dirty ONLY with `/new-window` doc edits (PROJECT_STATE/DECISIONS_LOG/TASK_GRAPH) — inert for the bundle. ✅ |
| 2 | Gate chain | typecheck **0** · lint **0 errors** / 90 warnings (baseline) · test **1722 passed / 0 failed** / 117 todo. ✅ |
| 3 | iOS bundle export | `expo export --platform ios` → clean Hermes bundle **6.2 MB**, all modules resolved (incl. `expo-blur`, `ScreenHeader`, `HomeScreen`, `drawerContext`). ✅ |
| 4 | Native deps | `expo-blur@15.0.8` (SDK-54-aligned) in `dependencies` + `package-lock.json` + `node_modules`; autolinked, **no config plugin needed**. ✅ |
| 5 | EAS/app config | eas.json: `cli.appVersionSource=remote`, testflight `distribution=store`/`autoIncrement`/`environment=production`/Release; submit `ascAppId 6774709116`/`appleTeamId S78F8ZA8QU`. app.json: `com.accessmap.app`, v3.0.0, `ITSAppUsesNonExemptEncryption=false`, all 3 usage strings present. ✅ |
| 6 | Web-API leak | New `BlurView` is native-only (`tabBarBackground: Platform.OS==='web' ? undefined : <TabBarGlass/>`); `backdropFilter` web-guarded (+ harmless on native); 3 `document.createElement` sites are pre-existing + `Platform.OS==='web'`-guarded. ✅ |

**Workflow:** MANAGED (no committed `ios/`) → EAS runs `prebuild` fresh and autolinks `expo-blur` cleanly.

**Minor advisory (NOT a blocker):** `expo-doctor` flags `typescript 6.0.3` vs SDK-expected `~5.9.2`. TypeScript is a dev dep — **not bundled, and EAS does not run `tsc`** — so it cannot fail the native build (and typecheck already passes at 0 on 6.0.3). Optional hygiene: `npx expo install typescript` to pin back to ~5.9.2. Does not gate the build.

---

## DECISIONS FOR SKY
1. **Run the env check first** (the one real prerequisite). From `~/AccessMap`:
   `npx eas-cli env:list --environment production` — confirm both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present. Missing = build compiles but the app launches blank.
2. **Then build** (agents can't run EAS): `npx eas-cli build --platform ios --profile testflight --non-interactive` (~15–20 min).
3. **Then submit:** `npx eas-cli submit --platform ios --profile production --latest --non-interactive`.
4. Carry-over (pre-existing, not build-gating): rotate reviewer password before App-Store review · points-value drift (live 10/3/15/7) · this TestFlight build is also the deferred on-device a11y/VoiceOver pass for all the new editorial surfaces.
