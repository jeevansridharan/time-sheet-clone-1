import React from 'react'

export default function SeparateSidebar({ user }) {
  return (
    <aside className="separate-sidebar" style={{ width: 280, marginLeft: 16 }}>
      <div style={{ padding: 12, background: '#fff', border: '1px solid #e6e6e6', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Quick Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: 'white' }}>New Task</button>
          <button style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: 'white' }}>Quick Timer</button>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 12, background: '#fff', border: '1px solid #e6e6e6', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Assigned To You</div>
        <div style={{ color: '#666', fontSize: 13 }}>No current assignments</div>
      </div>

      <div style={{ marginTop: 12, padding: 12, background: '#fff', border: '1px solid #e6e6e6', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent</div>
        <ul style={{ margin: 0, paddingLeft: 16, color: '#444' }}>
          <li>Checked in 2h ago</li>
        </ul>
      </div>
    </aside>
  )
}
