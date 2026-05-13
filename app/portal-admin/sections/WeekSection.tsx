import { WeekPlan, WeekPlanItem, DAY_OPTIONS } from '../types';

type Props = {
  weekPlans: WeekPlan[]; selectedWeekPlan: WeekPlan | null; selectedWeekItems: WeekPlanItem[];
  busy: boolean; selectedWeekPlanId: string; setSelectedWeekPlanId: (v: string) => void;
  newWeekLabel: string; setNewWeekLabel: (v: string) => void;
  newWeekPublished: boolean; setNewWeekPublished: (v: boolean) => void;
  handleCreateWeekPlan: (e: React.FormEvent) => void;
  newDayLabel: string; setNewDayLabel: (v: string) => void;
  newWeekItemTitle: string; setNewWeekItemTitle: (v: string) => void;
  newWeekItemDetails: string; setNewWeekItemDetails: (v: string) => void;
  handleCreateWeekItem: (e: React.FormEvent) => void;
  editingWeekPlanId: string | null; editWeekLabel: string; setEditWeekLabel: (v: string) => void;
  editWeekPublished: boolean; setEditWeekPublished: (v: boolean) => void;
  handleSaveWeekPlan: (id: string) => void; cancelEditWeekPlan: () => void; startEditWeekPlan: (p: WeekPlan) => void; handleDeleteWeekPlan: (id: string) => void;
  editingWeekItemId: string | null; editDayLabel: string; setEditDayLabel: (v: string) => void;
  editWeekItemTitle: string; setEditWeekItemTitle: (v: string) => void;
  editWeekItemDetails: string; setEditWeekItemDetails: (v: string) => void;
  handleSaveWeekItem: (id: string) => void; cancelEditWeekItem: () => void; startEditWeekItem: (i: WeekPlanItem) => void; handleDeleteWeekItem: (id: string) => void;
  moveItem: (table: string, items: any[], index: number, dir: 'up' | 'down') => void;
  formatDate: (d?: string | null) => string;
};

export function WeekSection({ weekPlans, selectedWeekPlan, selectedWeekItems, busy, selectedWeekPlanId, setSelectedWeekPlanId, newWeekLabel, setNewWeekLabel, newWeekPublished, setNewWeekPublished, handleCreateWeekPlan, newDayLabel, setNewDayLabel, newWeekItemTitle, setNewWeekItemTitle, newWeekItemDetails, setNewWeekItemDetails, handleCreateWeekItem, editingWeekPlanId, editWeekLabel, setEditWeekLabel, editWeekPublished, setEditWeekPublished, handleSaveWeekPlan, cancelEditWeekPlan, startEditWeekPlan, handleDeleteWeekPlan, editingWeekItemId, editDayLabel, setEditDayLabel, editWeekItemTitle, setEditWeekItemTitle, editWeekItemDetails, setEditWeekItemDetails, handleSaveWeekItem, cancelEditWeekItem, startEditWeekItem, handleDeleteWeekItem, moveItem, formatDate }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Create Plan */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Create Week Plan</h2>
        <form onSubmit={handleCreateWeekPlan} className="space-y-3">
          <input value={newWeekLabel} onChange={(e) => setNewWeekLabel(e.target.value)} placeholder="Week at a Glance" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={newWeekPublished} onChange={(e) => setNewWeekPublished(e.target.checked)} className="h-4 w-4" /> Publish immediately</label>
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Create Week Plan</button>
        </form>
      </div>

      {/* Add Week Item */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Add Week Item</h2>
        <form onSubmit={handleCreateWeekItem} className="space-y-3">
          <select value={selectedWeekPlanId} onChange={(e) => setSelectedWeekPlanId(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
            {weekPlans.map((p) => <option key={p.id} value={p.id}>{p.week_label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={newDayLabel} onChange={(e) => setNewDayLabel(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
              {DAY_OPTIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <input value={newWeekItemTitle} onChange={(e) => setNewWeekItemTitle(e.target.value)} placeholder="Title e.g. Match Prep" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          </div>
          <textarea rows={2} value={newWeekItemDetails} onChange={(e) => setNewWeekItemDetails(e.target.value)} placeholder="Optional details" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Add Item</button>
        </form>
      </div>

      {/* Week Plans list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Week Plans</h2>
        {weekPlans.length === 0 ? <p className="text-sm text-slate-500">No plans yet.</p> : (
          <div className="space-y-2">
            {weekPlans.map((plan) => {
              const isEditing = editingWeekPlanId === plan.id;
              return (
                <div key={plan.id} className={`rounded-xl border p-3 ${plan.published ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/40'}`}>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input value={editWeekLabel} onChange={(e) => setEditWeekLabel(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editWeekPublished} onChange={(e) => setEditWeekPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveWeekPlan(plan.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                        <button onClick={cancelEditWeekPlan} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{plan.week_label}</p>
                        <p className="text-xs text-slate-500">{plan.published ? '● Live' : 'Draft'} · {formatDate(plan.created_at)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => startEditWeekPlan(plan)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">Edit</button>
                        <button onClick={() => handleDeleteWeekPlan(plan.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">Del</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Week Items list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Items — {selectedWeekPlan?.week_label || 'Select a plan'}</h2>
        {selectedWeekItems.length === 0 ? <p className="text-sm text-slate-500">No items yet.</p> : (
          <div className="space-y-2">
            {selectedWeekItems.map((item, index) => {
              const isEditing = editingWeekItemId === item.id;
              return (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={editDayLabel} onChange={(e) => setEditDayLabel(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none">
                          {DAY_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                        </select>
                        <input value={editWeekItemTitle} onChange={(e) => setEditWeekItemTitle(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      </div>
                      <textarea rows={2} value={editWeekItemDetails} onChange={(e) => setEditWeekItemDetails(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveWeekItem(item.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                        <button onClick={cancelEditWeekItem} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.day_label} · {item.title}</p>
                        {item.details && <p className="text-xs text-slate-500">{item.details}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => moveItem('portal_week_plan_items', selectedWeekItems, index, 'up')} disabled={index === 0} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↑</button>
                        <button onClick={() => moveItem('portal_week_plan_items', selectedWeekItems, index, 'down')} disabled={index === selectedWeekItems.length - 1} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↓</button>
                        <button onClick={() => startEditWeekItem(item)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">Edit</button>
                        <button onClick={() => handleDeleteWeekItem(item.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">Del</button>
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
