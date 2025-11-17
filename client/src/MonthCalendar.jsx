import React, { useMemo } from 'react'
import { DateTime } from 'luxon'

export default function MonthCalendar({ monthStart }) {
  // monthStart is startOf('month')
  const start = monthStart.startOf('week') // show full weeks
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => start.plus({ days: i })), [start])
  const todayIso = DateTime.now().toISODate()
  const monthIso = monthStart.toISO().slice(0,7)

  return (
    <div className="mc-root">
      <div className="mc-header">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="mc-head-cell">{d}</div>
        ))}
      </div>
      <div className="mc-grid">
        {days.map(d => {
          const inMonth = d.toISO().slice(0,7) === monthIso
          const isToday = d.toISODate() === todayIso
          return (
            <div key={d.toISO()} className={`mc-cell ${inMonth ? '' : 'dim'} ${isToday ? 'today' : ''}`}>
              <div className="mc-daynum">{d.toFormat('d')}</div>
              {/* events/summary could go here */}
            </div>
          )
        })}
      </div>
    </div>
  )
}
