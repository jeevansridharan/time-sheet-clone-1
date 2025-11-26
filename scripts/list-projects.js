const prisma = require('../server/prismaClient')

async function markComplete(projectId) {
  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'Complete',
        timerPaused: true,
        totalHoursWorked: {
          increment: 0 // Reset timer to zero
        }
      }
    });
    console.log(`Project ${projectId} marked as complete.`);
  } catch (err) {
    console.error('Error marking project as complete:', err);
  } finally {
    await prisma.$disconnect();
  }
}

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

module.exports = { markComplete }
