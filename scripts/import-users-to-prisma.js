const fs = require('fs')
const path = require('path')
const prisma = require('../server/prismaClient')

async function importUsers() {
  const dbPath = path.join(__dirname, '..', 'server', 'db.json')
  if (!fs.existsSync(dbPath)) {
    console.error('server/db.json not found')
    process.exit(1)
  }
  const raw = fs.readFileSync(dbPath, 'utf8')
  let data
  try {
    data = JSON.parse(raw || '{}')
  } catch (err) {
    console.error('Failed to parse db.json', err)
    process.exit(1)
  }
  const users = Array.isArray(data.users) ? data.users : []
  console.log(`Found ${users.length} users in server/db.json`)
  for (const u of users) {
    try {
      await prisma.user.upsert({
        where: { id: u.id },
        create: {
          id: u.id,
          email: u.email,
          name: u.name || null,
          password: u.password || '',
          role: u.role || 'user',
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
        },
        update: {
          email: u.email,
          name: u.name || null,
          password: u.password || '',
          role: u.role || 'user'
        }
      })
      console.log('Upserted user', u.email || u.id)
    } catch (err) {
      console.error('Failed to upsert user', u.email || u.id, err.message || err)
    }
  }
  console.log('User import complete')
}

importUsers()
  .then(() => prisma.$disconnect())
  .catch(err => { console.error(err); prisma.$disconnect(); process.exit(1) })
