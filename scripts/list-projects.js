const prisma = require('../server/prismaClient')

async function main() {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
    console.log(JSON.stringify(projects, null, 2))
  } catch (err) {
    console.error('Error listing projects:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
