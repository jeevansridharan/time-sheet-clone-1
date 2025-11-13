import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function authHeaders() {
    const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function load() {
    try {
      const [pr, tr] = await Promise.all([
        axios.get('/api/projects', { headers: authHeaders() }),
        axios.get('/api/tasks', { headers: authHeaders() })
      ])
      setProjects(pr.data.projects || [])
      setTasks(tr.data.tasks || [])
    } catch (e) {
      setError('Failed to load tasks/projects')
    }
  }

  useEffect(() => { load() }, [])

  async function addTask(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await axios.post('/api/tasks', { title, projectId: projectId || null }, { headers: authHeaders() })
      setTitle('')
      setProjectId('')
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Create failed')
    } finally { setSaving(false) }
  }

  const projMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p.name])), [projects])

  return (
    <div>
      <h3 style={{ margin:'8px 0' }}>Tasks</h3>
      <form onSubmit={addTask} style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)} required style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }}>
          <option value="">No project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="submit" disabled={saving} style={{ padding:'8px 12px' }}>{saving ? 'Adding…' : 'Add Task'}</button>
      </form>
      {error && <div style={{ color:'crimson', marginBottom:8 }}>{error}</div>}
      <div style={{ background:'#fff', border:'1px solid #e6e6e6', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#fafafa' }}>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Title</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Project</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{t.title}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{t.projectId ? (projMap[t.projectId] || t.projectId) : '—'}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{t.status}</td>
              </tr>
            ))}
            {!tasks.length && (
              <tr><td colSpan={3} style={{ padding:12 }}>No tasks yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
