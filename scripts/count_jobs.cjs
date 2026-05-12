const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobCount = await prisma.job.count();
  console.log(`Total Jobs in Database: ${jobCount}`);
  
  const jobs = await prisma.job.findMany({
    select: {
      title: true,
      company: true,
      source: true
    }
  });
  
  console.log('\nJobs List:');
  jobs.forEach((j, i) => {
    console.log(`${i+1}. ${j.title} @ ${j.company} [Source: ${j.source}]`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
