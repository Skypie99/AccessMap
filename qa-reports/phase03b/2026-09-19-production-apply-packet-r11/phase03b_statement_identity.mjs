import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export const PINNED_PARSER_IDENTITY = Object.freeze({
  cliVersion: '2.116.0',
  sourceTag: 'v2.116.0',
  sourceCommit: '997a1e69a4a83466964ed874d3a604c88a7b3866',
  migrationFileSourceSha256: '560a3d2bdcc74acb3e778acc2d76552d7860d3e73de27de9a1ebb6eabe0c2bcb',
  parserTokenSourceSha256: '244aea79f3b7065b4151f642c9111cf58b3cb23b792201dbcff80d83491e6f04',
  parserStateSourceSha256: 'd0dafd2d8661d19c3e058899943d32e785e12eaeed2c127a3eda92f874e1c942',
  migrationHistorySourceSha256: '9be7d7a3b22e0fb3606aa24652837a515723f0df5f2c5aebf2a0cb9261c60beb',
  officialTypeScriptPortSha256: '3ca3a6e9cb8e7ecbf74af057bf84d6f25727e7a91bacf188cd67699f524e1379',
});

const EXPECTED_PARSER_IDENTITY_KEYS = Object.keys(PINNED_PARSER_IDENTITY);
const MIGRATION_FILENAME = /^(\d+)_(.*)\.sql$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const IDENTIFIER_RUNE = /[\p{L}\p{Nd}_$]/u;
const TAG_RUNE = /[\p{L}\p{Nd}_]/u;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const exactKeys = (value, expected, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`${label} keys mismatch`);
};

export function assertSupportedParserIdentity(identity = PINNED_PARSER_IDENTITY) {
  exactKeys(identity, EXPECTED_PARSER_IDENTITY_KEYS, 'parser identity');
  for (const key of EXPECTED_PARSER_IDENTITY_KEYS) {
    if (identity[key] !== PINNED_PARSER_IDENTITY[key]) throw new Error(`Unsupported parser identity: ${key}`);
  }
  return 'SUPABASE_CLI_2_116_0_PARSER_PINNED';
}

export function assertInstalledSupabaseCliVersion(command = 'supabase') {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: 15_000, env: process.env });
  if (result.error || result.signal || result.status !== 0) throw new Error('Unable to prove installed Supabase CLI version');
  const observed = result.stdout.trim();
  if (observed !== PINNED_PARSER_IDENTITY.cliVersion) {
    throw new Error(`Unsupported Supabase CLI version: ${observed || 'empty'}`);
  }
  return observed;
}

const isBeginAtomic = (data) => {
  const atomic = 'ATOMIC';
  let offset = data.length - atomic.length;
  if (offset < 0 || data.slice(offset).toUpperCase() !== atomic) return false;
  if (offset > 0 && IDENTIFIER_RUNE.test(data[offset - 1])) return false;
  const prefix = data.slice(0, offset).replace(/\s+$/u, '');
  offset = prefix.length - 'BEGIN'.length;
  if (offset < 0 || prefix.slice(offset).toUpperCase() !== 'BEGIN') return false;
  return offset === 0 || !IDENTIFIER_RUNE.test(prefix[offset - 1]);
};

class ReadyState {
  next(rune, data) {
    if (rune === '$') return new TagState(data.length - rune.length);
    if (rune === "'" || rune === '"') return new QuoteState(rune);
    if (rune === '-') return new CommentState();
    if (rune === '/') return new BlockState();
    if (rune === '\\') return new EscapeState();
    if (rune === ';') return null;
    if (rune === '(') return new AtomicState(new ReadyState(), ')');
    if ((rune === 'c' || rune === 'C') && isBeginAtomic(data)) return new AtomicState(new ReadyState(), 'END');
    return this;
  }
}

class CommentState {
  next(rune, data) {
    return rune === '-' ? new DollarState('\n') : new ReadyState().next(rune, data);
  }
}

class BlockState {
  constructor() { this.depth = 0; }
  next(rune, data) {
    const window = data.slice(-2);
    if (window === '/*') { this.depth += 1; return this; }
    if (this.depth === 0) return new ReadyState().next(rune, data);
    if (window === '*/') { this.depth -= 1; if (this.depth === 0) return new ReadyState(); }
    return this;
  }
}

class QuoteState {
  constructor(delimiter) { this.delimiter = delimiter; this.escape = false; }
  next(rune, data) {
    if (this.escape) {
      if (rune === this.delimiter) { this.escape = false; return this; }
      return new ReadyState().next(rune, data);
    }
    if (rune === this.delimiter) this.escape = true;
    return this;
  }
}

class DollarState {
  constructor(delimiter) { this.delimiter = delimiter; }
  next(_rune, data) { return data.endsWith(this.delimiter) ? new ReadyState() : this; }
}

class TagState {
  constructor(offset) { this.offset = offset; }
  next(rune, data) {
    if (rune === '$') return new DollarState(data.slice(this.offset));
    return TAG_RUNE.test(rune) ? this : new ReadyState().next(rune, data);
  }
}

