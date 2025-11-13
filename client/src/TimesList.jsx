import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { DateTime } from 'luxon'

export default function TimesList({ refreshKey }) {
  const [entries, setEntries] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
        const headers = t ? { Authorization: `Bearer ${t}` } : {}
        const res = await axios.get('/api/entries', { headers })
        if (!mounted) return
        setEntries(res.data.entries || [])
        setError(null)
      } catch (e) {
        if (!mounted) return
        setError('Unable to load entries')
        setEntries([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [refreshKey])

  if (loading) return <div style={{ padding: 12 }}>Loading entries…</div>
  if (error) return <div style={{ padding: 12, color: 'crimson' }}>{error}</div>

  if (!entries.length) return <div style={{ padding: 12 }}>No entries yet. Click "+ New Entry" to create one.</div>

  return (
    <div className="times-list" style={{ background:'#fff', border:'1px solid #e6e6e6', borderRadius:8, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background:'#fafafa' }}>
            <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Title</th>
            <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Start (IST)</th>
            <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>End (IST)</th>
            <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #eee' }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => {
            const start = DateTime.fromISO(e.start).setZone('Asia/Kolkata')
            const end = e.end ? DateTime.fromISO(e.end).setZone('Asia/Kolkata') : null
            const durMin = end ? Math.max(0, end.diff(start, 'minutes').minutes) : 0
            const durH = Math.floor(durMin / 60)
            const durM = Math.round(durMin % 60)
            const durFmt = end ? `${String(durH).padStart(2,'0')}:${String(durM).padStart(2,'0')}` : '—'
            return (
              <tr key={e.id}>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{e.title || 'Entry'}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{start.toFormat('dd LLL yyyy HH:mm')}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{end ? end.toFormat('dd LLL yyyy HH:mm') : '—'}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f1f1f1' }}>{durFmt}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
