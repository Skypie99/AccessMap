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
#
# Tightened 2026-09-20 (post independent-review of the comparator repair,
# which logged this as a non-blocking observation): captured content is now
# validated in memory -- via jq -e, a null/empty check, and a JSON-shape
# check -- BEFORE anything is written to disk, so an invalid/malformed/empty
# capture never reaches even a temp file, let alone the real evidence path.
# What is captured and how (the SQL file, the jq extraction path, the CLI
# call) is unchanged from the prior version -- only the validation around it
# is tightened.
set -euo pipefail

PROJECT_REF="kldlwszpfkdmsjrjhjym"
FORBIDDEN_STAGING_REF="cepayqmsoqxshsiyqnvz"
PINNED_CLI_VERSION="2.116.0"

HANDOFF="/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff"
CAPTURED="$HANDOFF/CAPTURED_FINAL_STRUCTURE"
PROOF_SQL="$HANDOFF/01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql"
PROOF_OUT="$CAPTURED/proof.json"
EDGE_OUT="$CAPTURED/edge_function.json"

trap 'rm -f "$PROOF_OUT.tmp" "$EDGE_OUT.tmp"' EXIT

# --- Refuse a mistargeted, malformed-looking, or drifted project ref, before
#     touching anything. ---
if ! [[ "$PROJECT_REF" =~ ^[a-z0-9]{20}$ ]]; then
  echo "REFUSING: PROJECT_REF '$PROJECT_REF' does not look like a valid Supabase project ref" >&2
  exit 1
fi
if [ "$PROJECT_REF" = "$FORBIDDEN_STAGING_REF" ]; then
  echo "REFUSING: PROJECT_REF resolves to the forbidden staging ref" >&2
  exit 1
fi

# --- Exact pinned CLI version, trimmed to avoid a trailing-whitespace false mismatch. ---
ACTUAL_CLI_VERSION="$(supabase --version | tr -d '[:space:]')"
if [ "$ACTUAL_CLI_VERSION" != "$PINNED_CLI_VERSION" ]; then
  echo "REFUSING: supabase CLI reports '$ACTUAL_CLI_VERSION', pinned version is '$PINNED_CLI_VERSION'" >&2
  exit 1
fi

if [ ! -f "$PROOF_SQL" ]; then
  echo "REFUSING: expected SQL file not found: $PROOF_SQL" >&2
  exit 1
fi

# --- Refuse overwrite of existing evidence -- STOP, never clobber. ---
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
#        already-reviewed SQL file, exact jq extraction path already used in
#        RESTORATION_RUNBOOK.md section 8 step 1. Captured into a shell
#        variable and validated BEFORE any file is written: jq -e fails
#        immediately on malformed JSON or on a null/false extraction result
#        (a missing row, or `.[0]` absent), and a second explicit type check
#        rejects anything that isn't a JSON object. Only after both checks
#        pass is the already-validated content written, and only to a .tmp
#        path first, moved into place with mv -n (no-clobber) so a race can
#        never partially overwrite real evidence. ---
RAW_PROOF="$(supabase db query --linked --project-ref "$PROJECT_REF" --file "$PROOF_SQL" --output-format json)"
if [ -z "$RAW_PROOF" ]; then
  echo "REFUSING: supabase db query for the proof capture returned empty output" >&2
  exit 1
fi
PROOF_JSON="$(printf '%s' "$RAW_PROOF" | jq -e '.[0].phase03b_quiescence_proof_r3')" || {
  echo "REFUSING: proof extraction failed -- malformed JSON, or .[0].phase03b_quiescence_proof_r3 was null/missing" >&2
  exit 1
}
if ! printf '%s' "$PROOF_JSON" | jq -e 'type == "object"' > /dev/null 2>&1; then
  echo "REFUSING: captured proof is not a JSON object (malformed or empty)" >&2
  exit 1
fi
printf '%s\n' "$PROOF_JSON" > "$PROOF_OUT.tmp"
mv -n "$PROOF_OUT.tmp" "$PROOF_OUT"
if [ -e "$PROOF_OUT.tmp" ]; then
  echo "REFUSING: proof destination appeared during capture; evidence was not installed" >&2
  exit 1
fi

