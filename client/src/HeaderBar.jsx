import React from 'react'

export default function HeaderBar({ user, onLogout, rangeLabel, onPrev, onNext, onToday, view, setView, onNewTask }) {
  return (
    <header className="hb-root">
      <div className="hb-left">
        <div className="hb-range">{rangeLabel}</div>
        <div className="hb-controls">
          <button onClick={onPrev}>◀</button>
          <button onClick={onToday}>Today</button>
          <button onClick={onNext}>▶</button>
        </div>
        <div className="hb-views">
          <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}>Week</button>
          <button className={view==='timeline'?'active':''} onClick={()=>setView('timeline')}>Day</button>
        </div>
      </div>
      <div className="hb-right">
        <div className="hb-user">{user?.email || user?.name || 'User'}</div>
        <button className="hb-new" onClick={onNewTask}>+ New Entry</button>
        <button className="hb-logout" onClick={onLogout}>Sign out</button>
      </div>
    </header>
  )
}
