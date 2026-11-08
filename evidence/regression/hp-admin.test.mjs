// Regression tests for Blocker 3 — HP admin operations require the hp-admin role.
//
// Exercises the REAL guards from lib/serverAuth.ts (transpiled in-memory, infra
// imports stubbed, real node crypto) against synthetic signed cookies. Routes
// pair requireHpSchoolId (→401) with isHpAdmin (→403); these tests assert that
// contract:
//   - hp-admin session: requireHpSchoolId returns the school AND isHpAdmin true
//   - hp-coach session:  requireHpSchoolId returns the school BUT isHpAdmin false (403)
//   - no / tampered / forged cookie: requireHpSchoolId null (401) and isHpAdmin false
//
// Run: node --test evidence/regression/hp-admin.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const SECRET = 'test-hp-secret-value';
process.env.HP_SESSION_SECRET = SECRET;

function loadServerAuth() {
  const src = readFileSync(new URL('../../lib/serverAuth.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleObj = { exports: {} };
  const stubRequire = (id) => {
    if (id === 'crypto') return require('crypto');          // real node crypto
    if (id === 'next/server') return {};                    // NextRequest is a type only
    if (id === '@supabase/supabase-js') return { createClient: () => ({}) };
    throw new Error('unexpected require in test: ' + id);
  };
  new Function('exports', 'require', 'module', js)(moduleObj.exports, stubRequire, moduleObj);
  return moduleObj.exports;
}

const SCHOOL_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// Mint a cookie exactly the way /api/hp/login does.
function signedCookie({ role, schoolId, exp = Date.now() + 3600_000 }) {
  const payload = Buffer.from(JSON.stringify({ exp, iat: Date.now(), role, schoolId })).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}
const reqWith = (cookie) => ({ headers: { get: (k) => (k === 'cookie' && cookie ? `hp_session=${cookie}` : null) } });

test('hp-admin session: has a school (not 401) and passes the admin gate', () => {
  const { requireHpSchoolId, isHpAdmin } = loadServerAuth();
  const req = reqWith(signedCookie({ role: 'hp-admin', schoolId: SCHOOL_A }));
  assert.equal(requireHpSchoolId(req), SCHOOL_A);
  assert.equal(isHpAdmin(req), true);
});

test('hp-coach session: has a school (not 401) but is forbidden from admin (403)', () => {
  const { requireHpSchoolId, isHpAdmin } = loadServerAuth();
  const req = reqWith(signedCookie({ role: 'hp-coach', schoolId: SCHOOL_A }));
  assert.equal(requireHpSchoolId(req), SCHOOL_A, 'coach is still authenticated');
  assert.equal(isHpAdmin(req), false, 'but must not pass the admin gate');
});

test('missing cookie: 401 (no school) and not admin', () => {
  const { requireHpSchoolId, isHpAdmin } = loadServerAuth();
  const req = reqWith(null);
  assert.equal(requireHpSchoolId(req), null);
  assert.equal(isHpAdmin(req), false);
});

test('tampered signature: rejected (401) and not admin', () => {
  const { requireHpSchoolId, isHpAdmin } = loadServerAuth();
  const good = signedCookie({ role: 'hp-admin', schoolId: SCHOOL_A });
  const req = reqWith(good.slice(0, -4) + '0000'); // corrupt the HMAC
  assert.equal(requireHpSchoolId(req), null);
  assert.equal(isHpAdmin(req), false);
});

test('a coach cannot forge admin by editing the payload (signature breaks)', () => {
  const { requireHpSchoolId, isHpAdmin } = loadServerAuth();
  // A payload claiming admin, signed with the WRONG secret — must not verify.
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 3600_000, iat: Date.now(), role: 'hp-admin', schoolId: SCHOOL_A })).toString('base64');
  const badSig = crypto.createHmac('sha256', 'the-wrong-secret').update(payload).digest('hex');
  const req = reqWith(`${payload}.${badSig}`);
  assert.equal(requireHpSchoolId(req), null, 'forged signature does not verify');
  assert.equal(isHpAdmin(req), false);
});
