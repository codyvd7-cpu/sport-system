'use client'

import * as React from 'react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

const HIGHER_IS_BETTER = ['Yo-Yo Test', 'CMJ', 'Pull-Ups']
const LOWER_IS_BETTER = ['10m Sprint', '40m Sprint', 'Bronco']

export default function AthleteProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: athleteId } = React.use(params)
  const router = useRouter()

  const [allAthletes, setAllAthletes] = useState<any[]>([])
  const [athlete, setAthlete] = useState<any | null>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [performance, setPerformance] = useState<any[]>([])

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editTeam, setEditTeam] = useState('')
  const [editSport, setEditSport] = useState('')
  const [editPosition, setEditPosition] = useState('')

  const [attendanceDate, setAttendanceDate] = useState('')
  const [attendanceSessionType, setAttendanceSessionType] = useState('')
  const [attendanceStatus, setAttendanceStatus] = useState('')
  const [attendanceNotes, setAttendanceNotes] = useState('')

  const [performanceDate, setPerformanceDate] = useState('')
  const [performanceTestType, setPerformanceTestType] = useState('')
  const [performanceResult, setPerformanceResult] = useState('')
  const [performanceUnit, setPerformanceUnit] = useState('')
  const [performanceNotes, setPerformanceNotes] = useState('')

  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null)
  const [editAttendanceDate, setEditAttendanceDate] = useState('')
  const [editAttendanceSessionType, setEditAttendanceSessionType] = useState('')
  const [editAttendanceStatus, setEditAttendanceStatus] = useState('')
  const [editAttendanceNotes, setEditAttendanceNotes] = useState('')

  const [editingPerformanceId, setEditingPerformanceId] = useState<string | null>(null)
  const [editPerformanceDate, setEditPerformanceDate] = useState('')
  const [editPerformanceTestType, setEditPerformanceTestType] = useState('')
  const [editPerformanceResult, setEditPerformanceResult] = useState('')
  const [editPerformanceUnit, setEditPerformanceUnit] = useState('')
  const [editPerformanceNotes, setEditPerformanceNotes] = useState('')

  useEffect(() => {
    fetchAthleteProfile()
  }, [athleteId])

  async function fetchAthleteProfile() {
    const { data: allAthletesData, error: allAthletesError } = await supabase
      .from('athletes')
      .select('*')
      .order('full_name', { ascending: true })

    if (allAthletesError) {
      console.error('all athletes error:', allAthletesError)
    } else {
      setAllAthletes(allAthletesData || [])
    }

    const { data: athleteData, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single()

    if (athleteError) {
      console.error('athlete error:', athleteError)
      return
    }

    setAthlete(athleteData)
    setEditFullName(athleteData.full_name || '')
    setEditAge(athleteData.age ? String(athleteData.age) : '')
    setEditTeam(athleteData.team || '')
    setEditSport(athleteData.sport || '')
    setEditPosition(athleteData.position || '')

    const { data: teamsData, error: teamsError } = await supabase
      .from('Teams')
      .select('*')
      .order('name', { ascending: true })

    if (teamsError) {
      console.error('teams error:', teamsError)
    } else {
      setTeams(teamsData || [])
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('session_date', { ascending: false })

    if (attendanceError) {
      console.error('attendance error:', attendanceError)
    } else {
      setAttendance(attendanceData || [])
    }

    const { data: performanceData, error: performanceError } = await supabase
      .from('Performance')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('test_date', { ascending: false })

    if (performanceError) {
      console.error('performance error:', performanceError)
    } else {
      setPerformance(performanceData || [])
    }
  }

  async function updateAthleteProfile() {
    if (!editFullName || !editTeam || !editSport) {
      alert('Full name, team, and sport are required')
      return
    }

    const { error } = await supabase
      .from('athletes')
      .update({
        full_name: editFullName,
        age: editAge ? Number(editAge) : null,
        team: editTeam,
        sport: editSport,
        position: editPosition || null,
      })
      .eq('id', athleteId)

    if (error) {
      console.error('update athlete error:', error)
      alert('Error updating athlete')
      return
    }

    alert('Profile updated ✅')
    setIsEditingProfile(false)
    fetchAthleteProfile()
  }

  function cancelProfileEdit() {
    if (!athlete) return
    setEditFullName(athlete.full_name || '')
    setEditAge(athlete.age ? String(athlete.age) : '')
    setEditTeam(athlete.team || '')
    setEditSport(athlete.sport || '')
    setEditPosition(athlete.position || '')
    setIsEditingProfile(false)
  }

  async function deleteAthleteFromProfile() {
    const confirmed = window.confirm(
      'Delete this athlete? This may also remove related attendance and performance records.'
    )
    if (!confirmed) return

    const { error } = await supabase.from('athletes').delete().eq('id', athleteId)

    if (error) {
      console.error('delete athlete error:', error)
      alert('Error deleting athlete')
      return
    }

    alert('Athlete deleted ✅')
    router.push('/athletes')
  }

  async function addAttendanceForAthlete() {
    if (!attendanceDate || !attendanceSessionType || !attendanceStatus) {
      alert('Fill all attendance fields')
      return
    }

    const { error } = await supabase.from('Attendance').insert([
      {
        athlete_id: athleteId,
        session_date: attendanceDate,
        session_type: attendanceSessionType,
        status: attendanceStatus,
        notes: attendanceNotes,
      },
    ])

    if (error) {
      console.error('add attendance error:', error)
      alert('Error adding attendance')
      return
    }

    alert('Attendance added ✅')
    setAttendanceDate('')
    setAttendanceSessionType('')
    setAttendanceStatus('')
    setAttendanceNotes('')
    fetchAthleteProfile()
  }

  function startEditAttendance(entry: any) {
    setEditingAttendanceId(entry.id)
    setEditAttendanceDate(entry.session_date)
    setEditAttendanceSessionType(entry.session_type)
    setEditAttendanceStatus(entry.status)
    setEditAttendanceNotes(entry.notes || '')
  }

  function cancelEditAttendance() {
    setEditingAttendanceId(null)
    setEditAttendanceDate('')
    setEditAttendanceSessionType('')
    setEditAttendanceStatus('')
    setEditAttendanceNotes('')
  }

  async function updateAttendanceEntry() {
    if (!editingAttendanceId || !editAttendanceDate || !editAttendanceSessionType || !editAttendanceStatus) {
      alert('Fill all attendance edit fields')
      return
    }

    const { error } = await supabase
      .from('Attendance')
      .update({
        session_date: editAttendanceDate,
        session_type: editAttendanceSessionType,
        status: editAttendanceStatus,
        notes: editAttendanceNotes,
      })
      .eq('id', editingAttendanceId)

    if (error) {
      console.error('update attendance error:', error)
      alert('Error updating attendance')
      return
    }

    alert('Attendance updated ✅')
    cancelEditAttendance()
    fetchAthleteProfile()
  }

  async function deleteAttendanceEntry(id: string) {
    const confirmed = window.confirm('Delete this attendance entry?')
    if (!confirmed) return

    const { error } = await supabase.from('Attendance').delete().eq('id', id)

    if (error) {
      console.error('delete attendance error:', error)
      alert('Error deleting attendance')
      return
    }

    fetchAthleteProfile()
  }

  async function addPerformanceForAthlete() {
    if (!performanceDate || !performanceTestType || !performanceResult) {
      alert('Fill all performance fields')
      return
    }

    const { error } = await supabase.from('Performance').insert([
      {
        athlete_id: athleteId,
        test_date: performanceDate,
        test_type: performanceTestType,
        result: Number(performanceResult),
        unit: performanceUnit,
        notes: performanceNotes,
      },
    ])

    if (error) {
      console.error('add performance error:', error)
      alert('Error adding performance')
      return
    }

    alert('Performance added ✅')
    setPerformanceDate('')
    setPerformanceTestType('')
    setPerformanceResult('')
    setPerformanceUnit('')
    setPerformanceNotes('')
    fetchAthleteProfile()
  }

  function startEditPerformance(entry: any) {
    setEditingPerformanceId(entry.id)
    setEditPerformanceDate(entry.test_date)
    setEditPerformanceTestType(entry.test_type)
    setEditPerformanceResult(String(entry.result))
    setEditPerformanceUnit(entry.unit || '')
    setEditPerformanceNotes(entry.notes || '')
  }

  function cancelEditPerformance() {
    setEditingPerformanceId(null)
    setEditPerformanceDate('')
    setEditPerformanceTestType('')
    setEditPerformanceResult('')
    setEditPerformanceUnit('')
    setEditPerformanceNotes('')
  }

  async function updatePerformanceEntry() {
    if (!editingPerformanceId || !editPerformanceDate || !editPerformanceTestType || !editPerformanceResult) {
      alert('Fill all performance edit fields')
      return
    }

    const { error } = await supabase
      .from('Performance')
      .update({
        test_date: editPerformanceDate,
        test_type: editPerformanceTestType,
        result: Number(editPerformanceResult),
        unit: editPerformanceUnit,
        notes: editPerformanceNotes,
      })
      .eq('id', editingPerformanceId)

    if (error) {
      console.error('update performance error:', error)
      alert('Error updating performance')
      return
    }

    alert('Performance updated ✅')
    cancelEditPerformance()
    fetchAthleteProfile()
  }

  async function deletePerformanceEntry(id: string) {
    const confirmed = window.confirm('Delete this performance entry?')
    if (!confirmed) return

    const { error } = await supabase.from('Performance').delete().eq('id', id)

    if (error) {
      console.error('delete performance error:', error)
      alert('Error deleting performance')
      return
    }

    fetchAthleteProfile()
  }

  const performanceTrends = useMemo(() => {
    const groups: Record<string, any[]> = {}

    for (const entry of performance) {
      const key = entry.test_type
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    }

    return Object.entries(groups).map(([testType, entries]) => {
      const sorted = [...entries].sort(
        (a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
      )

      const first = sorted[0]
      const latest = sorted[sorted.length - 1]

      let best = sorted[0]

      if (HIGHER_IS_BETTER.includes(testType)) {
        best = sorted.reduce((prev, curr) =>
          Number(curr.result) > Number(prev.result) ? curr : prev
        )
      } else if (LOWER_IS_BETTER.includes(testType)) {
        best = sorted.reduce((prev, curr) =>
          Number(curr.result) < Number(prev.result) ? curr : prev
        )
      } else {
        best = latest
      }

      let improvement = 0
      if (HIGHER_IS_BETTER.includes(testType)) {
        improvement = Number(latest.result) - Number(first.result)
      } else if (LOWER_IS_BETTER.includes(testType)) {
        improvement = Number(first.result) - Number(latest.result)
      } else {
        improvement = Number(latest.result) - Number(first.result)
      }

      return {
        testType,
        unit: latest.unit || first.unit || '',
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
  }, [performance])

  const currentAthleteIndex = allAthletes.findIndex((a) => a.id === athleteId)
  const previousAthlete =
    currentAthleteIndex > 0 ? allAthletes[currentAthleteIndex - 1] : null
  const nextAthlete =
    currentAthleteIndex >= 0 && currentAthleteIndex < allAthletes.length - 1
      ? allAthletes[currentAthleteIndex + 1]
      : null

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

  if (!athlete) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        <Nav />
        <p>Loading athlete profile...</p>
      </main>
    )
  }

  const present = attendance.filter((a) => a.status === 'Present').length
  const absent = attendance.filter((a) => a.status === 'Absent').length
  const late = attendance.filter((a) => a.status === 'Late').length
  const attendancePercent =
    attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">{athlete.full_name}</h1>
          <p className="mt-2 text-white/60">Athlete Profile</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/athletes"
            className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
          >
            Back to Athletes
          </Link>

          <button
            onClick={deleteAthleteFromProfile}
            className="rounded border border-red-500/40 px-4 py-2 text-red-400 hover:bg-red-500/10"
          >
            Delete Athlete
          </button>
        </div>
      </div>

      <Nav />

      <div className="mb-8 flex flex-wrap gap-3">
        {previousAthlete ? (
          <Link
            href={`/athletes/${previousAthlete.id}`}
            className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
          >
            ← {previousAthlete.full_name}
          </Link>
        ) : (
          <div className="rounded border border-white/10 px-4 py-2 text-white/30">
            ← No previous athlete
          </div>
        )}

        {nextAthlete ? (
          <Link
            href={`/athletes/${nextAthlete.id}`}
            className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
          >
            {nextAthlete.full_name} →
          </Link>
        ) : (
          <div className="rounded border border-white/10 px-4 py-2 text-white/30">
            No next athlete →
          </div>
        )}
      </div>

      <div className="mb-10 rounded-xl border border-white/20 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Athlete Info</h2>

          {!isEditingProfile ? (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={updateAthleteProfile}
                className="rounded bg-white px-4 py-2 text-black"
              >
                Save Profile
              </button>
              <button
                onClick={cancelProfileEdit}
                className="rounded border border-white/20 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {isEditingProfile ? (
          <div className="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Full Name"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <input
              type="number"
              placeholder="Age"
              value={editAge}
              onChange={(e) => setEditAge(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <select
              value={editTeam}
              onChange={(e) => {
                const selected = e.target.value
                setEditTeam(selected)

                const found = teams.find((t) => t.name === selected)
                if (found?.sport) {
                  setEditSport(found.sport)
                }
              }}
              className="block w-full rounded bg-white/10 p-3"
            >
              <option value="">Select Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>

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

            <select
              value={editPosition}
              onChange={(e) => setEditPosition(e.target.value)}
              className="block w-full rounded bg-white/10 p-3 md:col-span-2"
            >
              <option value="">Select Position</option>
              <option value="Forward">Forward</option>
              <option value="Midfield">Midfield</option>
              <option value="Defense">Defense</option>
              <option value="Goalkeeper">Goalkeeper</option>
            </select>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-white/60">Age</p>
              <p className="text-xl font-bold">{athlete.age ?? '-'}</p>
            </div>

            <div>
              <p className="text-white/60">Team</p>
              <p className="text-xl font-bold">{athlete.team ?? '-'}</p>
            </div>

            <div>
              <p className="text-white/60">Sport</p>
              <p className="text-xl font-bold">{athlete.sport ?? '-'}</p>
            </div>

            <div>
              <p className="text-white/60">Position</p>
              <p className="text-xl font-bold">{athlete.position ?? '-'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-10 grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-white/20 p-5">
          <h2 className="mb-4 text-2xl font-semibold">Quick Add Attendance</h2>

          <div className="space-y-3">
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <select
              value={attendanceSessionType}
              onChange={(e) => setAttendanceSessionType(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            >
              <option value="">Session Type</option>
              <option value="Gym">Gym</option>
              <option value="Field">Field</option>
              <option value="Match">Match</option>
            </select>

            <select
              value={attendanceStatus}
              onChange={(e) => setAttendanceStatus(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            >
              <option value="">Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>

            <input
              placeholder="Notes"
              value={attendanceNotes}
              onChange={(e) => setAttendanceNotes(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <button
              onClick={addAttendanceForAthlete}
              className="rounded bg-white px-4 py-2 text-black"
            >
              Add Attendance
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/20 p-5">
          <h2 className="mb-4 text-2xl font-semibold">Quick Add Performance</h2>

          <div className="space-y-3">
            <input
              type="date"
              value={performanceDate}
              onChange={(e) => setPerformanceDate(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <select
              value={performanceTestType}
              onChange={(e) => setPerformanceTestType(e.target.value)}
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
              value={performanceResult}
              onChange={(e) => setPerformanceResult(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <input
              placeholder="Unit"
              value={performanceUnit}
              onChange={(e) => setPerformanceUnit(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <input
              placeholder="Notes"
              value={performanceNotes}
              onChange={(e) => setPerformanceNotes(e.target.value)}
              className="block w-full rounded bg-white/10 p-3"
            />

            <button
              onClick={addPerformanceForAthlete}
              className="rounded bg-white px-4 py-2 text-black"
            >
              Add Performance
            </button>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Attendance Summary</h2>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-white/20 p-5">
            <p className="text-white/60">Attendance %</p>
            <p className="text-3xl font-bold">{attendancePercent}%</p>
          </div>

          <div className="rounded-xl border border-green-500/30 p-5">
            <p className="text-white/60">Present</p>
            <p className="text-3xl font-bold text-green-400">{present}</p>
          </div>

          <div className="rounded-xl border border-red-500/30 p-5">
            <p className="text-white/60">Absent</p>
            <p className="text-3xl font-bold text-red-400">{absent}</p>
          </div>

          <div className="rounded-xl border border-yellow-500/30 p-5">
            <p className="text-white/60">Late</p>
            <p className="text-3xl font-bold text-yellow-400">{late}</p>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Performance Trends</h2>

        <div className="space-y-4">
          {performanceTrends.length === 0 ? (
            <div className="rounded-xl border border-white/20 p-5 text-white/60">
              No performance trend data yet.
            </div>
          ) : (
            performanceTrends.map((entry) => (
              <div
                key={entry.testType}
                className="rounded-xl border border-white/20 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{entry.testType}</h3>
                    <p className="text-white/70">
                      {entry.totalTests} test{entry.totalTests === 1 ? '' : 's'}
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
                    <p className="text-sm text-white/50">from first to latest</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Attendance History</h2>
        </div>

        <div className="space-y-4">
          {attendance.length === 0 ? (
            <div className="rounded-xl border border-white/20 p-5 text-white/60">
              No attendance records yet.
            </div>
          ) : (
            attendance.map((entry) => {
              const isEditing = editingAttendanceId === entry.id

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/20 p-5"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="date"
                        value={editAttendanceDate}
                        onChange={(e) => setEditAttendanceDate(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <select
                        value={editAttendanceSessionType}
                        onChange={(e) => setEditAttendanceSessionType(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      >
                        <option value="">Session Type</option>
                        <option value="Gym">Gym</option>
                        <option value="Field">Field</option>
                        <option value="Match">Match</option>
                      </select>

                      <select
                        value={editAttendanceStatus}
                        onChange={(e) => setEditAttendanceStatus(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      >
                        <option value="">Status</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                      </select>

                      <input
                        placeholder="Notes"
                        value={editAttendanceNotes}
                        onChange={(e) => setEditAttendanceNotes(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={updateAttendanceEntry}
                          className="rounded bg-white px-4 py-2 text-black"
                        >
                          Save Attendance
                        </button>
                        <button
                          onClick={cancelEditAttendance}
                          className="rounded border border-white/20 px-4 py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                      <p>Notes: {entry.notes || '-'}</p>

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => startEditAttendance(entry)}
                          className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteAttendanceEntry(entry.id)}
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

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Performance History</h2>
        </div>

        <div className="space-y-4">
          {performance.length === 0 ? (
            <div className="rounded-xl border border-white/20 p-5 text-white/60">
              No performance records yet.
            </div>
          ) : (
            performance.map((entry) => {
              const isEditing = editingPerformanceId === entry.id

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/20 p-5"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="date"
                        value={editPerformanceDate}
                        onChange={(e) => setEditPerformanceDate(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <select
                        value={editPerformanceTestType}
                        onChange={(e) => setEditPerformanceTestType(e.target.value)}
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
                        value={editPerformanceResult}
                        onChange={(e) => setEditPerformanceResult(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <input
                        placeholder="Unit"
                        value={editPerformanceUnit}
                        onChange={(e) => setEditPerformanceUnit(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <input
                        placeholder="Notes"
                        value={editPerformanceNotes}
                        onChange={(e) => setEditPerformanceNotes(e.target.value)}
                        className="block w-full rounded bg-white/10 p-3"
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={updatePerformanceEntry}
                          className="rounded bg-white px-4 py-2 text-black"
                        >
                          Save Performance
                        </button>
                        <button
                          onClick={cancelEditPerformance}
                          className="rounded border border-white/20 px-4 py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>Date: {entry.test_date}</p>
                      <p>Test: {entry.test_type}</p>
                      <p>
                        Result: {entry.result} {entry.unit || ''}
                      </p>
                      <p>Notes: {entry.notes || '-'}</p>

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => startEditPerformance(entry)}
                          className="rounded border border-white/20 px-4 py-2 hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePerformanceEntry(entry.id)}
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