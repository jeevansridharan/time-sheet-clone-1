import React from 'react'

export default function HeaderBar({ user, onLogout, rangeLabel, onPrev, onNext, onToday, view, setView, onNewTask }) {
  return (
    <header className="hb-root">
      <div className="hb-left">
        <div className="hb-range">{rangeLabel}</div>
        <div className="hb-controls">
          <button onClick={onPrev}>◀</button>
          <button onClick={onNext}>▶</button>
        </div>
        <div className="hb-views">
          <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}>Week</button>
          <button className={view==='month'?'active':''} onClick={()=>setView('month')}>Month</button>
          <button className={view==='timeline'?'active':''} onClick={()=>setView('timeline')}>Day</button>
        </div>
      </div>
      <div className="hb-right">
        <button className="hb-notif" title="Notifications">🔔</button>
        <div className="hb-user">{user?.name || user?.email || 'User'}</div>
        <div className="hb-avatar">{(user && (user.name||user.email)||'U').slice(0,1).toUpperCase()}</div>
        <button className="hb-new" onClick={onNewTask}>+ New</button>
        <button className="hb-logout" onClick={onLogout}>Sign out</button>
      </div>
    </header>
  )
}
