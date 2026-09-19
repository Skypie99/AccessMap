import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(PACKET, 'STRICT_R8_ENVELOPE_SCHEMA.json'), 'utf8'));

function resolvePointer(root, pointer) {
  if (!pointer.startsWith('#/')) throw new Error(`Unsupported schema reference: ${pointer}`);
  return pointer.slice(2).split('/').reduce((value, token) => value[token.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function typeMatches(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function compileNode(node, root) {
  if (node === true) return () => [];
  if (node === false) return (_value, path) => [`${path} is prohibited`];
  if (node.$ref) return compileNode(resolvePointer(root, node.$ref), root);

  const allOf = (node.allOf ?? []).map((child) => compileNode(child, root));
  const anyOf = (node.anyOf ?? []).map((child) => compileNode(child, root));
  const oneOf = (node.oneOf ?? []).map((child) => compileNode(child, root));
  const ifValidator = node.if ? compileNode(node.if, root) : null;
  const thenValidator = node.then ? compileNode(node.then, root) : null;
  const elseValidator = node.else ? compileNode(node.else, root) : null;
  const propertyValidators = Object.fromEntries(
    Object.entries(node.properties ?? {}).map(([key, child]) => [key, compileNode(child, root)]),
  );
  const itemValidator = node.items && !Array.isArray(node.items) ? compileNode(node.items, root) : null;
  const tupleValidators = Array.isArray(node.items) ? node.items.map((child) => compileNode(child, root)) : [];
  const prefixValidators = (node.prefixItems ?? []).map((child) => compileNode(child, root));

  return (value, path = '$') => {
    const errors = [];
    const types = node.type === undefined ? [] : Array.isArray(node.type) ? node.type : [node.type];
    if (types.length > 0 && !types.some((type) => typeMatches(value, type))) {
      return [`${path} must have type ${types.join('|')}`];
    }
    if (Object.hasOwn(node, 'const') && JSON.stringify(value) !== JSON.stringify(node.const)) errors.push(`${path} must equal its const`);
    if (node.enum && !node.enum.some((candidate) => JSON.stringify(candidate) === JSON.stringify(value))) errors.push(`${path} is not in enum`);
    if (typeof value === 'string') {
      if (node.minLength !== undefined && value.length < node.minLength) errors.push(`${path} is too short`);
      if (node.pattern && !(new RegExp(node.pattern)).test(value)) errors.push(`${path} does not match pattern`);
      if (node.format === 'date-time' && (!value.endsWith('Z') || !Number.isFinite(Date.parse(value)))) errors.push(`${path} is not UTC date-time`);
    }
    if (typeof value === 'number' && node.minimum !== undefined && value < node.minimum) errors.push(`${path} is below minimum`);
    if (Array.isArray(value)) {
      if (node.minItems !== undefined && value.length < node.minItems) errors.push(`${path} has too few items`);
      if (node.maxItems !== undefined && value.length > node.maxItems) errors.push(`${path} has too many items`);
      if (node.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${path} has duplicate items`);
      if (itemValidator) value.forEach((item, index) => errors.push(...itemValidator(item, `${path}[${index}]`)));
      tupleValidators.forEach((validator, index) => {
        if (index < value.length) errors.push(...validator(value[index], `${path}[${index}]`));
      });
      prefixValidators.forEach((validator, index) => {
        if (index < value.length) errors.push(...validator(value[index], `${path}[${index}]`));
      });
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const key of node.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
      for (const [key, validator] of Object.entries(propertyValidators)) {
        if (Object.hasOwn(value, key)) errors.push(...validator(value[key], `${path}.${key}`));
      }
      if (node.additionalProperties === false) {
        for (const key of Object.keys(value)) if (!Object.hasOwn(propertyValidators, key)) errors.push(`${path}.${key} is unknown`);
      }
    }
    for (const validator of allOf) errors.push(...validator(value, path));
    if (anyOf.length > 0 && !anyOf.some((validator) => validator(value, path).length === 0)) errors.push(`${path} matches no anyOf branch`);
    if (oneOf.length > 0) {
      const branchErrors = oneOf.map((validator) => validator(value, path));
      if (branchErrors.filter((candidate) => candidate.length === 0).length !== 1) {
        errors.push(`${path} must match exactly one oneOf branch (${branchErrors.map((candidate, index) => `branch ${index + 1}: ${candidate.slice(0, 2).join(', ') || 'matched'}`).join(' | ')})`);
      }
    }
    if (ifValidator) {
      const branch = ifValidator(value, path).length === 0 ? thenValidator : elseValidator;
      if (branch) errors.push(...branch(value, path));
    }
    return errors;
  };
}

const compiled = compileNode(schema, schema);
const serverSnapshotBranches = [
  ['FAILURE', compileNode(resolvePointer(schema, '#/$defs/serverSnapshotFailure'), schema)],
  ['SUCCESS', compileNode(resolvePointer(schema, '#/$defs/serverSnapshotSuccess'), schema)],
];

export function matchingServerSnapshotBranches(value) {
  return serverSnapshotBranches
    .filter(([, validator]) => validator(value, '$.observed.snapshot').length === 0)
    .map(([name]) => name);
}

export function validateCompiledR8ServerSnapshot(value) {
  const matches = matchingServerSnapshotBranches(value);
  if (matches.length !== 1) {
    throw new Error(`FAIL_CLOSED_INVALID_ENVELOPE: server snapshot matched ${matches.length} branches`);
  }
  return matches[0];
}

export function validateCompiledR8Schema(value) {
  const errors = compiled(value, '$');
  if (errors.length > 0) {
    const error = new Error(`FAIL_CLOSED_INVALID_ENVELOPE: JSON Schema rejected input: ${errors.slice(0, 8).join('; ')}`);
    error.validationErrors = errors;
    throw error;
  }
  return 'VALIDATED_R8';
}

export const COMPILED_R8_SCHEMA_ID = schema.$id;
