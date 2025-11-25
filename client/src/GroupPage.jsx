import React, { useEffect, useState } from 'react'
import axios from 'axios'

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function GroupPage() {
  const headers = useAuthHeaders()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4f46e5'
  })
  const [addingMemberTo, setAddingMemberTo] = useState(null)
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    role: ''
  })

  async function loadTeams() {
    try {
      const res = await axios.get('/api/teams', { headers })
      setTeams(res.data.teams || [])
    } catch (err) {
      setError('Failed to load groups')
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await axios.get('/api/teams', { headers })
        if (!mounted) return
        setTeams(res.data.teams || [])
      } catch (err) {
        if (!mounted) return
        setError('Failed to load groups')
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await axios.post('/api/teams', {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        members: []
      }, { headers })
      
      setFormData({ name: '', description: '', color: '#4f46e5' })
      setShowForm(false)
      await loadTeams()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create group')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMember(teamId) {
    if (!memberForm.name) {
      setError('Member name is required')
      return
    }
    
    setError(null)
    setSaving(true)
    try {
      const team = teams.find(t => t.id === teamId)
      const currentMembers = team.members || []
      
      const newMember = {
        id: Date.now().toString(),
        name: memberForm.name,
        email: memberForm.email || null,
        role: memberForm.role || null,
        username: memberForm.email || null
      }
      
      await axios.patch(`/api/teams/${teamId}`, {
        members: [...currentMembers, newMember]
      }, { headers })
      
      setMemberForm({ name: '', email: '', role: '' })
      setAddingMemberTo(null)
      await loadTeams()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Groups</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ 
            padding: '8px 16px', 
            background: '#4f46e5', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          {showForm ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {showForm && (
        <div style={{ 
          background: 'white', 
          border: '1px solid #e6e6e6', 
          borderRadius: 8, 
          padding: 20, 
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Create New Group</h4>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>
                Group Name *
              </label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Enter group name"
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  border: '1px solid #ddd', 
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter group description (optional)"
                rows={3}
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  border: '1px solid #ddd', 
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  style={{ width: 50, height: 35, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: '#666' }}>{formData.color}</span>
              </div>
            </div>
            {error && <div style={{ color: 'crimson', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                type="submit" 
                disabled={saving}
                style={{ 
                  padding: '8px 16px', 
                  background: '#4f46e5', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                {saving ? 'Creating...' : 'Create Group'}
              </button>
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                style={{ 
                  padding: '8px 16px', 
                  background: '#f0f0f0', 
                  color: '#333', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {teams.map(team => {
          const memberCount = Array.isArray(team.members) ? team.members.length : 0
          
          return (
            <div 
              key={team.id} 
              style={{ 
                background: 'white', 
                border: '1px solid #e6e6e6', 
                borderRadius: 8,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div 
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    background: team.color || '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 18,
                    fontWeight: 600
                  }}
                >
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{team.name}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#888' }}>
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </p>
                </div>
              </div>
              
              {team.description && (
                <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#666' }}>
                  {team.description}
                </p>
              )}
              
              <div>
                <div style={{ 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: '#555', 
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Members</span>
                  <button
                    onClick={() => setAddingMemberTo(addingMemberTo === team.id ? null : team.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textTransform: 'none',
                      letterSpacing: 'normal'
                    }}
                  >
                    {addingMemberTo === team.id ? 'Cancel' : '+ Add'}
                  </button>
                </div>
                
                {addingMemberTo === team.id && (
                  <div style={{ 
                    padding: 12, 
                    background: '#f9f9f9', 
                    borderRadius: 6, 
                    marginBottom: 8,
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="Member name *"
                        value={memberForm.name}
                        onChange={(e) => setMemberForm({...memberForm, name: e.target.value})}
                        style={{
                          width: '100%',
                          padding: 6,
                          fontSize: 12,
                          border: '1px solid #ddd',
                          borderRadius: 4
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={memberForm.email}
                        onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                        style={{
                          width: '100%',
                          padding: 6,
                          fontSize: 12,
                          border: '1px solid #ddd',
                          borderRadius: 4
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="Role (optional)"
                        value={memberForm.role}
                        onChange={(e) => setMemberForm({...memberForm, role: e.target.value})}
                        style={{
                          width: '100%',
                          padding: 6,
                          fontSize: 12,
                          border: '1px solid #ddd',
                          borderRadius: 4
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleAddMember(team.id)}
                      disabled={saving}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        fontSize: 12,
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      {saving ? 'Adding...' : 'Add Member'}
                    </button>
                  </div>
                )}
                
                {memberCount > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {team.members.slice(0, 5).map((member, idx) => (
                      <div 
                        key={idx}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          padding: '6px 8px',
                          background: '#f9f9f9',
                          borderRadius: 4
                        }}
                      >
                        <div style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          background: '#e0e7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#4f46e5'
                        }}>
                          {(member.name || member.username || member.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.name || member.username || member.email || 'Unknown'}
                          </div>
                          {member.role && (
                            <div style={{ fontSize: 11, color: '#666' }}>
                              {member.role}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {memberCount > 5 && (
                      <div style={{ fontSize: 12, color: '#888', padding: '4px 8px' }}>
                        +{memberCount - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {teams.length === 0 && (
        <div style={{ 
          padding: 40, 
          textAlign: 'center', 
          background: '#f9f9f9', 
          borderRadius: 8,
          color: '#666'
        }}>
          No groups found. Create teams to see them here.
        </div>
      )}
    </div>
  )
}
