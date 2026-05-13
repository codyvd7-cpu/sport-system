import { Sponsor } from '../types';

type Props = {
  sponsors: Sponsor[]; busy: boolean;
  newSponsorName: string; setNewSponsorName: (v: string) => void;
  newSponsorLink: string; setNewSponsorLink: (v: string) => void;
  newSponsorPublished: boolean; setNewSponsorPublished: (v: boolean) => void;
  newSponsorImage: File | null; setNewSponsorImage: (v: File | null) => void;
  handleCreateSponsor: (e: React.FormEvent) => void;
  editingSponsorId: string | null;
  editSponsorName: string; setEditSponsorName: (v: string) => void;
  editSponsorLink: string; setEditSponsorLink: (v: string) => void;
  editSponsorPublished: boolean; setEditSponsorPublished: (v: boolean) => void;
  editSponsorImage: File | null; setEditSponsorImage: (v: File | null) => void;
  handleSaveSponsor: (id: string) => void; resetSponsorEditFields: () => void;
  startEditSponsor: (s: Sponsor) => void; handleDeleteSponsor: (id: string) => void;
  moveItem: (table: string, items: any[], index: number, dir: 'up' | 'down') => void;
};

export function SponsorsSection({ sponsors, busy, newSponsorName, setNewSponsorName, newSponsorLink, setNewSponsorLink, newSponsorPublished, setNewSponsorPublished, newSponsorImage, setNewSponsorImage, handleCreateSponsor, editingSponsorId, editSponsorName, setEditSponsorName, editSponsorLink, setEditSponsorLink, editSponsorPublished, setEditSponsorPublished, editSponsorImage, setEditSponsorImage, handleSaveSponsor, resetSponsorEditFields, startEditSponsor, handleDeleteSponsor, moveItem }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Add Sponsor</h2>
        <form onSubmit={handleCreateSponsor} className="space-y-3">
          <input value={newSponsorName} onChange={(e) => setNewSponsorName(e.target.value)} placeholder="Sponsor name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <input value={newSponsorLink} onChange={(e) => setNewSponsorLink(e.target.value)} placeholder="Website URL" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <input type="file" accept="image/*" onChange={(e) => setNewSponsorImage(e.target.files?.[0] || null)} className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:text-white" />
          <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={newSponsorPublished} onChange={(e) => setNewSponsorPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Add Sponsor</button>
        </form>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Sponsors ({sponsors.length})</h2>
        {sponsors.length === 0 ? <p className="text-sm text-slate-500">No sponsors yet.</p> : (
          <div className="space-y-3">
            {sponsors.map((s, index) => {
              const isEditing = editingSponsorId === s.id;
              return (
                <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input value={editSponsorName} onChange={(e) => setEditSponsorName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      <input value={editSponsorLink} onChange={(e) => setEditSponsorLink(e.target.value)} placeholder="URL" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      <input type="file" accept="image/*" onChange={(e) => setEditSponsorImage(e.target.files?.[0] || null)} className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200" />
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editSponsorPublished} onChange={(e) => setEditSponsorPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveSponsor(s.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                        <button onClick={resetSponsorEditFields} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-white p-1">
                        {s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-contain" /> : <span className="text-[10px] text-slate-500">No img</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${s.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{s.is_published ? 'Published' : 'Draft'}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => moveItem('portal_sponsors', sponsors, index, 'up')} disabled={index === 0} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↑</button>
                        <button onClick={() => moveItem('portal_sponsors', sponsors, index, 'down')} disabled={index === sponsors.length - 1} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↓</button>
                        <button onClick={() => startEditSponsor(s)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">Edit</button>
                        <button onClick={() => handleDeleteSponsor(s.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">Del</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
