// Regression tests for W3 (measurement contracts) — strict parsing + formatting.
//
// These convert engine-review.cjs's recorded DEFECTIVE behaviours into the
// correct product expectations after repair, and pin the legitimate behaviours
// that must be preserved (coach shorthand, canonical seconds, comma decimals,
// a valid zero vs missing). Runs the real lib/hpTests.ts (transpiled).
//
// Run: node --test evidence/regression/measurement-parsing.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './_harness.mjs';

const { parseRunTime, parseTestValue, fmtValue } = loadTs('../../lib/hpTests.ts', {
  './dates': { currentTerm: () => 'Term 1' },
});

test('parseRunTime rejects a malformed clock ("1:90") instead of returning 150', () => {
  assert.equal(parseRunTime('1:90'), null);       // was 150
});

test('parseRunTime rejects surplus clock components ("2:15:30") instead of 135', () => {
  assert.equal(parseRunTime('2:15:30'), null);     // was 135
});

test('parseRunTime preserves valid clock input', () => {
  assert.equal(parseRunTime('2:15'), 135);
  assert.equal(parseRunTime('1:59'), 119);
  assert.equal(parseRunTime('0:45'), 45);
});

test('parseRunTime preserves the coach shorthand mm.ss (2.15 = 2:15)', () => {
  assert.equal(parseRunTime('2.15'), 135);
});

test('parseRunTime keeps a canonical seconds value (>=10) as-is, not shorthand', () => {
  assert.equal(parseRunTime('119.6'), 119.6);
  assert.equal(parseRunTime('95'), 95);
});

test('parseRunTime rejects trailing junk', () => {
  assert.equal(parseRunTime('2:15abc'), null);
  assert.equal(parseRunTime('abc'), null);
});

test('parseTestValue requires the WHOLE input to be numeric ("2.1junk" → null, not 2.1)', () => {
  assert.equal(parseTestValue('sprint_10m', '2.1junk'), null);  // was 2.1
});

test('parseTestValue preserves valid values and comma decimals', () => {
  assert.equal(parseTestValue('sprint_10m', '2.1'), 2.1);
  assert.equal(parseTestValue('sprint_10m', '2,1'), 2.1);
});

test('parseTestValue distinguishes a valid zero from missing data', () => {
  assert.equal(parseTestValue('pushup_2min', '0'), 0);   // a real zero count
  assert.equal(parseTestValue('pushup_2min', ''), null); // missing
  assert.equal(parseTestValue('pushup_2min', '-'), null);
});

test('fmtValue rounds whole seconds before splitting ("1:60" bug → "2:00")', () => {
  assert.equal(fmtValue('run_500m', 119.6), '2:00');     // was "1:60"
  assert.equal(fmtValue('run_500m', 119), '1:59');
  assert.equal(fmtValue('run_500m', 125), '2:05');
  assert.equal(fmtValue('run_500m', 60), '1:00');
});
