#!/usr/bin/env node
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = require(path.join(__dirname, '..', 'server', 'db'));

function question(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  const envEmail = process.env.ADMIN_EMAIL;
  const envPass = process.env.ADMIN_PASSWORD;
  const envName = process.env.ADMIN_NAME;

  let email = envEmail;
  let password = envPass;
  let name = envName;

  if (!email) email = (await question('Admin email: ')).trim();
  if (!password) password = (await question('Admin password: ')).trim();
  if (!name) name = (await question('Admin name (optional): ')).trim() || 'Admin';

  if (!email || !password) {
    console.error('Email and password are required.');
    process.exit(2);
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    console.error('A user with this email already exists:', email);
    process.exit(1);
  }

  const hashed = bcrypt.hashSync(password, 10);
  const user = { id: uuidv4(), email, name, password: hashed, createdAt: new Date().toISOString() };
  db.addUser(user);
  console.log('Admin user created:', email);
}

main().catch(err => { console.error(err); process.exit(1); });
