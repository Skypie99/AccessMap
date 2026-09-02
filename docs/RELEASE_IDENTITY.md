# Flagstone Release Identity — the control plane

**Status:** canonical human policy (Release Source Lock v2, 2026-09-02). Machine authority is
`release/current.json`. If this document and the manifest disagree, the manifest wins and this
document is wrong — fix the document.

**Why this exists.** Build 33 exposed a governance failure: the submitted iOS source was newer
than `main`, the public demo kept deploying stale `main` (CARTO, "API KEY REQUIRED"), Vercel
Branch Tracking was changed without the serving deployment changing, and only an exact-SHA
promotion plus independent domain verification fixed it. This control plane makes that class
of failure hard to repeat.

---

## 0. Commands

| Command | What it does | Network | Writes |
|---|---|---|---|
| `npm run release:preflight` | Real Git identity of this checkout (worktree, HEAD, tree, origin/main, dirty tree, app version, EAS version-source rule). `-- --build-sensitive` makes a dirty tracked tree fatal. `-- --ls-remote` adds live origin/main. | none (opt-in read) | none |
| `npm run release:verify` | Central validator: manifest vs real Git objects (see §24). `-- --remote` adds one `ls-remote` of the production branch. `-- --json` for machines. | none (opt-in read) | none |
| `npm run release:status` | One-screen human status. Same validator, different print. | none | none |
| `npm run release:render` | Regenerates `qa-reports/CURRENT_RELEASE.md` from the manifest. `-- --check` only compares. | none | rendered doc |
| `npm run release:finalize -- …` | Records an already-built, already-verified release. Dry-run by default; `--write` applies (atomic). Hard gate: intended SHA == EAS SHA. | none | manifest + rendered doc (only with `--write`) |
| `npm run release:web:verify-live` | Fetches `/release-meta.json` from every production domain (cache-busted) and compares to the manifest. Legacy Build 33: no network, reports the receipt. | yes (future releases) | none |
| `npm run release:meta -- --out dist/release-meta.json` | FUTURE build artifact generator. Reports the ACTUAL build source. **Not wired into any build.** | none | only with `--out` |

All scripts are Node built-ins only (`scripts/release-lib.mjs` is the shared engine); CI runs
them without `npm ci`. Focused tests: `scripts/__tests__/releaseTools.test.ts`.

---

## 1. Control plane ≠ release source

```
IMMUTABLE RELEASE SOURCE COMMIT          (historical Git object, e.g. f559417…)
        ↓
EAS / WEB BUILDS ACTUAL SOURCE
        ↓
LATER GOVERNANCE METADATA RECORDS THAT SHA   (release/current.json on main)
        ↓
LIVE ARTIFACT REPORTS ITS ACTUAL BUILD SHA   (/release-meta.json, future)
        ↓
CONTROL-PLANE VERIFIER COMPARES LIVE SHA TO MANIFEST
```

Invariants:

- The manifest lives on canonical governance history (normally `main`). It describes
  immutable historical commits. **It never has to exist inside the commit it describes** — that
  would be self-referential and impossible for the final record.
- The metadata commit is NOT the app/web release source. `main` can carry the rules while
  release identity points at historical app/web commits.
- One machine authority: `release/current.json` (schema v2; reference shape in
  `release/schema.json`). Human docs are derived from it (`release:render`). Do not create
  competing hand-maintained identity files. Historical receipts are evidence, never rewritten.

## 2. Current Build 33 app identity

| Field | Value |
|---|---|
| Version / iOS build | 4.1.1 / 33 |
| Source commit | `f5594171e75bc5ec92a87d0392c361601ddedfba` |
| Source tree | `a4a5e70c1a413d39e457f5254af1bba91f08d7ed` |
| EAS source | `f5594171e75bc5ec92a87d0392c361601ddedfba` (== intended) |
| EAS version source | remote (local `app.json` buildNumber `15` is diagnostic only) |
| App Store | submitted_for_review |
| EAS build ID / profile / created / origin-main-at-build | **UNPROVEN** — not in primary evidence and not invented |

