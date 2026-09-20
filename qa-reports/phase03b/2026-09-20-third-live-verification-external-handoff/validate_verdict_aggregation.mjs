#!/usr/bin/env node
// Focused tests for the compare_captured_results.mjs evidence-aggregation
// repair (verdict_aggregation.mjs). Synthetic scenarios only -- no live
// contact, no fixtures derived from real captured evidence (that's what
// replay_preexisting_structure_exclusion_offline.mjs and the end-to-end run
// against the real CAPTURED_FINAL_STRUCTURE/ directory are for). This file
// tests only the aggregation rollup, in isolation, exactly as the
// independent review's blocking defect was scoped: "repair ONLY this
// evidence-aggregation defect."
import { createAggregator, REQUIRED_LIVE_SECTIONS } from './verdict_aggregation.mjs';

const checks = {};

// Helper: build an aggregator, drive it through a named per-section outcome
// sequence, and return { overall, exitCode }. `outcomes` maps section name ->
// 'PASS' | 'HOLD' | 'FAIL' | 'NOT_RUN'.
function run(outcomes) {
  const agg = createAggregator();
  for (const [section, status] of Object.entries(outcomes)) {
    const detail = `synthetic ${status} for ${section}`;
    if (status === 'PASS') agg.pass(section, detail);
    else if (status === 'HOLD') agg.hold(section, detail);
    else if (status === 'FAIL') agg.fail(section, detail);
    else if (status === 'NOT_RUN') agg.notRun(section, detail);
    else throw new Error(`unknown synthetic status ${status}`);
  }
  return { overall: agg.overall, exitCode: agg.exitCode, report: agg.report };
}

// Sanity: the three sections this repair is scoped to are exactly the ones
// named in the review/task, no more, no fewer.
checks.requiredLiveSectionsExactSet =
  JSON.stringify([...REQUIRED_LIVE_SECTIONS].sort()) ===
  JSON.stringify([
    'EDGE_FUNCTION_IDENTITY',
    'FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS',
    'LIVE_GATE_AND_LEDGER',
  ].sort());

// 1. structure PASS + proof (LIVE_GATE_AND_LEDGER) NOT_RUN + edge NOT_RUN => HOLD, non-zero exit
{
  const r = run({
    LIVE_GATE_AND_LEDGER: 'NOT_RUN',
    FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS: 'PASS',
    EDGE_FUNCTION_IDENTITY: 'NOT_RUN',
  });
  checks.scenario1_structurePassProofNotRunEdgeNotRun_isHoldNonZero =
    r.overall === 'HOLD' && r.exitCode !== 0;
}

// 2. structure PASS + proof PASS + edge NOT_RUN => HOLD, non-zero exit
{
  const r = run({
    LIVE_GATE_AND_LEDGER: 'PASS',
    FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS: 'PASS',
    EDGE_FUNCTION_IDENTITY: 'NOT_RUN',
  });
  checks.scenario2_structurePassProofPassEdgeNotRun_isHoldNonZero =
    r.overall === 'HOLD' && r.exitCode !== 0;
}

// 3. structure PASS + proof NOT_RUN + edge PASS => HOLD, non-zero exit
{
  const r = run({
    LIVE_GATE_AND_LEDGER: 'NOT_RUN',
    FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS: 'PASS',
    EDGE_FUNCTION_IDENTITY: 'PASS',
  });
  checks.scenario3_structurePassProofNotRunEdgePass_isHoldNonZero =
    r.overall === 'HOLD' && r.exitCode !== 0;
}

// 4. proof PASS + structure PASS + edge PASS => PASS, exit 0
{
  const r = run({
    LIVE_GATE_AND_LEDGER: 'PASS',
    FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS: 'PASS',
    EDGE_FUNCTION_IDENTITY: 'PASS',
  });
  checks.scenario4_allRequiredPass_isPassExitZero =
    r.overall === 'PASS' && r.exitCode === 0;
}

