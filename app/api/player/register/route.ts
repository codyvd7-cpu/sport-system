import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/player/register ─────────────────────────────────────────────────────
// Self-registration: the athlete creates and owns their own record.
//
// This is the inverse of the old model. There is no coach-made shell and no
// name-matching — the player signs up, enters their own identity, physical,
// sport and medical data, and THAT becomes the athletes row, owned by their
// account (athletes.user_id). A coach later SELECTS them into a team; until
// then the athlete is pending_team / unassigned.
//
// Medical data is written to the separate athlete_medical table, never onto
// athletes, so it stays behind the role-based access the database enforces.

function calcAgeGroup(dob: string): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  // SA school age groups run on age at 1 January of the year.
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  let age = yearStart.getFullYear() - birth.getFullYear();
  if (yearStart < new Date(yearStart.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  if (age <= 0 || age > 25) return null;
  return age >= 19 ? 'Open' : `U${age}`;
}

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
    ?? req.cookies.get('sb-access-token')?.value;
  if (!token) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const db = getAdmin();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user?.id) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // ── Validate the essentials ──────────────────────────────────────────────
  const fullName = String(body.fullName || '').trim();
  const dob = String(body.dob || '').trim();
  // Accept either a slug (what /api/school/list returns) or a raw id.
  const schoolRef = String(body.schoolId || body.schoolSlug || '').trim();
  const sport = String(body.sport || '').trim();

  if (!fullName) return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
  if (!dob) return NextResponse.json({ error: 'Please enter your date of birth.' }, { status: 400 });
  if (!schoolRef) return NextResponse.json({ error: 'Please choose your school.' }, { status: 400 });
  if (!sport) return NextResponse.json({ error: 'Please choose your main sport.' }, { status: 400 });

  // Resolve by id if it looks like a uuid, otherwise by slug.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolRef);
  const { data: school } = await db.from('schools')
    .select('id,is_active')
    .eq(isUuid ? 'id' : 'slug', schoolRef)
    .maybeSingle();
  if (!school || school.is_active !== true) {
    return NextResponse.json({ error: 'That school is not available.' }, { status: 400 });
  }
  const schoolId = school.id;

  // Domain validation — a nonempty date string is not enough (Blocker 10).
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) {
    return NextResponse.json({ error: 'Please enter a valid date of birth.' }, { status: 400 });
  }
  const ageGroup = calcAgeGroup(dob);
  if (!ageGroup) {
    return NextResponse.json({ error: 'Please check your date of birth.' }, { status: 400 });
  }
  // Optional physicals: keep only plausible values, otherwise store nothing
  // rather than garbage.
  const heightNum = Number(body.heightCm);
  const weightNum = Number(body.weightKg);
  const heightCm = Number.isFinite(heightNum) && heightNum >= 50 && heightNum <= 250 ? heightNum : null;
  const weightKg = Number.isFinite(weightNum) && weightNum >= 20 && weightNum <= 250 ? weightNum : null;

  // ── Create or update the athlete record this account owns ────────────────
  // One athlete record per account (idx_athletes_user enforces it). A second
  // registration updates the SAME row, but must only touch the fields the
  // athlete actually owns (AP-19). The fields below are self-service identity
  // and physicals.
  const ownFields = {
    full_name: fullName,
    date_of_birth: dob,
    age_group: ageGroup,
    grade: String(body.grade || '').trim() || null,
    sport,
    height_cm: heightCm,
    weight_kg: weightKg,
    position: String(body.position || '').trim() || null,
  };

  const { data: existing } = await db.from('athletes')
    .select('id,school_id,pending_team').eq('user_id', user.id).maybeSingle();

  // On re-registration we keep the athlete at the school they already belong to.
  // Letting a self-service form rewrite school_id would silently relocate the
  // whole record — logs, tests, medical, video history — into another tenant
  // (AP-19). A genuine school change is a coach/admin action, not self-service.
  const effectiveSchoolId = existing ? existing.school_id : schoolId;

  let athleteId: string;
  let pendingTeam: boolean;
  if (existing) {
    // Update ONLY the owned fields. team / pending_team / availability /
    // is_active are coach-managed — re-running setup must not drop the athlete
    // out of their squad or clear an injury/availability status a coach set.
    const { error: updErr } = await db.from('athletes').update(ownFields).eq('id', existing.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    athleteId = existing.id;
    pendingTeam = existing.pending_team !== false;
  } else {
    const { data: created, error } = await db.from('athletes')
      .insert({
        user_id: user.id,
        school_id: schoolId,
        ...ownFields,
        availability: 'Available',
        self_registered: true,
        pending_team: true,          // not yet selected into a squad by a coach
        team: null,                  // a coach assigns this
        is_active: true,
      }).select('id').single();
    if (error || !created) {
      return NextResponse.json({ error: error?.message || 'Could not create your profile.' }, { status: 500 });
    }
    athleteId = created.id;
    pendingTeam = true;
  }

  // The athlete row exists now. The two dependent writes below each have their
  // result checked: on failure we report a CLEAR, RETRYABLE incomplete state
  // rather than a false success (Blocker 10). A retry re-POSTs and finishes
  // idempotently — the athlete update and both upserts are conflict-safe.
  // (A single DB transaction across all three is the stronger guarantee and is
  // tracked as the migration-layer enhancement; this makes the failure honest
  // and recoverable today.)
  const incomplete = (step: string, message: string) =>
    NextResponse.json(
      { ok: false, incomplete: true, step, athleteId, ageGroup, pendingTeam, error: message },
      { status: 200 },
    );

  // ── Medical record — separate table, access-controlled ───────────────────
  const hasMedical = body.conditions || body.allergies || body.medications
    || body.injuryHistory || body.emergencyContactName;
  if (hasMedical) {
    // Preserve a clinician/admin-managed clearance decision: only SELF-SET the
    // clearance flag when there is no existing medical record. On a re-register,
    // clearance_status is omitted from the payload so a managed value survives
    // (Blocker 10) — self-service emergency info must not silently re-clear.
    const { data: existingMed } = await db.from('athlete_medical')
      .select('clearance_status').eq('athlete_id', athleteId).maybeSingle();

    const medicalRow: Record<string, unknown> = {
      athlete_id: athleteId,
      school_id: effectiveSchoolId,
      conditions: String(body.conditions || '').trim() || null,
      allergies: String(body.allergies || '').trim() || null,
      medications: String(body.medications || '').trim() || null,
      injury_history: String(body.injuryHistory || '').trim() || null,
      emergency_contact_name: String(body.emergencyContactName || '').trim() || null,
      emergency_contact_phone: String(body.emergencyContactPhone || '').trim() || null,
      medical_aid_name: String(body.medicalAidName || '').trim() || null,
      medical_aid_number: String(body.medicalAidNumber || '').trim() || null,
      updated_by: user.email || 'self',
      updated_at: new Date().toISOString(),
    };
    if (!existingMed) {
      medicalRow.clearance_status = (body.conditions || body.medications) ? 'see_head' : 'cleared';
    }

    const { error: medErr } = await db.from('athlete_medical').upsert(medicalRow, { onConflict: 'athlete_id' });
    if (medErr) {
      return incomplete('medical', 'Your profile was created, but your medical details did not save. Please try again.');
    }
  }

  // Also keep the lightweight player_profiles row in step for existing UI.
  const { error: profErr } = await db.from('player_profiles').upsert({
    user_id: user.id,
    email: user.email || '',
    full_name: fullName,
    grade: String(body.grade || '').trim() || null,
    sports: [sport],
    athlete_id: athleteId,
    school_id: effectiveSchoolId,
  }, { onConflict: 'user_id' });
  if (profErr) {
    return incomplete('profile', 'Your profile was created, but finishing setup failed. Please try again.');
  }

  return NextResponse.json({ ok: true, athleteId, ageGroup, pendingTeam });
}