`a0bf4d0…` was proven to be `main` only at the later web-deployment decision, not at EAS build
time, so `originMainAtBuild` is `null`. Historical honesty outranks a prettier manifest.

## 3. Current Build 33 web identity

| Field | Value |
|---|---|
| Mode | `web-only-descendant` (APPROVED WEB-ONLY DESCENDANT) |
| Base (== app source) | `f5594171e75bc5ec92a87d0392c361601ddedfba` |
| Source commit / tree | `ebf091c21066d39898160b1357bde0aa35bdb8bf` / `6cb842e3be0f4c3bfec569307829ad240d3f270a` |
| Ancestry | `git merge-base --is-ancestor f559417… ebf091c…` → PASS |
| Overlay | Accepted OpenFreeMap web basemap repair for the Build 33 demo (approved; receipt below) |
| Frozen branch | `release/web-4.1.1-build33-openfreemap` @ `ebf091c…` — **do not move it** |
| Vercel | project `access-map`, team `skypie99s-projects`, production branch = frozen branch, deployment `HMszH26wADRRDd1CqH4UkJ8kAugQ` @ `ebf091c…` |
| Domains | `flagstone.skypistudio.com` (primary recruiter path), `accessmap.skypistudio.com` |
| Live identity mode | `legacy-triangulated` (no release-meta endpoint; see §12) |
| Receipt | `qa-reports/2026-09-01_Build33_WebDeploymentDecision.md`; identity receipt `qa-reports/releases/2026-09-01_Flagstone_4.1.1_Build33_ReleaseIdentity.md` |

## 4. Mode A — exact (DEFAULT)

`web.syncMode = "exact"`. Required: `web.sourceCommit == app.sourceCommit` and
`web.sourceTree == app.sourceTree`; `web.overlay` must be `null`. `release:finalize` chooses this
by default whenever the app source changes ("web follows app").

## 5. Mode B — web-only descendant

`web.syncMode = "web-only-descendant"`. Allowed only for a genuine web-specific repair.
Required: `app.sourceCommit` is an ancestor of `web.sourceCommit`; `web.baseReleaseCommit ==
app.sourceCommit`; overlay `{ baseCommit, headCommit, reason, approved: true, receipt }` where
the receipt file exists in the repo. The tools print:

```
WEB SOURCE DIFFERS FROM IOS SOURCE
MODE: APPROVED WEB-ONLY DESCENDANT
```

This is an explicit platform overlay, not silent drift. Record it with
`release:finalize -- … --web-sync web-only-descendant --web-source-sha … --overlay-reason "…"
--overlay-receipt qa-reports/… --overlay-approved yes`.

## 6. Meaningful demo update gate

Do not update the public demo for every EAS build. Internal / preview / retry builds never
advance the canonical demo target. Before a public-demo release, record:

```
DEMO UPDATE REQUIRED: YES / NO
```

Normally YES for a recruiter-visible UI change, product-significant capability, accessibility
improvement, branding/presentation change, map/data-presentation change, public-demo bug fix,
or any difference an evaluator would notice. Normally NO for EAS retries, build-system-only,
test-only, metadata-only, invisible refactors, dependency work with no public behavior change.

**Third-state rule (deliberately not designed in v2):** *a new finalized App Store release
plus no demo update requires an explicit governance decision.* The v2 manifest cannot express
"app advanced, demo intentionally older" as a passing state: `web.baseReleaseCommit` must equal
`app.sourceCommit`, so `release:verify` fails with `APP ↔ WEB NOT SYNCHRONIZED … explicit
governance decision` until either the web is advanced (exact or approved descendant) or a
future governance amendment defines the third state. Never call APP ↔ WEB "synchronized" by
hand to get around that.

## 7. EAS remote-version-source rule

`eas.json` has `cli.appVersionSource = "remote"`. Therefore:

- `app.json` `ios.buildNumber` is **NOT** authoritative for the submitted build number. It is
  diagnostic only (it currently says `15`; Build 33 shipped).
