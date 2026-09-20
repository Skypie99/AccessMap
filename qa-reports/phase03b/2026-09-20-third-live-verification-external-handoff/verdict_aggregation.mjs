// Pure, narrowly-scoped aggregation logic for compare_captured_results.mjs.
//
// Fixes the defect the 2026-09-20 independent review reproduced: a NOT_RUN
// section (missing proof.json / edge_function.json) left the aggregate
// `overall` at PASS with exit code 0, because notRun() never touched
// `overall` at all. Missing evidence on a section required for restoration
// sign-off must never be indistinguishable from that section having passed.
//
// This module only decides how per-section statuses roll up into one
// aggregate verdict + exit code. It does not touch structure normalization,
// ledger/gate/pg_net checks, target identity, or Edge Function identity
// logic -- those stay exactly as compare_captured_results.mjs already
// computes them; this module only receives their PASS/HOLD/FAIL/NOT_RUN
// verdicts.
export const REQUIRED_LIVE_SECTIONS = Object.freeze([
  'LIVE_GATE_AND_LEDGER',
  'FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS',
  'EDGE_FUNCTION_IDENTITY',
]);

// CLIENT_COMPATIBILITY is intentionally NOT_RUN in every live run (it can only
// be proven via a local disposable-cluster pgTAP replay, never live) and must
// never block an otherwise-genuine aggregate PASS. TARGET_IDENTITY is not in
// REQUIRED_LIVE_SECTIONS either, but that is not a gap: a TARGET_IDENTITY
// FAIL still forces overall to FAIL via `fail()` below, exactly as before
// this repair -- target identity validation is unchanged and unweakened.
export function createAggregator() {
  const report = {};
  let overall = 'PASS';

  const fail = (section, detail) => {
    report[section] = { status: 'FAIL', detail };
    overall = 'FAIL';
  };
  const pass = (section, detail) => {
    report[section] = { status: 'PASS', detail };
  };
  const hold = (section, detail) => {
    report[section] = { status: 'HOLD', detail };
    if (overall === 'PASS') overall = 'HOLD';
  };
  // The fix: a NOT_RUN on a section this saga requires for restoration
  // sign-off must downgrade an as-yet-clean overall to HOLD, the same as an
  // explicit HOLD would. A NOT_RUN on a non-required section (currently only
  // CLIENT_COMPATIBILITY) is recorded but has no effect on `overall`.
  const notRun = (section, detail) => {
    report[section] = { status: 'NOT_RUN', detail };
    if (REQUIRED_LIVE_SECTIONS.includes(section) && overall === 'PASS') {
      overall = 'HOLD';
    }
  };

  return {
    report,
    fail,
    pass,
    hold,
    notRun,
    get overall() {
      return overall;
    },
    // overall can only ever be 'PASS' | 'HOLD' | 'FAIL' -- there is no path
    // that sets it to the literal string 'NOT_RUN', so (unlike the original
    // script) exit code is simply "0 iff genuinely PASS".
    get exitCode() {
      return overall === 'PASS' ? 0 : 1;
    },
  };
}
