import React, { useMemo, useState, useEffect } from 'react'
import { DateTime } from 'luxon'
import axios from 'axios'

function authHeaders() {
  const token = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Simple week grid (read-only placeholder similar to screenshot)
export default function WeekCalendar({ weekStart, user }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i })), [weekStart])
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => 7 + i), []) // 07:00..18:00
  const [projects, setProjects] = useState([])

  useEffect(() => {
    async function loadProjects() {
      try {
        const token = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
        if (!token) {
          console.log('WeekCalendar - No token found')
          return
        }
        const res = await axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
          console.log('WeekCalendar - Loaded projects:', res.data.projects)
          const projectsWithDeadlines = (res.data.projects || []).filter(p => p.deadline)
          console.log('WeekCalendar - Projects with deadlines:', projectsWithDeadlines)
          setProjects(res.data.projects || [])
      } catch (err) {
        console.error('Failed to load projects:', err.response?.status, err.response?.data)
      }
    }
    loadProjects()
  }, [weekStart])

  // Filter projects with deadlines in this week
  const weekProjects = useMemo(() => {
    const weekEnd = weekStart.plus({ days: 6 })
    return projects.filter(p => {
      if (!p.deadline) return false
      const deadlineDate = DateTime.fromISO(p.deadline)
      return deadlineDate >= weekStart && deadlineDate <= weekEnd.endOf('day')
    })
  }, [projects, weekStart])

  return (
    <div className="wk-root">
      <div className="wk-header">
        <div className="wk-cell wk-corner">W {weekStart.weekNumber}</div>
        {days.map(d => {
          const dayProjects = weekProjects.filter(p => {
            const deadlineDate = DateTime.fromISO(p.deadline)
            return deadlineDate.toISODate() === d.toISODate()
          })
          return (
            <div key={d.toISODate()} className="wk-cell wk-day">
              <div className="wk-day-name">{d.toFormat('ccc dd.LL')}</div>
              <div className="wk-day-total">0:00</div>
              {dayProjects.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {dayProjects.map(p => (
                    <div 
                      key={p.id} 
                      style={{ 
                        fontSize: 10, 
                        padding: '2px 4px', 
                        background: '#dc2626', 
                        color: 'white', 
                        borderRadius: 3, 
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={`${p.name} - Deadline: ${DateTime.fromISO(p.deadline).toFormat('MMM dd, HH:mm')}`}
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
      <div className="wk-body">
        {hours.map(h => (
          <div key={h} className="wk-row">
            <div className="wk-hour">{String(h).padStart(2,'0')}:00</div>
            {days.map(d => (
              <div key={d.toISODate()} className="wk-slot" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
