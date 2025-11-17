import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DateTime, Interval } from 'luxon'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function InsightsPanel() {
  const headers = useAuthHeaders()
  const [entries, setEntries] = useState([])
  const [projects, setProjects] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [e, p] = await Promise.all([
          axios.get('/api/entries', { headers }),
          axios.get('/api/projects', { headers })
        ])
        if (!mounted) return
        setEntries(e.data.entries || [])
        setProjects(p.data.projects || [])
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError('Stats unavailable')
      }
    })()
    return () => { mounted = false }
  }, [headers])

  const projMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  const agg = useMemo(() => {
    const t = {}
    for (const e of entries) {
      if (!e.end) continue
      const pid = e.project || 'unassigned'
      const p = projMap[pid]
      if (!t[pid]) t[pid] = { name: p?.name || 'Unassigned', hours: 0 }
      const s = DateTime.fromISO(e.start)
      const en = DateTime.fromISO(e.end)
      const h = Math.max(0, en.diff(s,'hours').hours)
      t[pid].hours += h
    }
    return t
  }, [entries, projMap])

  const donutHours = useMemo(() => ({
    labels: Object.values(agg).map(x => x.name),
    datasets: [{ data: Object.values(agg).map(x => Number(x.hours.toFixed(2))), backgroundColor: ['#6c5ce7','#00b894','#fdcb6e','#0984e3','#e17055','#e84393','#55efc4','#ffeaa7'] }]
  }), [agg])

  

  // Last 7 days hours (spark bar)
  const days = useMemo(() => {
    const end = DateTime.now().endOf('day')
    const start = end.minus({ days: 6 }).startOf('day')
    const arr = []
    let cur = start
    while (cur <= end) { arr.push(cur); cur = cur.plus({ days: 1 }) }
    return arr
  }, [])

  const perDay = useMemo(() => {
    const result = days.map(d => ({ date: d, hours: 0 }))
    for (const e of entries) {
      if (!e.end) continue
      const s = DateTime.fromISO(e.start)
      const en = DateTime.fromISO(e.end)
      for (let i = 0; i < result.length; i++) {
        const d = result[i].date
        const iv = Interval.fromDateTimes(d.startOf('day'), d.endOf('day'))
        const eiv = Interval.fromDateTimes(s, en)
        if (iv.overlaps(eiv)) {
          const overlap = iv.intersection(eiv)
          if (overlap) result[i].hours += overlap.toDuration('hours').hours
        }
      }
    }
    return result
  }, [days, entries])

  const barData = useMemo(() => ({
    labels: days.map(d => d.toFormat('ccc')), // Mon..Sun
    datasets: [{ label: 'Hours', data: perDay.map(d => Number(d.hours.toFixed(1))), backgroundColor: '#a4c3f5' }]
  }), [perDay, days])

  const barOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }

  return (
    <div className="insights-panel">
      <div className="card">
        <div className="card-title">Hours by Project</div>
        {error ? <div className="card-error">{error}</div> : <Doughnut data={donutHours} options={{ plugins: { legend: { display: false } }, cutout: '60%' }} />}
      </div>
      
      <div className="card">
        <div className="card-title">Last 7 days</div>
        {error ? <div className="card-error">{error}</div> : <Bar data={barData} options={barOptions} />}
      </div>
    </div>
  )
}
