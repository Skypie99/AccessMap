# FDA-028 hosted harness R6 run — HOLD

## Result

```text
FDA028_HARNESS_REPAIR_SHA: 48e8732b3437943716b347cc84cc06adf9aefff0
runner checkpoint SHA: 8b05af0ae52ee6eaceb89763b8b08a5c0db1fbe8
target project: cepayqmsoqxshsiyqnvz
target branch: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
status: HOLD
negative control: PASS (exact deliberate failure detected)
main evidence: 30/31 true
failed assertion: 26, timing: purge removes retained-old bucket and cascades its grant
cleanup: PASS
```

The main assertion combined a side-effecting `limiter.purge_at(...) > 0` call and a grant-count query in one Boolean `AND` expression. PostgreSQL does not promise left-to-right evaluation of Boolean subexpressions. Local PostgreSQL evaluated the purge before the count and passed; the hosted engine may evaluate the count before the purge and return false even though the purge then completes. The post-state cannot distinguish internal evaluation order because the entire statement rolled back as required.

The narrow harness repair is to assign the purge return value in a separate PL/pgSQL statement and only then insert the assertion that checks both the saved result and post-purge grant count. No limiter source, timing rule, allowance, or expected lifecycle behavior needs to change.

The complete pre/post state matched exactly after the main assertion failure:

```text
ledger: exact 103-row identity
flags / buckets / grants / helpers / queued_http: 0 / 0 / 0 / 0 / 0
Vault rows / key bytes: 1 / 32
key state, config, function contract: exact match
cleanup: PASS
```

## Frozen receipt hashes

```text
349d9446ba70be0bf5740d7541cbfa6a9b3ad5f0cdef8244284dd90924743e1d  RECEIPT.json
d63ec9b582f91b009666c34b62e1182141e707f0fc265622635695ee17cbd8c7  negative.stderr.txt
3041dd5d43682e66748ee7cdd0ed61afb50aeb92f80f9ab63160de1d223a7e48  negative.stdout.txt
2a0d79f732708c11678f9a21c9764d6a6a7a81d66e983920e296e9cb43176f15  post.stderr.txt
3bd2d236ef8ff756c9e1ce28d1617323d215b152d94d1440d49d1ae9612ac1ea  post.stdout.txt
2a0d79f732708c11678f9a21c9764d6a6a7a81d66e983920e296e9cb43176f15  pre.stderr.txt
777e330fba441c926910c1c2c4206fd2bc75dd2ba38ab60fe3deb1407815bfce  pre.stdout.txt
d63ec9b582f91b009666c34b62e1182141e707f0fc265622635695ee17cbd8c7  suite.stderr.txt
4d15e3af291d76969921eceb16752d1dffa09d112cd19f0289c7b426a8957b52  suite.stdout.txt
```

```text
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: UNCHANGED_FROM_BANKED_PASS
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: HOLD
PHASE_03A_FRESH_STAGE_GATE: HOLD
```
