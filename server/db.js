const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

let _db = { users: [] };

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
  save,
  DB_PATH
};
