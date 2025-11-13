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
app.use(express.static(path.join(__dirname, 'public')));

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
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  const existing = db.findUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'user exists' });

  const hashed = bcrypt.hashSync(password, 10);
  const user = {
    id: uuidv4(),
    email,
    name: name || null,
    password: hashed,
    createdAt: new Date().toISOString()
  };
  db.addUser(user);
  const { password: _p, ...publicUser } = user;
  res.status(201).json({ user: publicUser });
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = db.findUserByEmail(email);
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
    const { title, project, start, end, description, billable } = req.body || {};
    if (!start) return res.status(400).json({ error: 'start is required' });
    const entry = {
      id: uuidv4(),
      userId: req.user.id,
      title: title || 'Untitled',
      project: project || null,
      start: new Date(start).toISOString(),
      end: end ? new Date(end).toISOString() : null,
      description: description || null,
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
    ['title','project','start','end','description','billable'].forEach(k => {
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
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const project = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      description: description || null,
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
    ['name', 'description'].forEach(k => { if (k in req.body) patch[k] = req.body[k]; });
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
    const { title, description, projectId, status } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    const task = {
      id: uuidv4(),
      userId: req.user.id,
      title,
      description: description || null,
      projectId: projectId || null,
      status: status || 'open',
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
    ['title','description','projectId','status'].forEach(k => { if (k in req.body) patch[k] = req.body[k]; });
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
// Only start the server when this file is run directly. This allows tests to import the app.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
