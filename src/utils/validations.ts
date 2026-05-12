import { z } from 'zod';

export const jobSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    company: z.string().min(1, 'Company name is required'),
    location: z.string().optional(),
    country: z.string().optional(),
    job_url: z.string().optional(),
    source: z.string().optional(),
    date_posted: z.string().optional(),
    scraped_at: z.string().optional(),
    employment_type: z.string().optional(),
    seniority: z.string().optional(),
    skills: z.array(z.string()).optional(),
    description: z.string().optional(),
    is_remote: z.boolean().optional(),
    apply_type: z.string().optional(),
    recruiter_email: z.string().email().optional().or(z.literal('')).or(z.null()),
    apply_link: z.string().url('Invalid application URL').optional().or(z.literal('')),
    source_type: z.string().optional(),
    direct_apply: z.boolean().optional(),
    ATS_apply: z.boolean().optional(),
    domain: z.string().optional(),
    status: z.enum(['discover', 'started', 'completed']).default('discover'),
  })
});

export const bulkJobSchema = z.object({
  body: z.object({
    userId: z.string().uuid().or(z.literal('admin')),
    jobs: z.array(z.object({
      title: z.string().optional(),
      company: z.string().optional(),
      location: z.string().optional(),
      country: z.string().optional(),
      job_url: z.string().optional(),
      source: z.string().optional(),
      date_posted: z.string().optional(),
      scraped_at: z.string().optional(),
      employment_type: z.string().optional(),
      seniority: z.string().optional(),
      skills: z.array(z.string()).optional(),
      description: z.string().optional(),
      is_remote: z.boolean().optional(),
      apply_type: z.string().optional(),
      recruiter_email: z.string().optional().or(z.null()),
      apply_link: z.string().optional(),
      source_type: z.string().optional(),
      direct_apply: z.boolean().optional(),
      ATS_apply: z.boolean().optional(),
      domain: z.string().optional(),
    })),
  })
});

// --- Auth Validations ---
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['client', 'admin']).optional(),
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  })
});

// --- Resume Validations ---
export const resumeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Resume name is required'),
    url: z.string().url('Invalid resume URL').optional().or(z.literal('')).or(z.null()),
    isMain: z.boolean().optional(),
    type: z.string().optional(),
    atsMatchScore: z.number().optional(),
    atsReport: z.any().optional(),
  })
});

// --- Subscription Validations ---
export const subscriptionSchema = z.object({
  body: z.object({
    planType: z.enum(['STARTER', 'PRO', 'ELITE']),
    price: z.number().min(0),
    status: z.enum(['active', 'canceled', 'past_due']).optional(),
  })
});

export const checkoutSchema = z.object({
  body: z.object({
    planId: z.string().min(1, 'Plan ID is required'),
    interval: z.enum(['monthly', 'yearly']).default('monthly'),
  })
});
