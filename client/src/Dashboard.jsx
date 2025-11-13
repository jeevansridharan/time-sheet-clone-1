import React, { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import VerticalTimeline from './VerticalTimeline'
import WeekCalendar from './WeekCalendar'
import StatsPanel from './StatsPanel'
import Sidebar from './Sidebar'
import HeaderBar from './HeaderBar'
import NewEntryModal from './NewEntryModal'
import TimesList from './TimesList'
import ProjectsPage from './ProjectsPage'
import TasksPage from './TasksPage'

// Dashboard replicates layout similar to reference screenshot: sidebar, header, content tabs.

export default function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('calendar') // 'calendar' | 'timeline'
  const [weekStart, setWeekStart] = useState(DateTime.now().startOf('week')) // Monday by default (luxon startOf('week'))
  const [route, setRoute] = useState('dashboard') // dashboard | times | tasks | projects | expenses | reports | configuration
  const [showNew, setShowNew] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // simple hash-based routing so sidebar links work without server changes
  useEffect(() => {
    function parseHash() {
      const h = (window.location.hash || '').replace(/^#\/?/, '')
      const seg = h.split('/')[0]
      setRoute(seg || 'dashboard')
    }
    parseHash()
    window.addEventListener('hashchange', parseHash)
    return () => window.removeEventListener('hashchange', parseHash)
  }, [])

  function goWeek(delta) {
    setWeekStart(ws => ws.plus({ weeks: delta }).startOf('week'))
  }

  function toToday() {
    setWeekStart(DateTime.now().startOf('week'))
  }

  const weekEnd = weekStart.plus({ days: 6 })
  const rangeLabel = `${weekStart.toFormat('LLL dd')} – ${weekEnd.toFormat('LLL dd, yyyy')}`

  function onCreatedEntry() {
    setShowNew(false)
    setRefreshKey(k => k + 1)
  }

  function renderMain() {
    if (route === 'dashboard') {
      return (
        <>
          <div className="tab-switch">
            <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}>Calendar</button>
            <button className={view==='timeline'?'active':''} onClick={()=>setView('timeline')}>Timeline</button>
          </div>
          {view === 'calendar' ? (
            <WeekCalendar weekStart={weekStart} />
          ) : (
            <VerticalTimeline refreshKey={refreshKey} />
          )}
        </>
      )
    }
    if (route === 'times') return <TimesList refreshKey={refreshKey} />
    if (route === 'projects') return <ProjectsPage />
    if (route === 'tasks') return <TasksPage />
    if (route === 'reports') {
      return (
        <div className="placeholder">
          <h3 style={{ marginTop: 8 }}>Reports</h3>
          <p style={{ color: '#666' }}>Reports are not implemented yet.</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="dash-root">
      <Sidebar route={route} />
      <div className="dash-main">
        <HeaderBar
          user={user}
          onLogout={onLogout}
          rangeLabel={rangeLabel}
          onPrev={() => goWeek(-1)}
          onNext={() => goWeek(1)}
          onToday={toToday}
          view={view}
          setView={setView}
          onNewTask={() => setShowNew(true)}
        />
        <div className="dash-content">
          <div className="dash-primary">
            {renderMain()}
          </div>
          <StatsPanel />
        </div>
      </div>
      {showNew && (
        <NewEntryModal onCancel={() => setShowNew(false)} onCreated={onCreatedEntry} />
      )}
    </div>
  )
}
