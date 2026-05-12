import { Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/prisma.js';
import cloudinary from '../config/cloudinary.js';

// ─── Multer: memory storage (no disk writes) ──────────────────────────────────
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Upload a PDF, DOC, DOCX, or TXT file.'));
    }
  },
}).single('file');

// ─── GET /api/resumes ─────────────────────────────────────────────────────────
export async function getResumes(req: any, res: Response) {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(resumes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ─── POST /api/resumes ───────────────────────────────────────────────────────
export async function saveResume(req: any, res: Response) {
  try {
    const { name, url, atsMatchScore, atsReport } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Resume name is required.' });
    }

    const resume = await prisma.resume.create({
      data: {
        name,
        url,
        atsMatchScore: atsMatchScore || null,
        atsReport: atsReport || null,
        userId: req.user.id
      }
    });

    res.status(201).json(resume);
  } catch (error: any) {
    console.error("Save Resume Error:", error);
    res.status(500).json({ error: error.message || "Failed to save resume" });
  }
}

// ─── DELETE /api/resumes/:id ──────────────────────────────────────────────────
export async function deleteResume(req: any, res: Response) {
  try {
    const { id } = req.params;
    
    // Ensure it belongs to user
    const resume = await prisma.resume.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    await prisma.resume.delete({ where: { id } });
    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ─── PUT /api/resumes/:id ─────────────────────────────────────────────────────
export async function updateResume(req: Request, res: Response) {
  // TODO: Update in DB
  res.json({ success: true });
}

// ─── GET /api/resumes/:id/ats-report ─────────────────────────────────────────
export async function getAtsReport(req: Request, res: Response) {
  res.json({
    score: 72,
    breakdown: { impact: 75, brevity: 68, appearance: 80 },
    detections: { contact: true, linkedin: false, portfolio: true },
    checks: [
      { title: 'Contact info present', desc: 'Email and phone detected.', passed: true },
      { title: 'LinkedIn URL', desc: 'No LinkedIn URL found.', passed: false },
      { title: 'Quantified achievements', desc: 'Add numbers/metrics to bullets.', passed: false },
      { title: 'Section headers clear', desc: 'Standard headings detected.', passed: true },
    ],
    improvementsMade: ['Reformatted dates', 'Consolidated bullet points', 'Highlighted technical keywords'],
  });
}

// ─── POST /api/resumes/parse ──────────────────────────────────────────────────
export async function parseResume(req: any, res: Response) {
  try {
    const { targetRole } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please upload a resume file.' });
    }

    // [INSTITUTIONAL_MOCK_ENGINE] 
    // In production, this would use pdf-parse and Ollama/OpenAI
    const mockData = {
      personalInfo: {
        fullName: "Sayyad Jani Pasha",
        email: "sayyad@example.com",
        phone: "+91 98765 43210",
        location: "Hyderabad, India",
        link: "linkedin.com/in/sayyad",
        summary: `Strategic ${targetRole || 'Professional'} with expertise in architecting high-performance systems. Passionate about developer experience and clean codebases.`
      },
      experience: [
        {
          id: "exp_1",
          company: "Nexvelt Technologies",
          role: targetRole || "Senior Engineer",
          location: "Remote",
          period: "2022 - Present",
          description: "Leading architectural design and AI engine development. Reduced infrastructure costs by 40%."
        }
      ],
      education: [
        {
          id: "edu_1",
          school: "JNTU University",
          degree: "B.Tech in Computer Science",
          location: "Hyderabad",
          period: "2014 - 2018",
          description: "Graduated with Distinction."
        }
      ],
      skills: ["React", "Node.js", "TypeScript", "AI Integration", "System Design"],
      projects: [],
      languages: ["English", "Hindi"]
    };

    // Upload to Cloudinary for storage
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    const cloudRes = await cloudinary.uploader.upload(dataURI, {
      folder: "resumes",
      resource_type: "auto"
    });

    res.json({
      success: true,
      data: mockData,
      url: cloudRes.secure_url
    });
  } catch (error: any) {
    console.error("Parse Error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Legacy alias (used by old route)
export const generateResume = saveResume;
