import React from 'react'

const LINKS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'profile', label: 'Profile' },
  { key: 'times', label: 'Times' },
  { key: 'teams', label: 'Teams' },
  { key: 'projects', label: 'Projects' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'reports', label: 'Reports' }
]

export default function Sidebar({ route }) {
  function hrefFor(key) { return `#/${key}` }
  return (
    <aside className="sb-root">
      <div className="sb-brand">🕒 Timesheet</div>
      <nav className="sb-nav">
        {LINKS.map(l => (
          <a
            key={l.key}
            href={hrefFor(l.key)}
            className={route === l.key ? 'active' : ''}
          >{l.label}</a>
        ))}
      </nav>
    </aside>
  )
}
