'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const TYPES = [
  { value: 'player_of_week',    label: 'Player of the Week' },
  { value: 'most_improved',     label: 'Most Improved' },
  { value: 'attendance_leader', label: 'Attendance Leader' },
];

type SpotlightItem = { id: string; type: string; player_name: string; description: string; is_published: boolean; sport: string; };

export function SpotlightSection({ sport }: { sport: string }) {
  const [items, setItems]         = useState<SpotlightItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [type, setType]           = useState('player_of_week');
  const [name, setName]           = useState('');
  const [desc, setDesc]           = useState('');

  useState(() => {
    supabase.from('portal_spotlight').select('*').eq('sport', sport).order('sort_order')
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('portal_spotlight').insert([{
      sport, type, player_name: name.trim(), description: desc.trim(), is_published: true,
    }]);
    if (!error) {
      const { data } = await supabase.from('portal_spotlight').select('*').eq('sport', sport).order('sort_order');
      setItems(data || []);
      setName(''); setDesc(''); setType('player_of_week');
    }
    setBusy(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('portal_spotlight').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function togglePublish(item: SpotlightItem) {
    await supabase.from('portal_spotlight').update({ is_published: !item.is_published }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_published: !i.is_published } : i));
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Add */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Add Spotlight</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Player name" required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description e.g. Outstanding performance"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <button type="submit" disabled={busy || !name.trim()}
            className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">
            Add to Spotlight
          </button>
        </form>
      </div>

      {/* Current spotlight */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Current Spotlight</h2>
        {loading ? <p className="text-sm text-slate-500">Loading...</p> :
         items.length === 0 ? <p className="text-sm text-slate-500">No spotlight entries yet.</p> : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                    {TYPES.find(t => t.value === item.type)?.label || item.type}
                  </p>
                  <p className="text-sm font-bold text-white">{item.player_name}</p>
                  {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                </div>
                <button onClick={() => togglePublish(item)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${item.is_published ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  {item.is_published ? 'Live' : 'Draft'}
                </button>
                <button onClick={() => handleDelete(item.id)}
                  className="shrink-0 rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
