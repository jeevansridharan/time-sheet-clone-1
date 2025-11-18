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

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get('/api/teams', { headers })
      setTeams(res.data.teams || [])
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

  return (
    <div className="workflow-board">
      {ROLES.map(role => (
        <div key={role.key} className="workflow-column">
          <header className="workflow-column-header">
            <h4>{role.label}</h4>
            <p>{role.description}</p>
          </header>
          <div className="workflow-cards">
            {teams.map(team => {
              const wf = normalizeWorkflow(team)
              const isEditing = editing && editing.teamId === team.id && editing.role === role.key
              return (
                <div key={team.id} className="workflow-card">
                  <div className="workflow-card-title">{team.name}</div>
                  {isEditing ? (
                    <div className="workflow-edit">
                      <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        rows={4}
                        placeholder={`Describe the ${role.label.toLowerCase()} workflow for ${team.name}`}
                      />
                      <div className="workflow-edit-actions">
                        <button type="button" onClick={saveEdit} disabled={saving}>
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" onClick={cancelEdit} disabled={saving}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="workflow-card-body">
                        {wf[role.key] ? wf[role.key] : <span className="workflow-empty">No details yet</span>}
                      </div>
                      <button
                        type="button"
                        className="workflow-edit-btn"
                        onClick={() => startEdit(team.id, role.key)}
                      >Edit</button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
