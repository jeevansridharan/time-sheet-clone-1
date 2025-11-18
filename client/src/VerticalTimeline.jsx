import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DateTime } from 'luxon'

// Simple vertical 24h timeline (IST) — read-only display
// - Left gutter shows 00:00..23:00 hour ticks (24-hour format)
// - Items positioned by minutes since midnight IST
// - Current time line shown in red

const ZONE = 'Asia/Kolkata'
const PX_PER_MIN = 1 // 1440px total height
const DAY_MINUTES = 24 * 60

function useAuthHeaders() {
  return useMemo(() => {
    const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }, [])
}

export default function VerticalTimeline({ refreshKey }) {
  const headers = useAuthHeaders()
  const [items, setItems] = useState([])
  const [now, setNow] = useState(DateTime.now().setZone(ZONE))
  const [selectedDate, setSelectedDate] = useState(DateTime.now().setZone(ZONE).startOf('day'))
  const [error, setError] = useState(null)
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState(() => localStorage.getItem('ts_selectedTeam') || '')
  const selectedTeam = useMemo(() => teams.find(t => t.id === teamId) || null, [teams, teamId])

  // Load entries for the selected day (server-side filtering by from/to in UTC)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const fromUtc = selectedDate.toUTC().toISO()
        const toUtc = selectedDate.endOf('day').toUTC().toISO()
        const [er, tr] = await Promise.all([
          axios.get('/api/entries', { headers, params: { from: fromUtc, to: toUtc } }),
          axios.get('/api/teams', { headers })
        ])
        const entries = (er.data && er.data.entries) || []
        const tms = (tr.data && tr.data.teams) || []
        if (!mounted) return
        setTeams(tms)
        setItems(teamId ? entries.filter(e => e.teamId === teamId) : entries)
        setError(null)
      } catch (e) {
        // show empty timeline if unauth or server offline
        if (!mounted) return
        setError('offline/unauthorized')
        setItems([])
      }
    })()
    return () => { mounted = false }
  }, [headers, selectedDate, refreshKey, teamId])

  // tick every minute for current time line
  useEffect(() => {
    const id = setInterval(() => setNow(DateTime.now().setZone(ZONE)), 30 * 1000)
    return () => clearInterval(id)
  }, [])

  const hourMarks = useMemo(() => Array.from({ length: 25 }, (_, h) => h), [])

  function toMinutesSinceMidnight(dt) {
    const d = typeof dt === 'string' ? DateTime.fromISO(dt).setZone(ZONE) : dt.setZone(ZONE)
    return d.hour * 60 + d.minute
  }

  function itemStyle(entry) {
    const startM = toMinutesSinceMidnight(entry.start)
    const endM = entry.end ? toMinutesSinceMidnight(entry.end) : startM + 5
    const top = Math.max(0, Math.min(DAY_MINUTES, startM)) * PX_PER_MIN
    const height = Math.max(3, Math.min(DAY_MINUTES - startM, Math.max(1, endM - startM))) * PX_PER_MIN
    return { top, height }
  }

  const nowTop = useMemo(() => {
    const m = toMinutesSinceMidnight(now)
    return m * PX_PER_MIN
  }, [now])

  const isToday = now.startOf('day').toISODate() === selectedDate.toISODate()

  function changeDay(delta) {
    setSelectedDate(d => d.plus({ days: delta }).startOf('day'))
  }

  function onDateInput(e) {
    const iso = e.target.value // YYYY-MM-DD
    if (iso) setSelectedDate(DateTime.fromISO(iso, { zone: ZONE }).startOf('day'))
  }

  function onTeamChange(e) {
    const v = e.target.value
    setTeamId(v)
    if (v) localStorage.setItem('ts_selectedTeam', v); else localStorage.removeItem('ts_selectedTeam')
  }

  return (
    <div className="vtl-root">
      <div className="vtl-header">
        <div className="vtl-left">
          <strong>{selectedDate.toFormat('ccc, dd LLL yyyy')}</strong>
          <span style={{ marginLeft: 8 }}>IST • 24-hour</span>
        </div>
        <div className="vtl-controls">
          <select value={teamId} onChange={onTeamChange} style={{ marginRight: 6 }}>
            <option value="">All teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={() => changeDay(-1)} aria-label="Previous day">◀</button>
          <button onClick={() => setSelectedDate(DateTime.now().setZone(ZONE).startOf('day'))}>Today</button>
          <button onClick={() => changeDay(1)} aria-label="Next day">▶</button>
          <input
            type="date"
            value={selectedDate.toISODate()}
            onChange={onDateInput}
            style={{ marginLeft: 8 }}
          />
        </div>
        {selectedTeam && (
          <div style={{ marginTop: 6, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
            <span style={{ fontWeight:600 }}>{selectedTeam.name}</span>
            <span style={{ color:'#777' }}>• {(Array.isArray(selectedTeam.members)? selectedTeam.members.length : 0)} member{(Array.isArray(selectedTeam.members)? selectedTeam.members.length : 0) === 1 ? '' : 's'}</span>
            {(Array.isArray(selectedTeam.members) ? selectedTeam.members : []).map((member, idx) => {
              const label = typeof member === 'object'
                ? (member.name || member.username || member.email || 'Member')
                : String(member || '')
              const key = typeof member === 'object'
                ? member.id || `${selectedTeam.id || 'team'}-${idx}`
                : `${selectedTeam.id || 'team'}-${idx}-${label}`
              return (
                <span
                  key={key}
                  style={{ background:'#f5f5f5', border:'1px solid #e5e5e5', borderRadius:12, padding:'2px 8px' }}
                >
                  {label}
                </span>
              )
            })}
          </div>
        )}
        {error && <span className="vtl-error">{error} — showing empty timeline</span>}
      </div>
      <div className="vtl-scroll">
        <div className="vtl-grid" style={{ height: DAY_MINUTES * PX_PER_MIN }}>
          {/* hour lines + labels */}
          {hourMarks.map(h => (
            <div key={h} className="vtl-hour" style={{ top: h * 60 * PX_PER_MIN }}>
              <div className="vtl-hour-line" />
              <div className="vtl-hour-label">{String(h).padStart(2, '0')}:00</div>
            </div>
          ))}

          {/* items */}
          <div className="vtl-items">
            {items.map(e => {
              const { top, height } = itemStyle(e)
              const startIST = DateTime.fromISO(e.start).setZone(ZONE).toFormat('HH:mm')
              const endIST = e.end ? DateTime.fromISO(e.end).setZone(ZONE).toFormat('HH:mm') : ''
              const label = e.title ? e.title : 'Entry'
              return (
                <div key={e.id} className="vtl-item" style={{ top, height }} title={`${label} ${startIST}${endIST ? '–' + endIST : ''} IST`}>
                  <div className="vtl-item-content">
                    <div className="vtl-item-title">{label}</div>
                    <div className="vtl-item-time">{startIST}{endIST ? ' – ' + endIST : ''} IST</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* now line (only on selected day == today) */}
          {isToday && <div className="vtl-now" style={{ top: nowTop }} />}
        </div>
      </div>
    </div>
  )
}
