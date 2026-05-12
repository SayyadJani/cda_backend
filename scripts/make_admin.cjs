const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'janipashajani96@gmail.com';
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin' }
  });
  console.log(`User ${email} is now an admin.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
