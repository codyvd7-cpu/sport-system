'use client';

import * as React from 'react';

const TEAM_LIST = ['1sts','2nds','3rds','4ths','5ths','U16A','U16B','U16C','U16D','U15A','U15B','U15C','U15D','U15E','U14A','U14B','U14C','U14D'];

export default function AIToolsPage() {
  const [activeTab, setActiveTab] = React.useState<'parent' | 'session'>('parent');

  // Parent update state
  const [parentTeam, setParentTeam] = React.useState('');
  const [parentFocus, setParentFocus] = React.useState('');
  const [parentFixtures, setParentFixtures] = React.useState('');
  const [parentResults, setParentResults] = React.useState('');
  const [parentTesting, setParentTesting] = React.useState('');
  const [parentAnnouncements, setParentAnnouncements] = React.useState('');
  const [parentTone, setParentTone] = React.useState('Professional and encouraging');
  const [parentOutput, setParentOutput] = React.useState('');
  const [parentLoading, setParentLoading] = React.useState(false);

  // Session builder state
  const [sessionTeam, setSessionTeam] = React.useState('');
  const [sessionDuration, setSessionDuration] = React.useState('60');
  const [sessionFocus, setSessionFocus] = React.useState('');
  const [sessionPhase, setSessionPhase] = React.useState('Mid-season');
  const [sessionEquipment, setSessionEquipment] = React.useState('Cones, balls, sticks, open field');
  const [sessionNotes, setSessionNotes] = React.useState('');
  const [sessionOutput, setSessionOutput] = React.useState('');
  const [sessionLoading, setSessionLoading] = React.useState(false);

  async function generateParentUpdate() {
    if (!parentTeam || !parentFocus) return;
    setParentLoading(true);
    setParentOutput('');
    try {
      const res = await fetch('/api/parent-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { team: parentTeam, focus: parentFocus, fixtures: parentFixtures, results: parentResults, testing: parentTesting, announcements: parentAnnouncements, tone: parentTone } }),
      });
      const data = await res.json();
      setParentOutput(data.text);
    } catch { setParentOutput('Connection error. Please try again.'); }
    setParentLoading(false);
  }

  async function generateSession() {
    if (!sessionTeam || !sessionFocus) return;
    setSessionLoading(true);
    setSessionOutput('');
    try {
      const res = await fetch('/api/session-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { team: sessionTeam, duration: sessionDuration, focus: sessionFocus, phase: sessionPhase, equipment: sessionEquipment, notes: sessionNotes } }),
      });
      const data = await res.json();
      setSessionOutput(data.text);
    } catch { setSessionOutput('Connection error. Please try again.'); }
    setSessionLoading(false);
  }

  const inputCls = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500 transition";
  const labelCls = "mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500";

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-400">AI Tools</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Coaching Assistant</h1>
          <p className="mt-1 text-sm text-slate-500">Generate parent updates and training sessions instantly</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button onClick={() => setActiveTab('parent')}
            className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${activeTab === 'parent' ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
            📱 Parent Update
          </button>
          <button onClick={() => setActiveTab('session')}
            className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${activeTab === 'session' ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
            Session Builder
          </button>
        </div>

        {/* Parent Update */}
        {activeTab === 'parent' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-sky-400">Parent Message Generator</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Team *</label>
                  <select value={parentTeam} onChange={(e) => setParentTeam(e.target.value)} className={inputCls}>
                    <option value="">Select team...</option>
                    {TEAM_LIST.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tone</label>
                  <select value={parentTone} onChange={(e) => setParentTone(e.target.value)} className={inputCls}>
                    {['Professional and encouraging', 'Warm and friendly', 'Formal', 'Motivational'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Week Focus *</label>
                  <input value={parentFocus} onChange={(e) => setParentFocus(e.target.value)} placeholder="e.g. Speed testing week, match preparation, fitness conditioning" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Upcoming Fixtures</label>
                  <input value={parentFixtures} onChange={(e) => setParentFixtures(e.target.value)} placeholder="e.g. vs Jeppe Saturday 10am" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Recent Results</label>
                  <input value={parentResults} onChange={(e) => setParentResults(e.target.value)} placeholder="e.g. Won 3-1 vs KES" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Testing This Week</label>
                  <input value={parentTesting} onChange={(e) => setParentTesting(e.target.value)} placeholder="e.g. 10m sprint and SBJ on Thursday" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Announcements</label>
                  <input value={parentAnnouncements} onChange={(e) => setParentAnnouncements(e.target.value)} placeholder="e.g. Training moved to 4pm Friday" className={inputCls} />
                </div>
              </div>
              <button onClick={generateParentUpdate} disabled={parentLoading || !parentTeam || !parentFocus}
                className="mt-5 w-full rounded-xl border border-sky-500/40 bg-sky-500/15 py-3 text-sm font-black text-sky-300 hover:bg-sky-500/25 disabled:opacity-40 transition flex items-center justify-center gap-2">
                {parentLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />Generating...</> : '📱 Generate Parent Message'}
              </button>
            </div>

            {parentOutput && (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wide text-sky-400">Generated Message</p>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(parentOutput); }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition">
                      Copy
                    </button>
                    <button onClick={generateParentUpdate}
                      className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition">
                      Regenerate
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">{parentOutput}</p>
              </div>
            )}
          </div>
        )}

        {/* Session Builder */}
        {activeTab === 'session' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-violet-400">Training Session Builder</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Team / Age Group *</label>
                  <select value={sessionTeam} onChange={(e) => setSessionTeam(e.target.value)} className={inputCls}>
                    <option value="">Select team...</option>
                    {TEAM_LIST.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Duration (minutes)</label>
                  <select value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)} className={inputCls}>
                    {['30','45','60','75','90'].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Session Focus *</label>
                  <input value={sessionFocus} onChange={(e) => setSessionFocus(e.target.value)} placeholder="e.g. Acceleration and change of direction, repeat sprint ability, upper body strength" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phase of Season</label>
                  <select value={sessionPhase} onChange={(e) => setSessionPhase(e.target.value)} className={inputCls}>
                    {['Pre-season','Early season','Mid-season','Pre-tournament','Post-season'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Equipment Available</label>
                  <input value={sessionEquipment} onChange={(e) => setSessionEquipment(e.target.value)} placeholder="e.g. Cones, balls, sticks, gym, resistance bands" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Special Considerations</label>
                  <input value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="e.g. 3 players on modified, last hard session before match day" className={inputCls} />
                </div>
              </div>
              <button onClick={generateSession} disabled={sessionLoading || !sessionTeam || !sessionFocus}
                className="mt-5 w-full rounded-xl border border-violet-500/40 bg-violet-500/15 py-3 text-sm font-black text-violet-300 hover:bg-violet-500/25 disabled:opacity-40 transition flex items-center justify-center gap-2">
                {sessionLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />Building Session...</> : 'Generate Session Plan'}
              </button>
            </div>

            {sessionOutput && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wide text-violet-400">Session Plan</p>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(sessionOutput); }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition">
                      Copy
                    </button>
                    <button onClick={generateSession}
                      className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition">
                      Regenerate
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {sessionOutput.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className={`text-sm leading-relaxed ${
                      line.match(/^\d\./) ? 'font-black text-violet-300 mt-3 text-base' :
                      line.startsWith('-') ? 'text-slate-300 pl-3' :
                      'text-slate-200'
                    }`}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