// 5. any required section FAIL => FAIL, non-zero exit (tested once per section,
//    plus a mixed case where a NOT_RUN precedes the FAIL to prove ordering
//    doesn't matter -- FAIL must always win).
{
  for (const failingSection of REQUIRED_LIVE_SECTIONS) {
    const outcomes = Object.fromEntries(REQUIRED_LIVE_SECTIONS.map((s) => [s, s === failingSection ? 'FAIL' : 'PASS']));
    const r = run(outcomes);
    checks[`scenario5_${failingSection}_failForcesFailNonZero`] = r.overall === 'FAIL' && r.exitCode !== 0;
  }
  // NOT_RUN observed before a later FAIL on a different required section must
  // still resolve to FAIL, not get "stuck" at HOLD.
  const r = run({
    LIVE_GATE_AND_LEDGER: 'NOT_RUN',
    FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS: 'PASS',
    EDGE_FUNCTION_IDENTITY: 'FAIL',
  });
  checks.scenario5_notRunThenFail_orderIndependent_isFail = r.overall === 'FAIL' && r.exitCode !== 0;
  // And the reverse order (FAIL observed first, NOT_RUN after) must also stay FAIL.
  const r2 = run({
    FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS: 'FAIL',
    LIVE_GATE_AND_LEDGER: 'NOT_RUN',
    EDGE_FUNCTION_IDENTITY: 'PASS',
  });
  checks.scenario5_failThenNotRun_orderIndependent_isFail = r2.overall === 'FAIL' && r2.exitCode !== 0;
}

// 6. any required section HOLD => HOLD, non-zero exit (tested once per section)
{
  for (const holdingSection of REQUIRED_LIVE_SECTIONS) {
    const outcomes = Object.fromEntries(REQUIRED_LIVE_SECTIONS.map((s) => [s, s === holdingSection ? 'HOLD' : 'PASS']));
    const r = run(outcomes);
    checks[`scenario6_${holdingSection}_holdForcesHoldNonZero`] = r.overall === 'HOLD' && r.exitCode !== 0;
  }
}

// 7. CLIENT_COMPATIBILITY NOT_RUN with all required live sections PASS => PASS, exit 0
{
  const r = run({
    LIVE_GATE_AND_LEDGER: 'PASS',
    FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS: 'PASS',
    EDGE_FUNCTION_IDENTITY: 'PASS',
    CLIENT_COMPATIBILITY: 'NOT_RUN',
  });
  checks.scenario7_clientCompatibilityNotRunDoesNotBlockPass =
    r.overall === 'PASS' && r.exitCode === 0 && r.report.CLIENT_COMPATIBILITY.status === 'NOT_RUN';
}

// Regression guard for the *original* defect this repair fixes: a bare
// notRun() call on a required section, by itself, with nothing else run yet,
// must not leave overall at PASS (this is the exact shape of the bug -- the
// original notRun() never touched `overall` at all).
{
  const agg = createAggregator();
  agg.notRun('LIVE_GATE_AND_LEDGER', 'proof.json not found');
  checks.regression_bareNotRunOnRequiredSectionAloneIsNotPass = agg.overall !== 'PASS' && agg.exitCode !== 0;
}

// Non-required-section FAIL (e.g. TARGET_IDENTITY, which sits outside
// REQUIRED_LIVE_SECTIONS by design) must still force overall FAIL -- this
// proves the repair did not weaken target identity validation's existing
// blocking behavior while narrowing NOT_RUN handling to required sections.
{
  const agg = createAggregator();
  agg.fail('TARGET_IDENTITY', 'captured note claims a different project ref');
  agg.pass('LIVE_GATE_AND_LEDGER', 'ok');
  agg.pass('FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS', 'ok');
  agg.pass('EDGE_FUNCTION_IDENTITY', 'ok');
  checks.nonRequiredSectionFailStillForcesOverallFail = agg.overall === 'FAIL' && agg.exitCode !== 0;
}

const passed = Object.values(checks).filter(Boolean).length;
const total = Object.keys(checks).length;
const receipt = {
  status: passed === total ? 'PASS' : 'HOLD',
  scope: 'EVIDENCE_AGGREGATION_VERDICT_ROLLUP_ONLY',
  requiredLiveSections: REQUIRED_LIVE_SECTIONS,
  checks,
  passed,
  total,
  productionMutations: 'NONE',
  productionContact: 'NONE',
};
console.log(JSON.stringify(receipt, null, 2));
if (receipt.status !== 'PASS') process.exitCode = 1;
