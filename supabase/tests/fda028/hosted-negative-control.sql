-- PGTAP_KIND: raising-proof
-- PGTAP_EXECUTION: authorized-staging-only
-- One prepared statement. The required exception both carries the deliberately
-- failing assertion and proves that the statement was rolled back.
DO $proof$
DECLARE
  v_result jsonb;
BEGIN
  v_result := jsonb_build_object(
    'version', 1,
    'kind', 'negative',
    'plan', 1,
    'assertions', jsonb_build_array(jsonb_build_object(
      'number', 1,
      'description', 'FDA028 deliberate runner negative control',
      'passed', false
    ))
  );

  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'FDA028_ROLLBACK_NEGATIVE|' || v_result::text;
END
$proof$;
