import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import TaskDetails from './TaskDetails'

function normalizeMember(member, index, teamId, teamName) {
  if (!member) return null
  if (typeof member === 'object') {
    const id = member.id ? String(member.id) : `legacy-${teamId || 'team'}-${index}`
    const name = typeof member.name === 'string' ? member.name.trim() : ''
    const username = typeof member.username === 'string' ? member.username.trim() : ''
    const email = typeof member.email === 'string' ? member.email.trim() : ''
    const role = typeof member.role === 'string' ? member.role.trim() : ''
    const ageValue = member.age === '' || member.age === null || member.age === undefined ? null : Number(member.age)
    const yearValue = member.yearJoined === '' || member.yearJoined === null || member.yearJoined === undefined ? null : Number(member.yearJoined)
    return {
      id,
      teamId: teamId || null,
      teamName: teamName || '',
      name,
      username,
      email,
      role,
      age: Number.isNaN(ageValue) ? null : ageValue,
      yearJoined: Number.isNaN(yearValue) ? null : yearValue,
      subTask: member.subTask ? member.subTask.trim() : ''
    }
  }
  const value = typeof member === 'string' ? member.trim() : String(member || '').trim()
  if (!value) return null
  return {
    id: `legacy-${teamId || 'team'}-${index}`,
    teamId: teamId || null,
    teamName: teamName || '',
    name: value,
    username: '',
    email: '',
    role: '',
    age: null,
    yearJoined: null,
    subTask: ''
  }
}

function renderAssignee(value) {
  if (!value) return '—'
  if (typeof value === 'string') return value
  const name = value.name || value.username || value.email || '—'
  const detailParts = []
  if (value.role) detailParts.push(value.role)
  if (value.subTask) detailParts.push(value.subTask)
  if (value.email && value.email !== name) detailParts.push(value.email)
  if (!value.role && value.username && value.username !== name) detailParts.push(value.username)
  return detailParts.length ? `${name} (${detailParts.join(' · ')})` : name
}

