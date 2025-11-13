import React, { useMemo } from 'react'
import { DateTime } from 'luxon'

// Simple week grid (read-only placeholder similar to screenshot)
export default function WeekCalendar({ weekStart }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i })), [weekStart])
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => 7 + i), []) // 07:00..18:00

  return (
    <div className="wk-root">
      <div className="wk-header">
        <div className="wk-cell wk-corner">W {weekStart.weekNumber}</div>
        {days.map(d => (
          <div key={d.toISODate()} className="wk-cell wk-day">
            <div className="wk-day-name">{d.toFormat('ccc dd.LL')}</div>
            <div className="wk-day-total">0:00</div>
          </div>
        ))}
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
