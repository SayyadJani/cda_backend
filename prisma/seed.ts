import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clean existing data (Optional but recommended for fresh start)
  await prisma.notificationPrefs.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // 2. Create Users
  const user1 = await prisma.user.create({
    data: {
      id: 'd3b07384-d990-4495-9518-e32501064601', // Fixed ID for Demo User
      email: 'demo@nexvelt.com',
      password: hashedPassword,
      name: 'Demo User',
      role: 'client',
      onboardingStatus: 'completed',
      targetRole: 'Senior Frontend Engineer',
      domain: 'software_engineering',
      experienceLevel: 'Senior',
      workType: 'Remote',
      bio: 'Passionate about building premium web applications with React and Next.js.',
      phone: '1234567890',
      countryName: 'United States',
      countryCode: 'US',
      dialCode: '+1',
      subscription: {
        create: {
          planType: 'ULTIMATE',
          price: 99.99,
          status: 'active',
        }
      },
      notificationPrefs: {
        create: {
          emailAlerts: true,
          pushNotifications: true,
          weeklyReports: true,
          interviewReminders: true,
        }
      }
    }
  });

  // Restore Active User
  await prisma.user.create({
    data: {
      id: 'ee283b5d-0d25-4f90-835d-bbdc224a901d',
      email: 'janipasha@example.com', // Placeholder
      password: hashedPassword,
      name: 'JANI PASHA',
      role: 'client',
      onboardingStatus: 'completed',
      subscription: { create: { planType: 'STARTER', status: 'active' } },
      notificationPrefs: { create: {} }
    }
  });

  const user2 = await prisma.user.create({
    data: {
      id: 'a1b07384-d990-4495-9518-e32501064602', // Fixed ID for Admin User
      email: 'admin@nexvelt.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      onboardingStatus: 'completed',
      subscription: {
        create: {
          planType: 'STARTER',
          status: 'active',
        }
      },
      notificationPrefs: {
        create: {}
      }
    }
  });

  // 3. Create Jobs for Admin (Global Discovery)
  await prisma.job.createMany({
    data: [
      {
        userId: user2.id,
        company: 'Laylo',
        title: 'Senior Fullstack Engineer',
        location: 'Remote',
        country: 'US',
        job_url: 'https://www.ycombinator.com/companies/laylo/jobs/ZVMFWsc-senior-fullstack-engineer',
        source: 'yc',
        date_posted: new Date('2026-05-06T06:55:21.033Z'),
        scraped_at: new Date('2026-05-06T06:55:24.510Z'),
        employment_type: 'Full-time',
        seniority: 'senior',
        skills: ['typescript', 'node.js', 'react', 'graphql', 'aws', 'ai', 'product', 'design', 'figma'],
        description: "The Story\n\nOur founders, Alec and Sajan, started Laylo after watching the music industry get strip-mined by platforms that owned\nthe fan relationship and rented it back to artists. We're building the infrastructure for the next generation of\nentertainment: a direct messaging and CRM layer that lets creators own their audience, drop products to them, and drive\nreal revenue without paying a middleman tax.\n\nToday, Laylo is the drop CRM powering some of the biggest names in music, live events, and entertainment. We replace the\npatchwork of email, SMS, presave, and tour announcement tools with one platform. Over 40,000 creators use Laylo to drop\nmore than $1B in tickets, merch, and music to millions of fans, including artists like Zach Bryan and Sabrina Carpenter,\nand festivals like Outside Lands.\n\nWe're a 24-person team based around the world, profitable, and growing fast. We went through Y Combinator (S20) and are\nbacked by Eldridge, Sony, and other top-tier investors.\n\nAs a full stack engineer, writing code and building beautiful user experiences is just one part of your job. You'll also\ntalk to users, get involved with design, and develop your own opinion on what needs to exist in the world.",
        is_remote: true,
        apply_type: 'direct',
        apply_link: 'https://www.ycombinator.com/apply',
        source_type: 'company',
        direct_apply: true,
        ATS_apply: false,
        status: 'discover',
        domain: 'Software'
      },
      {
        userId: user2.id,
        company: 'Porter',
        title: 'Founding Security Engineer',
        location: 'Remote',
        country: 'US',
        job_url: 'https://www.ycombinator.com/companies/porter/jobs/UdlFqlr-founding-security-engineer',
        source: 'yc',
        date_posted: new Date('2026-05-06T06:55:20.557Z'),
        scraped_at: new Date('2026-05-06T06:55:24.509Z'),
        employment_type: 'Full-time',
        seniority: 'mid',
        skills: ['go', 'sql', 'rest', 'api', 'aws', 'gcp', 'azure', 'kubernetes', 'ai', 'product', 'design'],
        description: 'Porter is the cloud platform for modern tech companies...',
        is_remote: true,
        apply_type: 'direct',
        apply_link: 'https://www.ycombinator.com/apply',
        source_type: 'company',
        direct_apply: true,
        ATS_apply: false,
        status: 'discover',
        domain: 'Software'
      },
      {
        userId: user2.id,
        company: 'Google',
        title: 'Senior Frontend Engineer',
        location: 'Mountain View, CA',
        status: 'interview',
        domain: 'Big Tech',
        source: 'LinkedIn',
        apply_link: 'https://careers.google.com'
      },
      {
        userId: user2.id,
        company: 'Meta',
        title: 'Software Engineer',
        location: 'Remote',
        status: 'started',
        domain: 'Social Media',
        source: 'Direct',
        apply_link: 'https://metacareers.com'
      }
    ]
  });

  // 4. Create Resumes
  await prisma.resume.create({
    data: {
      userId: user1.id,
      name: 'Modern Fullstack Resume.pdf',
      url: 'https://example.com/resume1.pdf',
      isMain: true,
      type: 'Main',
      atsMatchScore: 92,
    }
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
