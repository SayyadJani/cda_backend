const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const jobsData = [
  {
    "id": "bf92e7336c24ba90",
    "title": "Senior Fullstack Engineer",
    "company": "Laylo",
    "location": "Remote",
    "country": "US",
    "job_url": "https://www.ycombinator.com/companies/laylo/jobs/ZVMFWsc-senior-fullstack-engineer",
    "source": "yc",
    "date_posted": "2026-05-06T06:55:21.033Z",
    "scraped_at": "2026-05-06T06:55:24.510Z",
    "employment_type": "Full-time",
    "seniority": "senior",
    "skills": ["typescript", "node.js", "react", "graphql", "aws", "ai", "product", "design", "figma"],
    "description": "The Story\n\nOur founders, Alec and Sajan, started Laylo after watching the music industry get strip-mined by platforms that owned the fan relationship...",
    "is_remote": true,
    "apply_type": "direct",
    "apply_link": "https://www.ycombinator.com/apply",
    "source_type": "company",
    "direct_apply": true,
    "ATS_apply": false
  },
  {
    "id": "1003e161087872ed",
    "title": "Founding Security Engineer",
    "company": "Porter",
    "location": "Remote",
    "country": "US",
    "job_url": "https://www.ycombinator.com/companies/porter/jobs/UdlFqlr-founding-security-engineer",
    "source": "yc",
    "date_posted": "2026-05-06T06:55:20.557Z",
    "scraped_at": "2026-05-06T06:55:24.509Z",
    "employment_type": "Full-time",
    "seniority": "mid",
    "skills": ["go", "sql", "rest", "api", "aws", "gcp", "azure", "kubernetes", "ai", "product", "design"],
    "description": "Porter is the cloud platform for modern tech companies. We provide the power of the cloud without the complexity and cost...",
    "is_remote": true,
    "apply_type": "direct",
    "apply_link": "https://www.ycombinator.com/apply",
    "source_type": "company",
    "direct_apply": true,
    "ATS_apply": false
  },
  {
    "title": "Vercel Development Representative, Startups",
    "company": "Vercel",
    "location": "Hybrid - San Francisco",
    "apply_link": "https://job-boards.greenhouse.io/vercel/jobs/5815357004",
    "source": "greenhouse",
    "employment_type": "Full-time",
    "seniority": "mid"
  },
  {
    "title": "Software Engineer, Workflows",
    "company": "Vercel",
    "location": "Hybrid - San Francisco, New York City",
    "apply_link": "https://job-boards.greenhouse.io/vercel/jobs/5798416004",
    "source": "greenhouse",
    "employment_type": "Full-time",
    "seniority": "mid",
    "skills": ["next.js", "typescript", "react"]
  },
  {
    "title": "UX Writer, AI ",
    "company": "Figma",
    "location": "San Francisco, CA",
    "apply_link": "https://boards.greenhouse.io/figma/jobs/5839202004?gh_jid=5839202004",
    "source": "greenhouse",
    "employment_type": "Full-time",
    "seniority": "senior"
  },
  {
    "title": "Data Scientist",
    "company": "Airbnb",
    "location": "San Francisco, United States",
    "apply_link": "https://careers.airbnb.com/positions/7834336?gh_jid=7834336",
    "source": "greenhouse",
    "employment_type": "Full-time",
    "seniority": "mid"
  }
];

async function main() {
  console.log('Seeding jobs...');
  
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });

  if (!admin) {
    console.error('No admin user found.');
    return;
  }

  for (const job of jobsData) {
    const data = {
      title: job.title,
      company: job.company,
      location: job.location,
      country: job.country || 'US',
      job_url: job.job_url || job.apply_link,
      source: job.source,
      date_posted: job.date_posted ? new Date(job.date_posted) : new Date(),
      scraped_at: job.scraped_at ? new Date(job.scraped_at) : new Date(),
      employment_type: job.employment_type || 'Full-time',
      seniority: job.seniority || 'mid',
      skills: job.skills || [],
      description: job.description || `Exciting role at ${job.company}`,
      is_remote: job.is_remote || false,
      apply_type: job.apply_type || 'direct',
      apply_link: job.apply_link,
      source_type: job.source_type || 'company',
      direct_apply: job.direct_apply || true,
      ATS_apply: job.ATS_apply || false,
      domain: job.title.toLowerCase().includes('engineer') ? 'Software' : 
              job.title.toLowerCase().includes('data') ? 'Data Science' : 'General',
      userId: admin.id
    };

    if (job.id) {
      await prisma.job.upsert({
        where: { id: job.id },
        update: data,
        create: { id: job.id, ...data }
      });
    } else {
      // For ones without specific IDs, use company-title as a key check to avoid duplicates if possible
      const existing = await prisma.job.findFirst({
        where: { title: job.title, company: job.company, userId: admin.id }
      });
      if (!existing) {
        await prisma.job.create({ data });
      }
    }
  }

  console.log('Successfully seeded more jobs.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
