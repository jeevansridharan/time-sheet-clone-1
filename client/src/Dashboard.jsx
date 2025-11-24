import React, { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import VerticalTimeline from './VerticalTimeline'
import WeekCalendar from './WeekCalendar'
import MonthCalendar from './MonthCalendar'
import StatsPanel from './StatsPanel'
import Sidebar from './Sidebar'
import HeaderBar from './HeaderBar'
import InsightsPanel from './InsightsPanel'
import NewEntryModal from './NewEntryModal'
import TimesList from './TimesList'
import ProjectsPage from './ProjectsPage'
import TasksPage from './TasksPage'
import ReportsPage from './ReportsPage'
import WorkflowBoard from './WorkflowBoard'
import PeoplePage from './PeoplePage'

// Dashboard replicates layout similar to reference screenshot: sidebar, header, content tabs.

export default function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('calendar') // 'calendar' | 'month' | 'timeline'
  const [weekStart, setWeekStart] = useState(DateTime.now().startOf('week')) // Monday by default (luxon startOf('week'))
  const [monthStart, setMonthStart] = useState(DateTime.now().startOf('month'))
  const [route, setRoute] = useState('dashboard') // dashboard | profile | times | tasks | projects | reports | teams | workflow
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

  function goMonth(delta) {
    setMonthStart(ms => ms.plus({ months: delta }).startOf('month'))
  }

  function toToday() {
    if (view === 'calendar') setWeekStart(DateTime.now().startOf('week'))
    else if (view === 'month') setMonthStart(DateTime.now().startOf('month'))
  }

  const weekEnd = weekStart.plus({ days: 6 })
  const rangeLabel = view === 'month'
    ? monthStart.toFormat('LLLL yyyy')
    : `${weekStart.toFormat('LLL dd')} – ${weekEnd.toFormat('LLL dd, yyyy')}`

  function onCreatedEntry() {
    setShowNew(false)
    setRefreshKey(k => k + 1)
  }

  function renderMain() {
    if (route === 'dashboard') {
      return (
        <>
          <div className="tab-switch">
            <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}>Week</button>
            <button className={view==='month'?'active':''} onClick={()=>setView('month')}>Month</button>
            <button className={view==='timeline'?'active':''} onClick={()=>setView('timeline')}>Day</button>
          </div>
          {view === 'calendar' && <WeekCalendar weekStart={weekStart} />}
          {view === 'month' && <MonthCalendar monthStart={monthStart} />}
          {view === 'timeline' && <VerticalTimeline refreshKey={refreshKey} />}
        </>
      )
    }
    if (route === 'times') return <TimesList refreshKey={refreshKey} />
  if (route === 'projects') return <ProjectsPage user={user} />
    if (route === 'people') return <PeoplePage user={user} />
    if (route === 'tasks') return <TasksPage user={user} />
    if (route === 'reports') return <ReportsPage />
    if (route === 'workflow') return <WorkflowBoard />
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
          onPrev={() => (view==='month'? goMonth(-1) : goWeek(-1))}
          onNext={() => (view==='month'? goMonth(1) : goWeek(1))}
          onToday={toToday}
          view={view}
          setView={setView}
          onNewTask={() => setShowNew(true)}
        />
        <div className="dash-content">
          <div className="dash-primary">
            {renderMain()}
          </div>
          <div className="side-column">
            <StatsPanel />
            <InsightsPanel />
          </div>
        </div>
      </div>
      {showNew && (
        <NewEntryModal onCancel={() => setShowNew(false)} onCreated={onCreatedEntry} />
      )}
    </div>
  )
}
