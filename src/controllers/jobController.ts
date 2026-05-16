import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';

/**
 * @desc    Get all jobs with filtering (Optimized with DB-level Pagination)
 * @route   GET /api/jobs
 * @access  Private
 */
export const getJobs = async (req: any, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.max(1, parseInt(req.query.limit || '10'));
    const skip = (page - 1) * limit;

    const status = req.query.status && req.query.status !== 'all' ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const domain = req.query.domain && req.query.domain !== 'All Domains' ? String(req.query.domain) : undefined;
    const location = req.query.location && req.query.location !== 'All Countries' ? String(req.query.location) : undefined;
    const jobType = req.query.jobType && req.query.jobType !== 'All Types' ? String(req.query.jobType) : undefined;

    const userId = req.user.id;
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
    const adminId = adminUser?.id || '';

    // 1. Build Base Filter for the Pool
    const baseConditions: Prisma.Sql[] = [Prisma.sql`("userId" = ${userId} OR "userId" = ${adminId})`];
    if (domain) baseConditions.push(Prisma.sql`"domain" = ${domain}`);
    
    const whereClause = Prisma.join(baseConditions, ' AND ');

    // 2. Optimized Deduplication & Filtering via Raw SQL
    // We use a CTE to get the "Unique Pool" (User version wins over Admin version)
    // Then we apply user-specific filters (Status, Search, Location) on that pool.
    const jobs: any[] = await prisma.$queryRaw`
      WITH UniquePool AS (
        SELECT DISTINCT ON (LOWER(TRIM(company)), LOWER(TRIM(title))) *
        FROM "Job"
        WHERE ${whereClause}
        ORDER BY LOWER(TRIM(company)), LOWER(TRIM(title)), (CASE WHEN "userId" = ${userId} THEN 0 ELSE 1 END) ASC, "createdAt" DESC
      )
      SELECT *, COUNT(*) OVER() as total_count
      FROM UniquePool
      WHERE 
        (${status === 'saved' || status === 'started' ? Prisma.sql`"isSaved" = true` : 
          status === 'applied' || status === 'completed' ? Prisma.sql`"isApplied" = true` : 
          Prisma.sql`true`})
        AND (${search ? Prisma.sql`("company" ILIKE ${'%' + search + '%'} OR "title" ILIKE ${'%' + search + '%'} OR "location" ILIKE ${'%' + search + '%'})` : Prisma.sql`true`})
        AND (${location ? Prisma.sql`"location" ILIKE ${'%' + location + '%'}` : Prisma.sql`true`})
        AND (${jobType ? Prisma.sql`("employment_type" ILIKE ${'%' + jobType + '%'} OR "title" ILIKE ${'%' + jobType + '%'})` : Prisma.sql`true`})
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalCount = jobs.length > 0 ? Number(jobs[0].total_count) : 0;
    
    // Normalize BigInts from Raw Query
    const normalizedJobs = jobs.map(job => {
      const { total_count, ...jobData } = job;
      return jobData;
    });

    // 3. Get Stats (Uses the optimized helper logic internally)
    // For simplicity, we'll return a separate stats call result if needed, 
    // but usually, the frontend handles this via a separate fetch or we can mock it here.
    const stats = { discover: 0, saved: 0, applied: 0 }; // Frontend will fetch these via /api/jobs/stats

    return res.status(200).json({
      jobs: normalizedJobs,
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
      currentPage: page,
      stats
    });
  } catch (error: any) {
    console.error("GET_JOBS_ERROR:", error);
    return res.status(500).json({ message: "Internal server error during job retrieval" });
  }
};


/**
 * @desc    Update job status
 * @route   PATCH /api/jobs/:id/status
 * @access  Private
 */
export const updateJobStatus = async (req: any, res: Response) => {
  const id = String(req.params.id);
  const { status, isSaved, isApplied } = req.body;
  const userId = req.user.id;

  const updateData: any = {};
  if (status !== undefined) updateData.status = String(status);
  if (isSaved !== undefined) updateData.isSaved = Boolean(isSaved);
  if (isApplied !== undefined) updateData.isApplied = Boolean(isApplied);

  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ message: 'Job node not found' });
    }

    // If it's the user's own job, update it
    if (job.userId === userId) {
      const updatedJob = await prisma.job.update({
        where: { id },
        data: updateData
      });
      return res.status(200).json(updatedJob);
    }

    // If it's a global admin job, clone it for the user
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (job.userId === adminUser?.id) {
       // Check if user already has a clone
       const existingClone = await prisma.job.findFirst({
         where: { 
           userId, 
           company: job.company, 
           title: job.title 
         }
       });

       if (existingClone) {
         const updated = await prisma.job.update({
           where: { id: existingClone.id },
           data: updateData
         });
         return res.status(200).json(updated);
       }

       // Create new user-specific instance with the updates
       const newUserJob = await prisma.job.create({
         data: {
           userId,
           company: job.company,
           title: job.title,
           location: job.location,
           country: job.country,
           job_url: job.job_url,
           date_posted: job.date_posted,
           scraped_at: job.scraped_at,
           employment_type: job.employment_type,
           seniority: job.seniority,
           salary: job.salary,
           skills: job.skills,
           description: job.description,
           is_remote: job.is_remote,
           apply_type: job.apply_type,
           recruiter_email: job.recruiter_email,
           source_type: job.source_type,
           direct_apply: job.direct_apply,
           ATS_apply: job.ATS_apply,
           domain: job.domain,
           source: job.source,
           apply_link: job.apply_link,
           status: job.status,
           ...updateData
         }
       });
       return res.status(201).json(newUserJob);
    }

    return res.status(403).json({ message: 'Unauthorized job interaction' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Admin: Create job for a user
 * @route   POST /api/jobs/admin
 */
export const createJob = async (req: any, res: Response) => {
  try {
    const { 
      userId, company, title, location, domain, source, apply_link,
      country, job_url, date_posted, scraped_at, employment_type,
      seniority, skills, description, is_remote, apply_type,
      recruiter_email, source_type, direct_apply, ATS_apply
    } = req.body;
    const job = await prisma.job.create({
      data: { 
        userId, company, title, location, domain, source, apply_link,
        country, job_url, 
        date_posted: date_posted ? new Date(date_posted) : null,
        scraped_at: scraped_at ? new Date(scraped_at) : new Date(),
        employment_type, seniority, skills, description, is_remote, 
        apply_type, recruiter_email, source_type, direct_apply, ATS_apply
      }
    });
    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Admin: Delete any job
 * @route   DELETE /api/jobs/admin/:id
 */
export const deleteJob = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.job.delete({ where: { id } });
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Admin: Bulk create jobs
 * @route   POST /api/jobs/admin/bulk
 */
export const bulkCreateJobs = async (req: any, res: Response) => {
  try {
    const { userId, jobs } = req.body;
    if (!Array.isArray(jobs)) {
      return res.status(400).json({ message: 'Jobs must be an array' });
    }

    // Resolve real Admin ID if 'admin' placeholder is sent
    let targetUserId = userId;
    if (userId === 'admin') {
      const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (!adminUser) {
        return res.status(404).json({ message: 'Admin user node not found in system.' });
      }
      targetUserId = adminUser.id;
    }

    console.log(`[BULK_CREATE] Mapping ${jobs.length} jobs for userId: ${targetUserId}`);
    
    const jobsToCreate = jobs.map((job: any) => ({
      userId: targetUserId,
      company: String(job.company || job.company_name || 'Unknown').substring(0, 255),
      title: String(job.title || job.job_title || 'Unknown Role').substring(0, 255),
      location: String(job.location || job.job_location || '').substring(0, 255),
      country: String(job.country || '').substring(0, 100),
      job_url: String(job.job_url || '').substring(0, 1000),
      source: String(job.source || 'scraped').substring(0, 50),
      date_posted: job.date_posted ? new Date(job.date_posted) : null,
      scraped_at: job.scraped_at ? new Date(job.scraped_at) : new Date(),
      employment_type: String(job.employment_type || '').substring(0, 50),
      seniority: String(job.seniority || '').substring(0, 50),
      salary: job.salary ? String(job.salary).substring(0, 100) : null,
      skills: Array.isArray(job.skills) ? job.skills : [],
      description: String(job.description || ''),
      is_remote: Boolean(job.is_remote),
      apply_type: String(job.apply_type || '').substring(0, 50),
      recruiter_email: job.recruiter_email ? String(job.recruiter_email).substring(0, 255) : null,
      apply_link: String(job.apply_link || job.link || '').substring(0, 1000),
      source_type: String(job.source_type || '').substring(0, 50),
      direct_apply: Boolean(job.direct_apply),
      ATS_apply: Boolean(job.ATS_apply),
      domain: String(job.domain || 'Software').substring(0, 100),
      status: 'discover'
    }));

    const result = await prisma.job.createMany({
      data: jobsToCreate,
      // skipDuplicates: true // Removed as it requires a unique constraint on PG
    });

    res.status(201).json({ 
      message: `Successfully imported ${result.count} jobs`,
      count: result.count 
    });
  } catch (error: any) {
    console.error("BULK_CREATE_ERROR:", {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: `Deployment failed: ${error.message}`,
      details: error.code // Prisma error code
    });
  }
};

/**
 * @desc    Get job statistics (global + user)
 * @route   GET /api/jobs/stats
 * @access  Private
 */
export const getJobStats = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
    const adminId = adminUser?.id || '';

    // PRODUCTION-GRADE OPTIMIZATION: Use Raw SQL with DISTINCT ON to deduplicate at the DB level.
    // This avoids fetching thousands of rows into server memory.
    const stats: any = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE "isApplied" = true) as applied,
        COUNT(*) FILTER (WHERE "isSaved" = true) as saved,
        COUNT(*) as discover
      FROM (
        SELECT DISTINCT ON (LOWER(TRIM(company)), LOWER(TRIM(title)))
          "isApplied", "isSaved", "userId"
        FROM "Job"
        WHERE "userId" = ${userId} OR "userId" = ${adminId}
        ORDER BY LOWER(TRIM(company)), LOWER(TRIM(title)), (CASE WHEN "userId" = ${userId} THEN 0 ELSE 1 END) ASC
      ) as unique_jobs
    `;

    const result = {
      applied: Number(stats[0].applied || 0),
      saved: Number(stats[0].saved || 0),
      discover: Number(stats[0].discover || 0)
    };

    res.status(200).json(result);
  } catch (error: any) {
    console.error("STATS_ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get Heatmap Data (Optimized for performance)
 * @route   GET /api/jobs/heatmap
 * @access  Private
 */
export const getHeatmapData = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    // We only need the essential metadata for jobs where isApplied is true
    const heatmapData = await prisma.job.findMany({
      where: {
        userId,
        isApplied: true
      },
      select: {
        id: true,
        title: true,
        company: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json(heatmapData);
  } catch (error: any) {
    console.error("GET_HEATMAP_ERROR:", error);
    res.status(500).json({ message: "Failed to fetch heatmap intelligence" });
  }
};

/**
 * @desc    Get single job by ID (Optimized)
 * @route   GET /api/jobs/:id
 * @access  Private
 */
export const getJobById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      return res.status(404).json({ message: "Job intelligence node not found" });
    }

    // If it's user's own job, return it directly
    if (job.userId === userId) {
      return res.status(200).json(job);
    }

    // If it's a global job (admin-owned)
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (job.userId === adminUser?.id) {
      // Check if user has their own interaction state for this job (deduplication logic)
      const userClone = await prisma.job.findFirst({
        where: {
          userId,
          company: job.company,
          title: job.title
        }
      });

      return res.status(200).json(userClone || job);
    }

    res.status(403).json({ message: "Access denied to this intelligence node" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
