const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

let _db = { users: [], entries: [] };

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      _db = JSON.parse(raw || '{}');
      if (!Array.isArray(_db.users)) _db.users = [];
    } else {
      save();
    }
  } catch (err) {
    console.error('Failed to load DB:', err);
    _db = { users: [] };
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

function findUserById(id) {
  return _db.users.find(u => u.id === id);
}

function addUser(user) {
  _db.users.push(user);
  save();
}

load();

module.exports = {
  getUsers,
  findUserByEmail,
  findUserById,
  addUser,
  getEntries,
  findEntryById,
  addEntry,
  updateEntry,
  deleteEntry,
  save,
  DB_PATH
};

