import React, { useMemo, useState, useEffect } from 'react'
import { DateTime } from 'luxon'

function authHeaders() {
  const token = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function MonthCalendar({ monthStart, user }) {
  // monthStart is startOf('month')
  const start = monthStart.startOf('week') // show full weeks
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => start.plus({ days: i })), [start])
  const todayIso = DateTime.now().toISODate()
  const monthIso = monthStart.toISO().slice(0,7)
  const [projects, setProjects] = useState([])

  useEffect(() => {
    async function loadProjects() {
      try {
        const token = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
        if (!token) {
          console.log('MonthCalendar - No token found')
          return
        }
        const res = await axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
          console.log('MonthCalendar - Loaded projects:', res.data.projects)
          const projectsWithDeadlines = (res.data.projects || []).filter(p => p.deadline)
          console.log('MonthCalendar - Projects with deadlines:', projectsWithDeadlines)
          setProjects(res.data.projects || [])
      } catch (err) {
        console.error('Failed to load projects:', err.response?.status, err.response?.data)
      }
    }
    loadProjects()
  }, [monthStart])

  const projectsWithDeadlines = projects.filter(p => p.deadline)

  return (
    <div className="mc-root">
      <div style={{ padding: 8, background: '#ffeb3b', marginBottom: 8, fontSize: 12, border: '2px solid red' }}>
        DEBUG: Total projects: {projects.length} | With deadlines: {projectsWithDeadlines.length}
        {projectsWithDeadlines.length > 0 && (
          <div>Projects: {projectsWithDeadlines.map(p => `${p.name} (${p.deadline})`).join(' | ')}</div>
        )}
      </div>
      <div className="mc-header">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="mc-head-cell">{d}</div>
        ))}
      </div>
      <div className="mc-grid">
        {days.map(d => {
          const inMonth = d.toISO().slice(0,7) === monthIso
          const isToday = d.toISODate() === todayIso
          const dayProjects = projects.filter(p => {
            if (!p.deadline) return false
            const deadlineDate = DateTime.fromISO(p.deadline)
            const dayIso = d.toISODate()
            const deadlineIso = deadlineDate.toISODate()
            if (deadlineIso === dayIso) {
              console.log('Match found!', p.name, 'deadline:', deadlineIso, 'day:', dayIso)
            }
            return deadlineIso === dayIso
          })
          return (
            <div key={d.toISO()} className={`mc-cell ${inMonth ? '' : 'dim'} ${isToday ? 'today' : ''}`}>
              <div className="mc-daynum">{d.toFormat('d')}</div>
              {dayProjects.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {dayProjects.map(p => (
                    <div 
                      key={p.id} 
                      style={{ 
                        fontSize: 11, 
                        padding: '3px 5px', 
                        background: '#dc2626', 
                        color: 'white', 
                        borderRadius: 4, 
                        marginBottom: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                      title={`${p.name} - Deadline: ${DateTime.fromISO(p.deadline).toFormat('MMM dd, yyyy HH:mm')}`}
                    >
                      📅 {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
