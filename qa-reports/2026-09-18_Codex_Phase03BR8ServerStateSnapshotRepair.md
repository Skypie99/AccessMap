# Codex Phase 03B R8 Server-State Snapshot Repair Report — 2026-09-18

## 1. DECISIONS FOR SKY

- [ ] **Commission a genuinely fresh independent R8 review** — review exact packet commit `d2632f1dcf9b21f67f95c27fa37794d84dc96391`; do not reuse this repair executor as reviewer.
  - **Action:** Give the immutable commit and this report to a fresh reviewer; do not run the production controller.
  - **Rollback:** No production rollback is needed; reject the local R8 branch if review fails.
  - **Why deferred:** R8 changes production safety-control code and the accepted R7 review cannot accept new bytes.
  - **Owner:** Sky

## 2. BLOCKERS / FAIL_FAST

- **FAIL_FAST — repository TypeScript gate could not resolve three packages** while borrowing the primary checkout's existing `node_modules`: `@maplibre/maplibre-gl-leaflet`, `expo-crypto`, and `expo-secure-store`. No dependency install was authorized or performed. The R8 packet's executable JS/SQL validation is independent and passed.

## 3. Summary

R8 repairs one root defect without changing application or migration bytes. The owner preflight did not expose overlapping schema branches: its Supabase CLI output was a one-element row array, R7 returned that array as the snapshot, and both object branches therefore matched zero. R8 strictly unwraps exactly one supported CLI row, retains `oneOf` and the existing `querySucceeded` discriminator, adds the exact owner fixture and ten focused regressions, reruns all R7 controls, and passes a fresh linked production read-only preflight.

## 4. What Shipped (Checkpoints)

- `d2632f1dcf9b21f67f95c27fa37794d84dc96391` — R8 packet, exact owner live-shape fixture, strict row extraction, branch-match probes, full local receipts, privacy scan, manifests, and live read-only evidence.
- Branch: `codex/flagstone-p03b-r8-schema-repair-20260918`
- Base: R7 packet commit `4dd4ebd7ae6295c8ebb204583f42932db7fb4c95`
- Candidate remains `9d638456fa8e679678c54f131fe8f0db723eda72` / tree `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`.

## 5. What's Proposed (Not Applied)

| Proposal | File path | What it does | Impact | Rollback documented? |
|---|---|---|---|---|
| R8 production apply packet | `qa-reports/phase03b/2026-09-18-production-apply-packet-r8/` | Supersedes R7 only after fresh independent acceptance | Local proposal only | Yes |
| R8 live read-only evidence | `qa-reports/phase03b/2026-09-18-production-apply-packet-r8-live-readonly-preflight/` | Proves the repaired adjudicator against the linked target | Read-only; no quiescence/apply | Not applicable |

## 6. Findings by Domain

### Data / Schema

- 🟢 `#/$defs/serverObserved/properties/snapshot/oneOf` is mutually exclusive: failure requires `querySucceeded=false`; success requires `querySucceeded=true`; both reject unknown keys.
- 🟢 Exact owner failure shape: `[{phase03b_server_state_r7: <snapshot object>}]`. R7's `resultRow()` returned the array because it did not support this CLI wrapper.
- 🟢 R8 accepts only an exact one-row legacy array wrapper, current `rows` wrapper, or direct keyed row; malformed and multi-row shapes fail closed.

### Privacy

- 🟢 Packet privacy scan: `PASS`, 47 pre-scan artifacts checked, zero secret-pattern findings; the final manifest pins 48 non-manifest artifacts.
- 🟢 Live evidence scan: `PASS`, zero secret-pattern findings. The SQL retains hashes/counts only and no row payloads or query text.

### Tests / CI

- `node .../run_local_validation.mjs` — `PASS`; 182 R8 checks, 172 untouched R7 checks, child exits `[0,0,0,0]`, validation infrastructure destroyed.
- New R8 schema regression cases: `10/10`.
- Ported strict validator cases: `35/35`; inherited R5/R6 branch cases: `30/30` and `40/40`.
- Packet manifest: 48/48 artifacts verified.
- Live evidence manifest: 3/3 source artifacts verified.
- `npm run typecheck` — failed only on three unresolved modules listed in §2; no application source changed.

## 6.5 Process Self-Check

### Efficiency Check