# --- 2. Edge Function identity: read-only list call, exact project. This is
#        a CLI/API call, not SQL -- there is no separate vetted SQL file for
#        it (see EXPECTED_VALUES.json .edgeFunctionIdentity.method). Same
#        validate-before-write discipline as step 1. Note: an empty JSON
#        array (`[]`, i.e. genuinely zero functions found) is intentionally
#        NOT treated as a capture error here -- that is a legitimate live
#        result and the comparator itself already reports it as HOLD
#        (expected-count mismatch), which is the correct place for that
#        judgment, not this capture script. Only a null/malformed response
#        is refused at this stage. ---
RAW_EDGE="$(supabase functions list --project-ref "$PROJECT_REF" --output-format json)"
if [ -z "$RAW_EDGE" ]; then
  echo "REFUSING: supabase functions list returned empty output" >&2
  exit 1
fi
EDGE_JSON="$(printf '%s' "$RAW_EDGE" | jq -e '.')" || {
  echo "REFUSING: edge function capture failed -- malformed or null JSON from supabase functions list" >&2
  exit 1
}
if ! printf '%s' "$EDGE_JSON" | jq -e '(type == "array") or (type == "object")' > /dev/null 2>&1; then
  echo "REFUSING: captured edge function list is not a JSON array or object" >&2
  exit 1
fi
printf '%s\n' "$EDGE_JSON" > "$EDGE_OUT.tmp"
mv -n "$EDGE_OUT.tmp" "$EDGE_OUT"
if [ -e "$EDGE_OUT.tmp" ]; then
  echo "REFUSING: edge-function destination appeared during capture; evidence was not installed" >&2
  exit 1
fi

echo "Saved: $PROOF_OUT"
echo "Saved: $EDGE_OUT"
echo "Next: re-run the fixed comparator (see below) and require a genuine overall PASS."
```

Notes on why each safety property holds:

| Requirement | How it's met |
|---|---|
| Targets exactly `kldlwszpfkdmsjrjhjym` | `PROJECT_REF` is a hardcoded literal, format-checked against `^[a-z0-9]{20}$`, passed explicitly to every command (`--project-ref`), never inherited from an ambient/linked default alone; a self-check refuses if it ever equalled the forbidden staging ref |
| Read-only | `supabase db query` runs a `SELECT`-only file already reviewed for this saga; `supabase functions list` is a `GET`-equivalent list call; neither writes |
| Uses existing vetted logic | Same SQL file, same `jq` extraction path (`.[0].phase03b_quiescence_proof_r3`), and the same CLI invocation shape already reviewed and present in `RESTORATION_RUNBOOK.md` section 8 step 1 -- only the validation wrapped around them is new |
| `jq -e` where appropriate | Both extractions (`.[0].phase03b_quiescence_proof_r3` and the raw functions-list `.`) use `jq -e`, which exits non-zero on `null`/`false`/parse error, not just on a missing key |
| Null/empty extraction fails immediately | `[ -z "$RAW_..." ]` guards catch an empty CLI response before jq even runs; `jq -e` catches a `null` or `false` extracted value; both `\|\| exit 1` explicitly rather than relying only on implicit `set -e` propagation |
| Malformed JSON fails immediately | `jq -e` fails closed on a parse error (non-zero exit), caught by the same `\|\| exit 1` |
| Output files not created/accepted from invalid input | Captured content is held in a shell variable and passed through two independent `jq -e` checks (extraction + type) before anything is written to disk at all -- not written-then-validated, but validated-then-written; a `trap` also removes any stray `.tmp` file on any exit path |
| Refuses overwrite | Explicit existence checks before either capture starts, plus a `.tmp` + `mv -n` (no-clobber) write for each file |
| Fails fast | `set -euo pipefail` plus explicit `\|\| { ...; exit 1; }` on every extraction — a failed CLI call, a failed `jq`, or a failed pipe stage aborts immediately, before the following steps run |
| Exact pinned CLI version | `supabase --version`, whitespace-stripped, is compared byte-for-byte against `2.116.0` before any live call; any drift refuses |
| No accidental inherited target | `--project-ref` is passed explicitly on every call; no step relies on `--linked` alone |
| No large payload printed unnecessarily | Captured content lives only in shell variables and files; only short confirmation lines are echoed to stdout |
| No mutation / no migration apply / no restoration / no gate removal | Every live call is a read (`SELECT` / `list`); nothing here can drop, alter, insert, or write anything |

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
