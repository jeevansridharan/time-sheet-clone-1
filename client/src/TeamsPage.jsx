import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const EMPTY_MEMBER_FORM = {
  name: '',
  username: '',
  role: '',
  email: '',
  age: '',
  yearJoined: '',
  subTask: ''
}

function safeId(prefix = 'mem') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`
}

function normalizeMember(item, index) {
  if (!item) return null
  if (typeof item === 'object') {
    const id = item.id ? String(item.id) : `legacy-${index}`
    return {
      id,
      name: item.name ? String(item.name) : '',
      username: item.username ? String(item.username) : '',
      role: item.role ? String(item.role) : '',
      email: item.email ? String(item.email) : '',
      age: item.age != null && item.age !== '' ? String(item.age) : '',
      yearJoined: item.yearJoined != null && item.yearJoined !== '' ? String(item.yearJoined) : '',
      subTask: item.subTask ? String(item.subTask) : ''
    }
  }
  const value = typeof item === 'string' ? item.trim() : String(item || '').trim()
  if (!value) return null
  return {
    id: `legacy-${index}`,
    name: value,
    username: '',
    role: '',
    email: '',
    age: '',
    yearJoined: '',
    subTask: ''
  }
}

function serializeMembers(list) {
  return list.map(m => {
    const ageValue = m.age && !Number.isNaN(Number(m.age)) ? Number(m.age) : null
    const yearValue = m.yearJoined && !Number.isNaN(Number(m.yearJoined)) ? Number(m.yearJoined) : null
    return {
      id: m.id || safeId(),
      name: m.name?.trim() || null,
      username: m.username?.trim() || null,
      role: m.role?.trim() || null,
      email: m.email?.trim() || null,
      age: ageValue,
      yearJoined: yearValue,
      subTask: m.subTask?.trim() || null
    }
  })
}

function initials(value) {
  if (!value) return '—'
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  const letters = parts.slice(0, 2).map(p => p[0].toUpperCase())
  return letters.join('')
}

const VISIBILITY_OPTIONS = [
  { value: 'everyone', label: 'Visible for everyone' },
  { value: 'members', label: 'Visible for team members' },
  { value: 'team_leader', label: 'Visible for team leader' },
  { value: 'disabled', label: 'Hidden' }
]

function visibilityLabel(value) {
  switch (value) {
    case 'everyone':
    case 'all':
      return 'Visible for everyone'
    case 'members':
      return 'Visible for team members'
    case 'team_leader':
    case 'owner':
    case 'owner_managers':
      return 'Visible for team leader'
    case 'disabled':
      return 'Hidden'
    default:
      return 'Visible for everyone'
  }
}

export default function TeamsPage() {
  const headers = useAuthHeaders()
  const [teams, setTeams] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#4f46e5', visibility: 'everyone' })
  const [formError, setFormError] = useState(null)

  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM)
  const [memberError, setMemberError] = useState(null)
  const [viewFilter, setViewFilter] = useState('employee')
  const [dataScope, setDataScope] = useState('all')
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState([])

  useEffect(() => { load() }, [])

  async function load(silent = false) {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [teamsRes, tasksRes] = await Promise.all([
        axios.get('/api/teams', { headers }),
        axios.get('/api/tasks', { headers })
      ])
      setTeams(teamsRes.data.teams || [])
      setTasks(tasksRes.data.tasks || [])
    } catch (e) {
      setError('Failed to load teams')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  function openCreateForm() {
    setEditingTeam(null)
    setForm({ name: '', description: '', color: '#4f46e5', visibility: 'everyone' })
    setFormError(null)
    setShowForm(true)
  }

  function openEditForm(team) {
    setEditingTeam(team)
    setForm({
      name: team.name || '',
      description: team.description || '',
      color: team.color || '#4f46e5',
      visibility: team.visibility || 'everyone'
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingTeam(null)
    setFormError(null)
  }

  async function handleFormSubmit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setFormError('Team name is required')
      return
    }
    const payload = {
      name,
      description: form.description.trim() || null,
      color: form.color || '#4f46e5',
      visibility: form.visibility || 'everyone'
    }
    try {
      setSaving(true)
      if (editingTeam) {
        await axios.patch(`/api/teams/${editingTeam.id}`, payload, { headers })
      } else {
        await axios.post('/api/teams', payload, { headers })
      }
      closeForm()
      await load(true)
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  const projectsByTeam = useMemo(() => {
    const map = new Map()
    tasks.forEach(task => {
      if (!task.teamId || !task.projectId) return
      if (!map.has(task.teamId)) map.set(task.teamId, new Set())
      map.get(task.teamId).add(task.projectId)
    })
    const counts = {}
    map.forEach((set, teamId) => {
      counts[teamId] = set.size
    })
    return counts
  }, [tasks])

  async function handleDelete(team) {
    if (!window.confirm(`Delete team "${team.name}"?`)) return
    try {
      setSaving(true)
      await axios.delete(`/api/teams/${team.id}`, { headers })
      if (selectedTeamId === team.id) {
        setSelectedTeamId(null)
        setMemberDraft('')
      }
      await load(true)
    } catch (err) {
      setError(err?.response?.data?.error || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function colorForTeam(team) {
    return (team && team.color) || '#4f46e5'
  }

  const selectedTeam = selectedTeamId ? teams.find(t => t.id === selectedTeamId) || null : null
  const memberList = useMemo(() => {
    if (!selectedTeam) return []
    const raw = Array.isArray(selectedTeam.members) ? selectedTeam.members : []
    return raw.map((item, index) => normalizeMember(item, index)).filter(Boolean)
  }, [selectedTeam])

  useEffect(() => {
    setMemberForm(EMPTY_MEMBER_FORM)
    setMemberError(null)
    setSelectedMemberIds([])
    setShowMemberForm(false)
  }, [selectedTeamId])

  useEffect(() => {
    setSelectedMemberIds(prev => prev.filter(id => memberList.some(member => member.id === id)))
  }, [memberList])

  const allMembersSelected = memberList.length > 0 && selectedMemberIds.length === memberList.length

  function toggleMemberSelection(memberId) {
    setSelectedMemberIds(prev => (prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]))
  }

  function toggleSelectAll() {
    setSelectedMemberIds(allMembersSelected ? [] : memberList.map(member => member.id))
  }

  async function addMember() {
    if (!selectedTeam) return
    const trimmed = {
      id: safeId(),
      name: memberForm.name.trim(),
      username: memberForm.username.trim(),
      role: memberForm.role.trim(),
      email: memberForm.email.trim(),
      age: memberForm.age.trim(),
      yearJoined: memberForm.yearJoined.trim(),
      subTask: memberForm.subTask.trim()
    }

    if (!trimmed.name && !trimmed.email) {
      setMemberError('Provide at least a name or an email')
      return
    }

    try {
      setSaving(true)
      setMemberError(null)
      const nextMembers = serializeMembers([...memberList, trimmed])
      await axios.patch(`/api/teams/${selectedTeam.id}`, { members: nextMembers }, { headers })
      setMemberForm(EMPTY_MEMBER_FORM)
      setShowMemberForm(false)
      await load(true)
    } catch (err) {
      setMemberError(err?.response?.data?.error || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  async function removeMember(memberId) {
    if (!selectedTeam) return
    try {
      setSaving(true)
      const nextMembers = serializeMembers(memberList.filter(m => m.id !== memberId))
      await axios.patch(`/api/teams/${selectedTeam.id}`, { members: nextMembers }, { headers })
      await load(true)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to remove member')
    } finally {
      setSaving(false)
    }
  }

  function viewTimeline(teamId) {
    if (teamId) localStorage.setItem('ts_selectedTeam', teamId)
    else localStorage.removeItem('ts_selectedTeam')
    window.location.hash = '#/dashboard'
  }

  if (loading) return <div>Loading teams…</div>

  return (
    <div>
      <div className="teams-header">
        <div>
          <h3 style={{ margin: 0 }}>Teams</h3>
          {error && <div style={{ color: 'crimson', marginTop: 6 }}>{error}</div>}
        </div>
        <button className="teams-primary" onClick={openCreateForm}>+ New Team</button>
      </div>

      <div className="teams-table-wrapper">
        <table className="teams-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Visibility</th>
              <th>Projects</th>
              <th>Members</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => {
              const members = Array.isArray(team.members) ? team.members : []
              const projectCount = projectsByTeam[team.id] || 0
              return (
                <tr key={team.id}>
                  <td>
                    <div className="team-name-cell">
                      <span className="team-color-dot" style={{ background: colorForTeam(team) }} />
                      <span>{team.name}</span>
                    </div>
                  </td>
                  <td>{team.description || '—'}</td>
                  <td>{visibilityLabel(team.visibility)}</td>
                  <td>{projectCount}</td>
                  <td>{members.length}</td>
                  <td>
                    <div className="teams-actions">
                      <button onClick={() => openEditForm(team)}>Edit</button>
                      <button onClick={() => setSelectedTeamId(prev => (prev === team.id ? null : team.id))}>
                        {selectedTeamId === team.id ? 'Close' : 'Manage'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!teams.length && (
              <tr>
                <td colSpan={6} style={{ padding: 18, textAlign: 'center', color: '#777' }}>
                  No teams yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTeam && (
        <div className="team-manage-card">
          <div className="team-manage-header">
            <div>
              <h4>{selectedTeam.name}</h4>
              <div className="team-manage-meta">
                <span><strong>Visibility:</strong> {visibilityLabel(selectedTeam.visibility)}</span>
                <span><strong>Color:</strong> <span className="team-color-dot" style={{ background: colorForTeam(selectedTeam), marginRight: 4 }} />{colorForTeam(selectedTeam)}</span>
              </div>
            </div>
            <div className="team-manage-actions">
              <button onClick={() => viewTimeline(selectedTeam.id)}>View timeline</button>
              <button onClick={() => openEditForm(selectedTeam)}>Edit details</button>
              <button className="danger" onClick={() => handleDelete(selectedTeam)} disabled={saving}>Delete</button>
            </div>
          </div>
          <div className="team-manage-description">
            <strong>Description:</strong> {selectedTeam.description || '—'}
          </div>
          <div className="team-members-section">
            <div className="team-members-header">
              <div className="team-members-title">
                <h5>Employees</h5>
                <span className="team-members-count">{memberList.length} total</span>
              </div>
              <div className="team-members-toolbar">
                <div className="team-toolbar-left">
                  <label className="team-toolbar-select">
                    <span>Saved view</span>
                    <select value={viewFilter} onChange={e => setViewFilter(e.target.value)} disabled={saving}>
                      <option value="employee">Employee View</option>
                      <option value="compact">Compact View</option>
                      <option value="onboarding">Onboarding View</option>
                    </select>
                  </label>
                  <button type="button" className="team-toolbar-inline-edit" disabled={saving}>Edit</button>
                </div>
                <div className="team-toolbar-right">
                  <label className="team-toolbar-select">
                    <span>Dataset</span>
                    <select value={dataScope} onChange={e => setDataScope(e.target.value)} disabled={saving}>
                      <option value="all">All Data</option>
                      <option value="active">Active Employees</option>
                      <option value="new">Joined This Year</option>
                    </select>
                  </label>
                  <button type="button" className="team-toolbar-icon" disabled={saving}>⟳</button>
                  <button type="button" className="team-toolbar-icon" disabled={saving}>☰</button>
                  <button
                    type="button"
                    className="team-toolbar-primary"
                    onClick={() => setShowMemberForm(true)}
                    disabled={saving}
                  >
                    Add Employee(s)
                  </button>
                </div>
              </div>
            </div>

            {memberList.length ? (
              <div className="team-members-table-wrapper">
                <table className="team-members-table">
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={allMembersSelected}
                          onChange={toggleSelectAll}
                          className="team-checkbox"
                        />
                      </th>
                      <th>Employee ID</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Nick Name</th>
                      <th>Email Address</th>
                      <th>Photo</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th style={{ width: 70 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberList.map(member => {
                      const [firstName, ...rest] = (member.name || '').trim().split(/\s+/).filter(Boolean)
                      const lastName = rest.join(' ')
                      const employeeCode = member.id ? member.id.slice(0, 6).toUpperCase() : 'ID'
                      return (
                        <tr key={member.id}>
                          <td className="checkbox-cell">
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.includes(member.id)}
                              onChange={() => toggleMemberSelection(member.id)}
                              className="team-checkbox"
                            />
                          </td>
                          <td>{employeeCode}</td>
                          <td>{firstName || '—'}</td>
                          <td>{lastName || '—'}</td>
                          <td>{member.username || '—'}</td>
                          <td>{member.email || '—'}</td>
                          <td>
                            <div className="member-photo-thumb">{initials(member.name || member.username || member.email)}</div>
                          </td>
                          <td>{member.role || '—'}</td>
                          <td>{member.subTask || '—'}</td>
                          <td>
                            <button className="member-remove" onClick={() => removeMember(member.id)} disabled={saving}>Remove</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="team-members-empty">No employees added yet.</div>
            )}

            <div className="team-members-footer">
              <div>Total record count: {memberList.length}</div>
              <div className="team-members-page-size">
                <span>Rows per page</span>
                <select disabled>
                  <option>10</option>
                </select>
                <span>1 - {memberList.length || 1}</span>
              </div>
            </div>

            {showMemberForm && (
              <div className="team-member-form-card">
                <div className="team-member-form-header">
                  <h6>Add employee</h6>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMemberForm(false)
                      setMemberForm(EMPTY_MEMBER_FORM)
                      setMemberError(null)
                    }}
                    disabled={saving}
                  >
                    Close
                  </button>
                </div>
                <div className="team-member-form-grid">
                  <label>
                    <span>Full name</span>
                    <input
                      value={memberForm.name}
                      onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Doe"
                      disabled={saving}
                    />
                  </label>
                  <label>
                    <span>Username</span>
                    <input
                      value={memberForm.username}
                      onChange={e => setMemberForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="jane.doe"
                      disabled={saving}
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      value={memberForm.email}
                      onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jane@example.com"
                      disabled={saving}
                    />
                  </label>
                  <label>
                    <span>Department</span>
                    <input
                      value={memberForm.role}
                      onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}
                      placeholder="Management"
                      disabled={saving}
                    />
                  </label>
                  <label>
                    <span>Designation</span>
                    <input
                      value={memberForm.subTask}
                      onChange={e => setMemberForm(f => ({ ...f, subTask: e.target.value }))}
                      placeholder="Administrator"
                      disabled={saving}
                    />
                  </label>
                  <label>
                    <span>Year joined</span>
                    <input
                      value={memberForm.yearJoined}
                      onChange={e => setMemberForm(f => ({ ...f, yearJoined: e.target.value }))}
                      placeholder="2022"
                      disabled={saving}
                    />
                  </label>
                  <label>
                    <span>Age</span>
                    <input
                      value={memberForm.age}
                      onChange={e => setMemberForm(f => ({ ...f, age: e.target.value }))}
                      placeholder="29"
                      disabled={saving}
                    />
                  </label>
                </div>
                {memberError && <div className="team-member-form-error">{memberError}</div>}
                <div className="team-member-form-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setShowMemberForm(false)
                      setMemberForm(EMPTY_MEMBER_FORM)
                      setMemberError(null)
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="button" className="primary" onClick={addMember} disabled={saving}>Save employee</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="teams-form-overlay">
          <div className="teams-form">
            <div className="teams-form-header">
              <h3>{editingTeam ? 'Edit Team' : 'New Team'}</h3>
              <button onClick={closeForm} aria-label="Close form">×</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <label>
                <span>Name</span>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </label>
              <div className="teams-form-row">
                <label>
                  <span>Color</span>
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Salary visibility</span>
                  <select
                    value={form.visibility}
                    onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                  >
                    {VISIBILITY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              {formError && <div className="form-error">{formError}</div>}
              <div className="teams-form-actions">
                <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save team'}</button>
                <button type="button" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
