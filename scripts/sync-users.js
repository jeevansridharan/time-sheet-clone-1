
const { PrismaClient } = require('@prisma/client');
const db = require('../server/db');

const prisma = new PrismaClient();

async function main() {
  const jsonUsers = db.getUsers();
  let successCount = 0;
  let errorCount = 0;

  console.log(`Found ${jsonUsers.length} users in db.json. Starting sync to Prisma DB...`);

  for (const user of jsonUsers) {
    try {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          id: user.id,
          name: user.name,
          password: user.password,
          role: user.role,
        },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          role: user.role,
        },
      });
      console.log(`- Synced user: ${user.email}`);
      successCount++;
    } catch (error) {
      console.error(`- Failed to sync user ${user.email}:`, error.message);
      errorCount++;
    }
  }

  console.log('\nSync complete!');
  console.log(`- ${successCount} users synced successfully.`);
  console.log(`- ${errorCount} users failed to sync.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

