import React, { useState } from 'react'
import axios from 'axios'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await axios.post('/login', { email, password })
      if (res.data && res.data.token) {
        // store token and propagate user info
        localStorage.setItem('tpodo_token', res.data.token)
        onLogin && onLogin(res.data.token, res.data.user)
      } else {
        setError('Invalid server response')
      }
    } catch (err) {
      const msg = err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error
        : (err && err.message) || 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, marginTop: 16 }}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Signing in…' : 'Sign in'}</button>
          <a href="/register" style={{ marginLeft: 12 }}>Create an account</a>
        </div>
        {error && <div role="alert" style={{ marginTop: 10, color: 'crimson' }}>{error}</div>}
      </form>
    </div>
  )
}
