// Regression tests for Blocker 1 — HP writes must verify student↔school ownership.
//
// These exercise the REAL exported functions from lib/hpRepository.ts (transpiled
// in-memory with the project's own TypeScript, no new deps) against a mock
// Supabase client. They assert the CORRECT post-repair behaviour:
//   - a School A session writing a School B student is rejected, and NO write runs
//   - a same-school write succeeds and is stripped to allowlisted columns
//
// Run: node --test evidence/regression/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// ── Load the real source, transpiled, with its infra imports stubbed ──────────
function loadRepository() {
  const src = readFileSync(new URL('../../lib/hpRepository.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleObj = { exports: {} };
  const stubRequire = (id) => {
    if (id === '@supabase/supabase-js') return { createClient: () => { throw new Error('unused'); } };
    if (id === './hpConfig') return { HP_SCHOOL: { name: '', shortName: '', location: '' } };
    throw new Error('unexpected require in test: ' + id);
  };
  new Function('exports', 'require', 'module', js)(moduleObj.exports, stubRequire, moduleObj);
  return moduleObj.exports;
}

// ── Minimal chainable + thenable Supabase mock ────────────────────────────────
// `resolve(state)` returns { data, error } for a finished query. Every write is
// recorded in `writes` so a test can assert whether a write actually happened.
function makeDb(resolve) {
  const writes = [];
  function from(table) {
    const state = { table, op: 'select', filters: {}, writes };
    const builder = {
      select() { state.op = 'select'; return builder; },
      insert(rows) { state.op = 'insert'; state.rows = rows; writes.push({ table, op: 'insert', rows }); return builder; },
      upsert(rows, opts) { state.op = 'upsert'; state.rows = rows; state.opts = opts; writes.push({ table, op: 'upsert', rows, opts }); return builder; },
      update(data) { state.op = 'update'; state.data = data; writes.push({ table, op: 'update', data }); return builder; },
      delete() { state.op = 'delete'; writes.push({ table, op: 'delete' }); return builder; },
      eq(k, v) { state.filters[k] = v; return builder; },
      in(k, v) { state.filters[k + '__in'] = v; return builder; },
      order() { return builder; },
      limit() { return builder; },
      maybeSingle() { return Promise.resolve(resolve({ ...state, single: true })); },
      then(onF, onR) { return Promise.resolve(resolve(state)).then(onF, onR); },
    };
    return builder;
  }
  return { from, _writes: writes };
}

const SCHOOL_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const STUDENT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; // belongs to School B

test('saveTestResult: rejects a student from another school and writes nothing', async () => {
  const { saveTestResult } = loadRepository();
  // Ownership lookup (hp_students, scoped to School A) finds no such student.
  const db = makeDb((s) => {
    if (s.table === 'hp_students') return { data: [], error: null };
    return { data: null, error: null };
  });
  await assert.rejects(
    () => saveTestResult(db, { student_id: STUDENT_B, term: 'Term 1', year: 2026, cmj: 42 }, 'hp-coach', SCHOOL_A),
    /not found in this school/i,
  );
  assert.equal(db._writes.length, 0, 'no insert/upsert/delete may run for a foreign student');
});

test('saveTestResult: same-school write succeeds and is stripped to allowlisted columns', async () => {
  const { saveTestResult } = loadRepository();
  const db = makeDb((s) => {
    if (s.table === 'hp_students') return { data: [{ id: STUDENT_B }], error: null }; // now "owned" by A
    if (s.table === 'hp_test_results' && s.single) return { data: null, error: null };  // no existing row
    return { data: null, error: null };
  });
  await saveTestResult(db, {
    student_id: STUDENT_B, term: 'Term 1', year: 2026, cmj: 42,
    id: 'client-supplied-id', school_id: 'SOME-OTHER-SCHOOL', hacker_col: 'x', // all must be dropped
  }, 'hp-coach', SCHOOL_A);

  const upsert = db._writes.find((w) => w.op === 'upsert' && w.table === 'hp_test_results');
  assert.ok(upsert, 'an upsert must run for a valid same-school write');
  const row = upsert.rows[0];
  assert.equal(row.school_id, SCHOOL_A, 'school_id must come from the session, not the client');
  assert.equal(row.student_id, STUDENT_B);
  assert.equal(row.cmj, 42, 'allowlisted metric is kept');
  assert.ok(!('id' in row), 'client id must be stripped');
  assert.ok(!('hacker_col' in row), 'unknown column must be stripped');
  assert.notEqual(row.school_id, 'SOME-OTHER-SCHOOL', 'client school_id must never win');
});

test('saveAttendance: rejects a register containing a foreign student and writes nothing', async () => {
  const { saveAttendance } = loadRepository();
  const db = makeDb((s) => {
    if (s.table === 'hp_students') return { data: [], error: null }; // none owned by A
    return { data: [], error: null };
  });
  await assert.rejects(
    () => saveAttendance(
      db, '2026-02-10',
      [{ student_id: STUDENT_B, session_date: '2026-02-10', status: 'present' }],
      'hp-coach', SCHOOL_A,
    ),
    /not found in this school/i,
  );
  assert.equal(db._writes.length, 0, 'no write may run when any student is foreign');
});

test('saveTestResult: refuses to run without a school context', async () => {
  const { saveTestResult } = loadRepository();
  const db = makeDb(() => ({ data: null, error: null }));
  await assert.rejects(
    () => saveTestResult(db, { student_id: STUDENT_B, term: 'Term 1', year: 2026 }, 'hp-coach', null),
    /school context is required/i,
  );
  assert.equal(db._writes.length, 0);
});
