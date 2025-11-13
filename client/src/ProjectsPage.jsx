import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function authHeaders() {
    const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function load() {
    try {
      const res = await axios.get('/api/projects', { headers: authHeaders() })
      setProjects(res.data.projects || [])
    } catch (e) {
      setError('Failed to load projects')
    }
  }

  useEffect(() => { load() }, [])

  async function addProject(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await axios.post('/api/projects', { name, description }, { headers: authHeaders() })
      setName('')
      setDescription('')
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Create failed')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <h3 style={{ margin:'8px 0' }}>Projects</h3>
      <form onSubmit={addProject} style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input placeholder="Project name" value={name} onChange={e=>setName(e.target.value)} required style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <input placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)} style={{ flex:1, padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <button type="submit" disabled={saving} style={{ padding:'8px 12px' }}>{saving ? 'Adding…' : 'Add Project'}</button>
      </form>
      {error && <div style={{ color:'crimson', marginBottom:8 }}>{error}</div>}
      <div style={{ background:'#fff', border:'1px solid #e6e6e6', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#fafafa' }}>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Name</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id}>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{p.name}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{p.description || '—'}</td>
              </tr>
            ))}
            {!projects.length && (
              <tr><td colSpan={2} style={{ padding:12 }}>No projects yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
