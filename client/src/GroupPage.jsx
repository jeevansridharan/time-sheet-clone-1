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

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ margin: '0 0 20px 0' }}>Groups</h3>
      
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
              
              {memberCount > 0 && (
                <div>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 600, 
                    color: '#555', 
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Members
                  </div>
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
                </div>
              )}
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
