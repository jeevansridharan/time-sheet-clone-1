import React, { useEffect, useState } from 'react'
import axios from 'axios'

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function PeoplePage() {
  const headers = useAuthHeaders()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', department: '', role: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get('/api/people', { headers })
      setPeople(res.data.people || [])
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load people')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!form.name && !form.email) { setError('Provide name or email'); return }
    try {
      setSaving(true)
      await axios.post('/api/people', form, { headers })
      setForm({ name: '', email: '', department: '', role: '' })
      load()
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  async function remove(id) {
    if (!window.confirm('Remove this person?')) return
    try {
      await axios.delete(`/api/people/${id}`, { headers })
      load()
    } catch (err) { setError(err?.response?.data?.error || 'Delete failed') }
  }

  if (loading) return <div>Loading people…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>People</h3>
        <div style={{ color: 'crimson' }}>{error}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Add person</strong>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input placeholder="Full name" value={form.name} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))} />
          <input placeholder="Email" value={form.email} onChange={e=>setForm(f=>({ ...f, email: e.target.value }))} />
          <input placeholder="Department" value={form.department} onChange={e=>setForm(f=>({ ...f, department: e.target.value }))} />
          <input placeholder="Role" value={form.role} onChange={e=>setForm(f=>({ ...f, role: e.target.value }))} />
          <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
        </div>
      </div>

      <div className="people-table-wrapper">
        <table className="teams-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th style={{ width: 90 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {people.length ? people.map(p => (
              <tr key={p.id}>
                <td>{p.id ? p.id.slice(0,6).toUpperCase() : '—'}</td>
                <td>{p.name || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>{p.department || '—'}</td>
                <td>{p.role || '—'}</td>
                <td><button onClick={()=>remove(p.id)}>Remove</button></td>
              </tr>
            )) : (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 14 }}>No people yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
