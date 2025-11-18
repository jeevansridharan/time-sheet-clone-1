import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function ProfilePage() {
  const headers = useAuthHeaders()
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('activities')
  const [isCheckedIn, setIsCheckedIn] = useState(() => {
    return !!localStorage.getItem('tpodo_checkin_at')
  })
  const [checkInAt, setCheckInAt] = useState(() => {
    const raw = localStorage.getItem('tpodo_checkin_at')
    return raw ? new Date(raw) : null
  })
  const [elapsed, setElapsed] = useState('00:00:00')
  const [lastSession, setLastSession] = useState(() => {
    const raw = localStorage.getItem('tpodo_last_session')
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [me, tr] = await Promise.all([
          axios.get('/me', { headers }),
          axios.get('/api/tasks', { headers })
        ])
        if (!mounted) return
        setUser(me.data.user)
        setTasks(tr.data.tasks || [])
        setError(null)
      } catch (e) {
        if (!mounted) return
        setError('Failed to load profile')
      } finally { setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!isCheckedIn || !checkInAt) {
      setElapsed('00:00:00')
      return
    }
    const update = () => {
      const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(checkInAt).getTime()) / 1000))
      const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, '0')
      const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, '0')
      const secs = String(diffSeconds % 60).padStart(2, '0')
      setElapsed(`${hrs}:${mins}:${secs}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [isCheckedIn, checkInAt])

  useEffect(() => {
    if (isCheckedIn && checkInAt) {
      localStorage.setItem('tpodo_checkin_at', new Date(checkInAt).toISOString())
    } else {
      localStorage.removeItem('tpodo_checkin_at')
    }
  }, [isCheckedIn, checkInAt])

  useEffect(() => {
    if (lastSession) {
      localStorage.setItem('tpodo_last_session', JSON.stringify(lastSession))
    } else {
      localStorage.removeItem('tpodo_last_session')
    }
  }, [lastSession])

  const myTasks = useMemo(() => {
    if (!user) return []
    const keys = new Set(
      [user.name, user.email]
        .filter(Boolean)
        .map(v => String(v).trim().toLowerCase())
        .filter(Boolean)
    )
    return (tasks || []).filter(task => {
      const assignee = task.assignedTo
      if (!assignee) return false
      if (typeof assignee === 'string') {
        const value = assignee.trim().toLowerCase()
        return value && keys.has(value)
      }
      if (typeof assignee === 'object') {
        const candidates = [assignee.name, assignee.email, assignee.username]
          .filter(Boolean)
          .map(v => String(v).trim().toLowerCase())
        return candidates.some(v => keys.has(v))
      }
      return false
    })
  }, [tasks, user])

  const current = useMemo(() => myTasks.filter(t => (t.status||'open') !== 'completed'), [myTasks])
  const previous = useMemo(() => myTasks.filter(t => (t.status||'open') === 'completed'), [myTasks])
  const summary = useMemo(() => ({
    total: myTasks.length,
    current: current.length,
    completed: previous.length
  }), [myTasks, current, previous])

  function initials(value) {
    if (!value) return '?'
    const parts = value.trim().split(/\s+/)
    if (!parts.length) return '?'
    const letters = parts.slice(0, 2).map(p => p[0].toUpperCase())
    return letters.join('')
  }

  async function toggle(t) {
    try {
      await axios.patch(`/api/tasks/${t.id}`, { status: (t.status||'open')==='completed' ? 'open' : 'completed' }, { headers })
      // refresh tasks
      const tr = await axios.get('/api/tasks', { headers })
      setTasks(tr.data.tasks || [])
    } catch {}
  }

  function handleCheckIn() {
    setCheckInAt(new Date())
    setIsCheckedIn(true)
  }

  function handleCheckOut() {
    if (!checkInAt) return
    const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(checkInAt).getTime()) / 1000))
    const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, '0')
    const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, '0')
    setLastSession({ duration: `${hrs}h ${mins}m`, finishedAt: new Date().toISOString() })
    setIsCheckedIn(false)
    setCheckInAt(null)
    setElapsed('00:00:00')
  }

  if (loading) return <div>Loading…</div>
  if (error) return <div style={{ color:'crimson' }}>{error}</div>

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-content">
          <div className="profile-avatar">{initials(user?.name || user?.email)}</div>
          <div className="profile-meta">
            <h2>{user?.name || 'Unnamed user'}</h2>
            <p>{user?.email}</p>
            <div className="profile-meta-grid">
              <span><strong>Phone:</strong> {user?.phone || '—'}</span>
              <span><strong>Age:</strong> {user?.age != null ? user.age : '—'}</span>
              <span><strong>Gender:</strong> {user?.gender || '—'}</span>
            </div>
          </div>
        </div>
        <div className="profile-tabs">
          {['Activities','Attendance','Time Logs'].map(label => {
            const key = label.toLowerCase().replace(/\s+/g, '_')
            return (
              <button
                key={key}
                className={activeTab === key ? 'active' : ''}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="profile-body">
        <div className="profile-left">
          <div className="profile-card profile-checkin">
            <div className="profile-card-header">
              <span className="profile-card-title">Today</span>
              <span className={isCheckedIn ? 'status in' : 'status out'}>{isCheckedIn ? 'Checked-in' : 'Not checked-in'}</span>
            </div>
            <div className="profile-timer">{elapsed}</div>
            <div className="profile-checkin-actions">
              {isCheckedIn ? (
                <button onClick={handleCheckOut}>Check-out</button>
              ) : (
                <button onClick={handleCheckIn}>Check-in</button>
              )}
            </div>
            {lastSession && (
              <div className="profile-last-session">
                Last session: {lastSession.duration} on {new Date(lastSession.finishedAt).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="profile-card">
            <div className="profile-card-title">My Stats</div>
            <div className="profile-stats-grid">
              <div>
                <span className="label">Current tasks</span>
                <strong>{summary.current}</strong>
              </div>
              <div>
                <span className="label">Completed</span>
                <strong>{summary.completed}</strong>
              </div>
              <div>
                <span className="label">Total assigned</span>
                <strong>{summary.total}</strong>
              </div>
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-card-title">Quick Notes</div>
            <p className="profile-muted">Use this panel to keep personal reminders about attendance, time-off, or goals for the week.</p>
          </div>
        </div>

        <div className="profile-right">
          {activeTab === 'activities' && (
            <div className="profile-card">
              <div className="profile-card-title">Current Tasks</div>
              {current.length ? (
                <table className="profile-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.map(t => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td>{t.status || 'open'}</td>
                        <td>
                          <button onClick={() => toggle(t)}>Mark Completed</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="profile-muted">No current tasks</div>}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="profile-card">
              <div className="profile-card-title">Previous Tasks</div>
              {previous.length ? (
                <table className="profile-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previous.map(t => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td>{t.status || 'completed'}</td>
                        <td>
                          <button onClick={() => toggle(t)}>Mark Open</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="profile-muted">No previous tasks</div>}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="profile-card">
              <div className="profile-card-title">Attendance Summary</div>
              <div className="profile-muted">Attendance analytics will appear here once check-ins are synced with the server.</div>
            </div>
          )}

          {activeTab === 'time_logs' && (
            <div className="profile-card">
              <div className="profile-card-title">Time Logs</div>
              <div className="profile-muted">Your day timeline entries will be listed here after you record time against tasks.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
