const { execSync } = require('child_process')

const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function run() {
  try {
    console.log('Registering test user (auto-run)...')
    try {
      await fetch(`${BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'auto-run@example.com', password: 'pass123', name: 'Auto Run' })
      })
      console.log('Register request sent (may already exist)')
    } catch (e) {
      console.warn('Register request failed (continuing)', e.message || e)
    }

    console.log('Importing users into Prisma...')
    try {
      execSync('node scripts/import-users-to-prisma.js', { stdio: 'inherit' })
    } catch (e) {
      console.warn('Import script failed:', e.message || e)
    }

    console.log('Logging in...')
    const loginRes = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auto-run@example.com', password: 'pass123' })
    })
    if (!loginRes.ok) {
      const txt = await loginRes.text()
      throw new Error('Login failed: ' + loginRes.status + ' ' + txt)
    }
    const login = await loginRes.json()
    const token = login.token
    console.log('Got token length', token ? token.length : 0)

    console.log('Creating project...')
    const createRes = await fetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Auto-run Project', description: 'Created by test script', hourlyRate: 12 })
    })
    const createBody = await createRes.text()
    console.log('Create status', createRes.status, createBody)

    console.log('Fetching projects...')
    const listRes = await fetch(`${BASE}/api/projects`, { headers: { Authorization: `Bearer ${token}` } })
    const list = await listRes.json()
    console.log('Projects:', JSON.stringify(list, null, 2))
  } catch (err) {
    console.error('Test script error:', err)
    process.exit(1)
  }
}

run()
