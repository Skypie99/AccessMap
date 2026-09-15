# FDA-028 hosted harness repair — prepared checkpoint

`PROMPT_ID: FLAGSTONE-P03A-FDA028-HOSTED-HARNESS-REPAIR-20260914-R1`

`BANKED_AT_UTC: 2026-09-15T00:44:21Z`

## Authority

```text
RUN_UNIT: FDA028_HOSTED_HARNESS_REPAIR
STATUS: PREPARED
FDA028_IMPLEMENTATION_CHANGE_AUTHORIZED: NO
PRODUCTION_AUTHORITY: NONE
PUSH_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
PHASE_03B_AUTHORIZED: NO
```

Only the committed FDA-028 hosted acceptance harness and its directly required test, runner, and receipt contracts may change. The accepted limiter implementation must remain byte-for-byte unchanged. A demonstrated implementation defect stops this run at HOLD.

## Local source identity

```text
branch: codex/flagstone-p03a-takeover-20260914
HEAD: 2123c01a6d299bebe9442d44547728b30351a387
tree: 4d7bf697a8274b76a862fd97eef03c7fd7f4540e
working tree: clean
accepted CODE SHA: 3ac416e2cd19c7322061efb689abc5bebcef3a83
accepted CODE tree: 99ee18fbeb72e0f31d501f749df920d30ea907de
accepted INT SHA: f2c2fbef36e88289c9c2a0663e6f26fc974e0a2a
accepted INT tree: 96d8e38b37e881fa1f4d6e39cf5e276e1f51b833
accepted frozen integration SHA: 9a0af4c88b5b00898e405992cfd44ba7dfd689fc
accepted frozen integration tree: 4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5
```

Accepted FDA-028 artifacts:

```text
forward migration sha256: 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
rollback migration sha256: eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302
```

## Takeover evidence identity

```text
qa-reports/2026-09-14_Codex_Phase03ATakeover.md: 7361710ae3ebfce07a11e83e126301f76660aa2d5aee245ff0fd8638b18765a5
qa-reports/phase03a/2026-09-14-takeover/INDEPENDENT_FRESH_STAGE_REVIEW.md: 07613c6db7fc7315411bec025cf296594bf071ac3b7dbd8bd49e37bc4326d6fa
qa-reports/phase03a/2026-09-14-takeover/FDA028_HOSTED_HARNESS_REPAIR_PROPOSAL.md: a7d7f48fc9b64e3dfc936cc4861bec1aff7d02d0e71bc0889d50e514c13ad07f
TAKEOVER_RESULT receipt: ffcedaedaa5cf791434b3b6e7b57b3ed9ecbe1db17bb358ecf11b54909f6d7ce
independent stage-review verdict: HOLD, sole blocker FDA028 hosted-harness reproducibility
```

## Fresh staging identity

Read-only reconciliation on 2026-09-15 UTC confirmed:

```text
parent project: cepayqmsoqxshsiyqnvz
branch id: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
is_default: false
persistent: false
with_data: false
status: ACTIVE_HEALTHY
migration ledger count: 103
latest migration: 20260913080000_reapply_phase03a_webhook_target_env_scoped
flags: 0
limiter.bucket: 0
limiter.grant: 0
limiter key bytes: 32
limiter secret rows: 1
public.pass helper rows: 0
```

No operation was found in `RUNNING`, `APPLIED_NOT_VERIFIED`, or `OUTCOME_UNKNOWN` state. No mutation was performed while preparing this checkpoint.

Two preliminary read-only catalog queries referenced the fixture-only `limiter.config.singleton` column and failed with PostgreSQL `42703`. The corrected query used the accepted `limiter.config.id = true` contract and produced the evidence above. These failures did not mutate hosted state.
