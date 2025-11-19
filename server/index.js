const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());

// Serve static frontend files from server/public
// If the client has been built, serve the built files from client/dist so
// the entire app is available from the backend port (3000). Otherwise
// fall back to server/public.
const clientDist = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  // ensure SPA fallback to index.html
  app.get('*', (req, res, next) => {
    const idx = path.join(clientDist, 'index.html')
    if (fs.existsSync(idx)) return res.sendFile(idx)
    return next()
  })
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Setup routes: web form to create initial admin (only when DB is empty)
app.get('/setup', (req, res) => {
  try {
    const users = db.getUsers();
    if (users && users.length > 0) return res.redirect('/login');
    return res.sendFile(path.join(__dirname, 'public', 'setup.html'));
  } catch (err) {
    return res.status(500).send('Server error');
  }
});

app.post('/setup', (req, res) => {
  try {
    const users = db.getUsers();
    if (users && users.length > 0) return res.status(403).json({ error: 'setup already completed' });
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const existing = db.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'user exists' });
    const hashed = bcrypt.hashSync(password, 10);
    const user = { id: uuidv4(), email, name: name || 'Admin', password: hashed, createdAt: new Date().toISOString() };
    db.addUser(user);
    return res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// Serve login page at /login for friendly URL (static serves login.html at /login.html)
app.get('/login', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve register page
app.get('/register', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const PORT = process.env.PORT || 3000;

// Auto-create admin user when DB is empty and ADMIN_EMAIL/ADMIN_PASSWORD are provided
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && db.getUsers().length === 0) {
  const existing = db.findUserByEmail(process.env.ADMIN_EMAIL);
  if (!existing) {
    const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    const adminUser = {
      id: uuidv4(),
      email: process.env.ADMIN_EMAIL,
      name: process.env.ADMIN_NAME || 'Admin',
      password: hashed,
      createdAt: new Date().toISOString()
    };
    db.addUser(adminUser);
    console.log(`Created admin user: ${adminUser.email}`);
  }
}

// Register
app.post('/register', (req, res) => {
  const { email, password, name, age, gender, phone } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  const existing = db.findUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'user exists' });
  if (phone) {
    const existingPhone = db.findUserByPhone(String(phone));
    if (existingPhone) return res.status(409).json({ error: 'phone already in use' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const user = {
    id: uuidv4(),
    email,
    name: name || null,
    age: typeof age === 'number' ? age : (age ? Number(age) : null),
    phone: phone ? String(phone) : null,
    gender: gender || null,
    password: hashed,
    createdAt: new Date().toISOString()
  };
  db.addUser(user);
  const { password: _p, ...publicUser } = user;
  res.status(201).json({ user: publicUser });
});

// Login
app.post('/login', (req, res) => {
  const { email, password, phone } = req.body || {};
  const identifier = email || phone;
  if (!identifier || !password) return res.status(400).json({ error: 'identifier and password required' });

  let user = null;
  // Try by email first
  user = db.findUserByEmail(identifier);
  // If not found by email, try by phone
  if (!user) user = db.findUserByPhone(identifier);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _p, ...publicUser } = user;
  res.json({ token, user: publicUser });
});

// Auth middleware
function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'missing token' });
  const token = m[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'invalid token (user not found)' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Protected route
app.get('/me', authMiddleware, (req, res) => {
  const { password, ...publicUser } = req.user;
  res.json({ user: publicUser });
});

app.get('/', (req, res) => res.send('tpodo timesheet server — auth endpoints: POST /register, POST /login, GET /me'));

// -- Time entries API (supports JSON-file fallback)
// GET /api/entries?from=ISO&to=ISO
app.get('/api/entries', authMiddleware, (req, res) => {
  try {
    const { from, to } = req.query;
    const all = db.getEntries();
    let entries = all.filter(e => e.userId === req.user.id);
    if (from) entries = entries.filter(e => new Date(e.end || e.start) >= new Date(from));
    if (to) entries = entries.filter(e => new Date(e.start) <= new Date(to));
    return res.json({ entries });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// Create entry
app.post('/api/entries', authMiddleware, (req, res) => {
  try {
    const { title, project, start, end, description, billable, taskId, teamId } = req.body || {};
    if (!start) return res.status(400).json({ error: 'start is required' });
    const entry = {
      id: uuidv4(),
      userId: req.user.id,
      title: title || 'Untitled',
      project: project || null,
      start: new Date(start).toISOString(),
      end: end ? new Date(end).toISOString() : null,
      description: description || null,
      taskId: taskId || null,
      teamId: teamId || null,
      billable: !!billable,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.addEntry(entry);
    return res.status(201).json({ entry });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// Update entry
app.patch('/api/entries/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.findEntryById(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    const patch = {};
    ['title','project','start','end','description','billable','taskId','teamId'].forEach(k => {
      if (k in req.body) patch[k] = req.body[k];
    });
    if (patch.start) patch.start = new Date(patch.start).toISOString();
    if (patch.end) patch.end = patch.end ? new Date(patch.end).toISOString() : null;
    const updated = db.updateEntry(id, patch);
    return res.json({ entry: updated });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// Delete entry
app.delete('/api/entries/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.findEntryById(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    const ok = db.deleteEntry(id);
    return res.json({ ok });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// ---- Projects API ----
// GET /api/projects
app.get('/api/projects', authMiddleware, (req, res) => {
  try {
    const all = db.getProjects();
    const projects = all.filter(p => p.userId === req.user.id);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/projects
app.post('/api/projects', authMiddleware, (req, res) => {
  try {
    const { name, description, hourlyRate } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const project = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      description: description || null,
      hourlyRate: typeof hourlyRate === 'number' ? hourlyRate : (hourlyRate ? Number(hourlyRate) : null),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.addProject(project);
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// PATCH /api/projects/:id
app.patch('/api/projects/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.findProjectById(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    const patch = {};
    ['name', 'description', 'hourlyRate'].forEach(k => { if (k in req.body) patch[k] = req.body[k]; });
    if ('hourlyRate' in patch && patch.hourlyRate != null) patch.hourlyRate = Number(patch.hourlyRate);
    const updated = db.updateProject(id, patch);
    res.json({ project: updated });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// DELETE /api/projects/:id
app.delete('/api/projects/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.findProjectById(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    const ok = db.deleteProject(id);
    res.json({ ok });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// ---- People API ----
// GET /api/people
app.get('/api/people', authMiddleware, (req, res) => {
  try {
    const all = db.getPeople()
    // only return people created by this user (userId) or all if admin; for now filter by owner
    const people = all.filter(p => p.userId === req.user.id)
    res.json({ people })
  } catch (err) { res.status(500).json({ error: 'server error' }) }
})

// POST /api/people
app.post('/api/people', authMiddleware, (req, res) => {
  try {
    const { name, email, department, role } = req.body || {}
    if (!name && !email) return res.status(400).json({ error: 'name or email required' })
    const person = {
      id: uuidv4(),
      userId: req.user.id,
      name: name ? String(name).trim() : (email ? String(email).trim() : 'Unknown'),
      email: email ? String(email).trim() : null,
      department: department ? String(department).trim() : null,
      role: role ? String(role).trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.addPerson(person)
    res.status(201).json({ person })
  } catch (err) { res.status(500).json({ error: 'server error' }) }
})

// PATCH /api/people/:id
app.patch('/api/people/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id
    const existing = db.findPersonById(id)
    if (!existing) return res.status(404).json({ error: 'not found' })
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' })
    const patch = {}
    if ('name' in req.body) patch.name = req.body.name
    if ('email' in req.body) patch.email = req.body.email
    if ('department' in req.body) patch.department = req.body.department
    if ('role' in req.body) patch.role = req.body.role
    const updated = db.updatePerson(id, patch)
    res.json({ person: updated })
  } catch (err) { res.status(500).json({ error: 'server error' }) }
})

// DELETE /api/people/:id
app.delete('/api/people/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id
    const existing = db.findPersonById(id)
    if (!existing) return res.status(404).json({ error: 'not found' })
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' })
    const ok = db.deletePerson(id)
    res.json({ ok })
  } catch (err) { res.status(500).json({ error: 'server error' }) }
})

function normalizeAssignee(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    const value = input.trim();
    return value ? { memberId: null, name: value } : null;
  }
  if (typeof input !== 'object') return null;
  const result = {
    memberId: input.memberId ? String(input.memberId).trim() : null,
    teamId: input.teamId ? String(input.teamId).trim() : null,
    name: typeof input.name === 'string' ? input.name.trim() : '',
    username: typeof input.username === 'string' ? input.username.trim() : null,
    email: typeof input.email === 'string' ? input.email.trim() : null,
    role: typeof input.role === 'string' ? input.role.trim() : null,
    age: input.age === '' || input.age === null || input.age === undefined ? null : Number(input.age),
    yearJoined: input.yearJoined === '' || input.yearJoined === null || input.yearJoined === undefined ? null : Number(input.yearJoined),
    subTask: typeof input.subTask === 'string' ? input.subTask.trim() : null
  };
  if (Number.isNaN(result.age)) result.age = null;
  if (Number.isNaN(result.yearJoined)) result.yearJoined = null;
  if (result.subTask === '') result.subTask = null;
  if (!result.name) {
    if (result.username) result.name = result.username;
    else if (result.email) result.name = result.email;
    else if (result.memberId) result.name = `Member ${result.memberId}`;
  }
  if (!result.name) return null;
  const clean = {};
  Object.entries(result).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && !value.trim()) return;
    clean[key] = typeof value === 'string' ? value.trim() : value;
  });
  if (!clean.name) return null;
  return clean;
}

// ---- Tasks API ----
// GET /api/tasks?projectId=
app.get('/api/tasks', authMiddleware, (req, res) => {
  try {
    const all = db.getTasks();
    let tasks = all.filter(t => t.userId === req.user.id);
    if (req.query.projectId) tasks = tasks.filter(t => t.projectId === req.query.projectId);
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/tasks
app.post('/api/tasks', authMiddleware, (req, res) => {
  try {
    const { title, description, projectId, status, teamId, todos, assignedTo } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    const normTodos = Array.isArray(todos)
      ? todos.map(t => {
          if (t && typeof t === 'object') return { id: t.id || uuidv4(), text: String(t.text || ''), done: !!t.done };
          return { id: uuidv4(), text: String(t || ''), done: false };
        }).filter(t => t.text)
      : [];
    const task = {
      id: uuidv4(),
      userId: req.user.id,
      title,
      description: description || null,
      projectId: projectId || null,
      teamId: teamId || null,
      status: status || 'open',
      assignedTo: normalizeAssignee(assignedTo),
      todos: normTodos,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.addTask(task);
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// PATCH /api/tasks/:id
app.patch('/api/tasks/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.findTaskById(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    const patch = {};
    ['title','description','projectId','status','teamId'].forEach(k => { if (k in req.body) patch[k] = req.body[k]; });
    if ('assignedTo' in req.body) {
      patch.assignedTo = normalizeAssignee(req.body.assignedTo);
    }
    if ('todos' in req.body) {
      const todos = req.body.todos;
      patch.todos = Array.isArray(todos)
        ? todos.map(t => {
            if (t && typeof t === 'object') return { id: t.id || uuidv4(), text: String(t.text || ''), done: !!t.done };
            return { id: uuidv4(), text: String(t || ''), done: false };
          }).filter(t => t.text)
        : [];
    }
    const updated = db.updateTask(id, patch);
    res.json({ task: updated });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.findTaskById(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    const ok = db.deleteTask(id);
    res.json({ ok });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// ---- Teams API ----
// GET /api/teams
app.get('/api/teams', authMiddleware, (req, res) => {
  try {
    const teams = db.getTeams().filter(t => t.userId === req.user.id)
    res.json({ teams })
  } catch (err) { res.status(500).json({ error: 'server error' }) }
})

// GET /api/team-report/:teamId?from=ISO&to=ISO
// Returns aggregated worked seconds/hours for each member in the team.
app.get('/api/team-report/:teamId', authMiddleware, (req, res) => {
  try {
    const teamId = req.params.teamId
    const team = db.findTeamById(teamId)
    if (!team) return res.status(404).json({ error: 'team not found' })

    // parse date range
    const fromIso = req.query.from || null
    const toIso = req.query.to || null
    const from = fromIso ? new Date(fromIso) : new Date(new Date().setHours(0,0,0,0))
    const to = toIso ? new Date(toIso) : new Date()

    const members = Array.isArray(team.members) ? team.members : []
    const result = []

    members.forEach(member => {
      // try match by email to a real user (if present)
      const email = member && member.email ? String(member.email).trim().toLowerCase() : null
      let user = null
      if (email) user = db.findUserByEmail(email)

      // If user found, gather entries by user id; otherwise no entries available
      const sessions = []
      let totalSeconds = 0
      if (user) {
        const all = db.getEntries().filter(e => e.userId === user.id)
        all.forEach(e => {
          const s = e.start ? new Date(e.start) : null
          const t = e.end ? new Date(e.end) : null
          if (!s) return
          const endTime = t || new Date()
          if (endTime < from || s > to) return
          // overlap clip within [from, to]
          const clipStart = s < from ? from : s
          const clipEnd = endTime > to ? to : endTime
          const sec = Math.max(0, Math.floor((clipEnd.getTime() - clipStart.getTime()) / 1000))
          if (sec > 0) {
            sessions.push({ id: e.id, start: s.toISOString(), end: t ? t.toISOString() : null, seconds: sec })
            totalSeconds += sec
          }
        })
      }

      result.push({
        memberId: member.id || null,
        name: member.name || member.username || member.email || 'Unknown',
        email: member.email || null,
        userId: user ? user.id : null,
        totalSeconds,
        totalHours: +(totalSeconds / 3600).toFixed(2),
        sessions
      })
    })

    return res.json({ teamId, from: from.toISOString(), to: to.toISOString(), report: result })
  } catch (err) {
    console.error('team-report error', err)
    return res.status(500).json({ error: 'server error' })
  }
})

function normalizeWorkflow(input) {
  const base = { leader: '', developer: '', junior: '' }
  if (input && typeof input === 'object') {
    if (typeof input.leader === 'string') base.leader = input.leader.trim()
    if (typeof input.developer === 'string') base.developer = input.developer.trim()
    if (typeof input.junior === 'string') base.junior = input.junior.trim()
  }
  return base
}

function normalizeTeamMembers(members) {
  if (!Array.isArray(members)) return []
  return members
    .map((item, index) => {
      if (!item) return null
      if (typeof item === 'object') {
        const id = item.id ? String(item.id) : uuidv4()
        const name = typeof item.name === 'string' ? item.name.trim() : ''
        const username = typeof item.username === 'string' ? item.username.trim() : ''
        const email = typeof item.email === 'string' ? item.email.trim() : ''
        const role = typeof item.role === 'string' ? item.role.trim() : ''
        const ageValue = item.age === '' || item.age === null || item.age === undefined ? null : Number(item.age)
        const yearValue = item.yearJoined === '' || item.yearJoined === null || item.yearJoined === undefined ? null : Number(item.yearJoined)
        const subTask = typeof item.subTask === 'string' ? item.subTask.trim() : ''
        if (!name && !username && !email) return null
        return {
          id,
          name: name || username || email,
          username: username || null,
          email: email || null,
          role: role || null,
          age: Number.isNaN(ageValue) ? null : ageValue,
          yearJoined: Number.isNaN(yearValue) ? null : yearValue,
          subTask: subTask || null
        }
      }
      const value = String(item).trim()
      if (!value) return null
      return {
        id: uuidv4(),
        name: value,
        username: null,
        email: null,
        role: null,
        age: null,
        yearJoined: null,
        subTask: null
      }
    })
    .filter(Boolean)
}

function normalizeVisibility(input) {
  if (typeof input !== 'string') return 'everyone'
  const value = input.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (value === 'members' || value === 'member') return 'members'
  if (value === 'team_leader' || value === 'leader' || value === 'owner' || value === 'owner_only' || value === 'owner_managers') return 'team_leader'
  if (value === 'disabled' || value === 'hidden' || value === 'off') return 'disabled'
  return 'everyone'
}

function sanitizeColor(value) {
  if (typeof value !== 'string') return '#4f46e5'
  const raw = value.trim()
  if (!raw) return '#4f46e5'
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw
  const cleaned = raw.replace(/[^0-9a-f]/gi, '').slice(0, 6)
  return cleaned ? `#${cleaned.padEnd(6, '0')}` : '#4f46e5'
}

// POST /api/teams
app.post('/api/teams', authMiddleware, (req, res) => {
  try {
    const { name, deadline, members, workflow, description, color, visibility } = req.body || {}
    if (!name) return res.status(400).json({ error: 'name is required' })
    const mem = normalizeTeamMembers(members)
    const team = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      description: typeof description === 'string' ? description.trim() || null : null,
      color: sanitizeColor(color),
      visibility: normalizeVisibility(visibility),
      members: mem,
      workflow: normalizeWorkflow(workflow),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.addTeam(team)
    res.status(201).json({ team })
  } catch (err) { res.status(500).json({ error: 'server error' }) }
})

// PATCH /api/teams/:id
app.patch('/api/teams/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id
    const existing = db.findTeamById(id)
    if (!existing) return res.status(404).json({ error: 'not found' })
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' })
    const patch = {}
    if ('name' in req.body) patch.name = req.body.name
    if ('deadline' in req.body) patch.deadline = req.body.deadline ? new Date(req.body.deadline).toISOString() : null
    if ('members' in req.body) patch.members = normalizeTeamMembers(req.body.members)
    if ('description' in req.body) patch.description = typeof req.body.description === 'string' ? req.body.description.trim() || null : null
    if ('color' in req.body) patch.color = sanitizeColor(req.body.color)
    if ('visibility' in req.body) patch.visibility = normalizeVisibility(req.body.visibility)
    if ('workflow' in req.body) patch.workflow = normalizeWorkflow(req.body.workflow)
    const updated = db.updateTeam(id, patch)
    res.json({ team: updated })
  } catch (err) { res.status(500).json({ error: 'server error' }) }
})

// DELETE /api/teams/:id
app.delete('/api/teams/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id
    const existing = db.findTeamById(id)
    if (!existing) return res.status(404).json({ error: 'not found' })
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' })
    const ok = db.deleteTeam(id)
    res.json({ ok })
  } catch (err) { res.status(500).json({ error: 'server error' }) }
})
// Only start the server when this file is run directly. This allows tests to import the app.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
