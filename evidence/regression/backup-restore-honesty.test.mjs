// Regression tests for Blocker 8 — HP backup restore must fail honestly.
//
// Runs the REAL app/api/hp/backup POST (transpiled) with auth + the Supabase
// admin client stubbed. Converts the review's reproduction (three failing
// upserts still returned 200 "restored 1/1/1") into the correct expectation,
// and pins the real-count + version + collision behaviour.
//
// Run: node --test evidence/regression/backup-restore-honesty.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './_harness.mjs';

const NextResponse = { json: (body, init = {}) => ({ status: init.status ?? 200, body }) };
const SCHOOL = 'school-1';

function makeDb(cfg = {}) {
  const calls = { upserts: [] };
  function from(table) {
    const b = { _table: table, _op: 'select' };
    b.select = () => b; b.in = () => b; b.neq = () => b; b.eq = () => b;
    b.order = () => b; b.range = () => b; b.limit = () => b;
    b.upsert = (rows, opts) => { b._op = 'upsert'; b._rows = rows; calls.upserts.push({ table, rows, opts }); return b; };
    b.insert = (rows) => { b._op = 'insert'; b._rows = rows; return b; };
    b.then = (resolve) => {
      let result;
      if (b._op === 'upsert') {
        const err = cfg.upsertErrors?.[table] || null;
        result = { data: err ? null : (b._rows || []).map((r) => ({ id: r.id })), error: err };
      } else if (b._op === 'insert') {
        result = { error: null };
      } else {
        result = { data: cfg.collide?.[table] || [] }; // cross-school collision check
      }
      return Promise.resolve(result).then(resolve);
    };
    return b;
  }
  return { db: { from }, calls };
}

function loadRoute(db) {
  return loadTs('../../app/api/hp/backup/route.ts', {
    '@/lib/serverAuth': { requireHpSchoolId: () => SCHOOL, isHpAdmin: () => true },
    '@/lib/hpRepository': { getHpAdmin: () => db },
    'next/server': { NextResponse, NextRequest: class {} },
  });
}
const reqWith = (backup) => ({ json: async () => ({ confirm: true, backup }) });
const goodBackup = () => ({
  version: '1.0',
  students: [{ id: 's1', full_name: 'A' }, { id: 's2', full_name: 'B' }],
  test_results: [{ id: 't1', student_id: 's1' }],
  attendance: [{ id: 'a1', student_id: 's1' }],
});

test('a failed restore returns failure, never success', async () => {
  const { db } = makeDb({ upsertErrors: { hp_students: { message: 'db down' } } });
  const res = await loadRoute(db).POST(reqWith(goodBackup()));
  assert.equal(res.status, 500);
  assert.equal(res.body.ok, false, 'must NOT claim success when a write failed');
  assert.equal(res.body.complete, false);
});

test('a partial failure reports what landed and still fails (not ok)', async () => {
  // students succeed, test_results fail
  const { db } = makeDb({ upsertErrors: { hp_test_results: { message: 'fk violation' } } });
  const res = await loadRoute(db).POST(reqWith(goodBackup()));
  assert.equal(res.status, 500);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.restored.students, 2, 'honestly reports the students that were written');
});

test('a fully successful restore reports ACTUAL written counts', async () => {
  const { db } = makeDb();
  const res = await loadRoute(db).POST(reqWith(goodBackup()));
  assert.equal(res.body.ok, true);
  assert.deepEqual(res.body.restored, { students: 2, test_results: 1, attendance: 1 });
});

test('students are restored before children (parents first)', async () => {
  const { db, calls } = makeDb();
  await loadRoute(db).POST(reqWith(goodBackup()));
  const order = calls.upserts.map((u) => u.table);
  assert.equal(order[0], 'hp_students', 'parent students must be the first upsert');
});

test('an unsupported backup version is rejected (400)', async () => {
  const { db } = makeDb();
  const res = await loadRoute(db).POST(reqWith({ ...goodBackup(), version: '2.0' }));
  assert.equal(res.status, 400);
});

test('a backup containing another school\'s ids is refused (409)', async () => {
  const { db } = makeDb({ collide: { hp_students: [{ id: 's1' }] } });
  const res = await loadRoute(db).POST(reqWith(goodBackup()));
  assert.equal(res.status, 409);
});

test('a malformed backup (non-array) is rejected (400)', async () => {
  const { db } = makeDb();
  const res = await loadRoute(db).POST(reqWith({ version: '1.0', students: 'nope', test_results: [], attendance: [] }));
  assert.equal(res.status, 400);
});
