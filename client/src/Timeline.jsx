import React, { useEffect, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import axios from 'axios'
import { Timeline } from 'vis-timeline/standalone'
import 'vis-timeline/styles/vis-timeline-graph2d.css'

export default function TimelineView() {
  const containerRef = useRef(null)
  const timelineRef = useRef(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // items dataset
    const data = new Timeline.DataSet([])
    timelineRef.current = new Timeline(container, data, {
      editable: {
        add: true,
        updateTime: true,
        remove: true,
      },
      stack: false,
      showCurrentTime: true,
      timeAxis: { scale: 'hour', step: 1 }
    })

    timelineRef.current.on('add', (item, callback) => {
      // item.start and item.end are Date objects
      createEntry(item.start, item.end).then(entry => {
        const s = DateTime.fromISO(entry.start).setZone('Asia/Kolkata').toFormat('HH:mm')
        const e = entry.end ? DateTime.fromISO(entry.end).setZone('Asia/Kolkata').toFormat('HH:mm') : ''
        const label = entry.title + (e ? ` (${s}-${e} IST)` : ` (${s} IST)`)
        callback({ id: entry.id, content: label, start: new Date(entry.start), end: entry.end ? new Date(entry.end) : null })
      }).catch(() => callback(null))
    })

    timelineRef.current.on('change', (props) => {
      // props.items is array of ids
      props.items.forEach(id => {
        const it = timelineRef.current.itemsData.get(id)
        updateEntry(id, it.start, it.end)
      })
    })

    timelineRef.current.on('remove', (item, callback) => {
      deleteEntry(item.id).then(() => callback(item)).catch(() => callback(null))
    })

    loadEntries().then(list => {
      const mapped = list.map(e => {
        const startIST = DateTime.fromISO(e.start).setZone('Asia/Kolkata').toFormat('HH:mm');
        const endIST = e.end ? DateTime.fromISO(e.end).setZone('Asia/Kolkata').toFormat('HH:mm') : '';
        const label = e.title + (endIST ? ` (${startIST}-${endIST} IST)` : ` (${startIST} IST)`);
        return { id: e.id, content: label, start: new Date(e.start), end: e.end ? new Date(e.end) : null };
      })
      data.add(mapped)
      setItems(mapped)
    })

    return () => {
      if (timelineRef.current) timelineRef.current.destroy()
    }
  }, [])

  // API helpers (assumes token stored in localStorage 'tpodo_token')
  function authHeaders() {
    const t = localStorage.getItem('tpodo_token') || sessionStorage.getItem('tpodo_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function loadEntries() {
    const res = await axios.get('/api/entries', { headers: authHeaders() })
    return res.data.entries || []
  }

  async function createEntry(start, end) {
    const payload = { title: 'New entry', start: new Date(start).toISOString(), end: end ? new Date(end).toISOString() : null }
    const res = await axios.post('/api/entries', payload, { headers: authHeaders() })
    return res.data.entry
  }

  async function updateEntry(id, start, end) {
    await axios.patch(`/api/entries/${id}`, { start: start.toISOString(), end: end ? end.toISOString() : null }, { headers: authHeaders() })
  }

  async function deleteEntry(id) {
    await axios.delete(`/api/entries/${id}`, { headers: authHeaders() })
  }

  return (
    <div>
      <div ref={containerRef} style={{ height: 400, border: '1px solid #ddd' }} />
      <p style={{ marginTop: 8, color: '#666' }}>Times are displayed in IST in the item labels; items are stored in UTC on the server.</p>
    </div>
  )
}
