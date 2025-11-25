import React, { useEffect, useState } from 'react'
import axios from 'axios'

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function PeoplePage({ user }) {
  const isManager = user?.role === 'manager'
  const headers = useAuthHeaders()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', department: '', role: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', department: '', role: '' })

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
    // Prevent duplicate email or name
    const exists = people.some(p => (p.email && form.email && p.email.toLowerCase() === form.email.toLowerCase()) || (p.name && form.name && p.name.toLowerCase() === form.name.toLowerCase()))
    if (exists) {
      setError('A person with this email or name already exists.');
      return;
    }
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

  function startEdit(person) {
    setEditingId(person.id)
    setEditForm({ 
      name: person.name || '', 
      email: person.email || '', 
      department: person.department || '', 
      role: person.role || '' 
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ name: '', email: '', department: '', role: '' })
  }

  async function saveEdit(id) {
    try {
      setSaving(true)
      await axios.put(`/api/people/${id}`, editForm, { headers })
      setEditingId(null)
      setEditForm({ name: '', email: '', department: '', role: '' })
      load()
    } catch (err) {
      setError(err?.response?.data?.error || 'Update failed')
    } finally { setSaving(false) }
  }

  if (loading) return <div>Loading people…</div>

  // Filter for unique email and name
  const uniquePeople = []
  const seen = new Set()
  for (const p of people) {
    const key = (p.email || '') + '|' + (p.name || '')
    if (!seen.has(key)) {
      uniquePeople.push(p)
      seen.add(key)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>People</h3>
        <div style={{ color: 'crimson' }}>{error}</div>
      </div>

      {isManager && (
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
      )}

      <div className="people-table-wrapper">
        <table className="teams-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              {isManager && <th style={{ width: 150 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {uniquePeople.length ? uniquePeople.map(p => (
              editingId === p.id ? (
                <tr key={p.id}>
                  <td>{p.id ? p.id.slice(0,6).toUpperCase() : '—'}</td>
                  <td><input value={editForm.name} onChange={e=>setEditForm(f=>({...f, name: e.target.value}))} style={{width: '100%'}} /></td>
                  <td><input value={editForm.email} onChange={e=>setEditForm(f=>({...f, email: e.target.value}))} style={{width: '100%'}} /></td>
                  <td><input value={editForm.department} onChange={e=>setEditForm(f=>({...f, department: e.target.value}))} style={{width: '100%'}} /></td>
                  <td><input value={editForm.role} onChange={e=>setEditForm(f=>({...f, role: e.target.value}))} style={{width: '100%'}} /></td>
                  <td>
                    <button onClick={()=>saveEdit(p.id)} disabled={saving} style={{marginRight: 4}}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td>{p.id ? p.id.slice(0,6).toUpperCase() : '—'}</td>
                  <td>{p.name || '—'}</td>
                  <td>{p.email || '—'}</td>
                  <td>{p.department || '—'}</td>
                  <td>{p.role || '—'}</td>
                  {isManager && (
                  <td>
                    <button onClick={()=>startEdit(p)} style={{marginRight: 4}}>Edit</button>
                    <button onClick={()=>remove(p.id)}>Remove</button>
                  </td>
                  )}
                </tr>
              )
            )) : (
              <tr><td colSpan={isManager ? 6 : 5} style={{ textAlign: 'center', padding: 14 }}>No people yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
