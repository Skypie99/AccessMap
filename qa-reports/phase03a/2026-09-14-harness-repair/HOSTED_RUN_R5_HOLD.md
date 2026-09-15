# FDA-028 hosted harness R5 run — HOLD

`RUN_AT_UTC: 2026-09-15`

## Result

```text
FDA028_HARNESS_REPAIR_SHA: f7fecc01fc7e13b3590becb5fb928e98f6eb2283
runner checkpoint SHA: 735fca2ecf540164d6e7c3d7739356377963ce4d
target project: cepayqmsoqxshsiyqnvz
target branch: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
status: HOLD
negative control: reached database; parser refused hosted error wrapper
main proof: NOT RUN
cleanup: PASS
production contact: none
old-stage contact: none
```

The pre-state query passed the exact 103-row ledger, accepted config, Vault shape, function contract, and empty-residue checks. The deliberate negative-control exception reached fresh staging and rolled back, but remote Management API transport wrapped it as `LegacyDbQueryUnexpectedStatusError` with a nested HTTP 400 / PostgreSQL `P0001` message. R5 accepted only the previously measured direct-database `LegacyDbQueryExecError`, so it failed closed before the main proof.

The post-state query ran after the parser failure and matched the complete pre-state exactly:

```text
flags: 0 -> 0
buckets: 0 -> 0
grants: 0 -> 0
helpers: 0 -> 0
queued_http: 0 -> 0
Vault rows: 1 -> 1
Vault key bytes: 32 -> 32
key state: exact match
config: exact match
ledger: exact match
cleanup: PASS
```

This is a harness transport-envelope mismatch. It is not an FDA-028 implementation finding. The negative control changed no persistent state, and the main statement never ran.

## Frozen receipt hashes

```text
d294de74653c989d9c89ae8eade90b562943e04cacde2cd4b35af68220a580f0  RECEIPT.json
d63ec9b582f91b009666c34b62e1182141e707f0fc265622635695ee17cbd8c7  negative.stderr.txt
3041dd5d43682e66748ee7cdd0ed61afb50aeb92f80f9ab63160de1d223a7e48  negative.stdout.txt
2a0d79f732708c11678f9a21c9764d6a6a7a81d66e983920e296e9cb43176f15  post.stderr.txt
46b9a00c0bbcf46dcd600e77afe5527e2233dc27c747506bcf0653a87cfa8f98  post.stdout.txt
2a0d79f732708c11678f9a21c9764d6a6a7a81d66e983920e296e9cb43176f15  pre.stderr.txt
4a4b20d206b435197485a882bfcbad3cb9f536dd0ee6539667550174f66fe34f  pre.stdout.txt
```

## Next gate

Repair only the strict proof-envelope parser to recognize this exact measured hosted wrapper, add adversarial rejection tests, refreeze, and repeat independent CODE review before any further proof execution.

```text
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: UNCHANGED_FROM_BANKED_PASS
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: HOLD
PHASE_03A_FRESH_STAGE_GATE: HOLD
```
