'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

const HIGHER_IS_BETTER = ['Yo-Yo Test', 'CMJ', 'Pull-Ups']
const LOWER_IS_BETTER = ['10m Sprint', '40m Sprint', 'Bronco']

export default function PerformancePage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [performance, setPerformance] = useState<any[]>([])

  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [testDate, setTestDate] = useState('')
  const [testType, setTestType] = useState('')
  const [result, setResult] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')

  const [filterTeam, setFilterTeam] = useState('')
  const [filterTestType, setFilterTestType] = useState('')
  const [filterAthlete, setFilterAthlete] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSelectedAthlete, setEditSelectedAthlete] = useState('')
  const [editTestDate, setEditTestDate] = useState('')
  const [editTestType, setEditTestType] = useState('')
  const [editResult, setEditResult] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editNotes, setEditNotes] = useState('')

  async function fetchAthletes() {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setAthletes(data || [])
  }

  async function fetchPerformance() {
    const { data, error } = await supabase
      .from('Performance')
      .select('*')
      .order('test_date', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setPerformance(data || [])
  }

  useEffect(() => {
    fetchAthletes()
    fetchPerformance()
  }, [])

  async function savePerformance() {
    if (!selectedAthlete || !testDate || !testType || !result) {
      alert('Fill all required fields')
      return
    }

    const { error } = await supabase.from('Performance').insert([
      {
        athlete_id: selectedAthlete,
        test_date: testDate,
        test_type: testType,
        result: Number(result),
        unit,
        notes,
      },
    ])

    if (error) {
      console.error(error)
      alert('Error saving performance')
      return
    }

    alert('Saved ✅')

    setSelectedAthlete('')
    setTestDate('')
    setTestType('')
    setResult('')
    setUnit('')
    setNotes('')

    fetchPerformance()
  }

  function startEdit(entry: any) {
    setEditingId(entry.id)
    setEditSelectedAthlete(entry.athlete_id)
    setEditTestDate(entry.test_date)
    setEditTestType(entry.test_type)
    setEditResult(String(entry.result))
    setEditUnit(entry.unit || '')
    setEditNotes(entry.notes || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditSelectedAthlete('')
    setEditTestDate('')
    setEditTestType('')
    setEditResult('')
    setEditUnit('')
    setEditNotes('')
  }

  async function updatePerformance() {
    if (!editingId || !editSelectedAthlete || !editTestDate || !editTestType || !editResult) {
      alert('Fill all edit fields')
      return
    }

    const { error } = await supabase
      .from('Performance')
      .update({
        athlete_id: editSelectedAthlete,
        test_date: editTestDate,
        test_type: editTestType,
        result: Number(editResult),
        unit: editUnit,
        notes: editNotes,
      })
      .eq('id', editingId)

    if (error) {
      console.error(error)
      alert('Error updating performance')
      return
    }

    alert('Updated ✅')
    cancelEdit()
    fetchPerformance()
  }

  async function deletePerformance(id: string) {
    const confirmed = window.confirm('Delete this performance record?')
    if (!confirmed) return

    const { error } = await supabase.from('Performance').delete().eq('id', id)

    if (error) {
      console.error(error)
      alert('Error deleting performance')
      return
    }

    fetchPerformance()
  }

  function clearFilters() {
    setFilterTeam('')
    setFilterTestType('')
    setFilterAthlete('')
  }

  const filteredPerformance = performance.filter((entry) => {
    const athlete = athletes.find((a) => a.id === entry.athlete_id)

    if (filterTeam && athlete?.team !== filterTeam) return false
    if (filterTestType && entry.test_type !== filterTestType) return false
    if (filterAthlete && entry.athlete_id !== filterAthlete) return false

    return true
  })

  const trendAnalytics = useMemo(() => {
    const groups: Record<string, any[]> = {}

    for (const entry of performance) {
      const key = `${entry.athlete_id}__${entry.test_type}`
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    }

    const analytics = Object.entries(groups).map(([key, entries]) => {
      const sorted = [...entries].sort(
        (a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
      )

      const first = sorted[0]
      const latest = sorted[sorted.length - 1]

      let best = sorted[0]

      if (HIGHER_IS_BETTER.includes(first.test_type)) {
        best = sorted.reduce((prev, curr) =>
          Number(curr.result) > Number(prev.result) ? curr : prev
        )
      } else if (LOWER_IS_BETTER.includes(first.test_type)) {
        best = sorted.reduce((prev, curr) =>
          Number(curr.result) < Number(prev.result) ? curr : prev
        )
      } else {
        best = latest
      }

      let improvement = 0
      if (HIGHER_IS_BETTER.includes(first.test_type)) {
        improvement = Number(latest.result) - Number(first.result)
      } else if (LOWER_IS_BETTER.includes(first.test_type)) {
        improvement = Number(first.result) - Number(latest.result)
      } else {
        improvement = Number(latest.result) - Number(first.result)
      }

      const athlete = athletes.find((a) => a.id === first.athlete_id)

      return {
        key,
        athlete_id: first.athlete_id,
        athlete_name: athlete?.full_name || 'Unknown',
        team: athlete?.team || '-',
        test_type: first.test_type,
        unit: first.unit || '',
        totalTests: sorted.length,
        firstResult: Number(first.result),
        firstDate: first.test_date,
        latestResult: Number(latest.result),
        latestDate: latest.test_date,
        bestResult: Number(best.result),
        bestDate: best.test_date,
        improvement,
      }
    })

    return analytics.sort((a, b) => a.athlete_name.localeCompare(b.athlete_name))
  }, [performance, athletes])

  function getImprovementColor(improvement: number) {
    if (improvement > 0) return 'text-green-400'
    if (improvement < 0) return 'text-red-400'
    return 'text-yellow-400'
  }

  function getImprovementLabel(improvement: number) {
    if (improvement > 0) return 'Improved'
    if (improvement < 0) return 'Declined'
    return 'No Change'
  }

  const filteredTrends = trendAnalytics.filter((entry) => {
    if (filterTeam && entry.team !== filterTeam) return false
    if (filterTestType && entry.test_type !== filterTestType) return false
    if (filterAthlete && entry.athlete_id !== filterAthlete) return false
    return true
  })

  function buildLeaderboard(testType: string) {
    const testEntries = performance.filter((entry) => entry.test_type === testType)
    const bestByAthlete = new Map<string, any>()

    for (const entry of testEntries) {
      const existing = bestByAthlete.get(entry.athlete_id)

      if (!existing) {
        bestByAthlete.set(entry.athlete_id, entry)
        continue
      }

      if (HIGHER_IS_BETTER.includes(testType)) {
        if (Number(entry.result) > Number(existing.result)) {
          bestByAthlete.set(entry.athlete_id, entry)
        }
      } else if (LOWER_IS_BETTER.includes(testType)) {
        if (Number(entry.result) < Number(existing.result)) {
          bestByAthlete.set(entry.athlete_id, entry)
        }
      }
    }

    const leaderboard = Array.from(bestByAthlete.values()).map((entry) => {
      const athlete = athletes.find((a) => a.id === entry.athlete_id)
      return {
        ...entry,
        athlete_name: athlete?.full_name || 'Unknown',
        team: athlete?.team || '-',
      }
    })

    leaderboard.sort((a, b) => {
      if (HIGHER_IS_BETTER.includes(testType)) {
        return Number(b.result) - Number(a.result)
      }
      return Number(a.result) - Number(b.result)
    })

    return leaderboard.slice(0, 5)
  }

  const sprint10Leaderboard = buildLeaderboard('10m Sprint')
  const sprint40Leaderboard = buildLeaderboard('40m Sprint')
  const yoyoLeaderboard = buildLeaderboard('Yo-Yo Test')
  const broncoLeaderboard = buildLeaderboard('Bronco')
  const cmjLeaderboard = buildLeaderboard('CMJ')
  const pullupsLeaderboard = buildLeaderboard('Pull-Ups')

  const totalRecords = performance.length
  const athletesTested = new Set(performance.map((entry) => entry.athlete_id)).size
  const latestTestDate = performance.length > 0 ? performance[0].test_date : 'No records yet'

  const testCounts = performance.reduce((acc: Record<string, number>, entry) => {
    acc[entry.test_type] = (acc[entry.test_type] || 0) + 1
    return acc
  }, {})

  const mostCommonTest =
    Object.entries(testCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No records yet'

  function LeaderboardCard({
    title,
    entries,
    colorClass,
  }: {
    title: string
    entries: any[]
    colorClass: string
  }) {
    return (
      <div className="rounded-xl border border-white/20 p-5">
        <h3 className={`mb-4 text-xl font-semibold ${colorClass}`}>{title}</h3>

        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-white/60">No records yet.</p>
          ) : (
            entries.map((entry, index) => (
              <div key={entry.id} className="rounded-lg bg-white/5 p-3">
                <p className="font-semibold">
                  {index + 1}. {entry.athlete_name}
                </p>
                <p className="text-sm text-white/70">Team: {entry.team}</p>
                <p className={`text-sm ${colorClass}`}>
                  {entry.result} {entry.unit || ''}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Performance</h1>
        <p className="mt-2 text-white/60">
          Log testing data, track change over time, and manage records.
        </p>
      </div>

      <Nav />

      <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/20 p-5">
          <p className="text-sm text-white/60">Total Records</p>
          <h2 className="mt-2 text-3xl font-bold">{totalRecords}</h2>
        </div>

        <div className="rounded-xl border border-white/20 p-5">
          <p className="text-sm text-white/60">Athletes Tested</p>
          <h2 className="mt-2 text-3xl font-bold">{athletesTested}</h2>
        </div>

        <div className="rounded-xl border border-white/20 p-5">
          <p className="text-sm text-white/60">Most Common Test</p>
          <h2 className="mt-2 text-2xl font-bold">{mostCommonTest}</h2>
        </div>

        <div className="rounded-xl border border-white/20 p-5">
          <p className="text-sm text-white/60">Latest Test Date</p>
          <h2 className="mt-2 text-2xl font-bold">{latestTestDate}</h2>
        </div>
      </div>

      <div className="mb-10 space-y-3 rounded-xl border border-white/20 p-5">
        <h2 className="text-2xl font-semibold">Add Performance Record</h2>

        <select
          value={selectedAthlete}
          onChange={(e) => setSelectedAthlete(e.target.value)}
          className="block w-full rounded bg-white/10 p-3"
        >
          <option value="">Select Athlete</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          className="block w-full rounded bg-white/10 p-3"
        />

        <select
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          className="block w-full rounded bg-white/10 p-3"
        >
          <option value="">Select Test Type</option>
          <option value="10m Sprint">10m Sprint</option>
          <option value="40m Sprint">40m Sprint</option>
          <option value="Yo-Yo Test">Yo-Yo Test</option>
          <option value="Bronco">Bronco</option>
          <option value="CMJ">CMJ</option>
          <option value="Pull-Ups">Pull-Ups</option>
          <option value="Body Mass">Body Mass</option>
        </select>

        <input
          type="number"
          placeholder="Result"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          className="block w-full rounded bg-white/10 p-3"
        />

        <input
          placeholder="Unit (e.g. sec, kg, cm, reps, m)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="block w-full rounded bg-white/10 p-3"
        />

        <input
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="block w-full rounded bg-white/10 p-3"
        />

        <button
          onClick={savePerformance}
          className="rounded bg-white px-4 py-2 text-black"
        >
          Save Performance
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-white/20 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Filters</h2>
          <button
            onClick={clearFilters}
            className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="block w-full rounded bg-white/10 p-3"
          >
            <option value="">Filter by Team</option>
            {[...new Set(athletes.map((a) => a.team).filter(Boolean))].map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>

          <select
            value={filterTestType}
            onChange={(e) => setFilterTestType(e.target.value)}
            className="block w-full rounded bg-white/10 p-3"
          >
            <option value="">Filter by Test Type</option>
            <option value="10m Sprint">10m Sprint</option>
            <option value="40m Sprint">40m Sprint</option>
            <option value="Yo-Yo Test">Yo-Yo Test</option>
            <option value="Bronco">Bronco</option>
            <option value="CMJ">CMJ</option>
            <option value="Pull-Ups">Pull-Ups</option>
            <option value="Body Mass">Body Mass</option>
          </select>

          <select
            value={filterAthlete}
            onChange={(e) => setFilterAthlete(e.target.value)}
            className="block w-full rounded bg-white/10 p-3"
          >
            <option value="">Filter by Athlete</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="mb-4 text-2xl font-bold">Performance Leaderboards</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LeaderboardCard
            title="Fastest 10m Sprint"
            entries={sprint10Leaderboard}
            colorClass="text-cyan-400"
          />
          <LeaderboardCard
            title="Fastest 40m Sprint"
            entries={sprint40Leaderboard}
            colorClass="text-blue-400"
          />
          <LeaderboardCard
            title="Best Yo-Yo Test"
            entries={yoyoLeaderboard}
            colorClass="text-green-400"
          />
          <LeaderboardCard
            title="Best Bronco"
            entries={broncoLeaderboard}
            colorClass="text-orange-400"
          />
          <LeaderboardCard
            title="Best CMJ"
            entries={cmjLeaderboard}
            colorClass="text-pink-400"
          />
          <LeaderboardCard
            title="Best Pull-Ups"
            entries={pullupsLeaderboard}
            colorClass="text-purple-400"
          />
        </div>
      </div>

      <div className="mb-4 text-white/70">
        Showing {filteredPerformance.length} performance records
      </div>

      <div className="mb-12">
        <h2 className="mb-4 text-2xl font-bold">Performance Trends</h2>

        <div className="space-y-4">
          {filteredTrends.length === 0 ? (
            <div className="rounded-xl border border-white/20 p-5 text-white/60">
              No trend data yet.
            </div>
          ) : (
            filteredTrends.map((entry) => (
              <div
                key={entry.key}
                className="rounded-xl border border-white/20 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{entry.athlete_name}</h3>
                    <p className="text-white/70">
                      Team: {entry.team} | Test: {entry.test_type}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-white/60">Trend</p>
                    <p
                      className={`text-lg font-bold ${getImprovementColor(
                        entry.improvement
                      )}`}
                    >
                      {getImprovementLabel(entry.improvement)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-white/60">First</p>
                    <p className="text-2xl font-bold">
                      {entry.firstResult} {entry.unit}
                    </p>
                    <p className="text-sm text-white/50">{entry.firstDate}</p>
                  </div>

                  <div>
                    <p className="text-sm text-white/60">Latest</p>
                    <p className="text-2xl font-bold">
                      {entry.latestResult} {entry.unit}
                    </p>
                    <p className="text-sm text-white/50">{entry.latestDate}</p>
                  </div>

                  <div>
                    <p className="text-sm text-white/60">Best</p>
                    <p className="text-2xl font-bold">
                      {entry.bestResult} {entry.unit}
                    </p>
                    <p className="text-sm text-white/50">{entry.bestDate}</p>
                  </div>

                  <div>
                    <p className="text-sm text-white/60">Change</p>
                    <p
                      className={`text-2xl font-bold ${getImprovementColor(
                        entry.improvement
                      )}`}
                    >
                      {entry.improvement > 0 ? '+' : ''}
                      {entry.improvement} {entry.unit}
                    </p>
                    <p className="text-sm text-white/50">
                      {entry.totalTests} test{entry.totalTests === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">Performance History</h2>

        <div className="space-y-4">
          {filteredPerformance.length === 0 ? (
            <div className="rounded-xl border border-white/20 p-5 text-white/60">
              No performance records found.
            </div>
          ) : (
            filteredPerformance.map((entry) => {
              const athlete = athletes.find((a) => a.id === entry.athlete_id)
              const isEditing = editingId === entry.id

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/20 p-5"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <select
                        value={editSelectedAthlete}
                        onChange={(e) => setEditSelectedAthlete(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      >
                        <option value="">Select Athlete</option>
                        {athletes.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.full_name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="date"
                        value={editTestDate}
                        onChange={(e) => setEditTestDate(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <select
                        value={editTestType}
                        onChange={(e) => setEditTestType(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      >
                        <option value="">Select Test Type</option>
                        <option value="10m Sprint">10m Sprint</option>
                        <option value="40m Sprint">40m Sprint</option>
                        <option value="Yo-Yo Test">Yo-Yo Test</option>
                        <option value="Bronco">Bronco</option>
                        <option value="CMJ">CMJ</option>
                        <option value="Pull-Ups">Pull-Ups</option>
                        <option value="Body Mass">Body Mass</option>
                      </select>

                      <input
                        type="number"
                        placeholder="Result"
                        value={editResult}
                        onChange={(e) => setEditResult(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <input
                        placeholder="Unit"
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <input
                        placeholder="Notes"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={updatePerformance}
                          className="rounded bg-white px-4 py-2 text-black"
                        >
                          Save Changes
                        </button>

                        <button
                          onClick={cancelEdit}
                          className="rounded border border-white/20 px-4 py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold">
                        {athlete?.full_name || 'Unknown'}
                      </h3>

                      <p>Team: {athlete?.team || '-'}</p>
                      <p>Date: {entry.test_date}</p>
                      <p>Test: {entry.test_type}</p>
                      <p>
                        Result: {entry.result} {entry.unit || ''}
                      </p>
                      <p>Notes: {entry.notes || '-'}</p>

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => startEdit(entry)}
                          className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deletePerformance(entry.id)}
                          className="rounded border border-red-500/40 px-4 py-2 text-red-400 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}