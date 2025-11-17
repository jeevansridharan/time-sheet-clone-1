import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import TaskDetails from './TaskDetails'

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState('')

  function authHeaders() {
    const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function load() {
    try {
      const [pr, tr, tm] = await Promise.all([
        axios.get('/api/projects', { headers: authHeaders() }),
        axios.get('/api/tasks', { headers: authHeaders() }),
        axios.get('/api/teams', { headers: authHeaders() })
      ])
      setProjects(pr.data.projects || [])
      setTasks(tr.data.tasks || [])
      setTeams(tm.data.teams || [])
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
      await axios.post('/api/tasks', { title, projectId: projectId || null, teamId: teamId || null, assignedTo: assignedTo || null }, { headers: authHeaders() })
      setTitle('')
      setProjectId('')
      setTeamId('')
      setAssignedTo('')
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Create failed')
    } finally { setSaving(false) }
  }

  const projMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p.name])), [projects])
  const teamMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t.name])), [teams])

  return (
    <div>
      <h3 style={{ margin:'8px 0' }}>Tasks</h3>
      <form onSubmit={addTask} style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)} required style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }}>
          <option value="">No project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={teamId} onChange={e=>setTeamId(e.target.value)} style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }}>
          <option value="">No team</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input placeholder="Assignee (name)" value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <button type="submit" disabled={saving} style={{ padding:'8px 12px' }}>{saving ? 'Adding…' : 'Add Task'}</button>
      </form>
      {error && <div style={{ color:'crimson', marginBottom:8 }}>{error}</div>}
      <div style={{ background:'#fff', border:'1px solid #e6e6e6', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#fafafa' }}>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Title</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Project</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Team</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Assigned</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id} style={{ background: selected===t.id ? '#f7f7ff' : 'transparent' }}>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }} onClick={()=>setSelected(t.id)}>{t.title}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }} onClick={()=>setSelected(t.id)}>{t.projectId ? (projMap[t.projectId] || t.projectId) : '—'}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }} onClick={()=>setSelected(t.id)}>{t.teamId ? (teamMap[t.teamId] || t.teamId) : '—'}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }} onClick={()=>setSelected(t.id)}>{t.assignedTo || '—'}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>
                  <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <input type="checkbox" checked={(t.status||'open')==='completed'} onChange={async (e)=>{
                      try {
                        await axios.patch(`/api/tasks/${t.id}`, { status: e.target.checked ? 'completed' : 'open' }, { headers: authHeaders() })
                        await load()
                      } catch {}
                    }} />
                    <span>{(t.status||'open')==='completed' ? 'Completed' : 'Open'}</span>
                  </label>
                </td>
              </tr>
            ))}
            {!tasks.length && (
              <tr><td colSpan={5} style={{ padding:12 }}>No tasks yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <TaskDetails taskId={selected} />
    </div>
  )
}
