# Capture the two missing live evidence artifacts (owner-run only)

**Prepared, not executed.** This session made no production or staging contact
while preparing this file. It only writes down the exact commands an owner
(or a differently-permissioned trusted tool) would run to close the
independent review's evidence gap: `proof.json` and `edge_function.json` were
never saved next to the already-saved `structure_catalog.json` in
`CAPTURED_FINAL_STRUCTURE/`, so the ledger/gate/pg_net proof and the Edge
Function identity check have never been independently re-hashable from a
file — only asserted via chat report. This is what the fixed
`compare_captured_results.mjs` now correctly refuses to let ride to an
`overall: PASS`.

Everything below is **read-only**: two `SELECT`-only SQL captures and one
`list` API call. Nothing here applies a migration, touches the gate, or
performs restoration.

## Preconditions

- Pinned Supabase CLI version `2.116.0`, already authenticated to
  `kldlwszpfkdmsjrjhjym`.
- Run from a shell that has NOT already exported a different `SUPABASE_PROJECT_REF`
  or similar env var that could silently override `--project-ref` below.

## The commands

```bash
#!/usr/bin/env bash
# Owner-run only. NOT executed by this session. Read-only capture of
# proof.json and edge_function.json into the existing CAPTURED_FINAL_STRUCTURE/
# directory (where structure_catalog.json already lives). No mutation, no
# migration apply, no restoration, no staging contact.
set -euo pipefail

PROJECT_REF="kldlwszpfkdmsjrjhjym"
FORBIDDEN_STAGING_REF="cepayqmsoqxshsiyqnvz"
PINNED_CLI_VERSION="2.116.0"

HANDOFF="/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff"
CAPTURED="$HANDOFF/CAPTURED_FINAL_STRUCTURE"
PROOF_SQL="$HANDOFF/01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql"
PROOF_OUT="$CAPTURED/proof.json"
EDGE_OUT="$CAPTURED/edge_function.json"

# --- Refuse a mistargeted or drifted project, before touching anything. ---
if [ "$PROJECT_REF" = "$FORBIDDEN_STAGING_REF" ]; then
  echo "REFUSING: PROJECT_REF resolves to the forbidden staging ref" >&2
  exit 1
fi

ACTUAL_CLI_VERSION="$(supabase --version)"
if [ "$ACTUAL_CLI_VERSION" != "$PINNED_CLI_VERSION" ]; then
  echo "REFUSING: supabase CLI reports '$ACTUAL_CLI_VERSION', pinned version is '$PINNED_CLI_VERSION'" >&2
  exit 1
fi

if [ ! -f "$PROOF_SQL" ]; then
  echo "REFUSING: expected SQL file not found: $PROOF_SQL" >&2
  exit 1
fi

# --- Refuse overwrite of existing evidence. ---
if [ -e "$PROOF_OUT" ]; then
  echo "REFUSING: $PROOF_OUT already exists -- will not overwrite existing evidence" >&2
  exit 1
fi
if [ -e "$EDGE_OUT" ]; then
  echo "REFUSING: $EDGE_OUT already exists -- will not overwrite existing evidence" >&2
  exit 1
fi

mkdir -p "$CAPTURED"

# --- 1. Ledger/gate/pg_net proof: read-only SELECT, exact project, exact
#        already-reviewed SQL file, exact jq extraction already used in
#        RESTORATION_RUNBOOK.md section 8 step 1. Written to a .tmp path
#        first and moved into place with mv -n so a mid-run interruption or
#        a race can never partially clobber real evidence. ---
supabase db query --linked --project-ref "$PROJECT_REF" --file "$PROOF_SQL" --output-format json \
  | jq '.[0].phase03b_quiescence_proof_r3' \
  > "$PROOF_OUT.tmp"
mv -n "$PROOF_OUT.tmp" "$PROOF_OUT"

# --- 2. Edge Function identity: read-only list call, exact project. This is
#        a CLI/API call, not SQL -- there is no separate vetted SQL file for
#        it (see EXPECTED_VALUES.json .edgeFunctionIdentity.method). ---
supabase functions list --project-ref "$PROJECT_REF" --output-format json \
  > "$EDGE_OUT.tmp"
mv -n "$EDGE_OUT.tmp" "$EDGE_OUT"

echo "Saved: $PROOF_OUT"
echo "Saved: $EDGE_OUT"
echo "Next: re-run the fixed comparator (see below) and require a genuine overall PASS."
```

Notes on why each safety property holds:

| Requirement | How it's met |
|---|---|
| Targets exactly `kldlwszpfkdmsjrjhjym` | `PROJECT_REF` is a hardcoded literal, passed explicitly to every command (`--project-ref`), never inherited from an ambient/linked default alone; a self-check refuses if it ever equalled the forbidden staging ref |
| Read-only | `supabase db query` runs a `SELECT`-only file already reviewed for this saga; `supabase functions list` is a `GET`-equivalent list call; neither writes |
| Uses existing vetted logic | Same SQL file, same `jq` extraction path, and the same CLI invocation shape already reviewed and present in `RESTORATION_RUNBOOK.md` section 8 step 1 |
| Saves complete machine-readable evidence | Full JSON written to file via `--output-format json`, no truncation, no jq filtering on the Edge Function call |
| Refuses overwrite | Explicit existence checks before either capture starts, plus a `.tmp` + `mv -n` (no-clobber) write for each file |
| Fails fast | `set -euo pipefail` — a failed CLI call, a failed `jq`, or a failed pipe stage aborts immediately, before the following steps run |
| Exact pinned CLI version | `supabase --version` is compared byte-for-byte against `2.116.0` before any live call; any drift refuses |
| No accidental inherited target | `--project-ref` is passed explicitly on every call; no step relies on `--linked` alone |
| No large payload printed unnecessarily | Output is redirected straight to file; only short confirmation lines are echoed |
| No mutation / no migration apply / no restoration | Every live call is a read (`SELECT` / `list`); nothing here can drop, alter, or write |

## After capture: rerun the fixed comparator and require a genuine PASS

```bash
node "/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/compare_captured_results.mjs" \
  --captured="/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/CAPTURED_FINAL_STRUCTURE"
```

With the aggregation repair in place, this now requires exactly `"overall": "PASS"` with exit code `0` for the run to mean anything -- a `NOT_RUN` on `LIVE_GATE_AND_LEDGER` or `EDGE_FUNCTION_IDENTITY` (evidence still missing or capture still incomplete) will surface as `overall: HOLD`, exit code `1`, not as a silent PASS. Only a genuine `PASS`/`0` across all three required sections
(`LIVE_GATE_AND_LEDGER`, `FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS`,
`EDGE_FUNCTION_IDENTITY`) closes runbook section 2/section 10's evidence gap.
`CLIENT_COMPATIBILITY` will still correctly read `NOT_RUN` and must not be
treated as a blocker (it is `NOT_RUN` live by design).

This command has **not** been run by this session — there is no `proof.json`
or `edge_function.json` on disk yet for it to read.
