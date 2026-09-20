#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PINNED_PARSER_IDENTITY,
  assertInstalledSupabaseCliVersion,
  assertSupportedParserIdentity,
  deriveExpectedMigrationIdentity,
  orderedStatementArraySha256,
  validateExactLedgerRows,
} from './phase03b_statement_identity.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const ROOT = join(PACKET, '../../..');
const MIGRATION_ROOT = join(ROOT, 'supabase/migrations-next/phase03b');
const EXPECTED = JSON.parse(readFileSync(join(PACKET, 'EXPECTED_VALUES.json'), 'utf8'));
const clone = (value) => structuredClone(value);
const holds = (operation) => { try { operation(); return false; } catch { return true; } };
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const identities = EXPECTED.migrations.map((migration) => deriveExpectedMigrationIdentity(
  join(MIGRATION_ROOT, migration.filename),
  migration,
));
const rows = identities.map(({ version, name, statement_count, statement_sha256 }) => ({
  version, name, statement_count, statement_sha256,
}));
const identityArtifact = JSON.parse(readFileSync(join(PACKET, 'EXPECTED_PHASE03B_STATEMENT_IDENTITY.json'), 'utf8'));
const rowWithStatements = (index, statements, overrides = {}) => ({
  version: identities[index].version,
  name: identities[index].name,
  statement_count: statements.length,
  statement_sha256: orderedStatementArraySha256(statements),
  ...overrides,
});

const checks = {};
checks.pinnedParserSourceIdentity = assertSupportedParserIdentity() === 'SUPABASE_CLI_2_116_0_PARSER_PINNED';
checks.installedCliVersionPinned = assertInstalledSupabaseCliVersion() === PINNED_PARSER_IDENTITY.cliVersion;
checks.expectedStatementArraysDerivedIndependently = identities.every((identity) => Array.isArray(identity.statements));
checks.firstMigrationHas68Statements = identities[0].statements.length === 68;
checks.secondMigrationHas23Statements = identities[1].statements.length === 23;

const missing = identities[0].statements.slice(0, -1);
checks.missingStatementHolds = holds(() => validateExactLedgerRows([rowWithStatements(0, missing), rows[1]], rows));
const extra = [...identities[0].statements, 'select 1'];
checks.extraStatementHolds = holds(() => validateExactLedgerRows([rowWithStatements(0, extra), rows[1]], rows));
const reordered = clone(identities[0].statements);
[reordered[0], reordered[1]] = [reordered[1], reordered[0]];
checks.reorderedStatementsHold = holds(() => validateExactLedgerRows([rowWithStatements(0, reordered), rows[1]], rows));
const altered = clone(identities[0].statements);
altered[0] = `${altered[0]} `;
checks.alteredStatementSameCountHolds = holds(() => validateExactLedgerRows([rowWithStatements(0, altered), rows[1]], rows));
checks.wrongVersionHolds = holds(() => validateExactLedgerRows([{ ...rows[0], version: '20260915210257' }, rows[1]], rows));
checks.duplicateVersionHolds = holds(() => validateExactLedgerRows([rows[0], { ...rows[1], version: rows[0].version }], rows));
checks.wrongNameHolds = holds(() => validateExactLedgerRows([{ ...rows[0], name: 'wrong_name' }, rows[1]], rows));
checks.missingMigrationRowHolds = holds(() => validateExactLedgerRows([rows[0]], rows));
checks.malformedLedgerTransportHolds = holds(() => validateExactLedgerRows([{ ...rows[0], statement_sha256: null }, rows[1]], rows));
checks.malformedStatementsValueHolds = holds(() => orderedStatementArraySha256('not-an-array'));
checks.unsupportedParserVersionHolds = holds(() => assertSupportedParserIdentity({
  ...PINNED_PARSER_IDENTITY,
  cliVersion: '2.117.0',
}));
checks.unsupportedParserSourceHolds = holds(() => assertSupportedParserIdentity({
  ...PINNED_PARSER_IDENTITY,
  parserStateSourceSha256: '0'.repeat(64),
}));
const postgresJsonbKeyOrderRows = rows.map((row) => ({
  name: row.name,
  statement_count: row.statement_count,
  statement_sha256: row.statement_sha256,
  version: row.version,
}));
checks.exactLiveLedgerSummaryTransportPasses = validateExactLedgerRows(postgresJsonbKeyOrderRows, rows) === 'EXACT_STATEMENT_ARRAY_IDENTITY';
checks.objectKeyOrderDoesNotChangeIdentity = JSON.stringify(postgresJsonbKeyOrderRows) !== JSON.stringify(rows) &&
  validateExactLedgerRows(postgresJsonbKeyOrderRows, rows) === 'EXACT_STATEMENT_ARRAY_IDENTITY';
checks.candidateMigrationBytesUnchanged = identities.every((identity, index) => identity.source_sha256 === EXPECTED.migrations[index].sha256);
checks.expectedIdentityArtifactMatchesDerivation = JSON.stringify(identityArtifact.parserIdentity) === JSON.stringify(PINNED_PARSER_IDENTITY) &&
  JSON.stringify(identityArtifact.migrations.map((migration) => ({
    version: migration.version,
    name: migration.name,
    statement_count: migration.statementCount,
    statement_sha256: migration.orderedStatementArraySha256,
  }))) === JSON.stringify(rows) && identityArtifact.derivedFromProduction === false;
checks.strictSchemaUnchanged = sha256(readFileSync(join(PACKET, 'STRICT_R8_ENVELOPE_SCHEMA.json'))) === '0fe78b2a306fba77d1741fa57eb2591dba2762dfdc53e4d9f00e81d84dead517';
checks.orderedArraySqlContractPinned = ['PROPOSED_QUIESCENCE_VERIFY.sql', 'POST_EXIT_VERIFY.sql'].every((filename) => {
  const sql = readFileSync(join(PACKET, filename), 'utf8');
  return sql.includes("octet_length(convert_to(statement,'UTF8'))::text||':'||statement") &&
    sql.includes('from unnest(statements) with ordinality') && !sql.includes('statements[1]');
});

const passed = Object.values(checks).filter(Boolean).length;
const receipt = {
  status: passed === Object.keys(checks).length ? 'PASS' : 'HOLD',
  method: 'Frozen migration bytes parsed by the source-pinned Supabase CLI 2.116.0 SplitAndTrim finite-state-machine contract; ordered arrays use UTF-8 byte-length-prefixed SHA-256.',
  parserIdentity: PINNED_PARSER_IDENTITY,
  rows,
  checks,
  passed,
  total: Object.keys(checks).length,
  productionMutations: 'NONE',
};
console.log(JSON.stringify(receipt, null, 2));
if (receipt.status !== 'PASS') process.exitCode = 1;