class EscapeState { next() { return new ReadyState(); } }

class AtomicState {
  constructor(previous, delimiter) { this.previous = previous; this.delimiter = delimiter; }
  next(rune, data) {
    const current = this.previous.next(rune, data);
    if (current !== null) this.previous = current;
    if (this.previous instanceof ReadyState && data.slice(-this.delimiter.length).toUpperCase() === this.delimiter) {
      return new ReadyState();
    }
    return this;
  }
}

// Exact JavaScript form of v2.116.0 parser.SplitAndTrim. Comments and whitespace
// remain attached to their statement; only trailing semicolons and surrounding
// Unicode whitespace are removed.
export function splitSupabaseCli21160(sql) {
  if (typeof sql !== 'string') throw new Error('Migration SQL must be valid UTF-8 text');
  let state = new ReadyState();
  let token = '';
  const statements = [];
  const emit = () => {
    const trimmed = token.replace(/;+$/u, '').trim();
    if (trimmed.length > 0) statements.push(trimmed);
    token = '';
    state = new ReadyState();
  };
  for (const rune of Array.from(sql)) {
    token += rune;
    const next = state.next(rune, token);
    if (next === null) emit(); else state = next;
  }
  if (token.length > 0) emit();
  return statements;
}

// Unambiguous ordered-array identity: SHA-256 of each UTF-8 statement prefixed
// by its byte length and a colon, concatenated without separators.
export function orderedStatementArraySha256(statements) {
  if (!Array.isArray(statements) || statements.some((statement) => typeof statement !== 'string')) {
    throw new Error('Statements must be an array of strings');
  }
  const hash = createHash('sha256');
  for (const statement of statements) {
    const bytes = Buffer.from(statement, 'utf8');
    hash.update(`${bytes.length}:`, 'utf8');
    hash.update(bytes);
  }
  return hash.digest('hex');
}

export function deriveExpectedMigrationIdentity(filePath, expected) {
  assertSupportedParserIdentity();
  exactKeys(expected, ['version', 'filename', 'sha256'], 'expected migration');
  const bytes = readFileSync(filePath);
  const sourceSha256 = sha256(bytes);
  if (sourceSha256 !== expected.sha256) throw new Error(`Frozen migration bytes changed: ${expected.filename}`);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const match = MIGRATION_FILENAME.exec(basename(filePath));
  if (!match || match[1] !== expected.version || basename(filePath) !== expected.filename) {
    throw new Error(`Migration filename/version mismatch: ${expected.filename}`);
  }
  const statements = splitSupabaseCli21160(text);
  return {
    version: match[1],
    name: match[2],
    statement_count: statements.length,
    statement_sha256: orderedStatementArraySha256(statements),
    statements,
    source_sha256: sourceSha256,
  };
}

export function deriveExpectedPhase03bRows(migrationRoot, migrations) {
  if (!Array.isArray(migrations) || migrations.length !== 2) throw new Error('Expected exactly two frozen Phase 03B migrations');
  const identities = migrations.map((migration) => deriveExpectedMigrationIdentity(resolve(migrationRoot, migration.filename), migration));
  return identities.map(({ version, name, statement_count, statement_sha256 }) => ({
    version, name, statement_count, statement_sha256,
  }));
}

export function validateExactLedgerRows(observed, expected) {
  if (!Array.isArray(observed)) throw new Error('Phase 03B ledger rows must be an array');
  if (!Array.isArray(expected) || expected.length !== 2) throw new Error('Expected ledger identity is unavailable');
  const expectedVersions = expected.map((row) => row.version);
  if (new Set(expectedVersions).size !== expectedVersions.length) throw new Error('Expected migration versions are duplicated');
  for (const [index, row] of observed.entries()) {
    exactKeys(row, ['version', 'name', 'statement_count', 'statement_sha256'], `ledger row ${index}`);
    if (typeof row.version !== 'string' || typeof row.name !== 'string' || !Number.isSafeInteger(row.statement_count) || row.statement_count <= 0 || !SHA256.test(row.statement_sha256)) {
      throw new Error(`Malformed ledger row ${index}`);
    }
  }
  const observedVersions = observed.map((row) => row.version);
  if (new Set(observedVersions).size !== observedVersions.length) throw new Error('Duplicate Phase 03B migration version');
  if (observed.length !== expected.length) throw new Error('Applied migration row cardinality mismatch');
  for (const [index, expectedRow] of expected.entries()) {
    exactKeys(expectedRow, ['version', 'name', 'statement_count', 'statement_sha256'], `expected ledger row ${index}`);
    for (const key of ['version', 'name', 'statement_count', 'statement_sha256']) {
      if (observed[index][key] !== expectedRow[key]) {
        throw new Error(`Applied migration ordered statement-array identity mismatch: row ${index} ${key}`);
      }
    }
  }
  return 'EXACT_STATEMENT_ARRAY_IDENTITY';
}
