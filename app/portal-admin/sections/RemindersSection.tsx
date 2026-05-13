import { Reminder } from '../types';

type Props = {
  reminders: Reminder[]; busy: boolean;
  newReminderTitle: string; setNewReminderTitle: (v: string) => void;
  newReminderDetails: string; setNewReminderDetails: (v: string) => void;
  newReminderPublished: boolean; setNewReminderPublished: (v: boolean) => void;
  handleCreateReminder: (e: React.FormEvent) => void;
  editingReminderId: string | null;
  editReminderTitle: string; setEditReminderTitle: (v: string) => void;
  editReminderDetails: string; setEditReminderDetails: (v: string) => void;
  editReminderPublished: boolean; setEditReminderPublished: (v: boolean) => void;
  handleSaveReminder: (id: string) => void; cancelEditReminder: () => void;
  startEditReminder: (r: Reminder) => void; handleDeleteReminder: (id: string) => void;
  moveItem: (table: string, items: any[], index: number, dir: 'up' | 'down') => void;
};

export function RemindersSection({ reminders, busy, newReminderTitle, setNewReminderTitle, newReminderDetails, setNewReminderDetails, newReminderPublished, setNewReminderPublished, handleCreateReminder, editingReminderId, editReminderTitle, setEditReminderTitle, editReminderDetails, setEditReminderDetails, editReminderPublished, setEditReminderPublished, handleSaveReminder, cancelEditReminder, startEditReminder, handleDeleteReminder, moveItem }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Add Reminder</h2>
        <form onSubmit={handleCreateReminder} className="space-y-3">
          <input value={newReminderTitle} onChange={(e) => setNewReminderTitle(e.target.value)} placeholder="e.g. Bring full training kit" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <textarea rows={3} value={newReminderDetails} onChange={(e) => setNewReminderDetails(e.target.value)} placeholder="Optional details" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={newReminderPublished} onChange={(e) => setNewReminderPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Add Reminder</button>
        </form>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Reminders ({reminders.length})</h2>
        {reminders.length === 0 ? <p className="text-sm text-slate-500">No reminders yet.</p> : (
          <div className="space-y-2">
            {reminders.map((r, index) => {
              const isEditing = editingReminderId === r.id;
              return (
                <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input value={editReminderTitle} onChange={(e) => setEditReminderTitle(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      <textarea rows={2} value={editReminderDetails} onChange={(e) => setEditReminderDetails(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editReminderPublished} onChange={(e) => setEditReminderPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveReminder(r.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                        <button onClick={cancelEditReminder} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{r.title}</p>
                        {r.details && <p className="text-xs text-slate-500">{r.details}</p>}
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${r.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{r.is_published ? 'Published' : 'Draft'}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => moveItem('portal_reminders', reminders, index, 'up')} disabled={index === 0} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↑</button>
                        <button onClick={() => moveItem('portal_reminders', reminders, index, 'down')} disabled={index === reminders.length - 1} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↓</button>
                        <button onClick={() => startEditReminder(r)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">Edit</button>
                        <button onClick={() => handleDeleteReminder(r.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">Del</button>
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
