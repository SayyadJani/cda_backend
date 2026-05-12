import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// ─── POST /api/ats/request ──────────────────────────────────────────────────
export async function requestATS(req: any, res: Response) {
  try {
    const { resumeId, targetRole, applicantName } = req.body;
    
    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required.' });
    }

    // Ensure resume exists
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: req.user.id }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found. Please save your resume first.' });
    }

    // Check if a request already exists for this resume and user
    const existing = await prisma.aTSRequest.findFirst({
      where: { userId: req.user.id, resumeId }
    });

    if (existing) {
       // Just update it if it's already there
       const updated = await prisma.aTSRequest.update({
         where: { id: existing.id },
         data: {
           targetRole,
           applicantName,
           status: 'PENDING'
         }
       });
       return res.json(updated);
    }

    const request = await prisma.aTSRequest.create({
      data: {
        userId: req.user.id,
        resumeId,
        targetRole,
        applicantName,
        status: 'PENDING'
      }
    });

    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ─── GET /api/ats/my-requests ──────────────────────────────────────────────
export async function getMyATSRequests(req: any, res: Response) {
  try {
    const requests = await prisma.aTSRequest.findMany({
      where: { userId: req.user.id },
      include: { resume: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ─── Admin Endpoints ───

// ─── GET /api/admin/ats/requests ───────────────────────────────────────────
export async function getAllATSRequests(req: any, res: Response) {
  try {
    const requests = await prisma.aTSRequest.findMany({
      include: { 
        user: { select: { name: true, email: true } },
        resume: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ─── POST /api/admin/ats/requests/:id/generate ────────────────────────────
export async function generateATSReport(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { reportData, atsMatchScore } = req.body;

    const request = await prisma.aTSRequest.update({
      where: { id },
      data: {
        status: 'GENERATED',
        reportData
      }
    });

    // Also update the resume with the score
    await prisma.resume.update({
      where: { id: request.resumeId },
      data: {
        atsMatchScore: parseInt(atsMatchScore) || 90,
        atsReport: reportData
      }
    });

    res.json({ success: true, request });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