- Authoritative build number = EAS build details / verified release evidence.
- `release:preflight` prints `EAS VERSION SOURCE: REMOTE / LOCAL IOS BUILD NUMBER: <n> / LOCAL
  BUILD NUMBER AUTHORITATIVE: NO`.
- `release:finalize` requires `--build` (or an evidence file's `appBuildVersion`) and fails with
  `BUILD NUMBER UNPROVEN` rather than reading `app.json`.
- `docs/RELEASE_PLAYBOOK.md` still describes `autoIncrement` bumping `app.json` — that is the
  local-source behaviour and is stale under remote sourcing. Trust this document and EAS.

## 8. Release finalization

`release:finalize` records an already-created, already-verified release. It never launches
EAS, submits to Apple, pushes, tags, or deploys.

```bash
# dry run (default) — validates the complete new state, prints proposed changes
npm run release:finalize -- --version 4.1.2 --build 34 \
  --source-sha <INTENDED SHA> --eas-source-sha <SHA FROM EAS BUILD DETAILS> \
  --eas-build-id <id> --profile testflight --status FINISHED \
  --app-store-status submitted_for_review
# apply
npm run release:finalize -- … --write
# or from a sanitized `eas build:view --json` file (only identity keys are read or printed)
npm run release:finalize -- --source-sha <INTENDED SHA> --evidence ./eas-build.json --write
```

Guarantees: **hard gate** `INTENDED == EAS` (else `RELEASE IDENTITY FAIL / INTENDED / EAS /
CURRENT RELEASE STATE NOT UPDATED`, exit 1); evidence-vs-flag conflicts STOP; the whole
candidate is validated with the same engine as `release:verify` before anything is written;
writes go temp-file → fsync → atomic rename (never a half-written manifest); identical input is
idempotent (`NO CHANGE`); an interrupted run's temp file is removed on the next run; a corrupt
manifest is refused with the recovery command `git checkout -- release/current.json`.

When the app source changes the web section is re-targeted (exact by default) and the
deployment record resets to `UNPROVEN`. After the deploy is independently verified, record it:

```bash
npm run release:finalize -- --target web-deployment \
  --deployment-id <vercel deployment id> --deployed-sha <serving SHA> \
  --production-branch <branch> --receipt qa-reports/<receipt>.md --verified-at <iso> --write
```

Hard gate: `--deployed-sha` must equal `web.sourceCommit`.

## 9. Immutable receipts

Every release keeps a short immutable receipt under `qa-reports/releases/` that references (not
duplicates) the full deployment decision. Historical QA is never rewritten; a correction is a
new file. Evidence hierarchy (§25) puts the manifest first and receipts second.

## 10. `main` vs release

`governance.releaseCodeIntegration` is `deferred`: `main` (`c462647…`, a docs-only child of
`a0bf4d0…`) does **not** contain Build 33 product code, and converging it is a SEPARATE RELEASE
DECISION. The verifier cross-checks the claim against `origin/main` (a `converged` claim that
`main` contradicts fails; a `deferred` claim that `main` already satisfies warns). "main is
behind Build 33" is not a problem the release tooling is authorized to solve.

## 11. release-meta architecture (future releases)

Artifact: `/release-meta.json`, generated by `scripts/release-meta.mjs` at build time from the
**actual** checked-out Git source (or the build provider's Git metadata when no `.git` exists;
a conflict between the two fails the build):

```json
{ "schemaVersion": 1, "product": "Flagstone", "appVersion": "4.1.2", "iosBuild": 34,
  "webSourceCommit": "<ACTUAL BUILD SHA>", "webSourceTree": "<ACTUAL TREE OR null>",
  "builtAt": "<REAL BUILD TIMESTAMP>" }
```

It never copies `web.sourceCommit` from the manifest (the verifier already knows the expected
value — copying it would make the check meaningless). No `appReleaseCommit` in the artifact (the
control plane knows it; this avoids forcing the final manifest into its own source commit). No
secrets, environment values, user data, Supabase keys, or tokens — the generator reads exactly
one environment variable (`VERCEL_GIT_COMMIT_SHA`, a SHA) and emits exactly seven keys.
`iosBuild` comes only from an explicit nonsecret input (`--ios-build`), never `app.json`.

**Not wired into the current Build 33 production build.** Activation is §23.

## 12. Build 33 legacy live-verification exception

Build 33 has no release-meta. Its live identity was triangulated from Vercel deployment
branch + full-SHA metadata, the Vercel → GitHub exact commit link, and live custom-domain bundle
filenames matching the deployment output. `release:web:verify-live` therefore makes **no
network request** for Build 33 and prints:

```
BUILD 33 LIVE IDENTITY: LEGACY VERIFIED BY IMMUTABLE DEPLOYMENT RECEIPT
```

release-meta becomes mandatory for the first future release after the tooling is activated on
the converged/current lineage. Do not retrofit Build 33; do not touch the frozen branch.

## 13. Vercel project identity

Display name `access-map`, team `skypie99s-projects`, connected repository
`Skypie99/AccessMap`, production domains `flagstone.skypistudio.com` (primary recruiter path)
and `accessmap.skypistudio.com`. Establish project identity from the connected repository +
production domain; do not require the display name to equal "Flagstone".

## 14. Branch Tracking ≠ serving deployment (permanent rule)

Changing Vercel Production Branch / Branch Tracking does NOT prove the new source is serving.
Build 33 proved: (1) Branch Tracking changed `main` → frozen branch; (2) the OLD `main`
deployment kept serving; (3) the existing exact-SHA Preview was promoted; (4) Vercel created a
new Production deployment; (5) only once it was Ready + Current did the domain serve `ebf091c…`.

Always track separately: **EXPECTED PRODUCTION BRANCH · SERVING PRODUCTION DEPLOYMENT ·
SERVING PRODUCTION SHA**. A branch-name match never satisfies LIVE IDENTITY PASS. The UI path
observed was Settings → Environments → Production → Branch Tracking; find the semantic setting
if Vercel moves it.

Approved promotion pattern: if a Preview deployment already exists at the exact approved WEB
SHA — re-verify exact branch + full SHA immediately before acting, use Vercel's supported
"Promote to Production", record the Preview deployment ID and the new Production deployment ID,
wait for Ready, independently verify Current, independently verify every custom domain. Never
create a meaningless commit merely to trigger production.

## 15. Vercel interruption / resume state machine

| State | Condition | Action |
|---|---|---|
| A — pre-deployment | old production branch, old serving deployment | proceed with the runbook |
| B — Branch Tracking banked | target branch configured, old deployment may still serve | do NOT toggle the branch again; verify/promote/deploy the exact target SHA |
| C — exact target serving | target branch configured, serving deployment = exact WEB SHA | do NOT redeploy; proceed to live acceptance |
| UNSAFE | wrong SHA, unknown deployment source, unexpected project/domain state | STOP |

Never repeat a production mutation because the previous transcript ended early. Real Vercel
state wins over conversational memory. Determine the state by reading Vercel, then act once.

## 16. Mutation banking law

After EVERY production-relevant mutation: (1) execute one mutation, (2) immediately read the
real resulting state, (3) verify the exact expected identity, (4) record a checkpoint, (5) only
then continue. Applies to: local release ref, remote frozen branch, tag, Branch Tracking,
promotion/deploy, rollback, final documentation integration. Runbooks must be resumable.

Temporary checkpoints live OUTSIDE Git (e.g. the session scratchpad) and may record timestamp,
phase, branch, deployment ID, source SHA, next safe action. They never record passwords,
cookies, tokens, or secret env values. If no real clock is available, omit the timestamp;
never fabricate one.

## 17. Service worker / cache requirement

`public/sw.js` ships with the web build. Its catch-all branch is StaleWhileRevalidate for
same-origin GETs, which would serve a **stale** `/release-meta.json` from cache. Before
release-meta is activated on a future lineage: exclude `/release-meta.json` from
service-worker precache and runtime caching (or prove it cannot return stale identity), prefer
`no-store` response headers where the host supports it, keep the live verifier cache-busted
(it already sends `?nocache=`, `cache: no-store`, `Cache-Control: no-cache`, `Pragma:
no-cache`), and include fresh-tab + hard-reload checks in recruiter acceptance. Do not modify
the frozen Build 33 source to retrofit this.

## 18. Source identity PASS ≠ experience PASS

Two independent judgments for every release:

- **A. RELEASE IDENTITY** — PASS only when the exact expected source is serving.
- **B. RECRUITER / PRODUCT EXPERIENCE** — PASS / PASS WITH NOTES / FAIL. Minimum path:
  skypistudio.com → Flagstone case study → LIVE MAP → flagstone.skypistudio.com. Checks: first
  impression, correct basemap/provider, current release UI, real production data, core map
  interaction, light/dark, fresh tab, hard reload, service-worker/cache resilience, responsive
  spot check when meaningful, critical console/network failures when tooling permits.

Every tool prints `RECRUITER / PRODUCT EXPERIENCE: SEPARATE GATE — NOT ASSESSED BY THIS TOOL`.
Do not call EXPERIENCE PASS because the SHA matches. Do not call IDENTITY FAIL because DevTools
are unavailable. **PASS WITH NOTES** = identity proven, critical functionality passes, no
blocking recruiter-facing issue, but explicitly named noncritical checks remain unverified.
Never silently upgrade UNVERIFIED to PASS.

## 19. Post-deploy documentation timing

A post-deployment receipt must not accidentally change the serving production source. While
production is branch-bound to `main`, do not land a documentation commit on `main` until the
intended production source is safely serving or the host is proven not to deploy that commit.
Build 33 order: frozen web ref → Vercel branch switch → exact deployment promotion → live
acceptance → documentation commit to `main`. Keep this rule until deployment automation makes
the production source explicit by immutable SHA.

## 20. Sky authority

Sky retains final authority for: `main` merge/integration, `main` push, tag push, production
deployment approval, EAS/App Store submission (unless separately delegated). If Claude Code's
permission classifier blocks an otherwise-authorized push: verify nothing changed, return the
exact proposed command, stop. Do not weaken permissions, switch integration method, create a
PR, force, or retry through another tool. Permission denial is a safe stop.

## 21. Emergency recovery

- **Wrong source serving:** Vercel → promote/redeploy the recorded rollback deployment
  (Build 33 rollback: `8xwqMtYrg8GvieZgseLUfofVYoGx` = `main @ a0bf4d0…`), then re-verify the
  serving deployment + SHA + domains. Rollback is a host operation; it never rewrites Git.
- **Corrupt or half-written manifest:** `git checkout -- release/current.json` (the control
  plane is versioned); the tools refuse to overwrite a corrupt file.
- **Frozen branch moved:** do not "fix" it by force-pushing; report `origin` vs manifest,
  `release:verify` already fails on the mismatch, escalate to Sky.
- **Conflicting trustworthy evidence:** STOP. Do not pick the plausible value.
- **Identity unavailable:** `RELEASE SOURCE IDENTITY: UNPROVEN` — STOP.

## 22. Exact future happy path

1. Decide whether this EAS/app release is a candidate for canonical release state (internal /
   retry builds are not).
2. `npm run release:preflight -- --build-sensitive` on the exact prepared source.
3. Complete required product QA.
4. Launch EAS from that exact source (Sky-authorized; never unattended).
5. After EAS, independently verify `EAS SOURCE SHA == INTENDED APP SOURCE SHA` from EAS build
   details; take the build number from EAS evidence (remote version source).
6. `npm run release:finalize -- …` (dry run).
7. With explicit approval: `npm run release:finalize -- … --write`.
8. `npm run release:verify && npm run release:render && npm run release:status`.
9. Record `DEMO UPDATE REQUIRED: YES / NO`. NO for an internal/nonfinal build → stop. A new
   finalized App Store release that keeps an older demo needs a separate explicit governance
   decision (§6).
10. Choose web source: DEFAULT `WEB = APP` (exact); EXCEPTION approved web-only descendant.
11. Create/push immutable release refs (frozen branch / tag) only with Sky authorization.
12. Deploy the exact expected WEB source (promotion pattern, §14).
13. Verify: expected Production Branch, serving deployment ID, serving deployment SHA, all
    production domains. Then `release:finalize -- --target web-deployment … --write`.
14. release-meta-enabled builds: `npm run release:web:verify-live`.
15. Recruiter/product acceptance (separate gate, §18).
16. Only after deployment/acceptance is safely banked: commit the deployment receipt
    (`qa-reports/…`, `qa-reports/releases/…`), the manifest, and the rendered doc to
    governance `main` (§19).
17. Final frozen-ref verification (`npm run release:verify -- --remote`). DONE.

## 23. Deferred activation checklist (after a separately approved main convergence)

Do not perform these today.

1. Confirm the release tooling survived convergence (`npm run release:verify` on the merged
   tree; the Jest suite passes).
2. Verify `release/current.json` still describes reality; update `governance.releaseCodeIntegration`
   via `release:finalize -- … --release-code-integration converged` when true.
3. Choose the next finalized release source.
4. Wire `scripts/release-meta.mjs` into THAT lineage's web build (e.g. generate into the export
   output after `expo export --platform web`, or a build step in `vercel.json`), so
   `/release-meta.json` reports the actual build SHA.
