import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

/**
 * @desc    Get aggregated dashboard summary
 * @route   GET /api/dashboard/summary
 * @access  Private
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    // In real app, get userId from req.user
    const user = await prisma.user.findFirst({
      include: {
        jobs: true,
        resumes: true,
        assignments: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const summary = {
      usage: {
        resumesUsed: user.resumes.length,
        resumesLimit: 12,
        appsUsed: user.jobs.length,
        appsLimit: 20
      },
      stats: {
        totalJobCount: user.jobs.length,
        unreadJobCount: user.jobs.filter(j => j.status === 'discover').length,
        discoveryActivity: [
          { week: "Mon", found: 12, applied: 2 },
          { week: "Tue", found: 18, applied: 5 },
          { week: "Wed", found: 15, applied: 3 },
          { week: "Thu", found: 20, applied: 6 },
          { week: "Fri", found: 25, applied: 8 },
          { week: "Sat", found: 10, applied: 1 },
          { week: "Sun", found: 5, applied: 0 }
        ]
      },
      recentAssignments: user.assignments.map(a => ({
        id: a.id,
        title: a.title,
        status: a.status
      }))
    };

    res.status(200).json(summary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
