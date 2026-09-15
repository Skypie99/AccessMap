-- PGTAP_KIND: pgtap
-- PGTAP_EXECUTION: authorized-staging-only
-- This deliberate assertion failure proves the hosted runner cannot report a
-- green result merely because the SQL command itself exited zero.
BEGIN;
SELECT plan(1);
SELECT ok(false, 'FDA028 deliberate runner negative control');
SELECT * FROM finish();
ROLLBACK;
