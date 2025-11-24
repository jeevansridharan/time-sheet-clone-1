import React, { useEffect, useState } from 'react'
import axios from 'axios'
import TaskDetails from './TaskDetails'

export default function ProjectsPage({ user }) {
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selectedTeams, setSelectedTeams] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [entries, setEntries] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [teams, setTeams] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTeam, setNewTaskTeam] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [people, setPeople] = useState([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')
  const [addingMember, setAddingMember] = useState(false)
  const [projectMembers, setProjectMembers] = useState([])
  const [editingProject, setEditingProject] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', deadline: '' })

  console.log('ProjectsPage user object:', user)
  const isManager = user?.role === 'manager'

  function authHeaders() {
    const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function load() {
    try {
      const [projectsRes, tasksRes, entriesRes, teamsRes, peopleRes] = await Promise.all([
        axios.get('/api/projects', { headers: authHeaders() }),
        axios.get('/api/tasks', { headers: authHeaders() }),
        axios.get('/api/entries', { headers: authHeaders() }),
        axios.get('/api/teams', { headers: authHeaders() }),
        axios.get('/api/people', { headers: authHeaders() })
      ])
      setProjects(projectsRes.data.projects || [])
      setTasks(tasksRes.data.tasks || [])
      setEntries(entriesRes.data.entries || [])
      setTeams(teamsRes.data.teams || [])
      setPeople(peopleRes.data.people || [])
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
      const projectRes = await axios.post('/api/projects', { name, description, deadline: deadline || null }, { headers: authHeaders() })
      const newProjectId = projectRes.data.project?.id
      
      // Create tasks for each selected team to link them to the project
      if (newProjectId && selectedTeams.length > 0) {
        for (const teamId of selectedTeams) {
          await axios.post('/api/tasks', {
            title: `${name} - Team Setup`,
            projectId: newProjectId,
            teamId: teamId,
            status: 'open'
          }, { headers: authHeaders() })
        }
      }
      
      setName('')
      setDescription('')
      setDeadline('')
      setSelectedTeams([])
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Create failed')
    } finally { setSaving(false) }
  }

  function toggleTeamSelection(teamId) {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
  }

  function openEditForm(project) {
    setEditingProject(project)
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      deadline: project.deadline ? new Date(project.deadline).toISOString().slice(0, 16) : ''
    })
  }

  function closeEditForm() {
    setEditingProject(null)
    setEditForm({ name: '', description: '', deadline: '' })
  }

  async function updateProject(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await axios.patch(`/api/projects/${editingProject.id}`, {
        name: editForm.name,
        description: editForm.description,
        deadline: editForm.deadline || null
      }, { headers: authHeaders() })
      closeEditForm()
      await load()
    } catch (err) {
      setError(err?.response?.data?.error || 'Update failed')
    } finally { setSaving(false) }
  }

  async function deleteProject(projectId) {
    if (!window.confirm('Are you sure you want to delete this project?')) return
    setError(null)
    setSaving(true)
    try {
      await axios.delete(`/api/projects/${projectId}`, { headers: authHeaders() })
      await load()
    } catch (err) {
      setError(err?.response?.data?.error || 'Delete failed')
    } finally { setSaving(false) }
  }

  async function addTaskToProject(e) {
    e.preventDefault()
    setError(null)
    setAddingTask(true)
    try {
      const team = teams.find(t => t.id === newTaskTeam)
      const member = team?.members?.find(m => m.id === newTaskAssignee)
      const assignedPayload = member ? {
        memberId: member.id,
        teamId: team.id,
        name: member.name || member.username || member.email || '',
        username: member.username || null,
        email: member.email || null,
        role: member.role || null,
        age: member.age != null ? member.age : null,
        yearJoined: member.yearJoined != null ? member.yearJoined : null,
        subTask: member.subTask || null
      } : null

      await axios.post('/api/tasks', {
        title: newTaskTitle,
        projectId: selectedProject.id,
        teamId: newTaskTeam || null,
        assignedTo: assignedPayload
      }, { headers: authHeaders() })
      
      setNewTaskTitle('')
      setNewTaskTeam('')
      setNewTaskAssignee('')
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to add task')
    } finally { setAddingTask(false) }
  }

  async function addMemberToProject(e) {
    e.preventDefault()
    setError(null)
    setAddingMember(true)
    try {
      const person = people.find(p => p.email === newMemberEmail)
      if (!person) {
        setError('Person not found')
        setAddingMember(false)
        return
      }

      const newMember = {
        id: person.id,
        name: person.name,
        email: person.email,
        role: newMemberRole,
        addedAt: new Date().toISOString()
      }

      setProjectMembers([...projectMembers, newMember])
      setNewMemberEmail('')
      setNewMemberRole('member')
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to add member')
    } finally { setAddingMember(false) }
  }

  function removeMemberFromProject(memberId) {
    setProjectMembers(projectMembers.filter(m => m.id !== memberId))
  }

  if (selectedTask) {
    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <button onClick={() => setSelectedTask(null)} style={{ padding:'6px 12px' }}>← Back to Project</button>
        </div>
        <TaskDetails taskId={selectedTask} />
      </div>
    )
  }

  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id)
    
    // Calculate project statistics
    const projectEntries = entries.filter(e => {
      const task = tasks.find(t => t.id === e.taskId)
      return task && task.projectId === selectedProject.id
    })
    
    let totalDuration = 0
    let totalBreaks = 0
    projectEntries.forEach(e => {
      if (e.end) {
        const start = new Date(e.start)
        const end = new Date(e.end)
        const hours = (end - start) / (1000 * 60 * 60)
        totalDuration += hours
      }
    })
    
    const formatDuration = (hours) => {
      const h = Math.floor(hours)
      const m = Math.floor((hours - h) * 60)
      return `${h}:${m.toString().padStart(2, '0')}`
    }

    // Get all unique team members from project tasks
    const projectTeamMembers = []
    const seenMembers = new Set()
    
    console.log('Project Tasks:', projectTasks)
    console.log('All Teams:', teams)
    
    projectTasks.forEach(task => {
      if (task.teamId) {
        const team = teams.find(t => t.id === task.teamId)
        console.log('Found team for task:', team)
        if (team) {
          const members = Array.isArray(team.members) ? team.members : []
          console.log('Team members:', members)
          members.forEach(member => {
            const memberId = member.id || member.email || JSON.stringify(member)
            if (!seenMembers.has(memberId)) {
              seenMembers.add(memberId)
              projectTeamMembers.push({
                id: member.id || memberId,
                name: member.name || member.username || member.email || 'Unknown',
                username: member.username || null,
                email: member.email || null,
                role: member.role || 'Member',
                teamName: team.name,
                teamId: team.id
              })
            }
          })
        }
      }
    })
    
    console.log('Project Team Members:', projectTeamMembers)

    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <button onClick={() => setSelectedProject(null)} style={{ padding:'6px 12px' }}>← Back</button>
          <h3 style={{ margin:0 }}>{selectedProject.name}</h3>
        </div>

        <div style={{ display:'flex', gap:16, marginBottom:16, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:24 }}>⏱</span>
            <div>
              <div style={{ fontSize:20, fontWeight:600 }}>{formatDuration(totalDuration)}</div>
              <div style={{ fontSize:12, color:'#888' }}>Duration</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:24 }}>₹</span>
            <div>
              <div style={{ fontSize:20, fontWeight:600 }}>₹ 0.00</div>
              <div style={{ fontSize:12, color:'#888' }}>Total</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:24 }}>💵</span>
            <div>
              <div style={{ fontSize:20, fontWeight:600 }}>₹ 0.00</div>
              <div style={{ fontSize:12, color:'#888' }}>Expenses</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:24 }}>☕</span>
            <div>
              <div style={{ fontSize:20, fontWeight:600 }}>{formatDuration(totalBreaks)}</div>
              <div style={{ fontSize:12, color:'#888' }}>Breaks</div>
            </div>
          </div>
        </div>

        <div style={{ borderBottom:'2px solid #e6e6e6', marginBottom:16 }}>
          <button 
            onClick={() => setActiveTab('tasks')}
            style={{ 
              padding:'12px 24px', 
              border:'none', 
              background:'transparent',
              borderBottom: activeTab === 'tasks' ? '3px solid #ff6b35' : 'none',
              fontWeight: activeTab === 'tasks' ? 600 : 400,
              cursor:'pointer'
            }}
          >
            📋 Tasks
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            style={{ 
              padding:'12px 24px', 
              border:'none', 
              background:'transparent',
              borderBottom: activeTab === 'teams' ? '3px solid #ff6b35' : 'none',
              fontWeight: activeTab === 'teams' ? 600 : 400,
              cursor:'pointer'
            }}
          >
            👥 Teams
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            style={{ 
              padding:'12px 24px', 
              border:'none', 
              background:'transparent',
              borderBottom: activeTab === 'members' ? '3px solid #ff6b35' : 'none',
              fontWeight: activeTab === 'members' ? 600 : 400,
              cursor:'pointer'
            }}
          >
            👤 Members
          </button>
        </div>

        {activeTab === 'tasks' && (
          <div>
            {isManager && (
            <form onSubmit={addTaskToProject} style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              <input 
                placeholder="Task title" 
                value={newTaskTitle} 
                onChange={e=>setNewTaskTitle(e.target.value)} 
                required 
                style={{ padding:8, border:'1px solid #ddd', borderRadius:6, minWidth:200 }} 
              />
              <select 
                value={newTaskTeam} 
                onChange={e=>{setNewTaskTeam(e.target.value); setNewTaskAssignee('')}}
                style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }}
              >
                <option value="">No team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select 
                value={newTaskAssignee} 
                onChange={e=>setNewTaskAssignee(e.target.value)}
                disabled={!newTaskTeam}
                style={{ padding:8, border:'1px solid #ddd', borderRadius:6, minWidth:150 }}
              >
                <option value="">Unassigned</option>
                {newTaskTeam && teams.find(t => t.id === newTaskTeam)?.members?.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.username || m.email || 'Member'}
                    {m.role ? ` • ${m.role}` : ''}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={addingTask} style={{ padding:'8px 12px' }}>
                {addingTask ? 'Adding…' : 'Add Task'}
              </button>
            </form>
            )}
            <table style={{ width:'100%', borderCollapse:'collapse', background:'#fff', border:'1px solid #e6e6e6', borderRadius:8 }}>
              <thead>
                <tr style={{ background:'#fafafa' }}>
                  <th style={{ textAlign:'left', padding:12 }}>Task Name</th>
                  <th style={{ textAlign:'left', padding:12 }}>Description</th>
                  <th style={{ textAlign:'center', padding:12 }}>Status</th>
                  <th style={{ textAlign:'center', padding:12 }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {projectTasks.length > 0 ? (
                  projectTasks.map(task => (
                    <tr 
                      key={task.id} 
                      onClick={() => setSelectedTask(task.id)} 
                      style={{ cursor:'pointer', transition:'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding:12, borderBottom:'1px solid #f1f1f1' }}>{task.title}</td>
                      <td style={{ padding:12, borderBottom:'1px solid #f1f1f1' }}>{task.description || '—'}</td>
                      <td style={{ padding:12, borderBottom:'1px solid #f1f1f1', textAlign:'center' }}>
                        <span style={{ 
                          padding:'4px 8px', 
                          borderRadius:4, 
                          fontSize:12,
                          background: task.status === 'done' ? '#d4edda' : task.status === 'in-progress' ? '#fff3cd' : '#e2e3e5',
                          color: task.status === 'done' ? '#155724' : task.status === 'in-progress' ? '#856404' : '#383d41'
                        }}>
                          {task.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ padding:12, borderBottom:'1px solid #f1f1f1', textAlign:'center' }}>
                        {task.priority || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding:20, textAlign:'center', color:'#888' }}>No tasks found for this project</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'teams' && (
          <div>
            <table style={{ width:'100%', borderCollapse:'collapse', background:'#fff', border:'1px solid #e6e6e6', borderRadius:8 }}>
              <thead>
                <tr style={{ background:'#fafafa' }}>
                  <th style={{ textAlign:'left', padding:12 }}>Team Name</th>
                  <th style={{ textAlign:'left', padding:12 }}>Description</th>
                  <th style={{ textAlign:'center', padding:12 }}>Members</th>
                  <th style={{ textAlign:'center', padding:12 }}>Tasks</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Get unique teams from project tasks
                  const projectTeamIds = new Set()
                  projectTasks.forEach(task => {
                    if (task.teamId) {
                      projectTeamIds.add(task.teamId)
                    }
                  })
                  
                  const projectTeams = teams.filter(t => projectTeamIds.has(t.id))
                  
                  if (projectTeams.length === 0) {
                    return (
                      <tr>
                        <td colSpan={4} style={{ padding:20, textAlign:'center', color:'#888' }}>
                          No teams assigned to this project. Add tasks with teams to see them here.
                        </td>
                      </tr>
                    )
                  }
                  
                  return projectTeams.map(team => {
                    const teamTaskCount = projectTasks.filter(t => t.teamId === team.id).length
                    const memberCount = Array.isArray(team.members) ? team.members.length : 0
                    
                    return (
                      <tr key={team.id}>
                        <td style={{ padding:12, borderBottom:'1px solid #f1f1f1' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ 
                              width:12, 
                              height:12, 
                              borderRadius:'50%', 
                              background: team.color || '#4f46e5' 
                            }} />
                            <strong>{team.name}</strong>
                          </div>
                        </td>
                        <td style={{ padding:12, borderBottom:'1px solid #f1f1f1' }}>
                          {team.description || '—'}
                        </td>
                        <td style={{ padding:12, borderBottom:'1px solid #f1f1f1', textAlign:'center' }}>
                          <span style={{ 
                            padding:'4px 12px', 
                            borderRadius:12, 
                            fontSize:13,
                            background: '#f3f4f6',
                            color: '#374151',
                            fontWeight: 500
                          }}>
                            {memberCount}
                          </span>
                        </td>
                        <td style={{ padding:12, borderBottom:'1px solid #f1f1f1', textAlign:'center' }}>
                          <span style={{ 
                            padding:'4px 12px', 
                            borderRadius:12, 
                            fontSize:13,
                            background: '#dbeafe',
                            color: '#1e40af',
                            fontWeight: 500
                          }}>
                            {teamTaskCount}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            <table style={{ width:'100%', borderCollapse:'collapse', background:'#fff', border:'1px solid #e6e6e6', borderRadius:8 }}>
              <thead>
                <tr style={{ background:'#fafafa' }}>
                  <th style={{ textAlign:'left', padding:12 }}>Name</th>
                  <th style={{ textAlign:'left', padding:12 }}>E-Mail</th>
                  <th style={{ textAlign:'left', padding:12 }}>Role</th>
                  <th style={{ textAlign:'left', padding:12 }}>Team</th>
                </tr>
              </thead>
              <tbody>
                {projectTeamMembers.length > 0 ? (
                  projectTeamMembers.map((member, index) => (
                    <tr key={member.id || index}>
                      <td style={{ padding:12, borderBottom:'1px solid #f1f1f1' }}>
                        {member.name || member.username || '—'}
                      </td>
                      <td style={{ padding:12, borderBottom:'1px solid #f1f1f1' }}>
                        {member.email || '—'}
                      </td>
                      <td style={{ padding:12, borderBottom:'1px solid #f1f1f1' }}>
                        <span style={{ 
                          padding:'4px 8px', 
                          borderRadius:4, 
                          fontSize:12,
                          background: '#e0e7ff',
                          color: '#3730a3'
                        }}>
                          {member.role || 'Member'}
                        </span>
                      </td>
                      <td style={{ padding:12, borderBottom:'1px solid #f1f1f1' }}>
                        {member.teamName || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding:20, textAlign:'center', color:'#888' }}>
                      No team members found. Add tasks with teams to see members here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ margin:'8px 0' }}>Projects</h3>
      <div style={{ marginBottom:12, padding:8, background:'#f0f0f0', borderRadius:4, fontSize:12 }}>
        User Role: <strong>{user?.role || 'unknown'}</strong> | Manager Access: <strong>{isManager ? 'YES' : 'NO'}</strong>
      </div>
      {isManager ? (
      <form onSubmit={addProject} style={{ marginBottom:12 }}>
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <input placeholder="Project name" value={name} onChange={e=>setName(e.target.value)} required style={{ padding:8, border:'1px solid #ddd', borderRadius:6, minWidth:200 }} />
          <input placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)} style={{ flex:1, padding:8, border:'1px solid #ddd', borderRadius:6 }} />
          <input type="datetime-local" placeholder="Deadline" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{ padding:8, border:'1px solid #ddd', borderRadius:6, minWidth:180 }} />
          <button type="submit" disabled={saving} style={{ padding:'8px 12px' }}>{saving ? 'Adding…' : 'Add Project'}</button>
        </div>
        {teams.length > 0 && (
          <div style={{ marginBottom:8 }}>
            <label style={{ display:'block', fontSize:13, color:'#555', marginBottom:6 }}>Select teams for this project:</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {teams.map(team => (
                <label key={team.id} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', border:'1px solid #ddd', borderRadius:6, cursor:'pointer', background: selectedTeams.includes(team.id) ? '#e0e7ff' : '#fff' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedTeams.includes(team.id)}
                    onChange={() => toggleTeamSelection(team.id)}
                  />
                  <span style={{ fontSize:13 }}>{team.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </form>
      ) : (
        <div style={{ padding:12, background:'#fff3cd', borderRadius:6, marginBottom:12, fontSize:13 }}>
          You need manager access to create projects. Contact your administrator.
        </div>
      )}
      {error && <div style={{ color:'crimson', marginBottom:8 }}>{error}</div>}
      <div style={{ background:'#fff', border:'1px solid #e6e6e6', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#fafafa' }}>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Name</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Description</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Deadline</th>
              {isManager && <th style={{ textAlign:'center', padding:8, borderBottom:'1px solid #eee', width:120 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id}>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1', cursor:'pointer' }} onClick={() => setSelectedProject(p)}>{p.name}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1', cursor:'pointer' }} onClick={() => setSelectedProject(p)}>{p.description || '—'}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1', cursor:'pointer' }} onClick={() => setSelectedProject(p)}>
                  {p.deadline ? new Date(p.deadline).toLocaleString() : '—'}
                </td>
                {isManager && (
                  <td style={{ padding:8, borderBottom:'1px solid #f1f1f1', textAlign:'center' }}>
                    <button onClick={(e) => { e.stopPropagation(); openEditForm(p); }} style={{ padding:'4px 8px', marginRight:4, fontSize:12 }}>Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} style={{ padding:'4px 8px', fontSize:12, background:'#dc2626', color:'white', border:'none', borderRadius:4, cursor:'pointer' }}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
              {!projects.length && (
                <tr><td colSpan={isManager ? 4 : 3} style={{ padding:12 }}>No projects yet. {isManager ? 'Add one above.' : 'Contact a manager to create projects.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingProject && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'white', padding:24, borderRadius:8, minWidth:400, maxWidth:600 }}>
            <h3 style={{ margin:'0 0 16px 0' }}>Edit Project</h3>
            <form onSubmit={updateProject}>
              <div style={{ marginBottom:12 }}>
                <label style={{ display:'block', fontSize:13, marginBottom:4 }}>Project Name</label>
                <input 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  required 
                  style={{ width:'100%', padding:8, border:'1px solid #ddd', borderRadius:6 }} 
                />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ display:'block', fontSize:13, marginBottom:4 }}>Description</label>
                <input 
                  value={editForm.description} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})} 
                  style={{ width:'100%', padding:8, border:'1px solid #ddd', borderRadius:6 }} 
                />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ display:'block', fontSize:13, marginBottom:4 }}>Deadline</label>
                <input 
                  type="datetime-local" 
                  value={editForm.deadline} 
                  onChange={e => setEditForm({...editForm, deadline: e.target.value})} 
                  style={{ width:'100%', padding:8, border:'1px solid #ddd', borderRadius:6 }} 
                />
              </div>
              {error && <div style={{ color:'crimson', marginBottom:12 }}>{error}</div>}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={closeEditForm} style={{ padding:'8px 16px' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:'8px 16px', background:'#4f46e5', color:'white', border:'none', borderRadius:6, cursor:'pointer' }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
