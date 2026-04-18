'use client'

import * as React from 'react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

const HIGHER_IS_BETTER = ['Yo-Yo Test', 'CMJ', 'Pull-Ups']
const LOWER_IS_BETTER = ['10m Sprint', '40m Sprint', 'Bronco']

export default function TeamPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = React.use(params)
  const teamName = decodeURIComponent(name)
  const router = useRouter()

  const [team, setTeam] = useState<any | null>(null)
  const [roster, setRoster] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [performance, setPerformance] = useState<any[]>([])

  const [isEditingTeam, setIsEditingTeam] = useState(false)
  const [editTeamName, setEditTeamName] = useState('')
  const [editAgeGroup, setEditAgeGroup] = useState('')
  const [editSquad, setEditSquad] = useState('')
  const [editSport, setEditSport] = useState('')
  const [editSeason, setEditSeason] = useState('')

  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [sport, setSport] = useState('')
  const [position, setPosition] = useState('')

  const [attendanceFilterDate, setAttendanceFilterDate] = useState('')
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState('')

  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null)
  const [editAthleteFullName, setEditAthleteFullName] = useState('')
  const [editAthleteAge, setEditAthleteAge] = useState('')
  const [editAthleteSport, setEditAthleteSport] = useState('')
  const [editAthletePosition, setEditAthletePosition] = useState('')

  const [bulkDate, setBulkDate] = useState('')
  const [bulkSessionType, setBulkSessionType] = useState('')
  const [bulkNotes, setBulkNotes] = useState('')
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchTeamPage()
  }, [teamName])

  async function fetchTeamPage() {
    const { data: teamData, error: teamError } = await supabase
      .from('Teams')
      .select('*')
      .eq('name', teamName)
      .maybeSingle()

    if (teamError) {
      console.error('team error:', teamError)
    } else {
      setTeam(teamData)

      if (teamData) {
        setEditTeamName(teamData.name || '')
        setEditAgeGroup(teamData.age_group || '')
        setEditSquad(teamData.squad || '')
        setEditSport(teamData.sport || '')
        setEditSeason(teamData.season || '')
        setSport(teamData.sport || '')
      }
    }

    const { data: rosterData, error: rosterError } = await supabase
      .from('athletes')
      .select('*')
      .eq('team', teamName)
      .order('full_name', { ascending: true })

    if (rosterError) {
      console.error('roster error:', rosterError)
      return
    }

    const rosterRows = rosterData || []
    setRoster(rosterRows)

    const initialStatuses: Record<string, string> = {}
    rosterRows.forEach((athlete) => {
      initialStatuses[athlete.id] = bulkStatuses[athlete.id] || 'Present'
    })
    setBulkStatuses(initialStatuses)

    const athleteIds = rosterRows.map((a) => a.id)

    if (athleteIds.length === 0) {
      setAttendance([])
      setPerformance([])
      return
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('Attendance')
      .select('*')
      .in('athlete_id', athleteIds)
      .order('session_date', { ascending: false })

    if (attendanceError) {
      console.error('attendance error:', attendanceError)
    } else {
      setAttendance(attendanceData || [])
    }

    const { data: performanceData, error: performanceError } = await supabase
      .from('Performance')
      .select('*')
      .in('athlete_id', athleteIds)
      .order('test_date', { ascending: false })

    if (performanceError) {
      console.error('performance error:', performanceError)
    } else {
      setPerformance(performanceData || [])
    }
  }

  async function updateTeam() {
    if (!team?.id) return

    if (!editTeamName || !editSport) {
      alert('Team name and sport are required')
      return
    }

    const oldTeamName = team.name

    const { error: teamUpdateError } = await supabase
      .from('Teams')
      .update({
        name: editTeamName,
        age_group: editAgeGroup || null,
        squad: editSquad || null,
        sport: editSport,
        season: editSeason || null,
      })
      .eq('id', team.id)

    if (teamUpdateError) {
      console.error('team update error:', teamUpdateError)
      alert('Error updating team')
      return
    }

    if (oldTeamName !== editTeamName) {
      const { error: athleteUpdateError } = await supabase
        .from('athletes')
        .update({
          team: editTeamName,
          sport: editSport,
        })
        .eq('team', oldTeamName)

      if (athleteUpdateError) {
        console.error('athlete team sync error:', athleteUpdateError)
        alert('Team updated, but athlete team names did not sync')
        return
      }
    } else {
      const { error: athleteSportUpdateError } = await supabase
        .from('athletes')
        .update({
          sport: editSport,
        })
        .eq('team', editTeamName)

      if (athleteSportUpdateError) {
        console.error('athlete sport sync error:', athleteSportUpdateError)
      }
    }

    alert('Team updated ✅')
    setIsEditingTeam(false)

    if (oldTeamName !== editTeamName) {
      router.push(`/teams/${encodeURIComponent(editTeamName)}`)
      return
    }

    fetchTeamPage()
  }

  function cancelTeamEdit() {
    if (!team) return
    setEditTeamName(team.name || '')
    setEditAgeGroup(team.age_group || '')
    setEditSquad(team.squad || '')
    setEditSport(team.sport || '')
    setEditSeason(team.season || '')
    setIsEditingTeam(false)
  }

  async function addAthleteToTeam() {
    if (!fullName || !teamName || !sport) {
      alert('Full name, team, and sport are required')
      return
    }

    const { error } = await supabase.from('athletes').insert([
      {
        full_name: fullName,
        age: age ? Number(age) : null,
        team: teamName,
        sport,
        position: position || null,
      },
    ])

    if (error) {
      console.error('add athlete error:', error)
      alert('Error adding athlete')
      return
    }

    alert('Athlete added to team ✅')
    setFullName('')
    setAge('')
    setPosition('')
    fetchTeamPage()
  }

  function startEditAthlete(athlete: any) {
    setEditingAthleteId(athlete.id)
    setEditAthleteFullName(athlete.full_name || '')
    setEditAthleteAge(athlete.age ? String(athlete.age) : '')
    setEditAthleteSport(athlete.sport || '')
    setEditAthletePosition(athlete.position || '')
  }

  function cancelEditAthlete() {
    setEditingAthleteId(null)
    setEditAthleteFullName('')
    setEditAthleteAge('')
    setEditAthleteSport('')
    setEditAthletePosition('')
  }

  async function updateAthlete() {
    if (!editingAthleteId || !editAthleteFullName || !editAthleteSport) {
      alert('Full name and sport are required')
      return
    }

    const { error } = await supabase
      .from('athletes')
      .update({
        full_name: editAthleteFullName,
        age: editAthleteAge ? Number(editAthleteAge) : null,
        sport: editAthleteSport,
        position: editAthletePosition || null,
      })
      .eq('id', editingAthleteId)

    if (error) {
      console.error('update athlete error:', error)
      alert('Error updating athlete')
      return
    }

    alert('Athlete updated ✅')
    cancelEditAthlete()
    fetchTeamPage()
  }

  async function removeAthleteFromTeam(athleteId: string, athleteName: string) {
    const confirmed = window.confirm(`Remove ${athleteName} from ${teamName}?`)
    if (!confirmed) return

    const { error } = await supabase
      .from('athletes')
      .update({
        team: null,
      })
      .eq('id', athleteId)

    if (error) {
      console.error('remove athlete error:', error)
      alert('Error removing athlete from team')
      return
    }

    fetchTeamPage()
  }

  async function saveTeamAttendanceSession() {
    if (!bulkDate || !bulkSessionType) {
      alert('Date and session type are required')
      return
    }

    if (roster.length === 0) {
      alert('No athletes in this team')
      return
    }

    const rows = roster.map((athlete) => ({
      athlete_id: athlete.id,
      session_date: bulkDate,
      session_type: bulkSessionType,
      status: bulkStatuses[athlete.id] || 'Present',
      notes: bulkNotes || null,
    }))

    const { error } = await supabase.from('Attendance').insert(rows)

    if (error) {
      console.error('bulk attendance error:', error)
      alert('Error saving team attendance')
      return
    }

    alert('Team attendance saved ✅')
    setBulkDate('')
    setBulkSessionType('')
    setBulkNotes('')
    const resetStatuses: Record<string, string> = {}
    roster.forEach((athlete) => {
      resetStatuses[athlete.id] = 'Present'
    })
    setBulkStatuses(resetStatuses)
    fetchTeamPage()
  }

  const present = attendance.filter((a) => a.status === 'Present').length
  const absent = attendance.filter((a) => a.status === 'Absent').length
  const late = attendance.filter((a) => a.status === 'Late').length
  const attendancePercent =
    attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0

  const testCounts = performance.reduce((acc: Record<string, number>, entry) => {
    acc[entry.test_type] = (acc[entry.test_type] || 0) + 1
    return acc
  }, {})

  const mostCommonTest =
    Object.entries(testCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  const latestTestDate =
    performance.length > 0
      ? [...performance].sort(
          (a, b) =>
            new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
        )[0].test_date
      : '—'

  const athleteAttendanceSummary = useMemo(() => {
    return roster.map((athlete) => {
      const athleteAttendance = attendance.filter((a) => a.athlete_id === athlete.id)
      const athletePresent = athleteAttendance.filter((a) => a.status === 'Present').length
      const athleteAbsent = athleteAttendance.filter((a) => a.status === 'Absent').length
      const athleteLate = athleteAttendance.filter((a) => a.status === 'Late').length
      const percent =
        athleteAttendance.length > 0
          ? Math.round((athletePresent / athleteAttendance.length) * 100)
          : 0

      return {
        athlete,
        total: athleteAttendance.length,
        present: athletePresent,
        absent: athleteAbsent,
        late: athleteLate,
        percent,
      }
    })
  }, [roster, attendance])

  const filteredAttendance = attendance.filter((entry) => {
    if (attendanceFilterDate && entry.session_date !== attendanceFilterDate) return false
    if (attendanceFilterStatus && entry.status !== attendanceFilterStatus) return false
    return true
  })

  function getAthleteById(id: string) {
    return roster.find((a) => a.id === id)
  }

  function getPercentColor(percent: number) {
    if (percent >= 85) return 'text-green-400'
    if (percent >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

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
      const athlete = getAthleteById(entry.athlete_id)
      return {
        ...entry,
        athlete_name: athlete?.full_name || 'Unknown',
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
  const yoyoLeaderboard = buildLeaderboard('Yo-Yo Test')
  const cmjLeaderboard = buildLeaderboard('CMJ')

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
                <p className={`text-sm ${colorClass}`}>
                  {entry.result} {entry.unit || ''}
                </p>
                <p className="text-sm text-white/50">{entry.test_date}</p>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (!team && roster.length === 0) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        <Nav />
        <p>Loading team page...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">{teamName}</h1>
          <p className="mt-2 text-white/60">Team Page</p>
        </div>

        <Link
          href="/teams"
          className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
        >
          Back to Teams
        </Link>
      </div>

      <Nav />

      <div className="mb-10 rounded-xl border border-white/20 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Team Info</h2>

          {!isEditingTeam ? (
            <button
              onClick={() => setIsEditingTeam(true)}
              className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
            >
              Edit Team
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={updateTeam}
                className="rounded bg-white px-4 py-2 text-black"
              >
                Save Team
              </button>
              <button
                onClick={cancelTeamEdit}
                className="rounded border border-white/20 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {isEditingTeam ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <input
              placeholder="Team Name"
              value={editTeamName}
              onChange={(e) => setEditTeamName(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <input
              placeholder="Age Group"
              value={editAgeGroup}
              onChange={(e) => setEditAgeGroup(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <input
              placeholder="Squad"
              value={editSquad}
              onChange={(e) => setEditSquad(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <select
              value={editSport}
              onChange={(e) => setEditSport(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            >
              <option value="">Select Sport</option>
              <option value="Hockey">Hockey</option>
              <option value="Rugby">Rugby</option>
              <option value="Swimming">Swimming</option>
            </select>

            <input
              placeholder="Season"
              value={editSeason}
              onChange={(e) => setEditSeason(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-white/60">Team</p>
              <p className="text-xl font-bold">{team?.name || teamName}</p>
            </div>

            <div>
              <p className="text-white/60">Age Group</p>
              <p className="text-xl font-bold">{team?.age_group || '-'}</p>
            </div>

            <div>
              <p className="text-white/60">Squad</p>
              <p className="text-xl font-bold">{team?.squad || '-'}</p>
            </div>

            <div>
              <p className="text-white/60">Sport</p>
              <p className="text-xl font-bold">{team?.sport || '-'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-10 grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-white/20 p-5">
          <h2 className="mb-4 text-2xl font-semibold">Quick Add Athlete</h2>

          <div className="space-y-3">
            <input
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <input
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <input
              value={teamName}
              disabled
              className="block w-full rounded bg-white/5 p-3 text-white/60"
            />

            <input
              value={sport}
              disabled
              className="block w-full rounded bg-white/5 p-3 text-white/60"
            />

            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            >
              <option value="">Select Position</option>
              <option value="Forward">Forward</option>
              <option value="Midfield">Midfield</option>
              <option value="Defense">Defense</option>
              <option value="Goalkeeper">Goalkeeper</option>
            </select>

            <button
              onClick={addAthleteToTeam}
              className="rounded bg-white px-4 py-2 text-black"
            >
              Add Athlete to Team
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/20 p-5">
          <h2 className="mb-4 text-2xl font-semibold">Team Summary</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-white/60">Roster Size</p>
              <p className="text-3xl font-bold">{roster.length}</p>
            </div>

            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-white/60">Attendance %</p>
              <p className={`text-3xl font-bold ${getPercentColor(attendancePercent)}`}>
                {attendancePercent}%
              </p>
            </div>

            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-white/60">Most Common Test</p>
              <p className="text-xl font-bold">{mostCommonTest}</p>
            </div>

            <div className="rounded-xl border border-green-500/20 p-4">
              <p className="text-white/60">Present</p>
              <p className="text-3xl font-bold text-green-400">{present}</p>
            </div>

            <div className="rounded-xl border border-red-500/20 p-4">
              <p className="text-white/60">Absent</p>
              <p className="text-3xl font-bold text-red-400">{absent}</p>
            </div>

            <div className="rounded-xl border border-yellow-500/20 p-4">
              <p className="text-white/60">Late</p>
              <p className="text-3xl font-bold text-yellow-400">{late}</p>
            </div>
          </div>

          <p className="mt-4 text-white/50">Latest performance test: {latestTestDate}</p>
        </div>
      </div>

      <div className="mb-10 rounded-xl border border-white/20 p-5">
        <h2 className="mb-4 text-2xl font-semibold">Log Team Attendance Session</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="date"
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            className="block w-full rounded bg-white/10 p-3"
          />

          <select
            value={bulkSessionType}
            onChange={(e) => setBulkSessionType(e.target.value)}
            className="block w-full rounded bg-white/10 p-3"
          >
            <option value="">Session Type</option>
            <option value="Gym">Gym</option>
            <option value="Field">Field</option>
            <option value="Match">Match</option>
          </select>

          <input
            placeholder="Shared notes for session"
            value={bulkNotes}
            onChange={(e) => setBulkNotes(e.target.value)}
            className="block w-full rounded bg-white/10 p-3"
          />
        </div>

        <div className="mt-4 space-y-3">
          {roster.length === 0 ? (
            <div className="rounded-xl border border-white/10 p-4 text-white/60">
              No athletes in this team yet.
            </div>
          ) : (
            roster.map((athlete) => (
              <div
                key={athlete.id}
                className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[1fr_220px]"
              >
                <div>
                  <p className="font-semibold">{athlete.full_name}</p>
                  <p className="text-white/60">
                    Age: {athlete.age ?? '-'} • Position: {athlete.position || '-'}
                  </p>
                </div>

                <select
                  value={bulkStatuses[athlete.id] || 'Present'}
                  onChange={(e) =>
                    setBulkStatuses((prev) => ({
                      ...prev,
                      [athlete.id]: e.target.value,
                    }))
                  }
                  className="block w-full rounded bg-white/10 p-3"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>
              </div>
            ))
          )}
        </div>

        <button
          onClick={saveTeamAttendanceSession}
          className="mt-4 rounded bg-white px-4 py-2 text-black"
        >
          Save Team Attendance
        </button>
      </div>

      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Roster</h2>
        </div>

        <div className="space-y-4">
          {roster.length === 0 ? (
            <div className="rounded-xl border border-white/20 p-5 text-white/60">
              No athletes in this team yet.
            </div>
          ) : (
            roster.map((athlete) => {
              const isEditing = editingAthleteId === athlete.id

              return (
                <div
                  key={athlete.id}
                  className="rounded-xl border border-white/20 p-5"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        placeholder="Full Name"
                        value={editAthleteFullName}
                        onChange={(e) => setEditAthleteFullName(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <input
                        type="number"
                        placeholder="Age"
                        value={editAthleteAge}
                        onChange={(e) => setEditAthleteAge(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <input
                        value={teamName}
                        disabled
                        className="block w-full rounded bg-white/5 p-3 text-white/60"
                      />

                      <select
                        value={editAthleteSport}
                        onChange={(e) => setEditAthleteSport(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      >
                        <option value="">Select Sport</option>
                        <option value="Hockey">Hockey</option>
                        <option value="Rugby">Rugby</option>
                        <option value="Swimming">Swimming</option>
                      </select>

                      <select
                        value={editAthletePosition}
                        onChange={(e) => setEditAthletePosition(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      >
                        <option value="">Select Position</option>
                        <option value="Forward">Forward</option>
                        <option value="Midfield">Midfield</option>
                        <option value="Defense">Defense</option>
                        <option value="Goalkeeper">Goalkeeper</option>
                      </select>

                      <div className="flex gap-3">
                        <button
                          onClick={updateAthlete}
                          className="rounded bg-white px-4 py-2 text-black"
                        >
                          Save Athlete
                        </button>
                        <button
                          onClick={cancelEditAthlete}
                          className="rounded border border-white/20 px-4 py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Link
                          href={`/athletes/${athlete.id}`}
                          className="text-2xl font-semibold hover:underline"
                        >
                          {athlete.full_name}
                        </Link>
                        <div className="mt-2 space-y-1 text-white/80">
                          <p>Age: {athlete.age ?? '-'}</p>
                          <p>Sport: {athlete.sport ?? '-'}</p>
                          <p>Position: {athlete.position ?? '-'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/athletes/${athlete.id}`}
                          className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
                        >
                          Open Profile
                        </Link>

                        <button
                          onClick={() => startEditAthlete(athlete)}
                          className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
                        >
                          Edit Athlete
                        </button>

                        <button
                          onClick={() =>
                            removeAthleteFromTeam(athlete.id, athlete.full_name)
                          }
                          className="rounded border border-red-500/40 px-4 py-2 text-red-400 hover:bg-red-500/10"
                        >
                          Remove from Team
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="mb-10 rounded-xl border border-white/20 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold">Quick Attendance View</h2>

          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={attendanceFilterDate}
              onChange={(e) => setAttendanceFilterDate(e.target.value)}
              className="rounded bg-white/10 p-3"
            />

            <select
              value={attendanceFilterStatus}
              onChange={(e) => setAttendanceFilterStatus(e.target.value)}
              className="rounded bg-white/10 p-3"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAttendance.length === 0 ? (
            <div className="rounded-xl border border-white/10 p-5 text-white/60">
              No attendance records for this filter.
            </div>
          ) : (
            filteredAttendance.map((entry) => {
              const athlete = getAthleteById(entry.athlete_id)

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/10 p-4"
                >
                  <p className="font-semibold">{athlete?.full_name || 'Unknown'}</p>
                  <p>Date: {entry.session_date}</p>
                  <p>Session: {entry.session_type}</p>
                  <p
                    className={`font-bold ${
                      entry.status === 'Present'
                        ? 'text-green-400'
                        : entry.status === 'Absent'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    Status: {entry.status}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Team Performance Leaderboard</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LeaderboardCard
            title="Fastest 10m Sprint"
            entries={sprint10Leaderboard}
            colorClass="text-cyan-400"
          />
          <LeaderboardCard
            title="Best Yo-Yo Test"
            entries={yoyoLeaderboard}
            colorClass="text-green-400"
          />
          <LeaderboardCard
            title="Best CMJ"
            entries={cmjLeaderboard}
            colorClass="text-pink-400"
          />
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Player Attendance Snapshot</h2>

        <div className="space-y-4">
          {athleteAttendanceSummary.length === 0 ? (
            <div className="rounded-xl border border-white/20 p-5 text-white/60">
              No attendance data for this team yet.
            </div>
          ) : (
            athleteAttendanceSummary.map((row) => (
              <div
                key={row.athlete.id}
                className="rounded-xl border border-white/20 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Link
                      href={`/athletes/${row.athlete.id}`}
                      className="text-xl font-semibold hover:underline"
                    >
                      {row.athlete.full_name}
                    </Link>
                    <p className="text-white/60">Position: {row.athlete.position || '-'}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-white/60">Attendance %</p>
                    <p className={`text-2xl font-bold ${getPercentColor(row.percent)}`}>
                      {row.percent}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-white/60">Total</p>
                    <p className="text-2xl font-bold">{row.total}</p>
                  </div>

                  <div>
                    <p className="text-sm text-white/60">Present</p>
                    <p className="text-2xl font-bold text-green-400">{row.present}</p>
                  </div>

                  <div>
                    <p className="text-sm text-white/60">Absent</p>
                    <p className="text-2xl font-bold text-red-400">{row.absent}</p>
                  </div>

                  <div>
                    <p className="text-sm text-white/60">Late</p>
                    <p className="text-2xl font-bold text-yellow-400">{row.late}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-semibold">Recent Performance Entries</h2>

        <div className="space-y-4">
          {performance.length === 0 ? (
            <div className="rounded-xl border border-white/20 p-5 text-white/60">
              No performance records for this team yet.
            </div>
          ) : (
            performance.slice(0, 10).map((entry) => {
              const athlete = getAthleteById(entry.athlete_id)

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/20 p-5"
                >
                  <p className="font-semibold">{athlete?.full_name || 'Unknown'}</p>
                  <p>Date: {entry.test_date}</p>
                  <p>Test: {entry.test_type}</p>
                  <p>
                    Result: {entry.result} {entry.unit || ''}
                  </p>
                  <p>Notes: {entry.notes || '-'}</p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}