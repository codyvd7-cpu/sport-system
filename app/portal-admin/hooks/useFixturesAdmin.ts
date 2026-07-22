import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Fixture } from '../types';

// ─── useFixturesAdmin ──────────────────────────────────────────────────────────
// Phase 3, first extraction: all fixtures-domain state and handlers, pulled out
// of portal-admin/page.tsx (1,539 lines, 8 domains tangled in one file) into a
// focused, self-contained module.
//
// Scoping note for whoever does the next domain (results, week plan, programs,
// reminders, sponsors, spotlight, players — same pattern applies to each):
// data fetching for all 8 domains is NOT independent per-domain today — it's
// one combined Promise.all in loadPortalAdminData(), sharing one loading/error
// state across everything. A fully "clean" per-domain hook would give fixtures
// its own fetch + own loading state, but that changes observable behavior (the
// page's single loading spinner would no longer reflect fixture fetches). To
// keep this a pure refactor — zero behavior change — supabase/runAction/
// showToast/setError/refetch are injected as parameters rather than owned here.
// Untangling the shared fetch into independent per-domain queries is a
// legitimate follow-up, but it's a behavior-affecting change, not a
// code-quality one, so it's deliberately out of scope for this pass.

export type TeamSlot = { _key: string; team: string; time: string; coach: string; umpire: string; durationOverride: string };
export type FixtureBlock = {
  _key: string; date: string; venue: string; homeAway: string; duration: string; note: string;
  slots: TeamSlot[];
};

const blankSlot = (time = ''): TeamSlot => ({
  _key: Math.random().toString(36).slice(2), team: '', time, coach: '', umpire: '', durationOverride: '',
});
const blankBlock = (): FixtureBlock => ({
  _key: Math.random().toString(36).slice(2), date: '', venue: '', homeAway: 'home', duration: '', note: '',
  slots: [blankSlot()],
});

export interface UseFixturesAdminDeps {
  supabase: SupabaseClient;
  activeSport: string;
  runAction: (action: () => Promise<void>) => Promise<void>;
  showToast: (msg: string) => void;
  setError: (msg: string) => void;
  refetch: () => Promise<void>;
}

