import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getHpSchoolId, verifyPortalCookie, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getSchoolBranding, DEFAULT_BRANDING } from '@/lib/schoolBranding';

// ─── Fixture-day weather ────────────────────────────────────────────────────────
// Open-Meteo (free, no key). Coordinates come from the requesting user's school
// (schools.latitude/longitude) — previously they were pinned to one location, so
// every school would have seen School 1's forecast. Forecasts only exist ~14
// days out; beyond that we return nothing and the UI shows nothing.

// Cache is keyed by date AND coordinates — keying by date alone would serve one
// school's forecast to another.
const cache = new Map<string, { at: number; data: any }>();
const TTL = 3 * 60 * 60 * 1000; // 3h

const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear', icon: '☀️' }, 1: { label: 'Mostly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' }, 3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' }, 48: { label: 'Fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' }, 53: { label: 'Drizzle', icon: '🌦️' }, 55: { label: 'Drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' }, 63: { label: 'Rain', icon: '🌧️' }, 65: { label: 'Heavy rain', icon: '🌧️' },
  80: { label: 'Showers', icon: '🌦️' }, 81: { label: 'Showers', icon: '🌧️' }, 82: { label: 'Heavy showers', icon: '⛈️' },
  95: { label: 'Thunderstorms', icon: '⛈️' }, 96: { label: 'Thunderstorms', icon: '⛈️' }, 99: { label: 'Severe storms', icon: '⛈️' },
};

/** Which school is asking? Checks each session type; falls back to defaults. */
async function resolveSchoolLocation(req: NextRequest) {
  if (!adminConfigured()) return DEFAULT_BRANDING;
  try {
    const hpSchoolId = getHpSchoolId(req);
    if (hpSchoolId) return await getSchoolBranding(hpSchoolId);

    const portal = verifyPortalCookie(req);
    if (portal?.schoolId) return await getSchoolBranding(portal.schoolId);

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const { data } = await getAdmin().auth.getUser(token);
      const user = data.user;
      if (user?.email) {
        const staffSchoolId = await resolveStaffSchoolId(user.email);
        if (staffSchoolId) return await getSchoolBranding(staffSchoolId);
      }
      if (user) {
        const { data: profile } = await getAdmin()
          .from('player_profiles').select('athlete_id').eq('user_id', user.id).maybeSingle();
        if (profile?.athlete_id) {
          const { data: athlete } = await getAdmin()
            .from('athletes').select('school_id').eq('id', profile.athlete_id).maybeSingle();
          if (athlete?.school_id) return await getSchoolBranding(athlete.school_id);
        }
      }
    }
  } catch { /* fall through to defaults */ }
  return DEFAULT_BRANDING;
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ weather: null });

  const days = Math.round((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < -1 || days > 14) return NextResponse.json({ weather: null }); // out of forecast range

  const school = await resolveSchoolLocation(req);
  const LAT = school.latitude, LNG = school.longitude;
  const cacheKey = `${date}|${LAT},${LNG}`;

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ weather: hit.data });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(school.timezone)}&start_date=${date}&end_date=${date}`;
    const r = await fetch(url, { next: { revalidate: 0 } });
    if (!r.ok) throw new Error('weather fetch failed');
    const d = await r.json();
    const daily = d.daily;
    if (!daily?.time?.length) return NextResponse.json({ weather: null });
    const code = daily.weather_code?.[0] ?? 3;
    const meta = WMO[code] || { label: 'Cloudy', icon: '☁️' };
    const data = {
      icon: meta.icon,
      label: meta.label,
      tMax: Math.round(daily.temperature_2m_max?.[0]),
      tMin: Math.round(daily.temperature_2m_min?.[0]),
      rain: daily.precipitation_probability_max?.[0] ?? null,
      storm: [82, 95, 96, 99].includes(code),
    };
    cache.set(cacheKey, { at: Date.now(), data });
    return NextResponse.json({ weather: data });
  } catch {
    return NextResponse.json({ weather: null }); // decorative info — never error the page
  }
}
