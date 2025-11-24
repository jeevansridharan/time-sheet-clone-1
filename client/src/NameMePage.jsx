import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { DateTime } from 'luxon'

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function NameMePage() {
  const headers = useAuthHeaders()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [shiftName, setShiftName] = useState('General')
  const [startTime, setStartTime] = useState('9:00 AM')
  const [endTime, setEndTime] = useState('6:00 PM')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await axios.get('/me', { headers })
        if (!mounted) return
        console.log('User data:', res.data.user)
        setUser(res.data.user)
        
        // Load saved schedule from localStorage
        const savedSchedule = localStorage.getItem('work_schedule')
        if (savedSchedule) {
          const schedule = JSON.parse(savedSchedule)
          setShiftName(schedule.shiftName || 'General')
          setStartTime(schedule.startTime || '9:00 AM')
          setEndTime(schedule.endTime || '6:00 PM')
        }
      } catch (err) {
        console.error('Failed to load user', err)
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [headers.Authorization])

  const handleSaveSchedule = () => {
    const schedule = { shiftName, startTime, endTime }
    localStorage.setItem('work_schedule', JSON.stringify(schedule))
    setEditing(false)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getWeekDays = () => {
    const today = DateTime.now()
    const startOfWeek = today.startOf('week') // Monday
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = startOfWeek.plus({ days: i })
      days.push({
        date: day,
        dayNum: day.day,
        dayName: day.toFormat('ccc'),
        isWeekend: day.weekday === 6 || day.weekday === 7,
        isToday: day.hasSame(today, 'day')
      })
    }
    return days
  }

  const weekDays = getWeekDays()
  const startDate = weekDays[0].date.toFormat('dd-LLL-yyyy')
  const endDate = weekDays[6].date.toFormat('dd-LLL-yyyy')

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>

  return (
    <div style={{ padding: '20px', maxWidth: '1200px' }}>
      {/* Greeting Section */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
              {getGreeting()} {user?.name || 'User'}
            </h2>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              Have a productive day!
            </p>
          </div>
          <div style={{ fontSize: '48px' }}>
            {new Date().getHours() < 18 ? '☀️' : '🌙'}
          </div>
        </div>
      </div>

      {/* Work Schedule Section */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>🕐</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Work Schedule</h3>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
              {startDate} - {endDate}
            </p>
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          background: '#f9f9f9', 
          borderRadius: '6px',
          borderLeft: '4px solid #4f46e5',
          marginBottom: '20px'
        }}>
          {editing ? (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  Shift Name
                </label>
                <input 
                  type="text"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    Start Time
                  </label>
                  <input 
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="9:00 AM"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    End Time
                  </label>
                  <input 
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="6:00 PM"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleSaveSchedule}
                  style={{
                    padding: '6px 16px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Save
                </button>
                <button 
                  onClick={() => setEditing(false)}
                  style={{
                    padding: '6px 16px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{shiftName}</div>
                <button 
                  onClick={() => setEditing(true)}
                  style={{
                    padding: '4px 12px',
                    background: 'transparent',
                    color: '#4f46e5',
                    border: '1px solid #4f46e5',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Edit
                </button>
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>{startTime} - {endTime}</div>
            </div>
          )}
        </div>

        {/* Week Timeline */}
        <div style={{ position: 'relative', paddingTop: '10px' }}>
          {/* Timeline Line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '0',
            right: '0',
            height: '2px',
            background: '#e0e0e0',
            zIndex: 0
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {weekDays.map((day, idx) => (
              <div key={idx} style={{ 
                flex: 1, 
                textAlign: 'center',
                position: 'relative'
              }}>
                {/* Timeline Dot */}
                <div style={{
                  width: day.isToday ? '12px' : '8px',
                  height: day.isToday ? '12px' : '8px',
                  borderRadius: '50%',
                  background: day.isToday ? '#4f46e5' : '#e0e0e0',
                  margin: '0 auto 16px auto',
                  position: 'relative',
                  zIndex: 1
                }} />
                
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                  {day.dayName} {day.dayNum}
                </div>
                {day.isWeekend && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#ff9900', 
                    marginTop: '4px',
                    fontWeight: '500'
                  }}>
                    Weekend
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
