import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

/**
 * @desc    Get all plans
 * @route   GET /api/plans
 * @access  Public
 */
export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany();
    
    // If no plans in DB, return some defaults
    if (plans.length === 0) {
      return res.status(200).json([
        { id: "free", name: "FREE", price: 0, features: ["Limited Resumes", "Job Tracking"] },
        { id: "pro", name: "PRO", price: 49, features: ["Unlimited Resumes", "AI Tailoring", "ATS Analysis"] }
      ]);
    }
    
    res.status(200).json(plans);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Initiate subscription checkout
 * @route   POST /api/subscriptions/checkout
 * @access  Private
 */
export const initiateCheckout = async (req: Request, res: Response) => {
  try {
    const planId = String(req.body.planId || 'pro');
    const interval = String(req.body.interval || 'monthly');
    
    // Real implementation would integrate Stripe here
    res.status(200).json({
      sessionId: 'mock_stripe_session_id',
      url: `https://checkout.stripe.com/pay/${planId}_${interval}`
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
