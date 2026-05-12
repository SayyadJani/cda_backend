import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

/**
 * @desc    Get all jobs with filtering (Optimized with DB-level Pagination)
 * @route   GET /api/jobs
 * @access  Private
 */
export const getJobs = async (req: any, res: Response) => {
  try {
    const pageStr = String(req.query.page || '1');
    const limitStr = String(req.query.limit || '10');
    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.max(1, parseInt(limitStr) || 10);
    const skip = (page - 1) * limit;

    const status = req.query.status && req.query.status !== 'all' ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const domain = req.query.domain && req.query.domain !== 'All Domains' ? String(req.query.domain) : undefined;
    const month = req.query.month !== undefined ? parseInt(String(req.query.month)) : undefined;
    const year = req.query.year !== undefined ? parseInt(String(req.query.year)) : undefined;
    const location = req.query.location && req.query.location !== 'All Countries' ? String(req.query.location) : undefined;
    const jobType = req.query.jobType && req.query.jobType !== 'All Types' ? String(req.query.jobType) : undefined;

    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
    const adminId = adminUser?.id;
    const userId = req.user.id;

    // Build the user/admin ownership filter
    const ownershipFilter = adminId
      ? { OR: [{ userId }, { userId: adminId }] }
      : { userId };

    // Build month/year filter if provided
    const dateFilter = (month !== undefined && !isNaN(month) && year !== undefined && !isNaN(year))
      ? { createdAt: { gte: new Date(year, month, 1), lte: new Date(year, month + 1, 0, 23, 59, 59) } }
      : undefined;

    // Pool query — used for stats and dedup. Only ownership + domain + date filters.
    // OPTIMIZATION: Exclude 'description' field here as it is very large and not needed for stats/dedup.
    const poolWhere: any = {
      AND: [
        ownershipFilter,
        ...(domain ? [{ domain }] : []),
        ...(dateFilter ? [dateFilter] : []),
      ]
    };

    if (search) {
      const keywords = search.split(/\s+/).filter((k: string) => k.length > 0);
      keywords.forEach((kw: string) => {
        poolWhere.AND.push({
          OR: [
            { company: { contains: kw, mode: 'insensitive' } },
            { title: { contains: kw, mode: 'insensitive' } },
            { location: { contains: kw, mode: 'insensitive' } },
            { domain: { contains: kw, mode: 'insensitive' } },
            { source: { contains: kw, mode: 'insensitive' } }
          ]
        });
      });
    }

    const poolOfJobs = await prisma.job.findMany({
      where: poolWhere,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        country: true,
        job_url: true,
        source: true,
        date_posted: true,
        scraped_at: true,
        employment_type: true,
        seniority: true,
        salary: true,
        skills: true,
        is_remote: true,
        apply_type: true,
        recruiter_email: true,
        apply_link: true,
        source_type: true,
        direct_apply: true,
        ATS_apply: true,
        status: true,
        isSaved: true,
        isApplied: true,
        domain: true,
        userId: true,
        createdAt: true,
        updatedAt: true
        // description excluded here
      }
    });

    // Deduplicate: Prioritize versions that have been interacted with (saved/applied)
    const globalJobMap = new Map<string, any>();
    poolOfJobs.forEach(job => {
      const key = `${job.company.toLowerCase().trim()}|${job.title.toLowerCase().trim()}`;
      const existing = globalJobMap.get(key);
      
      if (!existing) {
        globalJobMap.set(key, job);
      } else {
        // Priority logic: Interacted jobs (saved/applied) > Non-interacted jobs
        const existingIsInteracted = existing.isSaved || existing.isApplied;
        const currentIsInteracted = job.isSaved || job.isApplied;
        
        if (currentIsInteracted && !existingIsInteracted) {
          globalJobMap.set(key, job);
        } else if (currentIsInteracted === existingIsInteracted) {
          // If both have same interaction status, user-owned version wins over others
          if (job.userId === userId && existing.userId !== userId) {
            globalJobMap.set(key, job);
          }
        }
      }
    });

    const allDedupedJobs = Array.from(globalJobMap.values());

    // Stats from the full deduped pool (no status filter)
    const stats = { discover: 0, saved: 0, applied: 0 };
    const domainStats: Record<string, number> = {};
    allDedupedJobs.forEach(job => {
      if (job.isApplied) stats.applied++;
      else if (job.isSaved) stats.saved++;
      else stats.discover++;
      const d = job.domain || 'General';
      domainStats[d] = (domainStats[d] || 0) + 1;
    });

    // Apply remaining filters (status, location, jobType) in memory
    const filteredJobs = allDedupedJobs.filter(job => {
      // Status filter
      if (status === 'started' || status === 'saved') {
        if (!job.isSaved) return false;
      } else if (status === 'completed' || status === 'applied') {
        if (!job.isApplied) return false;
      }

      // Location filter
      if (location) {
        const loc = (job.location || '').toLowerCase();
        if (location === 'Remote') {
          if (!loc.includes('remote') && !job.is_remote) return false;
        } else {
          if (!loc.includes(location.toLowerCase())) return false;
        }
      }

      // Job type filter (matches employment_type or title)
      if (jobType) {
        const jt = jobType.toLowerCase();
        const matchesType = (job.employment_type || '').toLowerCase().includes(jt) ||
                            job.title.toLowerCase().includes(jt);
        if (!matchesType) return false;
      }

      return true;
    });

    const totalCount = filteredJobs.length;
    const paginatedJobs = filteredJobs.slice(skip, skip + limit);

    // Fetch descriptions only for the paginated result to keep the response light
    // OPTIMIZATION: Use a single batch query instead of Promise.all(map)
    const paginatedIds = paginatedJobs.map(j => j.id);
    const descriptions = await prisma.job.findMany({
      where: { id: { in: paginatedIds } },
      select: { id: true, description: true }
    });

    // Map descriptions back to jobs
    const descMap = new Map(descriptions.map(d => [d.id, d.description]));
    const jobsWithDescription = paginatedJobs.map(job => ({
      ...job,
      description: descMap.get(job.id) || ""
    }));

    return res.status(200).json({
      jobs: jobsWithDescription,
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
      currentPage: page,
      stats,
      domainStats
    });
  } catch (error: any) {
    console.error("GET_JOBS_ERROR:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
      user: req.user?.id
    });
    return res.status(500).json({
      message: "Internal server error during job retrieval",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    const userId = req.user.id;
    const adminId = adminUser?.id || '';

    const allJobs = await prisma.job.findMany({
      where: {
        OR: [
          { userId: userId },
          { userId: adminId }
        ]
      },
      select: { company: true, title: true, status: true, userId: true, isApplied: true, isSaved: true }
    });

    const stats = {
      discover: 0,
      saved: 0,
      applied: 0
    };

    const processedJobs = new Set<string>();
    
    // Prioritize user jobs in stats
    const sortedJobs = allJobs.sort((a, b) => (a.userId === userId ? -1 : 1));

    sortedJobs.forEach((job: any) => {
      const key = `${job.company}-${job.title}`;
      if (!processedJobs.has(key)) {
        processedJobs.add(key);
        if (job.isApplied) stats.applied++;
        if (job.isSaved) stats.saved++;
        if (!job.isApplied && !job.isSaved) stats.discover++;
      }
    });

    res.status(200).json(stats);
  } catch (error: any) {
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
