import React from 'react'

export default function StatsPanel() {
  return (
    <div className="stats-panel">
      <div className="stat-card orange">
        <div className="icon">⏱️</div>
        <div className="value">0:00</div>
        <div className="label">Duration</div>
      </div>
      <div className="stat-card purple">
        <div className="icon">💰</div>
        <div className="value">₹ 0.00</div>
        <div className="label">Total</div>
      </div>
    </div>
  )
}
