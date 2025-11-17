import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DateTime } from 'luxon'

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function TeamsPage() {
  const headers = useAuthHeaders()
  const [teams, setTeams] = useState([])
  const [entries, setEntries] = useState([])
  const [name, setName] = useState('')
  const [deadline, setDeadline] = useState('')
  const [newMembers, setNewMembers] = useState('') // comma-separated
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [addingForId, setAddingForId] = useState(null)
  const [newMemberName, setNewMemberName] = useState('')

  async function load() {
    try {
      const [tr, er] = await Promise.all([
        axios.get('/api/teams', { headers }),
        axios.get('/api/entries', { headers })
      ])
      setTeams(tr.data.teams || [])
      setEntries(er.data.entries || [])
    } catch (e) { setError('Failed to load teams') }
  }

  useEffect(() => { load() }, [])

  async function addTeam(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const members = newMembers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      await axios.post('/api/teams', { name, deadline: deadline || null, members }, { headers })
      setName('')
      setDeadline('')
      setNewMembers('')
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Create failed')
    } finally { setSaving(false) }
  }

  const hoursByTeam = useMemo(() => {
    const t = {}
    for (const e of entries) {
      if (!e.end) continue
      const key = e.teamId || 'none'
      const s = DateTime.fromISO(e.start)
      const en = DateTime.fromISO(e.end)
      const h = Math.max(0, en.diff(s,'hours').hours)
      t[key] = (t[key] || 0) + h
    }
    return t
  }, [entries])

  function viewTimeline(teamId) {
    // persist selection and go to dashboard/day
    if (teamId) localStorage.setItem('ts_selectedTeam', teamId)
    else localStorage.removeItem('ts_selectedTeam')
    window.location.hash = '#/dashboard'
  }

  function startAddMember(team) {
    setAddingForId(team.id)
    setNewMemberName('')
  }

  async function addMember(team) {
    const current = Array.isArray(team.members) ? team.members.slice() : []
    const name = newMemberName.trim()
    if (!name) return
    if (current.includes(name)) { setAddingForId(null); setNewMemberName(''); return }
    try {
      setSaving(true)
      const members = [...current, name]
      await axios.patch(`/api/teams/${team.id}`, { members }, { headers })
      setAddingForId(null)
      setNewMemberName('')
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Update failed')
    } finally { setSaving(false) }
  }

  async function removeMember(team, name) {
    try {
      setSaving(true)
      const current = Array.isArray(team.members) ? team.members : []
      const members = current.filter(m => m !== name)
      await axios.patch(`/api/teams/${team.id}`, { members }, { headers })
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Update failed')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <h3 style={{ margin:'8px 0' }}>Teams</h3>
      <form onSubmit={addTeam} style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input placeholder="Team name" value={name} onChange={e=>setName(e.target.value)} required style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <input placeholder="Members (comma separated)" value={newMembers} onChange={e=>setNewMembers(e.target.value)} style={{ padding:8, border:'1px solid #ddd', borderRadius:6, minWidth:220 }} />
        <button type="submit" disabled={saving} style={{ padding:'8px 12px' }}>{saving ? 'Adding…' : 'Add Team'}</button>
      </form>
      {error && <div style={{ color:'crimson', marginBottom:8 }}>{error}</div>}

      <div style={{ background:'#fff', border:'1px solid #e6e6e6', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#fafafa' }}>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Team</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Time (h)</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Timeline</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(t => (
              <tr key={t.id}>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1', maxWidth:420 }}>
                  <div style={{ fontWeight:600, marginBottom:6 }}>
                    {t.name}
                    <span style={{ fontWeight:400, color:'#777', marginLeft:8 }}>
                      • {(Array.isArray(t.members)? t.members.length : 0)} member{(Array.isArray(t.members)? t.members.length : 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                    {(Array.isArray(t.members) ? t.members : []).map(m => (
                      <span key={m} style={{ background:'#f2f2f2', border:'1px solid #e5e5e5', borderRadius:12, padding:'2px 8px', display:'inline-flex', alignItems:'center', gap:6 }}>
                        {m}
                        <button type="button" onClick={()=>removeMember(t, m)} style={{ border:'none', background:'transparent', cursor:'pointer', color:'#888' }} title="Remove">×</button>
                      </span>
                    ))}
                    {addingForId === t.id ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                        <input value={newMemberName} onChange={e=>setNewMemberName(e.target.value)} placeholder="Name" style={{ padding:6, border:'1px solid #ddd', borderRadius:6 }} />
                        <button type="button" disabled={saving} onClick={()=>addMember(t)} style={{ padding:'4px 8px' }}>Add</button>
                        <button type="button" onClick={()=>{ setAddingForId(null); setNewMemberName('') }} style={{ padding:'4px 8px' }}>Cancel</button>
                      </span>
                    ) : (
                      <button type="button" onClick={()=>startAddMember(t)} style={{ padding:'4px 8px' }}>+ Member</button>
                    )}
                  </div>
                </td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{(hoursByTeam[t.id] || 0).toFixed(2)}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>
                  <button onClick={()=>viewTimeline(t.id)}>View Timeline</button>
                </td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{t.deadline ? DateTime.fromISO(t.deadline).toFormat('dd LLL yyyy') : '—'}</td>
              </tr>
            ))}
            {!teams.length && (
              <tr><td colSpan={4} style={{ padding:12 }}>No teams yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
