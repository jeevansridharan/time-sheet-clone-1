import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DateTime, Interval } from 'luxon'
import { Chart as ChartJS, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Bar } from 'react-chartjs-2'

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, annotationPlugin)

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function ReportsPage() {
  const headers = useAuthHeaders()
  const [entries, setEntries] = useState([])
  const [error, setError] = useState(null)
  const [rangeDays, setRangeDays] = useState(7)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const e = await axios.get('/api/entries', { headers })
        if (!mounted) return
        setEntries(e.data.entries || [])
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError('Failed to load data');
      }
    })()
    return () => { mounted = false }
  }, [headers])

  // Daily working hours for last N days
  const days = useMemo(() => {
    const end = DateTime.now().endOf('day')
    const start = end.minus({ days: rangeDays - 1 }).startOf('day')
    const arr = []
    let cur = start
    while (cur <= end) { arr.push(cur); cur = cur.plus({ days: 1 }) }
    return arr
  }, [rangeDays])

  const perDay = useMemo(() => {
    const result = days.map(d => ({ date: d, hours: 0 }))
    for (const e of entries) {
      if (!e.end) continue
      const s = DateTime.fromISO(e.start)
      const en = DateTime.fromISO(e.end)
      for (let i = 0; i < result.length; i++) {
        const day = result[i].date
        const iv = Interval.fromDateTimes(day.startOf('day'), day.endOf('day'))
        if (iv.overlaps(Interval.fromDateTimes(s, en))) {
          // contribute only overlap to that day
          const overlap = iv.intersection(Interval.fromDateTimes(s, en))
          if (overlap) {
            const h = overlap.toDuration('hours').hours
            result[i].hours += h
          }
        }
      }
    }
    return result
  }, [entries, days])

  const barLineData = useMemo(() => {
    const labels = days.map(d => d.toFormat('d. LLL'))
    const hours = perDay.map(d => Number(d.hours.toFixed(2)))
    const avg = hours.reduce((a,b)=>a+b,0) / (hours.length || 1)
    return { labels, hours, avg }
  }, [perDay, days])

  const barData = useMemo(() => ({
    labels: barLineData.labels,
    datasets: [
      {
        type: 'bar',
        label: 'Hours',
        data: barLineData.hours,
        backgroundColor: '#b9d9a7'
      }
    ]
  }), [barLineData])

  const barOptions = useMemo(() => ({
    responsive: true,
    scales: {
      y: { title: { display: true, text: 'Working Hours (h)' }, beginAtZero: true }
    },
    plugins: {
      legend: { position: 'bottom' },
      annotation: {
        annotations: {
          avgLine: {
            type: 'line',
            yMin: barLineData.avg,
            yMax: barLineData.avg,
            borderColor: '#ff9900',
            borderDash: [6,4],
            label: { enabled: true, content: `Average (${barLineData.avg.toFixed(2)}h)`, position: 'start', backgroundColor: 'rgba(255,153,0,0.1)', color: '#ff9900' }
          }
        }
      }
    }
  }), [barLineData])

  if (error) return <div style={{ color:'crimson' }}>{error}</div>

  return (
    <div className="reports-root">
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Working Hours</div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, color: '#555', marginRight: 8 }}>Range:</label>
          <select value={rangeDays} onChange={e=>setRangeDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
        <Bar data={barData} options={barOptions} />
      </div>
    </div>
  )
}
