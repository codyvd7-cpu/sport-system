'use client';
import * as React from 'react';
import { useToast } from '@/components/Toast';
import { useRole } from '@/lib/useRole';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';

const PRESETS = [
  { title:'Match Result Posted',    body:'A new result has been added. Check the portal.' },
  { title:'Fixture Added',          body:'A new fixture has been scheduled. Check upcoming matches.' },
  { title:'Attendance Reminder',    body:'Please mark your team attendance for today\'s session.' },
  { title:'Testing Session Today',  body:'Performance testing is scheduled for today. Be ready.' },
  { title:'Important Announcement', body:'' },
];

export default function NotificationsPage() {
  const { showToast } = useToast();
  const { sport } = useRole();
  
  const SPORT_COLORS: Record<string,string> = {hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4'};
  const sportColor = SPORT_COLORS[(sport||'hockey') as string] || '#38bdf8';
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'Sport';
  const SCORE_TERMS: Record<string,{scorers:string;score:string}> = {
    hockey:{scorers:'Goal Scorers',score:'Goals'}, rugby:{scorers:'Try Scorers',score:'Tries'},
    cricket:{scorers:'Top Scorers',score:'Runs'}, rowing:{scorers:'Crew',score:'Time'},
    swimming:{scorers:'Swimmers',score:'Time'}, waterpolo:{scorers:'Goal Scorers',score:'Goals'},
  };
  const scoreTerm = SCORE_TERMS[sport||'hockey'] || SCORE_TERMS.hockey;
  const [title, setTitle]     = React.useState('');
  const [body, setBody]       = React.useState('');
  const [url, setUrl]         = React.useState('/dashboard');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent]       = React.useState<{sent:number;failed:number}|null>(null);

  async function send() {
    if (!title.trim() || !body.trim()) { showToast('Title and message required.', 'error'); return; }
    setSending(true); setSent(null);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url }),
      });
      const d = await res.json();
      if (!res.ok) { showToast(`Failed: ${d.error}`, 'error'); }
      else { setSent(d); showToast(`Sent to ${d.sent} device${d.sent !== 1 ? 's' : ''} ✓`); }
    } catch (e: any) { showToast(`Error: ${e.message}`, 'error'); }
    setSending(false);
  }

  return (
    <main className="min-h-screen pb-24 text-white md:pb-8 overflow-x-hidden" style={{background:'var(--bg)'}}>
      <FadeUp delay={0}>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-5">

        {/* Header */}
          <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:sportColor}}>{sportLabel}</p>
          <h1 className="text-4xl font-black tracking-tight leading-none text-white">Send<br/>
            <span style={{background:`linear-gradient(135deg,${sportColor},#a78bfa)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
              Notification
            </span>
          </h1>
          <p className="mt-2 text-[13px]" style={{color:'rgba(255,255,255,0.3)'}}>Push to all subscribed coaches and staff</p>
        </div>

        {/* Presets */}
        <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="px-5 py-3 border-b" style={{borderColor:'rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)'}}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:'rgba(255,255,255,0.3)'}}>Quick Presets</p>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.title} onClick={() => { setTitle(p.title); if(p.body) setBody(p.body); }}
                className="rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition"
                style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Compose */}
        <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="px-5 py-3 border-b" style={{borderColor:'rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)'}}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:sportColor}}>Compose</p>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em]" style={{color:'rgba(255,255,255,0.3)'}}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title"
                className="w-full rounded-xl border px-4 py-2.5 text-sm text-white outline-none transition"
                style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)'}}/>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em]" style={{color:'rgba(255,255,255,0.3)'}}>Message</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Notification message" rows={3}
                className="w-full rounded-xl border px-4 py-2.5 text-sm text-white outline-none transition resize-none"
                style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)'}}/>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em]" style={{color:'rgba(255,255,255,0.3)'}}>Opens page</label>
              <select value={url} onChange={e => setUrl(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 text-sm text-white outline-none"
                style={{background:'rgba(255,255,255,0.04)',borderColor:'rgba(255,255,255,0.08)'}}>
                <option value="/dashboard">Dashboard</option>
                <option value="/attendance">Attendance</option>
                <option value="/performance">Performance</option>
                <option value="/teams">Teams</option>
                <option value="/portal">Portal</option>
                <option value="/results">Results</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        {title && body && (
          <div className="rounded-2xl p-4 flex items-start gap-3"
            style={{background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)'}}>
            <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl shrink-0"/>
            <div>
              <p className="text-[13px] font-black text-white">{title}</p>
              <p className="text-[12px] mt-0.5" style={{color:'rgba(255,255,255,0.5)'}}>{body}</p>
              <p className="text-[10px] mt-1" style={{color:'rgba(255,255,255,0.25)'}}>Kinetiq Sport · now</p>
            </div>
          </div>
        )}

        {/* Send */}
        <button onClick={send} disabled={sending || !title.trim() || !body.trim()}
          className="w-full rounded-2xl py-4 text-sm font-black transition disabled:opacity-50"
          style={{background:'linear-gradient(135deg,rgba(56,189,248,0.15),rgba(167,139,250,0.15))',border:'1px solid rgba(56,189,248,0.25)',color:'white'}}>
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"/>
              Sending…
            </span>
          ) : '🔔 Send to All Devices'}
        </button>

        {sent && (
          <div className="rounded-2xl p-4 text-center" style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}>
            <p className="text-[13px] font-black" style={{color:'#10b981'}}>{sent.sent} device{sent.sent !== 1 ? 's' : ''} notified</p>
            {sent.failed > 0 && <p className="text-[11px] mt-1" style={{color:'rgba(255,255,255,0.3)'}}>{sent.failed} failed (stale subscriptions removed)</p>}
          </div>
        )}

      </div>
      </FadeUp>
    </main>
  );
}
