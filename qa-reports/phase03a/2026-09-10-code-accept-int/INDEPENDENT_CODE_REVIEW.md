# Phase 03A Complete CODE Acceptance — Independent Review (IN PROGRESS)

VERDICT: TBD (review in progress — do not cite this section until final)

Candidate SHA: 5edd6455cac5fc5a42cd7e327b7a53f844a75d05
FDA-028 V4 reviewed commit: eec51b6723d04105a7ba31bf2efd2573b95e8902
FDA-028 V4 reviewed tree: 23f352bec069522efe9a174a4551c2c484b91de2

## Hash verification (STEP 1)

All 8 pinned hashes MATCH exactly (verified with `LC_ALL=C shasum -a 256`):

```
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
5dccef0b07b9a9f0bddddfc3646a28a1a8907f0a14ae920fdc92d0f09bfc24e2  supabase/tests/fda028/acceptance.sql
7283dcf8e46c459a23056486f341c10d400c714ad7f337a50582f08894d9543c  supabase/tests/fda028/acceptance2.sql
b60720e4cbdbda44561d2e98478b6c0e3d7fe36c05da3241a5d6438248ca6f8c  supabase/tests/fda028/acceptance3.sql
061dfe7c019a6f7e636ef5339f6cd9ab2882340b06f2aacecadf66e29041a905  supabase/tests/fda028/concurrency.sh
4abb7b96c36e453be3c51ca54d1d6a2fbe5e13d9a7b2dca6876ca210b0eae7ba  supabase/tests/fda028/devkey.sql
2186cc19d5f7c155930d0b82ba56c5f874f0593806273375544dc517abed4ca2  supabase/tests/fda028/fixture.sql
```

STATUS: PROCEEDING with full review.

## Findings table (draft — to be filled)

| # | Item | Verdict |
|---|------|---------|
| 1 | Exact v4 bytes survived | CONFIRMED (hashes match) — diff-scope check pending |
| 2 | All seven findings represented | PENDING |
| 3 | No scope leakage | PENDING |
| 4 | Migration history forward-only | PENDING |
| 5 | Restoration artifacts classified | PENDING |
| 6 | Manifest change | PENDING |
| 7 | Caller dependency safety | PENDING |
| 8 | No new security/regression from composition | PENDING |
| 9 | Reproduce owner's headline gate (217/217) | PENDING |
| 10 | Jest reuse argument | PENDING |
| 11 | Honesty of open items | PENDING |
| 12 | Anything else | PENDING |

(This file will be updated incrementally as each item is verified.)
