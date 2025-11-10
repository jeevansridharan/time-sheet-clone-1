const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());

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

// Only start the server when this file is run directly. This allows tests to import the app.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
