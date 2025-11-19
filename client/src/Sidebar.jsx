import React from 'react'

const NAV_GROUPS = [
  {
    title: null,
    items: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'times', label: 'Times' }
    ]
  },
  {
    title: 'Manage',
    items: [
      { key: 'projects', label: 'Projects' },
      { key: 'tasks', label: 'Tasks' }
    ]
  },
  {
    title: 'Reports',
    items: [
      { key: 'reports', label: 'Reports' },
      { key: 'workflow', label: 'Workflow' }
    ]
  },
  {
    title: 'Admin',
    items: [
      { key: 'teams', label: 'Teams' },
      { key: 'profile', label: 'Profile' }
    ]
  }
]

export default function Sidebar({ route }) {
  function hrefFor(key) { return `#/${key}` }
  return (
    <aside className="sb-root">
      <div className="sb-brand">
        <div className="sb-logo">TP</div>
        <div className="sb-brand-text">
          <div className="sb-title">TimeSheet</div>
          <div className="sb-sub">MySpace</div>
        </div>
      </div>
      <nav className="sb-nav">
        {NAV_GROUPS.map((group, idx) => (
          <div key={group.title || `group-${idx}`} className="sb-section">
            {group.title && <div className="sb-section-title">{group.title}</div>}
            <div className="sb-links">
              {group.items.map(item => (
                <a
                  key={item.key}
                  href={hrefFor(item.key)}
                  className={route === item.key ? 'active' : ''}
                  title={item.label}
                >
                  <span className="sb-item-icon">•</span>
                  <span className="sb-item-label">{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
