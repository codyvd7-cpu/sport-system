import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/athletes/import ─────────────────────────────────────────────────────
// Bulk athlete creation for onboarding a school.
//
// Without this, a new school has to add three hundred athletes one at a time,
// which realistically means they never finish setting up. This accepts a
// pasted list — the format a school actually has, since squad lists live in
// spreadsheets and emails.
//
// Deliberately conservative: it reports what it WOULD create and what looks
// wrong, and only writes when explicitly confirmed. Importing children's
// records is not something to do on a single click with no preview.

interface ParsedRow {
  fullName: string;
  team: string | null;
  ageGroup: string | null;
  position: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  issue?: string;
}

/** Accepts CSV or tab-separated, with or without a header row. */
function parseRows(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const split = (l: string) => l.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

  // Detect and map a header row, so column order doesn't have to be exact.
  const first = split(lines[0]).map(h => h.toLowerCase());
  const looksLikeHeader = first.some(h => /name|team|squad|grade|position|email|phone|parent|guardian/.test(h));

  const idx = {
    name: 0, team: 1, age: 2, position: 3, email: 4, phone: 5,
  };
  if (looksLikeHeader) {
    first.forEach((h, i) => {
      if (/full ?name|athlete|player|^name/.test(h)) idx.name = i;
      else if (/team|squad/.test(h)) idx.team = i;
      else if (/age|grade|group/.test(h)) idx.age = i;
      else if (/position|pos/.test(h)) idx.position = i;
      else if (/email/.test(h)) idx.email = i;
      else if (/phone|cell|mobile|contact/.test(h)) idx.phone = i;
    });
  }

  const body = looksLikeHeader ? lines.slice(1) : lines;

  return body.map(line => {
    const c = split(line);
    const fullName = (c[idx.name] || '').trim();
    const row: ParsedRow = {
      fullName,
      team: c[idx.team]?.trim() || null,
      ageGroup: c[idx.age]?.trim() || null,
      position: c[idx.position]?.trim() || null,
      parentEmail: c[idx.email]?.trim() || null,
      parentPhone: c[idx.phone]?.trim() || null,
    };
    // Flag rather than silently skip — a coach should see what was wrong.
    if (!fullName) row.issue = 'No name';
    else if (fullName.length < 2) row.issue = 'Name too short';
    else if (!fullName.includes(' ')) row.issue = 'Looks like a first name only';
    if (row.parentEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.parentEmail)) {
      row.issue = 'Invalid parent email';
    }
    return row;
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '');
  const confirm = body.confirm === true;
  const defaultTeam = body.defaultTeam ? String(body.defaultTeam) : null;
  const sport = body.sport ? String(body.sport) : null;

  if (!text.trim()) return NextResponse.json({ error: 'Nothing to import.' }, { status: 400 });

  const rows = parseRows(text);
  if (rows.length === 0) return NextResponse.json({ error: 'No rows found.' }, { status: 400 });
  if (rows.length > 1000) {
    return NextResponse.json({ error: 'Too many rows — import up to 1000 at a time.' }, { status: 400 });
  }

  const valid = rows.filter(r => !r.issue);
  const problems = rows.filter(r => r.issue);

  // Existing athletes, so a re-paste doesn't create duplicates. Matching on
  // name within a school is imperfect but is what a coach expects; exact
  // duplicates are skipped rather than silently merged.
  const { data: existing } = await getAdmin().from('athletes')
    .select('full_name').eq('school_id', schoolId).eq('is_active', true);
  const known = new Set((existing || []).map(a => a.full_name.trim().toLowerCase()));

  const toCreate = valid.filter(r => !known.has(r.fullName.toLowerCase()));
  const duplicates = valid.filter(r => known.has(r.fullName.toLowerCase()));

  // Preview mode — nothing is written. The client shows this and asks for
  // confirmation before committing.
  if (!confirm) {
    return NextResponse.json({
      preview: true,
      willCreate: toCreate.length,
      duplicates: duplicates.length,
      problems: problems.length,
      sample: toCreate.slice(0, 8),
      problemRows: problems.slice(0, 8),
    });
  }

  if (toCreate.length === 0) {
    return NextResponse.json({ ok: true, created: 0, message: 'Everyone in that list is already on the system.' });
  }

  const { data: inserted, error } = await getAdmin().from('athletes').insert(
    toCreate.map(r => ({
      school_id: schoolId,
      full_name: r.fullName,
      first_name: r.fullName.split(' ')[0],
      last_name: r.fullName.split(' ').slice(1).join(' ') || null,
      team: r.team || defaultTeam,
      age_group: r.ageGroup,
      position: r.position,
      parent_email: r.parentEmail,
      parent_phone: r.parentPhone,
      sport,
      availability: 'Available',
      is_active: true,
    }))
  ).select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    created: inserted?.length ?? 0,
    skippedDuplicates: duplicates.length,
    skippedProblems: problems.length,
  });
}
