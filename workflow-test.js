// ─── Altus workflow test ───────────────────────────────────────────────────────
// Paste into the browser console on app.altusperformance.co.za.
//
// Why this exists: checking that pages return 200 proved almost nothing. Every
// cross-school bug found so far — a school's portal showing another school's
// fixtures, sport tiles dropping the school, results filed under the wrong
// sport — sat in the DATA the page received, not in whether it loaded.
//
// So this traces journeys the way a parent actually experiences them, and
// asserts what should be true rather than reporting what is.
//
// Run it after every deploy.

const SCHOOLS = {
  ashford:   { name: 'Ashford Grammar',   sports: ['rugby','hockey','cricket','swimming'],
               ownOpponents: ['Bishops College','Rondebosch','Paarl Gimnasium','Somerset College','Wynberg','SACS','Paul Roos','Durbanville High','Milnerton Prep','Paarl Boys','Boland Gala','Western Province Gala'] },
  ridgemont: { name: 'Ridgemont College', sports: ['hockey','rugby','cricket','swimming'],
               ownOpponents: ['Northcliff High','St Stithians','KES','Parktown Boys','Jeppe High','Westbrook School','Redhill','Summit College','Gauteng Champs','Inter-High Gala','Northcliff Gala'] },
};

let pass = 0, fail = 0;
const log = [];
function check(name, ok, detail = '') {
  if (ok) { pass++; log.push(`  ok    ${name}`); }
  else    { fail++; log.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

async function run() {
  // ── 1. Each school resolves to its own identity ─────────────────────────
  for (const [slug, expect] of Object.entries(SCHOOLS)) {
    const b = await (await fetch(`/api/school/branding?slug=${slug}`)).json();
    check(`${slug}: branding is ${expect.name}`, b.branding?.name === expect.name, b.branding?.name);
    check(`${slug}: has its own crest`, (b.branding?.logoUrl || '').includes(slug));

    const s = await (await fetch(`/api/school/sports?slug=${slug}`)).json();
    const keys = (s.sports || []).map(x => x.key);
    check(`${slug}: runs ${expect.sports.length} sports`,
          expect.sports.every(k => keys.includes(k)), keys.join(','));
  }

  // ── 2. No sport page is empty ───────────────────────────────────────────
  // An empty page in a demo reads as a broken product.
  for (const [slug, expect] of Object.entries(SCHOOLS)) {
    for (const sport of expect.sports) {
      const d = await (await fetch(`/api/portal/data?sport=${sport}&school=${slug}`)).json();
      const n = (d.fixtures || []).length + (d.results || []).length;
      check(`${slug}/${sport}: has content`, n > 0, `${n} items`);
    }
  }

  // ── 3. THE IMPORTANT ONE: no cross-school content ───────────────────────
  for (const [slug, expect] of Object.entries(SCHOOLS)) {
    const other = Object.entries(SCHOOLS).find(([s]) => s !== slug)[1];
    for (const sport of expect.sports) {
      const d = await (await fetch(`/api/portal/data?sport=${sport}&school=${slug}`)).json();
      const opponents = [...(d.fixtures || []), ...(d.results || [])].map(x => x.opponent);
      const foreign = opponents.filter(o => other.ownOpponents.includes(o));
      check(`${slug}/${sport}: no ${other.name} content`, foreign.length === 0, foreign.join(','));
    }
  }

  // ── 4. An unknown school must not silently fall back ────────────────────
  const bogus = await fetch('/api/portal/data?sport=hockey&school=not-a-real-school');
  check('unknown school is rejected, not defaulted', bogus.status === 404, `got ${bogus.status}`);

  // ── 5. Every API still refuses unauthenticated access ───────────────────
  for (const ep of ['/api/coach/inbox','/api/athlete/events','/api/coach/claims','/api/video']) {
    const r = await fetch(ep);
    check(`${ep} requires auth`, r.status === 401 || r.status === 400, `got ${r.status}`);
  }

  console.log(log.join('\n'));
  console.log(`\n${pass} passed, ${fail} failed`);
  return fail === 0 ? 'ALL PASSED' : `${fail} FAILURES — see above`;
}

run();
