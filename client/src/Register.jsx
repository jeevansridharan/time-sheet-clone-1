import React, { useState } from 'react'
import axios from 'axios'

export default function Register({ onLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      await axios.post('/register', { name, email, password, phone: phone || null, age: age ? Number(age) : null, gender: gender || null })
      // auto-login
      const res = await axios.post('/login', { email, password })
      if (res.data?.token) {
        localStorage.setItem('tpodo_token', res.data.token)
        onLogin && onLogin(res.data.token, res.data.user)
        return
      }
      setSuccess('Registered. Please sign in.')
      window.location.hash = ''
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 520, marginTop: 16 }}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display:'block', fontSize: 13, marginBottom: 4 }}>Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} type="text" required style={{ width:'100%', padding:8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display:'block', fontSize: 13, marginBottom: 4 }}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required style={{ width:'100%', padding:8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display:'block', fontSize: 13, marginBottom: 4 }}>Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required style={{ width:'100%', padding:8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display:'block', fontSize: 13, marginBottom: 4 }}>Phone</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="e.g., 9876543210" style={{ width:'100%', padding:8 }} />
        </div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 160px' }}>
            <label style={{ display:'block', fontSize: 13, marginBottom: 4 }}>Age</label>
            <input value={age} onChange={e=>setAge(e.target.value)} type="number" min="0" step="1" placeholder="e.g., 25" style={{ width:'100%', padding:8 }} />
          </div>
          <div style={{ flex:'1 1 160px' }}>
            <label style={{ display:'block', fontSize: 13, marginBottom: 4 }}>Gender</label>
            <select value={gender} onChange={e=>setGender(e.target.value)} style={{ width:'100%', padding:8 }}>
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading} style={{ padding:'8px 12px' }}>{loading ? 'Creating…' : 'Create Account'}</button>
          <a href="#" style={{ marginLeft: 12 }}>Back to sign in</a>
        </div>
        {error && <div role="alert" style={{ marginTop: 10, color: 'crimson' }}>{error}</div>}
        {success && <div style={{ marginTop: 10, color: 'green' }}>{success}</div>}
      </form>
    </div>
  )
}
