// Regression tests for Blocker 9 — alerts must be honest and school-isolated.
//
// Runs the REAL lib/alertsService and lib/push (transpiled) with push + supabase
// stubbed. Converts the review's reproduction (a failed clear still sent "All
// clear") into the correct expectation, and pins school isolation.
//
// Run: node --test evidence/regression/alert-isolation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './_harness.mjs';

// ── alertsService: honest state changes ───────────────────────────────────────
function alertDb(cfg = {}) {
  function from() {
    const b = { _op: 'select' };
    b.update = () => { b._op = 'update'; return b; };
    b.insert = () => { b._op = 'insert'; return b; };
    b.select = () => b; b.eq = () => b; b.order = () => b; b.limit = () => b;
    b.single = () => Promise.resolve({
      data: { id: 'al1', type: 'lightning', message: 'm', created_by: 'a', created_at: 't' },
      error: cfg.insertError || null,
    });
    b.then = (res) => Promise.resolve(b._op === 'update' ? { error: cfg.updateError || null } : { data: null }).then(res);
    return b;
  }
  return { from };
}

function loadSvc() {
  const pushes = [];
  const svc = loadTs('../../lib/alertsService.ts', {
    './push': { broadcastPush: async (_db, payload, schoolId) => { pushes.push({ payload, schoolId }); return 3; }, pushReady: () => true },
    '@supabase/supabase-js': {},
  });
  return { svc, pushes };
}

test('clearAlert: a failed DB clear throws and sends NO all-clear', async () => {
  const { svc, pushes } = loadSvc();
  await assert.rejects(() => svc.clearAlert(alertDb({ updateError: { message: 'db down' } }), 'school-1'));
  assert.equal(pushes.length, 0, 'an all-clear must never follow a failed clear');
});

test('clearAlert: a committed clear sends exactly one all-clear, school-scoped', async () => {
  const { svc, pushes } = loadSvc();
  await svc.clearAlert(alertDb({}), 'school-1');
  assert.equal(pushes.length, 1);
  assert.match(pushes[0].payload.title, /all clear/i);
  assert.equal(pushes[0].schoolId, 'school-1');
});

test('clearAlert / activateAlert require a school (never global)', async () => {
  const { svc, pushes } = loadSvc();
  await assert.rejects(() => svc.clearAlert(alertDb({}), null), /school is required/i);
  await assert.rejects(() => svc.activateAlert(alertDb({}), { actor: 'a', schoolId: null }), /school is required/i);
  assert.equal(pushes.length, 0);
});

test('activateAlert: a failed retire throws before broadcasting', async () => {
  const { svc, pushes } = loadSvc();
  await assert.rejects(() => svc.activateAlert(alertDb({ updateError: { message: 'db down' } }), { actor: 'a', schoolId: 'school-1' }));
  assert.equal(pushes.length, 0, 'no alert push if the previous one could not be retired');
});

test('activateAlert: success broadcasts to the raising school only', async () => {
  const { svc, pushes } = loadSvc();
  const r = await svc.activateAlert(alertDb({}), { actor: 'a', schoolId: 'school-1' });
  assert.equal(r.pushed, 3);
  assert.equal(pushes[0].schoolId, 'school-1');
});

// ── push.broadcastPush: school isolation ──────────────────────────────────────
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub';
process.env.VAPID_PRIVATE_KEY = 'priv';
const webpushStub = { setVapidDetails() {}, sendNotification: async () => {} };
webpushStub.default = webpushStub;

function loadPush() {
  return loadTs('../../lib/push.ts', { 'web-push': webpushStub, '@supabase/supabase-js': {} });
}

test('broadcastPush without a school reaches NOBODY (no global page)', async () => {
  const { broadcastPush } = loadPush();
  const throwingDb = { from() { throw new Error('db must not be queried for a null-school broadcast'); } };
  const sent = await broadcastPush(throwingDb, { title: 't', body: 'b' }, null);
  assert.equal(sent, 0);
});

test('broadcastPush scopes strictly by school_id and never includes null-school subs', async () => {
  const { broadcastPush } = loadPush();
  const rec = { eq: [], or: [] };
  const db = { from() {
    const b = {};
    b.select = () => b;
    b.eq = (k, v) => { rec.eq.push([k, v]); return b; };
    b.or = (s) => { rec.or.push(s); return b; };
    b.then = (res) => Promise.resolve({ data: [] }).then(res); // no subs → 0, no webpush send
    return b;
  } };
  await broadcastPush(db, { title: 't', body: 'b' }, 'school-1');
  assert.deepEqual(rec.eq, [['school_id', 'school-1']], 'must filter strictly by school_id');
  assert.equal(rec.or.length, 0, 'must NOT use an OR that pulls in null-school subscriptions');
});
