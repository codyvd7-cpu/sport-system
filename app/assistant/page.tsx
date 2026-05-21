'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Message = { role: 'user' | 'assistant'; content: string };
type Row = Record<string, any>;

const QUICK_PROMPTS = [
  { label: 'Who needs attention?', icon: '', prompt: 'Which athletes need attention right now based on attendance, availability and performance trends?' },
  { label: 'Team fitness report', icon: '', prompt: 'Give me a fitness and attendance overview for all teams. Flag any concerns.' },
  { label: 'Write player feedback', icon: '✍️', prompt: 'Help me write structured feedback for a player. Ask me their name and key points to highlight.' },
  { label: 'Training session plan', icon: '', prompt: 'Help me plan a training session. Ask me the team, focus area, and what equipment is available.' },
  { label: 'Benchmark analysis', icon: '', prompt: 'Analyse our testing results and tell me where we are strongest and where we need to improve most.' },
  { label: 'Injury & availability', icon: '🏥', prompt: 'Which players are injured or on modified training? What should I consider for their return to play?' },
];

export default function AssistantPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [contextLoading, setContextLoading] = React.useState(true);
  const [context, setContext] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    async function loadContext() {
      try {
        const [athRes, attRes, perfRes] = await Promise.all([
          supabase.from('athletes').select('id, full_name, team, age_group, availability, position').order('team'),
          supabase.from('attendance').select('athlete_id, status, session_date, session_type').order('session_date', { ascending: false }).limit(500),
          supabase.from('performance_tests').select('athlete_id, test_type, value, unit, test_date').order('test_date', { ascending: false }).limit(500),
        ]);

        const athletes: Row[] = athRes.data || [];
        const attendance: Row[] = attRes.data || [];
        const performance: Row[] = perfRes.data || [];

        const attRates: Record<string, number> = {};
        athletes.forEach((a) => {
          const records = attendance.filter((r) => r.athlete_id === a.id);
          if (records.length > 0) {
            const present = records.filter((r) => ['present', 'late'].includes((r.status || '').toLowerCase())).length;
            attRates[a.id] = Math.round((present / records.length) * 100);
          }
        });

        const pbs: Record<string, Record<string, string>> = {};
        performance.forEach((r) => {
          if (!pbs[r.athlete_id]) pbs[r.athlete_id] = {};
          pbs[r.athlete_id][r.test_type] = `${r.value}${r.unit || ''}`;
        });

        const teamGroups: Record<string, Row[]> = {};
        athletes.forEach((a) => {
          const t = a.team || 'Unassigned';
          if (!teamGroups[t]) teamGroups[t] = [];
          teamGroups[t].push(a);
        });

        let ctx = `You are the AI coaching assistant for St Benedict's College Hockey Department in Johannesburg, South Africa. You have access to live data:\n\n`;
        ctx += `TOTAL ATHLETES: ${athletes.length}\n\n`;

        ctx += `SQUADS:\n`;
        Object.entries(teamGroups).filter(([t]) => t !== 'Unassigned').forEach(([team, squad]) => {
          ctx += `\n${team} (${squad.length} players):\n`;
          squad.forEach((a) => {
            const rate = attRates[a.id];
            const avail = a.availability || 'Available';
            const pb = Object.entries(pbs[a.id] || {}).map(([t, v]) => `${t}:${v}`).join(', ');
            ctx += `  ${a.full_name}${a.position ? ` [${a.position}]` : ''} | ${avail}${rate !== undefined ? ` | Att:${rate}%` : ''}${pb ? ` | ${pb}` : ''}\n`;
          });
        });

        const flagged = athletes.filter((a) => a.availability === 'Injured' || (attRates[a.id] !== undefined && attRates[a.id] < 70));
        if (flagged.length > 0) {
          ctx += `\nFLAGGED ATHLETES:\n`;
          flagged.forEach((a) => {
            ctx += `  ${a.full_name} (${a.team}): ${a.availability === 'Injured' ? 'INJURED' : ''} ${attRates[a.id] < 70 ? `Att ${attRates[a.id]}%` : ''}\n`;
          });
        }

        ctx += `\nBENCHMARKS (St Benedict's standards):\n`;
        ctx += `U14-15: SBJ Elite>195cm Good>175cm | 10m Elite<1.72s | 30m Elite<4.25s | Yo-Yo Elite>1200m | Push-Ups Elite>40\n`;
        ctx += `U16-18: SBJ Elite>215cm Good>195cm | 10m Elite<1.65s | 30m Elite<4.05s | Yo-Yo Elite>1600m | Push-Ups Elite>50\n`;

        ctx += `\nYOUR ROLE:\n`;
        ctx += `- Use real names and data. Be specific.\n`;
        ctx += `- For player feedback use format: STRENGTHS / CURRENT FOCUS / COACH COMMENT\n`;
        ctx += `- Flag attendance below 70% and injured players proactively\n`;
        ctx += `- Compare test results to benchmark standards when analysing performance\n`;
        ctx += `- Be concise — coaches are busy. Give actionable insights.\n`;
        ctx += `- You can write training programs, session plans, match reports, end-of-term summaries\n`;
        ctx += `- Speak like a knowledgeable hockey S&C coach and performance analyst\n`;

        setContext(ctx);
      } catch {
        setContext("You are the AI coaching assistant for St Benedict's College Hockey Department.");
      }
      setContextLoading(false);
    }
    loadContext();
  }, []);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading || contextLoading) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: context,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.text || 'Could not generate a response.';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }
    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">AI Assistant</p>
            <h1 className="mt-0.5 text-3xl font-black tracking-tight text-white">Hockey Intelligence</h1>
            <p className="mt-1 text-sm text-slate-500">
              {contextLoading ? 'Loading team data...' : `Connected · ${context.includes('FLAGGED') ? 'Athletes flagged' : 'All systems nominal'}`}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/25 to-violet-500/15 text-3xl border border-sky-500/20">
            
          </div>
        </div>

        {/* Quick prompts */}
        {messages.length === 0 && !contextLoading && (
          <div className="mb-6">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Ask me anything</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_PROMPTS.map((p) => (
                <button key={p.label} onClick={() => sendMessage(p.prompt)}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition hover:border-sky-500/30 hover:bg-sky-500/5 active:scale-[0.98]">
                  <span className="text-2xl">{p.icon}</span>
                  <p className="mt-2 text-xs font-black text-white leading-snug">{p.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {contextLoading && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent shrink-0" />
            <p className="text-sm text-slate-400">Loading athlete data, attendance records and performance tests...</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/30 to-violet-500/20 text-base border border-sky-500/20"></div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'bg-sky-500/15 border border-sky-500/20 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-[10px] font-black text-slate-400">YOU</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/30 to-violet-500/20 text-base border border-sky-500/20"></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="h-2 w-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Clear button if there are messages */}
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="mt-3 text-center text-[10px] text-slate-700 hover:text-slate-500 transition">
            Clear conversation
          </button>
        )}

        {/* Input */}
        <div className="mt-4 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={contextLoading ? 'Loading data...' : 'Ask about players, training plans, performance, feedback...'}
            rows={2}
            disabled={loading || contextLoading}
            className="flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500 disabled:opacity-40 transition"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || contextLoading}
            className="flex w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/15 text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-700">Enter to send · Shift+Enter for new line</p>
      </div>
    </main>
  );
}
