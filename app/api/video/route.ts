import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/video ───────────────────────────────────────────────────────────────
// Video review: match footage, timestamped tags, and clips.
//
// Link-based by design — schools host the video (YouTube unlisted, Veo,
// Vimeo), Altus stores the tags. Tags are just timestamps, so moving to hosted
// video later changes the `provider` column and nothing else.
//
// GET  ?list=1            → videos for this school
// GET  ?videoId=          → one video with its tags, clips and the tag palette
// GET  ?athleteId=        → every clip and tag for one athlete, across videos
// POST { title, url, ...} → add a video
// POST { videoId, tag }   → add a tag
// POST { videoId, clip }  → add a clip
// PATCH / DELETE          → edit or remove

/** Extracts a YouTube id from any of its URL shapes. */
function parseYouTube(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const db = getAdmin();
  const p = req.nextUrl.searchParams;

  // Everything for one athlete, across every video — the "show me their clips" view
  if (p.get('athleteId')) {
    const athleteId = p.get('athleteId')!;
    const { data: ath } = await db.from('athletes').select('school_id').eq('id', athleteId).maybeSingle();
    if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const [{ data: clips }, { data: tags }] = await Promise.all([
      db.from('video_clips').select('id,video_id,title,start_seconds,end_seconds,coach_note,visible_to_player,created_at')
        .eq('athlete_id', athleteId).order('created_at', { ascending: false }),
      db.from('video_tags').select('id,video_id,label,color,timestamp_seconds,note,created_at')
        .eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(50),
    ]);

    const vids = [...new Set([...(clips || []).map(c => c.video_id), ...(tags || []).map(t => t.video_id)])];
    const { data: videos } = vids.length
      ? await db.from('videos').select('id,title,team,opponent,played_on,provider,external_id').in('id', vids)
      : { data: [] };

    return NextResponse.json({ clips: clips || [], tags: tags || [], videos: videos || [] });
  }

  // One video, fully loaded
  if (p.get('videoId')) {
    const videoId = p.get('videoId')!;
    const { data: video } = await db.from('videos').select('*').eq('id', videoId).maybeSingle();
    if (!video || video.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const [{ data: tags }, { data: clips }, { data: tagTypes }, { data: athletes }] = await Promise.all([
      db.from('video_tags').select('id,tag_type_id,label,color,timestamp_seconds,athlete_id,note,created_by')
        .eq('video_id', videoId).order('timestamp_seconds'),
      db.from('video_clips').select('id,title,start_seconds,end_seconds,athlete_id,coach_note,visible_to_player')
        .eq('video_id', videoId).order('start_seconds'),
      db.from('video_tag_types').select('id,label,hotkey,color,sort_order,lead_seconds,trail_seconds')
        .eq('school_id', schoolId).eq('is_active', true).order('sort_order'),
      // Squad list for attributing a tag to a player
      video.team
        ? db.from('athletes').select('id,full_name').eq('school_id', schoolId).eq('team', video.team).eq('is_active', true).order('full_name')
        : db.from('athletes').select('id,full_name').eq('school_id', schoolId).eq('is_active', true).order('full_name').limit(200),
    ]);

    return NextResponse.json({
      video, tags: tags || [], clips: clips || [],
      tagTypes: tagTypes || [], squad: athletes || [],
    });
  }

  // Library
  const { data: videos } = await db.from('videos')
    .select('id,title,team,opponent,played_on,provider,external_id,created_at')
    .eq('school_id', schoolId).order('played_on', { ascending: false, nullsFirst: false }).limit(100);

  const ids = (videos || []).map(v => v.id);
  const { data: counts } = ids.length
    ? await db.from('video_tags').select('video_id').in('video_id', ids)
    : { data: [] };
  const tagCount = new Map<string, number>();
  for (const t of counts || []) tagCount.set(t.video_id, (tagCount.get(t.video_id) || 0) + 1);

  return NextResponse.json({
    videos: (videos || []).map(v => ({ ...v, tagCount: tagCount.get(v.id) || 0 })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const db = getAdmin();

  // ── Add a tag ────────────────────────────────────────────────────────────
  if (body.kind === 'tag') {
    const videoId = String(body.videoId || '');
    const ts = Number(body.timestampSeconds);
    if (!videoId || !Number.isFinite(ts)) {
      return NextResponse.json({ error: 'videoId and timestampSeconds are required.' }, { status: 400 });
    }
    const { data: v } = await db.from('videos').select('id,school_id').eq('id', videoId).maybeSingle();
    if (!v || v.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const { data, error } = await db.from('video_tags').insert([{
      school_id: schoolId, video_id: videoId,
      tag_type_id: body.tagTypeId || null,
      label: String(body.label || 'Tag'),
      color: body.color ? String(body.color) : null,
      timestamp_seconds: Math.max(0, ts),
      athlete_id: body.athleteId || null,
      note: body.note ? String(body.note) : null,
      created_by: auth.email || 'staff',
    }]).select('id,label,color,timestamp_seconds,athlete_id,note').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, tag: data });
  }

  // ── Add a clip ───────────────────────────────────────────────────────────
  if (body.kind === 'clip') {
    const videoId = String(body.videoId || '');
    const start = Number(body.startSeconds);
    const end = Number(body.endSeconds);
    if (!videoId || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return NextResponse.json({ error: 'A valid videoId, start and end are required.' }, { status: 400 });
    }
    const { data: v } = await db.from('videos').select('id,school_id').eq('id', videoId).maybeSingle();
    if (!v || v.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const { data, error } = await db.from('video_clips').insert([{
      school_id: schoolId, video_id: videoId,
      title: String(body.title || 'Clip'),
      start_seconds: Math.max(0, start), end_seconds: end,
      athlete_id: body.athleteId || null,
      goal_id: body.goalId || null,
      coach_note: body.coachNote ? String(body.coachNote) : null,
      visible_to_player: !!body.visibleToPlayer,
      created_by: auth.email || 'staff',
    }]).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, clip: data });
  }

  // ── Add a video ──────────────────────────────────────────────────────────
  const url = String(body.url || '').trim();
  const title = String(body.title || '').trim();
  if (!url || !title) return NextResponse.json({ error: 'Title and video link are required.' }, { status: 400 });

  const ytId = parseYouTube(url);
  if (!ytId) {
    return NextResponse.json({
      error: 'That doesn\u2019t look like a YouTube link. Paste a youtube.com or youtu.be URL.',
    }, { status: 400 });
  }

  const { data, error } = await db.from('videos').insert([{
    school_id: schoolId, title,
    team: body.team ? String(body.team) : null,
    sport: body.sport ? String(body.sport) : null,
    opponent: body.opponent ? String(body.opponent) : null,
    played_on: body.playedOn || null,
    provider: 'youtube', external_id: ytId, url,
    notes: body.notes ? String(body.notes) : null,
    created_by: auth.email || 'staff',
  }]).select('id,title').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, video: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  const body = await req.json().catch(() => ({}));
  const db = getAdmin();

  const table = body.kind === 'tag' ? 'video_tags' : body.kind === 'clip' ? 'video_clips' : 'videos';
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });

  const { data: row } = await db.from(table).select('id,school_id').eq('id', id).maybeSingle();
  if (!row || row.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await db.from(table).delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