5. Exclude `/release-meta.json` from stale service-worker caching (§17) and prefer `no-store`
   headers for it in `vercel.json`.
6. Configure explicit production-source coupling (production branch ↔ manifest; every deploy
   records `deploymentId` + `deployedCommit`).
7. Prove Vercel/build behaviour in a Preview deployment first.
8. Run exact-SHA live verification (`release:web:verify-live`).
9. Enable production automation only after that evidence.
10. Retire the temporary Build 33 frozen-branch exception when its exit conditions hold
    (`DECISIONS_LOG.md` `[WEB-DEPLOY-BUILD33-SPLIT]`): main audited/approved to the shipped
    lineage; main contains the accepted web source or an approved successor; Vercel Production
    Branch returned to `main`; live demo re-verified; exception explicitly retired.

Current audit result (2026-09-02): **FUTURE AUTO-COUPLING: DEFER UNTIL MAIN CONVERGENCE.**
Production is intentionally served from the frozen Build 33 branch; nothing in the hosting
configuration was changed.

## 24. Prohibited source states (`release:verify` fails)

Malformed or short SHAs · missing Git objects · tree does not match commit · exact mode with
different app/web SHAs · descendant mode failing ancestry (unrelated source) · descendant
without overlay · overlay approval not explicitly `true` · overlay receipt missing · web base
≠ app source · EAS source ≠ intended source · eas.json version source ≠ manifest · recorded
deployed SHA ≠ expected web source · production branch head (local `origin/*` ref) ≠ expected
web source · `converged` claim contradicted by `origin/main` · rendered `CURRENT_RELEASE.md`
drifted · shallow clone (cannot prove ancestry) · unreadable manifest. UNPROVEN values are
reported as UNPROVEN and never as PASS.

Never infer release source from `main`, branch recency, worktree recency, the newest commit,
visual similarity, QA timestamps, agent memory, or "the branch that looks right".

## 25. Evidence hierarchy

1. `release/current.json` · 2. immutable release receipt · 3. immutable release tag ·
4. EAS Build Details Git SHA · 5. Git commit/tree verification · 6. live release-meta identity
(web). For Build 33 the deployment receipt is primary. If trustworthy sources conflict: STOP.

## 26. Git worktree reality

Agents must detect the actual runtime state (`git rev-parse --git-common-dir`,
`--show-toplevel`), record the worktree path, preserve the current checkout, and never create
another worktree merely to satisfy a sentence in a prompt. `release:preflight` prints all of it
and does not fail because a linked worktree exists.
