import React, { useEffect, useState } from 'react'
import TimelineView from './Timeline'
import VerticalTimeline from './VerticalTimeline'
import Login from './Login'
import axios from 'axios'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('tpodo_token')
    if (!t) {
      setLoading(false)
      return
    }
    axios.get('/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(res => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('tpodo_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  function handleLogin(token, u) {
    localStorage.setItem('tpodo_token', token)
    setUser(u || null)
  }

  function logout() {
    localStorage.removeItem('tpodo_token')
    setUser(null)
  }

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>

  return (
    <div style={{ padding: 20 }}>
      <h1>Time Sheet — Timeline (IST, 24-hour)</h1>
      {!user ? (
        <div>
          <p>Please sign in to view and manage your timeline.</p>
          <Login onLogin={(token, u) => handleLogin(token, u)} />
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>Signed in as <strong>{user.email || user.name || user.id}</strong></div>
            <div>
              <button onClick={logout}>Sign out</button>
            </div>
          </div>
          {/* Replace horizontal timeline with vertical timeline view */}
          <VerticalTimeline />
        </div>
      )}
    </div>
  )
}
