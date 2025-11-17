import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DateTime, Interval } from 'luxon'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, annotationPlugin)

function useAuthHeaders() {
  const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function TaskDetails({ taskId }) {
  const headers = useAuthHeaders()
  const [task, setTask] = useState(null)
  const [entries, setEntries] = useState([])
  const [rangeDays, setRangeDays] = useState(14)
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')

  useEffect(() => {
    if (!taskId) return
    let mounted = true
    ;(async () => {
      try {
        const [tr, er] = await Promise.all([
          axios.get('/api/tasks', { headers }),
          axios.get('/api/entries', { headers })
        ])
        if (!mounted) return
        const t = (tr.data.tasks || []).find(x => x.id === taskId)
        setTask(t || null)
        setTodos(Array.isArray(t?.todos) ? t.todos : [])
        const ens = (er.data.entries || []).filter(e => e.taskId === taskId)
        setEntries(ens)
      } catch {}
    })()
    return () => { mounted = false }
  }, [taskId])

  const totalHours = useMemo(() => {
    let h = 0
    for (const e of entries) {
      if (!e.end) continue
      const s = DateTime.fromISO(e.start)
      const en = DateTime.fromISO(e.end)
      h += Math.max(0, en.diff(s,'hours').hours)
    }
    return h
  }, [entries])

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
    labels: days.map(d => d.toFormat('d LLL')),
    datasets: [
      { type: 'bar', label: 'Hours', data: perDay.map(d => Number(d.hours.toFixed(2))), backgroundColor: '#9ad0f5' }
    ]
  }), [perDay, days])

  const avg = useMemo(() => {
    const arr = perDay.map(d => d.hours)
    return arr.reduce((a,b)=>a+b,0) / (arr.length || 1)
  }, [perDay])

  const barOptions = useMemo(() => ({
    responsive: true,
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours' } } },
    plugins: {
      legend: { display: false },
      annotation: { annotations: { avgLine: { type:'line', yMin: avg, yMax: avg, borderColor:'#ff9900', borderDash:[6,4], label: { enabled: true, content: `Avg ${avg.toFixed(2)}h`, position: 'start' } } } }
    }
  }), [avg])

  async function persistTodos(nextTodos) {
    if (!taskId) return
    try {
      await axios.patch(`/api/tasks/${taskId}`, { todos: nextTodos }, { headers })
      setTodos(nextTodos)
    } catch {}
  }

  async function addTodo(e) {
    e?.preventDefault?.()
    const text = newTodo.trim()
    if (!text) return
    const next = [...todos, { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), text, done: false }]
    setNewTodo('')
    await persistTodos(next)
  }

  async function toggleTodo(id) {
    const next = todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
    await persistTodos(next)
  }

  async function removeTodo(id) {
    const next = todos.filter(t => t.id !== id)
    await persistTodos(next)
  }

  if (!taskId) return null

  return (
    <div className="task-details" style={{ marginTop: 12 }}>
      <div className="card">
        <div className="card-title">Task performance{task ? ` — ${task.title}` : ''}</div>
        <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <div className="metric" style={{ padding:12, border:'1px solid #eee', borderRadius:8 }}>
            <div style={{ fontSize:12, color:'#666' }}>Total hours</div>
            <div style={{ fontSize:22, fontWeight:700 }}>{totalHours.toFixed(2)}h</div>
          </div>
          <div style={{ marginLeft:'auto' }}>
            <label style={{ fontSize:12, color:'#555', marginRight:8 }}>Range:</label>
            <select value={rangeDays} onChange={e=>setRangeDays(Number(e.target.value))}>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">Todo list {task ? `— ${task.title}` : ''}</div>
        <form onSubmit={addTodo} style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <input value={newTodo} onChange={e=>setNewTodo(e.target.value)} placeholder="Add a todo" style={{ padding:8, border:'1px solid #ddd', borderRadius:6, minWidth:260 }} />
          <button type="submit">Add</button>
        </form>
        <div>
          {todos && todos.length ? (
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:8 }}>
              {todos.map(t => (
                <li key={t.id} style={{ display:'flex', alignItems:'center', gap:8, border:'1px solid #eee', borderRadius:8, padding:'8px 10px', background:'#fff' }}>
                  <input type="checkbox" checked={!!t.done} onChange={()=>toggleTodo(t.id)} />
                  <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#888' : 'inherit' }}>{t.text}</span>
                  <button onClick={()=>removeTodo(t.id)} style={{ marginLeft:'auto' }}>Delete</button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color:'#777' }}>No todos yet. Add one above.</div>
          )}
        </div>
      </div>
    </div>
  )
}