export function useFixturesAdmin({ supabase, activeSport, runAction, showToast, setError, refetch }: UseFixturesAdminDeps) {
  // ── Create (block builder) ──────────────────────────────────────────────────
  const [newFixtureOpponent, setNewFixtureOpponent] = useState('');
  const [newFixturePublished, setNewFixturePublished] = useState(true);
  const [newFixtureBlocks, setNewFixtureBlocks] = useState<FixtureBlock[]>([blankBlock()]);
  const [newFixtureSortOrder, setNewFixtureSortOrder] = useState('1');

  function addFixtureBlock() {
    setNewFixtureBlocks(blocks => {
      const last = blocks[blocks.length - 1];
      const next = blankBlock();
      if (last) { next.date = last.date; next.duration = last.duration; }
      return [...blocks, next];
    });
  }
  function removeFixtureBlock(key: string) {
    setNewFixtureBlocks(blocks => blocks.length > 1 ? blocks.filter(b => b._key !== key) : blocks);
  }
  function updateFixtureBlock(key: string, field: 'date'|'venue'|'homeAway'|'duration'|'note', value: string) {
    setNewFixtureBlocks(blocks => blocks.map(b => b._key === key ? { ...b, [field]: value } : b));
  }
  function addTeamSlot(blockKey: string) {
    setNewFixtureBlocks(blocks => blocks.map(b => {
      if (b._key !== blockKey) return b;
      const last = b.slots[b.slots.length - 1];
      let nextTime = '';
      if (last?.time && /^\d{2}:\d{2}$/.test(last.time)) {
        const [h, m] = last.time.split(':').map(Number);
        nextTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      return { ...b, slots: [...b.slots, blankSlot(nextTime)] };
    }));
  }
  function updateTeamSlot(blockKey: string, slotKey: string, field: keyof TeamSlot, value: string) {
    setNewFixtureBlocks(blocks => blocks.map(b => b._key !== blockKey ? b : {
      ...b, slots: b.slots.map(s => s._key === slotKey ? { ...s, [field]: value } : s),
    }));
  }
  function removeTeamSlot(blockKey: string, slotKey: string) {
    setNewFixtureBlocks(blocks => blocks.map(b => b._key !== blockKey ? b : {
      ...b, slots: b.slots.length > 1 ? b.slots.filter(s => s._key !== slotKey) : b.slots,
    }));
  }

  async function handleCreateFixture(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!newFixtureOpponent.trim()) {
        setError('Opponent is required.');
        return;
      }
      type FlatRow = {
        team: string; date: string; time: string; venue: string; homeAway: string;
        coach: string; umpire: string; notes: string;
      };
      const flat: FlatRow[] = [];
      newFixtureBlocks.forEach(block => {
        if (!block.date) return;
        block.slots.forEach(slot => {
          if (!slot.team.trim()) return;
          const duration = (slot.durationOverride || block.duration).trim();
          flat.push({
            team: slot.team.trim(),
            date: block.date,
            time: slot.time.trim(),
            venue: block.venue.trim(),
            homeAway: block.homeAway,
            coach: slot.coach.trim(),
            umpire: slot.umpire.trim(),
            notes: [duration, block.note.trim()].filter(Boolean).join(' · '),
          });
        });
      });
      if (flat.length === 0) {
        setError('Each block needs a date, and at least one team slot filled in.');
        return;
      }

      const baseSort = Number(newFixtureSortOrder) || 0;
      const rows = flat.map((r, i) => ({
        team: r.team,
        opponent: newFixtureOpponent.trim(),
        fixture_date: r.date,
        fixture_time: r.time,
        venue: r.venue,
        is_published: newFixturePublished,
        sort_order: baseSort + i,
        coach: r.coach || null,
        umpire: r.umpire || null,
        notes: r.notes || null,
        home_away: r.homeAway,
        sport: activeSport,
      }));

      const { error: insertError } = await supabase.from('portal_fixtures').insert(rows);

      if (insertError) {
        setError(insertError.message || 'Failed to create fixture.');
        return;
      }

      showToast(`Added ${rows.length} fixture${rows.length === 1 ? '' : 's'} vs ${newFixtureOpponent.trim()}.`);
      setNewFixtureOpponent('');
      setNewFixturePublished(true);
      setNewFixtureSortOrder('1');
      setNewFixtureBlocks([blankBlock()]);
      await refetch();
    });
  }

  // ── Edit existing fixture ───────────────────────────────────────────────────
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [editFixtureCoach, setEditFixtureCoach] = useState('');
  const [editFixtureUmpire, setEditFixtureUmpire] = useState('');
  const [editFixtureNotes, setEditFixtureNotes] = useState('');
  const [editFixtureHomeAway, setEditFixtureHomeAway] = useState('home');
  const [editFixtureTeam, setEditFixtureTeam] = useState('');
  const [editFixtureOpponent, setEditFixtureOpponent] = useState('');
  const [editFixtureDate, setEditFixtureDate] = useState('');
  const [editFixtureTime, setEditFixtureTime] = useState('');
  const [editFixtureVenue, setEditFixtureVenue] = useState('');
  const [editFixturePublished, setEditFixturePublished] = useState(true);
  const [editFixtureSortOrder, setEditFixtureSortOrder] = useState('1');

  function startEditFixture(fixture: Fixture) {
    setEditingFixtureId(fixture.id);
    setEditFixtureTeam(fixture.team);
    setEditFixtureOpponent(fixture.opponent);
    setEditFixtureDate(fixture.fixture_date);
    setEditFixtureTime(fixture.fixture_time);
    setEditFixtureVenue(fixture.venue);
    setEditFixtureCoach(fixture.coach || '');
    setEditFixtureUmpire(fixture.umpire || '');
    setEditFixtureNotes(fixture.notes || '');
    setEditFixtureHomeAway(fixture.home_away || 'home');
    setEditFixturePublished(fixture.is_published);
    setEditFixtureSortOrder(String(fixture.sort_order));
  }

  function cancelEditFixture() {
    setEditingFixtureId(null);
    setEditFixtureTeam('');
    setEditFixtureOpponent('');
    setEditFixtureDate('');
    setEditFixtureTime('');
    setEditFixtureVenue('');
    setEditFixtureCoach('');
    setEditFixtureUmpire('');
    setEditFixtureNotes('');
    setEditFixtureHomeAway('home');
    setEditFixturePublished(true);
    setEditFixtureSortOrder('1');
  }

  async function handleSaveFixture(id: string) {
    await runAction(async () => {
      if (!editFixtureTeam.trim() || !editFixtureOpponent.trim() || !editFixtureDate) {
        setError('Team, opponent, and fixture date are required.');
        return;
      }

      const { error: updateError } = await supabase
        .from('portal_fixtures')
        .update({
          team: editFixtureTeam.trim(),
          opponent: editFixtureOpponent.trim(),
          fixture_date: editFixtureDate,
          fixture_time: editFixtureTime.trim(),
          venue: editFixtureVenue.trim(),
          home_away: editFixtureHomeAway,
          coach: editFixtureCoach.trim() || null,
          umpire: editFixtureUmpire.trim() || null,
          notes: editFixtureNotes.trim() || null,
          is_published: editFixturePublished,
          sort_order: Number(editFixtureSortOrder) || 0,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message || 'Failed to update fixture.');
        return;
      }

      showToast('Fixture updated.');
      cancelEditFixture();
      await refetch();
    });
  }

  async function handleDeleteFixture(id: string) {
    const confirmed = window.confirm('Delete this fixture?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('portal_fixtures').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete fixture.');
        return;
      }

      showToast('Fixture deleted.');
      await refetch();
    });
  }

  return {
    newFixtureOpponent, setNewFixtureOpponent,
    newFixturePublished, setNewFixturePublished,
    newFixtureBlocks, addFixtureBlock, removeFixtureBlock, updateFixtureBlock,
    addTeamSlot, updateTeamSlot, removeTeamSlot,
    handleCreateFixture,
    editingFixtureId, editFixtureTeam, setEditFixtureTeam,
    editFixtureOpponent, setEditFixtureOpponent,
    editFixtureDate, setEditFixtureDate,
    editFixtureTime, setEditFixtureTime,
    editFixtureVenue, setEditFixtureVenue,
    editFixtureCoach, setEditFixtureCoach,
    editFixtureUmpire, setEditFixtureUmpire,
    editFixtureNotes, setEditFixtureNotes,
    editFixtureHomeAway, setEditFixtureHomeAway,
    editFixturePublished, setEditFixturePublished,
    startEditFixture, cancelEditFixture, handleSaveFixture, handleDeleteFixture,
  };
}
