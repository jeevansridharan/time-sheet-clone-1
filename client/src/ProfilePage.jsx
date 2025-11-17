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

  const myTasks = useMemo(() => {
    if (!user) return []
    const name = (user.name || '').trim().toLowerCase()
    const email = (user.email || '').trim().toLowerCase()
    return (tasks || []).filter(t => {
      const a = (t.assignedTo || '').trim().toLowerCase()
      return a && (a === name || a === email)
    })
  }, [tasks, user])

  const current = useMemo(() => myTasks.filter(t => (t.status||'open') !== 'completed'), [myTasks])
  const previous = useMemo(() => myTasks.filter(t => (t.status||'open') === 'completed'), [myTasks])

  async function toggle(t) {
    try {
      await axios.patch(`/api/tasks/${t.id}`, { status: (t.status||'open')==='completed' ? 'open' : 'completed' }, { headers })
      // refresh tasks
      const tr = await axios.get('/api/tasks', { headers })
      setTasks(tr.data.tasks || [])
    } catch {}
  }

  if (loading) return <div>Loading…</div>
  if (error) return <div style={{ color:'crimson' }}>{error}</div>

  return (
    <div>
      <h3 style={{ margin:'8px 0' }}>My Profile</h3>
      <div className="card" style={{ marginBottom:12 }}>
        <div className="card-title">User</div>
        <div style={{ lineHeight: 1.6 }}>
          <div><strong>Name:</strong> {user?.name || '—'}</div>
          <div><strong>Email:</strong> {user?.email || '—'}</div>
          <div><strong>Phone:</strong> {user?.phone || '—'}</div>
          <div><strong>Age:</strong> {user?.age != null ? user.age : '—'}</div>
          <div><strong>Gender:</strong> {user?.gender || '—'}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom:12 }}>
        <div className="card-title">Current Tasks</div>
        {current.length ? (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#fafafa' }}>
                <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Title</th>
                <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Status</th>
                <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {current.map(t => (
                <tr key={t.id}>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{t.title}</td>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{t.status || 'open'}</td>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>
                    <button onClick={()=>toggle(t)}>Mark Completed</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ color:'#777' }}>No current tasks</div>}
      </div>

      <div className="card">
        <div className="card-title">Previous Tasks</div>
        {previous.length ? (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#fafafa' }}>
                <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Title</th>
                <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Status</th>
                <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {previous.map(t => (
                <tr key={t.id}>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{t.title}</td>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{t.status || 'completed'}</td>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>
                    <button onClick={()=>toggle(t)}>Mark Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ color:'#777' }}>No previous tasks</div>}
      </div>
    </div>
  )
}
