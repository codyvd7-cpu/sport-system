// Regression tests for Blocker 2 — staff capability guards are now adopted.
//
// Two layers:
//  1. the capability contract (lib/authz, pure): read vs write split, viewer
//     excluded from writes.
//  2. the real authorize() guard (lib/staffAuth) against a mock DB: active
//     staff, active school, role, and the negative cases the review named —
//     viewer, deactivated staff, deactivated school, non-staff, bad auth.
//
// Run: node --test evidence/regression/staff-authz.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './_harness.mjs';

const authz = loadTs('../../lib/authz.ts');

// ── 1. Capability contract ────────────────────────────────────────────────────
test('capability contract: writes exclude the read-only viewer, reads include it', () => {
  const { can } = authz;
  // writes
  for (const cap of ['claims.manage', 'rtp.manage', 'athlete.manage']) {
    assert.equal(can('owner', cap), true, `owner can ${cap}`);
    assert.equal(can('coach', cap), true, `coach can ${cap}`);
    assert.equal(can('viewer', cap), false, `viewer must NOT ${cap}`);
  }
  // reads
  for (const cap of ['claims.view', 'rtp.view']) {
    assert.equal(can('viewer', cap), true, `viewer may ${cap}`);
    assert.equal(can('coach', cap), true, `coach may ${cap}`);
  }
});

// ── 2. authorize() against mocked infrastructure ──────────────────────────────
function mockDb({ staffRow, schoolRow }) {
  return {
    from(table) {
      const b = {
        select: () => b,
        eq: () => b,
        maybeSingle: () => Promise.resolve({
          data: table === 'staff_roles' ? staffRow : table === 'schools' ? schoolRow : null,
          error: null,
        }),
      };
      return b;
    },
  };
}

function makeAuthorize({ auth, staffRow, schoolRow }) {
  const staffAuth = loadTs('../../lib/staffAuth.ts', {
    './authz': authz,
    './supabaseAdmin': { getAdmin: () => mockDb({ staffRow, schoolRow }) },
    './serverAuth': { authenticateRequest: async () => auth },
    'next/server': {},
  });
  return staffAuth.authorize;
}

const okAuth = { ok: true, userId: 'u1', email: 'person@school.test' };
const activeSchool = { is_active: true };
const roleRow = (role, is_active = true) => ({ role, school_id: 'school-A', teams: [], sport: null, is_active });
const req = {}; // authenticateRequest is stubbed, so the request object is unused

test('owner on an active school is authorized to manage claims', async () => {
  const authorize = makeAuthorize({ auth: okAuth, staffRow: roleRow('owner'), schoolRow: activeSchool });
  const ctx = await authorize(req, 'claims.manage');
  assert.ok(ctx, 'owner should be authorized');
  assert.equal(ctx.role, 'owner');
  assert.equal(ctx.schoolId, 'school-A');
});

test('coach is authorized to manage RTP', async () => {
  const authorize = makeAuthorize({ auth: okAuth, staffRow: roleRow('coach'), schoolRow: activeSchool });
  assert.ok(await authorize(req, 'rtp.manage'));
});

test('viewer may VIEW claims but may NOT MANAGE them', async () => {
  const authorize = makeAuthorize({ auth: okAuth, staffRow: roleRow('viewer'), schoolRow: activeSchool });
  assert.ok(await authorize(req, 'claims.view'), 'viewer can view');
  assert.equal(await authorize(req, 'claims.manage'), null, 'viewer cannot manage');
});

test('a deactivated staff member is rejected', async () => {
  const authorize = makeAuthorize({ auth: okAuth, staffRow: roleRow('coach', false), schoolRow: activeSchool });
  assert.equal(await authorize(req, 'claims.view'), null);
});

test('a deactivated school rejects even an active owner', async () => {
  const authorize = makeAuthorize({ auth: okAuth, staffRow: roleRow('owner'), schoolRow: { is_active: false } });
  assert.equal(await authorize(req, 'claims.view'), null);
});

test('a non-staff account (no staff_roles row) is rejected', async () => {
  const authorize = makeAuthorize({ auth: okAuth, staffRow: null, schoolRow: activeSchool });
  assert.equal(await authorize(req, 'claims.view'), null);
});

test('a request that fails authentication is rejected', async () => {
  const authorize = makeAuthorize({ auth: { ok: false }, staffRow: roleRow('owner'), schoolRow: activeSchool });
  assert.equal(await authorize(req, 'claims.view'), null);
});
