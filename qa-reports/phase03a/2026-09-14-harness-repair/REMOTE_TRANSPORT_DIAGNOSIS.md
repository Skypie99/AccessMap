# FDA-028 R4 read-only remote transport diagnosis

## Outcome

The first Step 6 read-only state query failed before connecting:

```text
command transport: supabase db query --project-ref <fresh ref> ...
exit: 1
error code: LegacyDbQueryMutuallyExclusiveFlagsError
error: --project-ref requires the CLI remote --linked mode
mutation: none
```

Supabase CLI 2.116.0 uses `--linked` as the remote query transport selector even when `--project-ref` is supplied explicitly. The corrected diagnostic invocation used both tokens in the same command:

```text
--linked --project-ref cepayqmsoqxshsiyqnvz
```

The project identity remained explicit. No persisted linked-project identity supplied or replaced the project ref. The runner still refuses user-supplied `--linked`, `--local`, `--db-url`, `--profile`, and `--workdir` selectors so callers cannot alter the frozen command.

The corrected query was read-only and returned:

```text
ledger count: 103
latest: 20260913080000
ordered ledger sha256: 9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316
flags: 0
buckets: 0
grants: 0
helpers: 0
queued_http: 0
Vault secret rows: 1
Vault key bytes: 32
dev_key_material exists: false
accepted config: exact match
function contract: exact match
```

The successful remote transport emitted the additional measured stderr line `Initialising login role...`. R5 permits that exact line and continues to reject every other unrecognized stderr line.

## Evidence

```text
d40dd920a87a9775bcbec99574229e776509ae6555d0a53dcea697303ed0cfa2  prelimit-20260915T0145Z/hosted-state.stdout.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  prelimit-20260915T0145Z/hosted-state.stderr.txt
44b3e9afc07724b032641e69f24ceb2004036d4fe8ff0aec6d79958206131fbd  prelimit-20260915T0145Z/hosted-state-linked-explicit.stdout.json
2a0d79f732708c11678f9a21c9764d6a6a7a81d66e983920e296e9cb43176f15  prelimit-20260915T0145Z/hosted-state-linked-explicit.stderr.txt
```

No negative-control or main proof SQL ran during this diagnosis. No hosted mutation, old-stage contact, production contact, Vault write, or Git remote write occurred.
