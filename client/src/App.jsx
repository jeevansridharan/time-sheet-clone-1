import React, { useEffect, useState } from 'react'
import Dashboard from './Dashboard'
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
    axios
      .get('/me', { headers: { Authorization: `Bearer ${t}` } })
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
      {!user ? (
        <div>
          <h1>Sign in to continue</h1>
          <Login onLogin={(token, u) => handleLogin(token, u)} />
        </div>
      ) : (
        <Dashboard user={user} onLogout={logout} />
      )}
    </div>
  )
}
