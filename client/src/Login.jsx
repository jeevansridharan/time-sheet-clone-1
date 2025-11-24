import React, { useState } from 'react'
import axios from 'axios'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [managerPassword, setManagerPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await axios.post('/login', { email, password, role, managerPassword: role === 'manager' ? managerPassword : undefined })
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
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email or phone</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="text" placeholder="you@example.com or 9876543210" required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} required style={{ width: '100%', padding: 8 }}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        {role === 'manager' && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Manager Access Code</label>
            <input 
              value={managerPassword} 
              onChange={e => setManagerPassword(e.target.value)} 
              type="password" 
              placeholder="Enter manager access code"
              required 
              style={{ width: '100%', padding: 8 }} 
            />
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Signing in…' : 'Sign in'}</button>
          <a href="#/register" style={{ marginLeft: 12 }}>Create an account</a>
        </div>
        <div style={{ marginTop: 8 }}>
          <a href="#/forgot-password" style={{ fontSize: 13, color: '#4f46e5' }}>Forgot password?</a>
        </div>
        {error && <div role="alert" style={{ marginTop: 10, color: 'crimson' }}>{error}</div>}
      </form>
    </div>
  )
}
