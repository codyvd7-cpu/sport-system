// Regression tests for Blocker 10 — registration must not claim success when a
// dependent write fails, and must preserve a managed medical clearance.
//
// Runs the REAL app/api/player/register POST (transpiled) with next/server and
// the Supabase admin client stubbed. Converts the review's reproduction
// (ok:true with both dependent writes failing) into the correct expectation.
//
// Run: node --test evidence/regression/registration-honesty.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './_harness.mjs';

const NextResponse = { json: (body, init = {}) => ({ status: init.status ?? 200, body }) };

const SCHOOL_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER = { id: 'u1', email: 'jane@example.test' };

function makeDb(cfg) {
  const calls = { upserts: [] };
  const db = {
    auth: { getUser: async () => ({ data: { user: cfg.user ?? USER } }) },
    from(table) {
      const b = {
        select: () => b,
        eq: () => b,
        insert() { b._insert = true; return b; },
        update() { return b; },
        upsert(obj, opts) {
          calls.upserts.push({ table, obj, opts });
          if (table === 'athlete_medical') return Promise.resolve({ error: cfg.medError ?? null });
          if (table === 'player_profiles') return Promise.resolve({ error: cfg.profError ?? null });
          return Promise.resolve({ error: null });
        },
        single: () => Promise.resolve({ data: cfg.createdAthlete ?? { id: 'ath-1' }, error: null }),
        maybeSingle: () => Promise.resolve({
          data: table === 'schools' ? cfg.school
            : table === 'athletes' ? (cfg.existingAthlete ?? null)
            : table === 'athlete_medical' ? (cfg.existingMed ?? null)
            : null,
        }),
        then: (res) => Promise.resolve({ error: cfg.updateError ?? null }).then(res), // update().eq()
      };
      return b;
    },
  };
  return { db, calls };
}

function loadRoute(db) {
  return loadTs('../../app/api/player/register/route.ts', {
    '@/lib/supabaseAdmin': { getAdmin: () => db, adminConfigured: () => true },
    'next/server': { NextResponse, NextRequest: class {} },
  });
}
const reqWith = (body) => ({
  headers: { get: (k) => (k === 'authorization' ? 'Bearer tok' : null) },
  cookies: { get: () => undefined },
  json: async () => body,
});
const base = { fullName: 'Jane Doe', dob: '2012-05-01', schoolId: SCHOOL_UUID, sport: 'Rugby', conditions: 'Asthma' };
const activeSchool = { id: SCHOOL_UUID, is_active: true };

test('a failed medical write reports a retryable incomplete state, NOT ok:true', async () => {
  const { db } = makeDb({ school: activeSchool, medError: { message: 'db down' } });
  const res = await loadRoute(db).POST(reqWith(base));
  assert.equal(res.body.ok, false, 'must not claim success');
  assert.equal(res.body.incomplete, true);
  assert.equal(res.body.step, 'medical');
  assert.equal(res.body.athleteId, 'ath-1', 'returns the created athlete so retry can finish');
});

test('a failed profile write reports a retryable incomplete state', async () => {
  const { db } = makeDb({ school: activeSchool, profError: { message: 'db down' } });
  const res = await loadRoute(db).POST(reqWith(base));
  assert.equal(res.body.ok, false);
  assert.equal(res.body.step, 'profile');
});

test('a fully successful registration returns ok:true', async () => {
  const { db } = makeDb({ school: activeSchool });
  const res = await loadRoute(db).POST(reqWith(base));
  assert.equal(res.body.ok, true);
  assert.equal(res.body.athleteId, 'ath-1');
});

test('re-registration does NOT overwrite an existing managed clearance', async () => {
  const { db, calls } = makeDb({
    school: activeSchool,
    existingAthlete: { id: 'ath-1', school_id: SCHOOL_UUID, pending_team: true },
    existingMed: { clearance_status: 'see_head' }, // a clinician already set this
  });
  const res = await loadRoute(db).POST(reqWith(base));
  assert.equal(res.body.ok, true);
  const med = calls.upserts.find((u) => u.table === 'athlete_medical');
  assert.ok(med, 'medical upsert ran');
  assert.ok(!('clearance_status' in med.obj), 'clearance_status must be omitted so the managed value survives');
});

test('first-time medical write DOES set a default clearance', async () => {
  const { db, calls } = makeDb({ school: activeSchool }); // no existing medical row
  await loadRoute(db).POST(reqWith(base));
  const med = calls.upserts.find((u) => u.table === 'athlete_medical');
  assert.equal(med.obj.clearance_status, 'see_head', 'a condition was supplied → see_head');
});

test('an invalid date of birth is rejected (400), before any write', async () => {
  const { db, calls } = makeDb({ school: activeSchool });
  const res = await loadRoute(db).POST(reqWith({ ...base, dob: 'not-a-date' }));
  assert.equal(res.status, 400);
  assert.equal(calls.upserts.length, 0);
});
