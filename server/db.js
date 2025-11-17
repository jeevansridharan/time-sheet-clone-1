const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

let _db = { users: [], entries: [], projects: [], tasks: [], teams: [] };

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      _db = JSON.parse(raw || '{}');
      if (!Array.isArray(_db.users)) _db.users = [];
      if (!Array.isArray(_db.entries)) _db.entries = [];
      if (!Array.isArray(_db.projects)) _db.projects = [];
  if (!Array.isArray(_db.tasks)) _db.tasks = [];
  if (!Array.isArray(_db.teams)) _db.teams = [];
    } else {
      save();
    }
  } catch (err) {
    console.error('Failed to load DB:', err);
    _db = { users: [], entries: [], projects: [], tasks: [], teams: [] };
    save();
  }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(_db, null, 2), 'utf8');
}

function getUsers() {
  return _db.users;
}

function getEntries() {
  return _db.entries || [];
}

function findEntryById(id) {
  return getEntries().find(e => e.id === id);
}

function addEntry(entry) {
  _db.entries = _db.entries || [];
  _db.entries.push(entry);
  save();
}

function updateEntry(id, patch) {
  const idx = getEntries().findIndex(e => e.id === id);
  if (idx === -1) return null;
  _db.entries[idx] = { ..._db.entries[idx], ...patch, updatedAt: new Date().toISOString() };
  save();
  return _db.entries[idx];
}

function deleteEntry(id) {
  const before = getEntries().length;
  _db.entries = getEntries().filter(e => e.id !== id);
  const after = _db.entries.length;
  if (after !== before) save();
  return before !== after;
}

function findUserByEmail(email) {
  return _db.users.find(u => u.email === email);
}

function findUserByPhone(phone) {
  if (!phone) return undefined;
  return _db.users.find(u => u.phone === phone);
}

function findUserById(id) {
  return _db.users.find(u => u.id === id);
}

function addUser(user) {
  _db.users.push(user);
  save();
}

// Projects
function getProjects() {
  return _db.projects || [];
}
function findProjectById(id) {
  return getProjects().find(p => p.id === id);
}
function addProject(project) {
  _db.projects = _db.projects || [];
  _db.projects.push(project);
  save();
}
function updateProject(id, patch) {
  const idx = getProjects().findIndex(p => p.id === id);
  if (idx === -1) return null;
  _db.projects[idx] = { ..._db.projects[idx], ...patch, updatedAt: new Date().toISOString() };
  save();
  return _db.projects[idx];
}
function deleteProject(id) {
  const before = getProjects().length;
  _db.projects = getProjects().filter(p => p.id !== id);
  const after = _db.projects.length;
  if (after !== before) save();
  return before !== after;
}

// Tasks
function getTasks() {
  return _db.tasks || [];
}
function findTaskById(id) {
  return getTasks().find(t => t.id === id);
}
function addTask(task) {
  _db.tasks = _db.tasks || [];
  _db.tasks.push(task);
  save();
}
function updateTask(id, patch) {
  const idx = getTasks().findIndex(t => t.id === id);
  if (idx === -1) return null;
  _db.tasks[idx] = { ..._db.tasks[idx], ...patch, updatedAt: new Date().toISOString() };
  save();
  return _db.tasks[idx];
}
function deleteTask(id) {
  const before = getTasks().length;
  _db.tasks = getTasks().filter(t => t.id !== id);
  const after = _db.tasks.length;
  if (after !== before) save();
  return before !== after;
}

// Teams
function getTeams() { return _db.teams || [] }
function findTeamById(id) { return getTeams().find(t => t.id === id) }
function addTeam(team) { _db.teams = _db.teams || []; _db.teams.push(team); save() }
function updateTeam(id, patch) {
  const idx = getTeams().findIndex(t => t.id === id)
  if (idx === -1) return null
  _db.teams[idx] = { ..._db.teams[idx], ...patch, updatedAt: new Date().toISOString() }
  save();
  return _db.teams[idx]
}
function deleteTeam(id) {
  const before = getTeams().length
  _db.teams = getTeams().filter(t => t.id !== id)
  const after = _db.teams.length
  if (after !== before) save()
  return before !== after
}

load();

module.exports = {
  getUsers,
  findUserByEmail,
  findUserByPhone,
  findUserById,
  addUser,
  getEntries,
  findEntryById,
  addEntry,
  updateEntry,
  deleteEntry,
  // projects
  getProjects,
  findProjectById,
  addProject,
  updateProject,
  deleteProject,
  // tasks
  getTasks,
  findTaskById,
  addTask,
  updateTask,
  deleteTask,
  // teams
  getTeams,
  findTeamById,
  addTeam,
  updateTeam,
  deleteTeam,
  save,
  DB_PATH
};

