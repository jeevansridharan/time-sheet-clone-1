import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DateTime } from 'luxon'

export default function NewEntryModal({ onCancel, onCreated }) {
  const now = useMemo(() => DateTime.local(), [])
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [taskId, setTaskId] = useState('')
  const [start, setStart] = useState(now.toFormat("yyyy-LL-dd'T'HH:mm"))
  const [end, setEnd] = useState(now.plus({ hours: 1 }).toFormat("yyyy-LL-dd'T'HH:mm"))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')

  function authHeaders() {
    const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [tr, tm] = await Promise.all([
          axios.get('/api/tasks', { headers: authHeaders() }),
          axios.get('/api/teams', { headers: authHeaders() })
        ])
        if (!mounted) return
        setTasks(tr.data.tasks || [])
        setTeams(tm.data.teams || [])
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      // datetime-local returns local time; convert to UTC ISO for API
      const startUtc = DateTime.fromISO(start).toUTC().toISO()
      const endUtc = end ? DateTime.fromISO(end).toUTC().toISO() : null
      const res = await axios.post('/api/entries', {
        title: title || 'Entry',
        project: project || null,
        start: startUtc,
        end: endUtc,
        taskId: taskId || null,
        teamId: teamId || null
      }, { headers: authHeaders() })
      onCreated && onCreated(res.data.entry)
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Failed to create entry'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin:0 }}>New Entry</h3>
        </div>
        <div className="form-row">
          <label>Team</label>
          <select value={''} onChange={()=>{}} disabled>
            <option value="">Select via task/project (optional)</option>
          </select>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <label>Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What did you work on?" />
            </div>
            <div className="form-row">
              <label>Project</label>
              <select value={project} onChange={e=>setProject(e.target.value)}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Task</label>
              <select value={taskId} onChange={e=>setTaskId(e.target.value)}>
                <option value="">No task</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Team</label>
              <select value={teamId} onChange={e=>setTeamId(e.target.value)}>
                <option value="">No team</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Start</label>
              <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>End</label>
              <input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} />
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create entry'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