export default function TasksPage({ user }) {
  const [tasks, setTasks] = useState([])
  const [teams, setTeams] = useState([])
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  
  const isManager = user?.role === 'manager'

  function authHeaders() {
    const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function load() {
    try {
      const [tr, tm] = await Promise.all([
        axios.get('/api/tasks', { headers: authHeaders() }),
        axios.get('/api/teams', { headers: authHeaders() })
      ])
      setTasks(tr.data.tasks || [])
      setTeams(tm.data.teams || [])
    } catch (e) {
      setError('Failed to load tasks')
    }
  }

  useEffect(() => { load() }, [])

  const teamsWithMembers = useMemo(() => {
    return teams.map(team => {
      const members = Array.isArray(team.members) ? team.members : []
      const normalized = members
        .map((member, index) => normalizeMember(member, index, team.id, team.name))
        .filter(Boolean)
      return { ...team, members: normalized }
    })
  }, [teams])

  const selectedTeamMembers = useMemo(() => {
    if (!teamId) return []
    const team = teamsWithMembers.find(t => t.id === teamId)
    return team ? team.members : []
  }, [teamsWithMembers, teamId])

  useEffect(() => {
    if (!assigneeId) return
    if (!selectedTeamMembers.some(member => member.id === assigneeId)) {
      setAssigneeId('')
    }
  }, [assigneeId, selectedTeamMembers])

  async function addTask(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const team = teamsWithMembers.find(t => t.id === teamId)
      const member = selectedTeamMembers.find(m => m.id === assigneeId)
      const assignedPayload = member
        ? {
            memberId: member.id,
            teamId: team?.id || null,
            name: member.name || member.username || member.email || '',
            username: member.username || null,
            email: member.email || null,
            role: member.role || null,
            age: member.age != null ? member.age : null,
            yearJoined: member.yearJoined != null ? member.yearJoined : null,
            subTask: member.subTask ? member.subTask : null
          }
        : null
      await axios.post(
        '/api/tasks',
        {
          title,
          teamId: teamId || null,
          assignedTo: assignedPayload
        },
        { headers: authHeaders() }
      )
      setTitle('')
      setTeamId('')
      setAssigneeId('')
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Create failed')
    } finally { setSaving(false) }
  }

  const teamMap = useMemo(() => Object.fromEntries(teamsWithMembers.map(t => [t.id, t.name])), [teamsWithMembers])

  function startEdit(task) {
    setEditingId(task.id)
    setEditForm({
      title: task.title,
      teamId: task.teamId || '',
      assigneeId: task.assignedTo?.memberId || ''
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  async function saveEdit(taskId) {
    try {
      const team = teamsWithMembers.find(t => t.id === editForm.teamId)
      const member = team?.members.find(m => m.id === editForm.assigneeId)
      const assignedPayload = member
        ? {
            memberId: member.id,
            teamId: team?.id || null,
            name: member.name || member.username || member.email || '',
            username: member.username || null,
            email: member.email || null,
            role: member.role || null,
            age: member.age != null ? member.age : null,
            yearJoined: member.yearJoined != null ? member.yearJoined : null,
            subTask: member.subTask ? member.subTask : null
          }
        : null
      await axios.patch(
        `/api/tasks/${taskId}`,
        {
          title: editForm.title,
          teamId: editForm.teamId || null,
          assignedTo: assignedPayload
        },
        { headers: authHeaders() }
      )
      setEditingId(null)
      setEditForm({})
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Update failed')
    }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    try {
      await axios.delete(`/api/tasks/${taskId}`, { headers: authHeaders() })
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Delete failed')
    }
  }

  const editTeamMembers = useMemo(() => {
    if (!editForm.teamId) return []
    const team = teamsWithMembers.find(t => t.id === editForm.teamId)
    return team ? team.members : []
  }, [teamsWithMembers, editForm.teamId])

  return (
    <div>
      <h3 style={{ margin:'8px 0' }}>Tasks</h3>
      {isManager && (
      <form onSubmit={addTask} style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)} required style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <select value={teamId} onChange={e=>setTeamId(e.target.value)} style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }}>
          <option value="">No team</option>
          {teamsWithMembers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={assigneeId}
          onChange={e=>setAssigneeId(e.target.value)}
          disabled={!teamId || !selectedTeamMembers.length}
          style={{ padding:8, border:'1px solid #ddd', borderRadius:6, minWidth:180 }}
        >
          <option value="">Unassigned</option>
          {selectedTeamMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.name || member.username || member.email || 'Member'}
              {member.role ? ` • ${member.role}` : ''}
            </option>
          ))}
        </select>
        <button type="submit" disabled={saving} style={{ padding:'8px 12px' }}>{saving ? 'Adding…' : 'Add Task'}</button>
      </form>
      )}
      {isManager && teamId && !selectedTeamMembers.length && (
        <div style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>
          No employees found for this team. Add them from the Teams page to assign owners.
        </div>
      )}
      {error && <div style={{ color:'crimson', marginBottom:8 }}>{error}</div>}
      <div style={{ background:'#fff', border:'1px solid #e6e6e6', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#fafafa' }}>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Title</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Team</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Assigned</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Status</th>
              {isManager && <th style={{ textAlign:'center', padding:8, borderBottom:'1px solid #eee', width:120 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => {
              if (editingId === t.id) {
                return (
                  <tr key={t.id} style={{ background: '#fffbeb' }}>
                    <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>
                      <input 
                        value={editForm.title} 
                        onChange={e=>setEditForm({...editForm, title: e.target.value})}
                        style={{ width:'100%', padding:4, border:'1px solid #ddd', borderRadius:4 }}
                      />
                    </td>
                    <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>
                      <select 
                        value={editForm.teamId} 
                        onChange={e=>setEditForm({...editForm, teamId: e.target.value, assigneeId: ''})}
                        style={{ width:'100%', padding:4, border:'1px solid #ddd', borderRadius:4 }}
                      >
                        <option value="">No team</option>
                        {teamsWithMembers.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>
                      <select 
                        value={editForm.assigneeId} 
                        onChange={e=>setEditForm({...editForm, assigneeId: e.target.value})}
                        disabled={!editForm.teamId || !editTeamMembers.length}
                        style={{ width:'100%', padding:4, border:'1px solid #ddd', borderRadius:4 }}
                      >
                        <option value="">Unassigned</option>
                        {editTeamMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.username || member.email || 'Member'}
                            {member.role ? ` • ${member.role}` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => saveEdit(t.id)} style={{ padding:'4px 8px', fontSize:12 }}>Save</button>
                        <button onClick={cancelEdit} style={{ padding:'4px 8px', fontSize:12 }}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={t.id} style={{ background: selected===t.id ? '#f7f7ff' : 'transparent' }}>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }} onClick={()=>setSelected(t.id)}>{t.title}</td>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }} onClick={()=>setSelected(t.id)}>{t.teamId ? (teamMap[t.teamId] || t.teamId) : '—'}</td>
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }} onClick={()=>setSelected(t.id)}>{t.assignedTo?.name || '—'}</td>
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
                  {isManager && (
                    <td style={{ padding:8, borderBottom:'1px solid #f1f1f1', textAlign:'center' }}>
                      <button onClick={() => startEdit(t)} style={{ padding:'4px 8px', marginRight:4, fontSize:12 }}>Edit</button>
                      <button onClick={() => deleteTask(t.id)} style={{ padding:'4px 8px', fontSize:12, background:'#dc2626', color:'white', border:'none', borderRadius:4, cursor:'pointer' }}>Delete</button>
                    </td>
                  )}
                </tr>
              )
            })}
            {!tasks.length && (
              <tr><td colSpan={isManager ? 6 : 5} style={{ padding:12 }}>No tasks yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <TaskDetails taskId={selected} />
    </div>
  )
}
