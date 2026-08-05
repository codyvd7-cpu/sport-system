'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type School = {
  id: string; name: string; short_name: string; abbreviation: string; slug: string;
  logo_url: string | null; primary_color: string; accent_color: string;
  latitude: number | null; longitude: number | null; is_active: boolean;
  athleteCount: number; staffCount: number;
};

const BLANK = {
  name: '', shortName: '', abbreviation: '', slug: '',
  logoUrl: '', primaryColor: '#38bdf8', accentColor: '#a78bfa',
  latitude: '', longitude: '',
};

export default function PlatformSchoolsPage() {
  const [schools, setSchools] = React.useState<School[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [denied, setDenied] = React.useState(false);
  const [form, setForm] = React.useState({ ...BLANK });
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');
  const [newCodes, setNewCodes] = React.useState<{ hpCoach: string; hpAdmin: string; portal: Record<string, string>; school: string } | null>(null);

  const authedFetch = React.useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in first.');
    return fetch('/api/platform/schools', {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers || {}),
      },
    });
  }, []);

  const load = React.useCallback(async () => {
    try {
      const res = await authedFetch();
      if (res.status === 401) { setDenied(true); setLoading(false); return; }
      const d = await res.json();
      setSchools(d.schools || []);
    } catch {
      setDenied(true);
    }
    setLoading(false);
  }, [authedFetch]);

  React.useEffect(() => { load(); }, [load]);

  // Auto-suggest slug + abbreviation from the name, but let them be overridden.
  function onNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: f.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      shortName: f.shortName || name.split(' ')[0],
      abbreviation: f.abbreviation || name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase(),
    }));
  }

  async function createSchool(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(''); setMsg('');
    try {
      const res = await authedFetch({ method: 'POST', body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to create school.');
      setMsg(`${d.school.name} created.`);
      if (d.codes) setNewCodes({ ...d.codes, school: d.school.name });
      if (d.warnings?.length) setErr(d.warnings.join(' · '));
      setForm({ ...BLANK });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create school.');
    }
    setBusy(false);
  }

  async function toggleActive(s: School) {
    setBusy(true); setErr('');
    try {
      const res = await authedFetch({ method: 'PATCH', body: JSON.stringify({ id: s.id, isActive: !s.is_active }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed.');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed.');
    }
    setBusy(false);
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#05070d', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>Loading…</div>;
  }

  if (denied) {
    return (
      <div style={{ minHeight: '100vh', background: '#05070d', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 800 }}>Platform access only</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 420 }}>
          This screen manages every school on Altus, so it&apos;s restricted to the platform operator.
          Add your email to the <code style={{ color: '#7dd3fc' }}>PLATFORM_ADMIN_EMAILS</code> environment variable to gain access.
        </p>
        <a href="/dashboard" style={{ marginTop: 8, fontSize: 13, color: '#7dd3fc' }}>← Back to dashboard</a>
      </div>
    );
  }

  const input: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '9px 12px', color: 'white', fontSize: 13, outline: 'none',
  };
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 5, display: 'block' };

  return (
    <div style={{ minHeight: '100vh', background: '#05070d', color: 'white', padding: '32px 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#7dd3fc', marginBottom: 6 }}>Altus Platform</p>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>Schools</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
          Every school using Altus. Creating one here sets up its identity and branding — its own staff, athletes and data stay completely separate from every other school.
        </p>

        {err && <div style={{ marginBottom: 16, borderRadius: 10, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', padding: '10px 14px', fontSize: 12, color: '#fca5a5' }}>{err}</div>}
        {msg && <div style={{ marginBottom: 16, borderRadius: 10, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', padding: '10px 14px', fontSize: 12, color: '#6ee7b7' }}>{msg}</div>}

        {/* Newly generated access codes — shown once, right after creation */}
        {newCodes && (
          <div style={{ marginBottom: 24, borderRadius: 14, border: '1px solid rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.06)', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#7dd3fc' }}>{newCodes.school} — access codes</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  Save these now — copy them to the school. You can always look them up later in the <code>hp_access_codes</code> and <code>portal_access_codes</code> tables.
                </p>
              </div>
              <button onClick={() => setNewCodes(null)} style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              <div style={{ borderRadius: 9, background: 'rgba(0,0,0,0.25)', padding: '9px 12px' }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>HP Coach</p>
                <p style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: 'white' }}>{newCodes.hpCoach}</p>
              </div>
              <div style={{ borderRadius: 9, background: 'rgba(0,0,0,0.25)', padding: '9px 12px' }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>HP Admin</p>
                <p style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: 'white' }}>{newCodes.hpAdmin}</p>
              </div>
              {Object.entries(newCodes.portal).map(([sport, code]) => (
                <div key={sport} style={{ borderRadius: 9, background: 'rgba(0,0,0,0.25)', padding: '9px 12px' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Portal · {sport}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: 'white' }}>{code}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing schools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
          {schools.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '14px 16px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: s.primary_color + '22', border: `1px solid ${s.primary_color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: s.primary_color, flexShrink: 0 }}>
                {s.abbreviation}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800 }}>{s.name}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  /{s.slug} · {s.athleteCount} athletes · {s.staffCount} staff
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 9px', borderRadius: 999, background: s.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)', color: s.is_active ? '#6ee7b7' : 'rgba(255,255,255,0.4)' }}>
                {s.is_active ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => toggleActive(s)} disabled={busy}
                style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                {s.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>

        {/* Create */}
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Add a school</h2>
        <form onSubmit={createSchool} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>School name</label>
            <input style={input} value={form.name} onChange={e => onNameChange(e.target.value)} placeholder="e.g. Riverside Academy" required />
          </div>
          <div>
            <label style={label}>Short name</label>
            <input style={input} value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value }))} placeholder="Riverside" required />
          </div>
          <div>
            <label style={label}>Abbreviation</label>
            <input style={input} value={form.abbreviation} onChange={e => setForm(f => ({ ...f, abbreviation: e.target.value.toUpperCase() }))} placeholder="RA" maxLength={4} required />
          </div>
          <div>
            <label style={label}>URL slug</label>
            <input style={input} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="riverside" required />
          </div>
          <div>
            <label style={label}>Logo URL (optional)</label>
            <input style={input} value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="/school-logo.png" />
          </div>
          <div>
            <label style={label}>Primary colour</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} style={{ width: 42, height: 38, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer' }} />
              <input style={input} value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={label}>Accent colour</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="color" value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))} style={{ width: 42, height: 38, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer' }} />
              <input style={input} value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={label}>Latitude (for weather)</label>
            <input style={input} value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="-26.2041" />
          </div>
          <div>
            <label style={label}>Longitude (for weather)</label>
            <input style={input} value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="28.0473" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={busy}
              style={{ width: '100%', border: 'none', borderRadius: 10, padding: '12px 0', background: '#38bdf8', color: '#04121f', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
              {busy ? 'Creating…' : 'Create school'}
            </button>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10, lineHeight: 1.6 }}>
              HP and parent-portal access codes are generated automatically and shown once above. The one remaining manual step is the school&apos;s first staff account: add a row in <code style={{ color: 'rgba(255,255,255,0.5)' }}>staff_roles</code> with their email, role <code style={{ color: 'rgba(255,255,255,0.5)' }}>owner</code>, and this school&apos;s id — after that they can invite their own coaches from inside the app.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