Reviewed the R7 packet commit, owner runbook, retained owner `/tmp` evidence, and prior Phase 03B memory before repair. The retained failure capture avoided guessing the live CLI shape.

### Overlap Check

The R7 packet and independent review were preserved as immutable sources. R8 is a new worktree and branch; no concurrent worktree was modified.

### Simplification Opportunities

Changing `oneOf` to `anyOf` was rejected because it would weaken the schema and would not fix an array reaching an object schema. The extractor repair is the smallest layer-correct change.

## 7. Gates

```bash
node qa-reports/phase03b/2026-09-18-production-apply-packet-r8/run_local_validation.mjs
```

Result: `PASS` — local `182`, preserved R7 `172`, new R8 schema `10/10`.

```bash
node qa-reports/phase03b/2026-09-18-production-apply-packet-r8/adjudicate_server_state.mjs --evidence=<new-private-path> --run-id=<uuid> --controller-pid=<pid> --monotonic-origin=<monotonic-ms>
```

Result: `ENTRY_CONFIRMED_NOT_COMMITTED`, `GATE_ABSENT`, `APPLY_NOT_STARTED`, `transaction_read_only=on`, ledger `85/85`, Phase 03B versions `[]`, HTTP queue `0`, response count `6`, accepted fingerprint unchanged.

```bash
shasum -a 256 -c qa-reports/phase03b/2026-09-18-production-apply-packet-r8/ARTIFACT_MANIFEST.sha256
```

Result: 48/48 `OK`.

## 8. Required Output

```text
PHASE03B_PRODUCTION_APPLY_PACKET_R8_REPAIR: PASS
SOURCE_R7_PACKET_COMMIT: 4dd4ebd7ae6295c8ebb204583f42932db7fb4c95
SOURCE_R7_INDEPENDENT_REVIEW_COMMIT: f39e126f7573d8e218e0fbbf49326c395cb301e2
R8_ROOT_DEFECT_COUNT: 1
SERVER_STATE_SNAPSHOT_ONEOF_AMBIGUITY: PASS
EXACT_OVERLAP_ROOT_CAUSE: No branch overlap existed. The live CLI returned a one-row array wrapper; R7 returned the array as observed.snapshot, so both object branches matched zero. R8 strictly extracts the single keyed row before applying the existing true/false discriminator.
MUTUALLY_EXCLUSIVE_BRANCHES: YES
LIVE_SHAPED_REGRESSION_FIXTURE: PASS
STRICT_R8_ENVELOPE_SCHEMA: PASS
EXACT_KEY_VALIDATION: PASS
UNKNOWN_KEY_REJECTION: PASS
NESTED_UNKNOWN_KEY_REJECTION: PASS
CONTRADICTION_REJECTION: PASS
SERVER_STATE_CLASSIFICATION_EXACT_VALIDATION: PASS
SERVER_STATE_CLASSIFIER_HASH_PINNING: PASS
LIVE_READ_ONLY_SERVER_STATE_PREFLIGHT: PASS
LIVE_TRANSACTION_READ_ONLY: YES
ENTRY_AMBIGUITY_SERVER_ADJUDICATION: PASS
MAX_QUIESCENCE_HARD_LATCH: PASS
SINGLE_RESTORATION_DISPATCHER: PASS
RESTORATION_AFTER_600S: BLOCKED
EXACT_TWO_MIGRATIONS_ONLY: YES
LOCAL_REPLAY_CHECK_COUNT: 182
NEW_R8_SCHEMA_TESTS: 10/10
CANDIDATE_BYTES_CHANGED: NO
PRODUCTION_MUTATIONS: NONE
QUIESCENCE_ENTERED: NO
PRODUCTION_APPLY_EXECUTED: NO
ONE_RUN_AUTHORIZATION_STATUS: UNUSED
PHASE_03C_STARTED: NO
R8_PACKET_EVIDENCE_COMMIT: d2632f1dcf9b21f67f95c27fa37794d84dc96391
PHASE03B_R8_PACKET_INDEPENDENT_REVIEW: READY
NEXT_SAFE_ACTION: Commission one genuinely fresh independent review of commit d2632f1dcf9b21f67f95c27fa37794d84dc96391; do not run the production controller.
```

## 9. What's Left

- Fresh independent R8 review only.
- No push, merge, production apply, quiescence, release, or Phase 03C action is authorized by this repair.
