import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const ROLES = [
  { key: 'leader', label: 'Team Leader', description: 'Primary owner for coordination and approvals.' },
  { key: 'developer', label: 'Developer', description: 'Handles the core implementation tasks.' },
  { key: 'junior', label: 'Junior', description: 'Supports delivery, QA checks, and assists the team.' }
]

function normalizeWorkflow(team) {
  const wf = (team && typeof team === 'object' && team.workflow) || {}
  return {
    leader: (wf.leader || '').trim(),
    developer: (wf.developer || '').trim(),
    junior: (wf.junior || '').trim()
  }
}

export default function WorkflowBoard() {
  const headers = useAuthHeaders()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null) // { teamId, role }
  const [draft, setDraft] = useState('')
  const [selectedTeam, setSelectedTeam] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const teamsRes = await axios.get('/api/teams', { headers })
      setTeams(teamsRes.data.teams || [])
    } catch (e) {
      setError('Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const teamsById = useMemo(() => {
    const map = new Map()
    for (const team of teams) map.set(team.id, team)
    return map
  }, [teams])

  function startEdit(teamId, role) {
    const team = teamsById.get(teamId)
    if (!team) return
    const wf = normalizeWorkflow(team)
    setEditing({ teamId, role })
    setDraft(wf[role] || '')
  }

  function cancelEdit() {
    setEditing(null)
    setDraft('')
  }

  async function saveEdit() {
    if (!editing) return
    const { teamId, role } = editing
    const team = teamsById.get(teamId)
    if (!team) return
    const wf = normalizeWorkflow(team)
    const payload = { ...wf, [role]: draft.trim() }
    try {
      setSaving(true)
      await axios.patch(`/api/teams/${teamId}`, { workflow: payload }, { headers })
      cancelEdit()
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to update workflow')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading workflows…</div>
  if (error) return <div style={{ color: 'crimson' }}>{error}</div>
  if (!teams.length) return <div>No teams yet. Create a team first to define its workflow.</div>

  // Count projects per team
  const projectsByTeam = {}
  teams.forEach(team => {
    const teamId = team.id
    if (teamId) {
      projectsByTeam[teamId] = (projectsByTeam[teamId] || 0) + 1
    }
  })

  return (
    <div className="workflow-board">
      <div className="workflow-teams-list" style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>Teams Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {teams.map(team => {
            const projectCount = projectsByTeam[team.id] || 0
            const members = team.members || []
            const isSelected = selectedTeam?.id === team.id
            return (
              <div 
                key={team.id} 
                style={{ 
                  padding: '16px', 
                  background: 'white', 
                  border: isSelected ? '2px solid #007bff' : '1px solid #dee2e6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 4px 12px rgba(0,123,255,0.15)' : '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onClick={() => setSelectedTeam(isSelected ? null : team)}
              >
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{team.name}</h4>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>
                    {projectCount} {projectCount === 1 ? 'project' : 'projects'} • {members.length} {members.length === 1 ? 'member' : 'members'}
                  </div>
                </div>
                {isSelected && members.length > 0 && (
                  <div style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid #e9ecef'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>Team Members:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {members.map((member, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            background: '#f8f9fa',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        >
                          <span style={{ fontWeight: '500' }}>{member.name || member.email || 'Unknown'}</span>
                          <span style={{ 
                            padding: '2px 8px',
                            background: '#007bff',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}>
                            {member.role || 'Member'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isSelected && members.length === 0 && (
                  <div style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid #e9ecef',
                    fontSize: '13px',
                    color: '#6c757d',
                    fontStyle: 'italic'
                  }}>
                    No members in this team yet
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
