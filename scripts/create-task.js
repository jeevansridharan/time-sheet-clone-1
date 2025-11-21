const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function run() {
  try {
    console.log('Logging in as auto-run@example.com')
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

    console.log('Fetching projects...')
    const listRes = await fetch(`${BASE}/api/projects`, { headers: { Authorization: `Bearer ${token}` } })
    if (!listRes.ok) {
      throw new Error('Failed to list projects: ' + listRes.status)
    }
    const list = await listRes.json()
    const projects = list.projects || []
    if (!projects.length) {
      console.log('No projects found for user; please create a project first (use UI or scripts/test-create-project.js)')
      return
    }
    const project = projects[0]
    console.log('Using project', project.id, project.name)

    console.log('Creating task for project...')
    const createRes = await fetch(`${BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Auto-run task', projectId: project.id })
    })
    const createBody = await createRes.text()
    console.log('Create status', createRes.status, createBody)

    console.log('Fetching tasks...')
    const tasksRes = await fetch(`${BASE}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } })
    const tasks = await tasksRes.json()
    console.log('Tasks:', JSON.stringify(tasks, null, 2))
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

run()
