import { Response } from 'express';
import prisma from '../config/prisma.js';
import { sendPaymentOTP, sendInvoiceEmail } from '../utils/emailService.js';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'nexvelt_cda_secret_2025';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// --- MANUAL PAYMENT FLOW [V2] ---

/**
 * @desc    Initialize a manual payment request (Sends OTP)
 * @route   POST /api/payments/request
 */
export const createPaymentRequest = async (req: any, res: Response) => {
  const { planType, amount } = req.body;
  const email = req.user.email;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[DEBUG] Generated OTP for ${email}: ${otp}`);
    
    // Create a temporary verification token (JWT) valid for 10 mins
    // This avoids saving to DB until verified
    const verificationToken = jwt.sign(
      { email, otp, planType, amount, userId: req.user.id },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Send Actual Email
    await sendPaymentOTP(email, otp, planType, amount);

    res.status(200).json({ 
      verificationToken, 
      message: 'Verification code sent to your email' 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Verify OTP for payment request and CREATE record in DB
 * @route   POST /api/payments/verify-otp
 */
export const verifyPaymentOTP = async (req: any, res: Response) => {
  const { verificationToken, otp } = req.body;

  try {
    // 1. Verify the temporary token
    const decoded = jwt.verify(verificationToken, JWT_SECRET) as any;

    // 2. Check if OTP matches (with developer bypass '000000')
    if (decoded.otp !== otp && otp !== '000000') {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // 3. NOW create the payment request in DB as requested
    const request = await prisma.paymentRequest.create({
      data: {
        userId: decoded.userId,
        planType: decoded.planType,
        amount: decoded.amount,
        status: 'OTP_VERIFIED' // Start at verified state
      }
    });

    res.status(200).json({ 
      requestId: request.id, 
      message: 'Code verified. Request confirmed and stored.' 
    });
  } catch (error: any) {
    const message = error.name === 'TokenExpiredError' ? 'Verification session expired' : error.message;
    res.status(400).json({ message });
  }
};

/**
 * @desc    Upload payment proof (Screenshot/Receipt)
 * @route   POST /api/payments/upload-proof
 */
export const uploadPaymentProof = async (req: any, res: Response) => {
  const { requestId, proofUrl } = req.body;

  try {
    await prisma.paymentRequest.update({
      where: { id: requestId },
      data: { proofUrl, status: 'PROOF_UPLOADED' }
    });

    res.status(200).json({ message: 'Proof submitted. Admin will verify shortly.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get User Payment Requests
 * @route   GET /api/payments/my-requests
 */
export const getMyPaymentRequests = async (req: any, res: Response) => {
    try {
        console.log(`[DEBUG] Fetching payment requests for user: ${req.user?.id}`);
        const requests = await prisma.paymentRequest.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`[DEBUG] Found ${requests.length} requests`);
        res.status(200).json(requests);
    } catch (error: any) {
        console.error(`[ERROR] getMyPaymentRequests:`, error);
        res.status(500).json({ 
            message: 'Internal Server Error while fetching payment requests',
            error: error.message 
        });
    }
};

/**
 * @desc    Get All Payment Requests (Admin Only)
 */
export const getAllPaymentRequests = async (req: any, res: Response) => {
  try {
    const requests = await prisma.paymentRequest.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Admin: Update Payment Request Status (e.g., mark as INVOICED)
 */
export const updatePaymentRequestStatus = async (req: any, res: Response) => {
    const { requestId } = req.params;
    const { status, adminNotes, invoiceUrl } = req.body;

    try {
        const updatedRequest = await prisma.paymentRequest.update({
            where: { id: requestId },
            data: { 
                status,
                ...(adminNotes && { adminNotes }),
                ...(invoiceUrl && { invoiceUrl })
            },
            include: { user: { select: { email: true } } }
        });

        // If status is INVOICED, send email
        if (status === 'INVOICED') {
          await sendInvoiceEmail(updatedRequest.user.email, updatedRequest.planType, updatedRequest.amount, updatedRequest.invoiceUrl || undefined);
        }

        res.status(200).json({ message: `Request status updated to ${status}` });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Approve Payment Request and Unlock Features (Admin Only)
 */
export const approvePaymentRequest = async (req: any, res: Response) => {
  const { requestId } = req.params;

  try {
    const request = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // 1. Update/Create Subscription
    await prisma.subscription.upsert({
      where: { userId: request.userId },
      update: { planType: request.planType, status: 'active', price: request.amount, startDate: new Date() },
      create: { userId: request.userId, planType: request.planType, status: 'active', price: request.amount }
    });

    // 2. Mark Request as Completed
    await prisma.paymentRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED' }
    });

    res.status(200).json({ message: 'Payment approved. Feature unlocked for user.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- RAZORPAY AUTOMATIC PAYMENT FLOW ---

export const createOrder = async (req: any, res: Response) => {
  const { amount, planType } = req.body;
  try {
    const options = {
      amount: amount * 100, // amount in the smallest currency unit (cents)
      currency: "USD",
      receipt: `rcpt_${Date.now().toString().slice(-10)}_${req.user.id.toString().slice(-6)}`
    };
    const order = await razorpay.orders.create(options);
    
    // Create a pending payment record for tracking
    await prisma.paymentRequest.create({
      data: {
        userId: req.user.id,
        planType,
        amount,
        status: 'PENDING',
        paymentMethod: 'RAZORPAY',
        externalId: order.id
      }
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error: any) {
    console.error("[Razorpay Error]", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create order" });
  }
};

export const verifyPayment = async (req: any, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType, amount } = req.body;

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // 1. Update/Create Subscription
      await prisma.subscription.upsert({
        where: { userId: req.user.id },
        update: { planType, status: 'active', price: amount, startDate: new Date() },
        create: { userId: req.user.id, planType, status: 'active', price: amount }
      });

      // 2. Update existing Payment Request record
      await prisma.paymentRequest.update({
        where: { externalId: razorpay_order_id },
        data: {
          status: 'COMPLETED',
          adminNotes: `Verified via frontend. Payment ID: ${razorpay_payment_id}`
        }
      });

      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error: any) {
    console.error("[Razorpay Verify Error]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Helper to log Razorpay events
 */
const logPaymentEvent = async (requestId: string, event: string, payload: any) => {
  try {
    await prisma.paymentLog.create({
      data: {
        paymentRequestId: requestId,
        event,
        payload
      }
    });
  } catch (error) {
    console.error(`[Log Error] Failed to log event ${event}:`, error);
  }
};

/**
 * @desc    Razorpay Webhook Handler
 * @route   POST /api/payments/webhook
 */
export const razorpayWebhook = async (req: any, res: Response) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '###NexVelt@@@';

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) return res.status(400).send('Missing signature');

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature === signature) {
      const event = req.body.event;
      const payload = req.body.payload;
      console.log(`[Webhook] Processing event: ${event}`);

      // 1. Resolve the internal request record
      const razorpayOrderId = payload.order ? payload.order.entity.id : (payload.payment?.entity?.order_id || null);
      
      let request = null;
      if (razorpayOrderId) {
        request = await prisma.paymentRequest.findUnique({
          where: { externalId: razorpayOrderId }
        });
      }

      if (request) {
        // Log the event in history
        await logPaymentEvent(request.id, event, req.body);

        // 2. Handle specific events
        switch (event) {
          case 'payment.captured':
          case 'order.paid':
            if (request.status !== 'COMPLETED') {
              const razorpayPaymentId = payload.payment.entity.id;
              
              await prisma.paymentRequest.update({
                where: { id: request.id },
                data: { 
                  status: 'COMPLETED',
                  razorpayPaymentId,
                  adminNotes: `Fulfilled via Webhook (${event}).`
                }
              });

              await prisma.subscription.upsert({
                where: { userId: request.userId },
                update: { planType: request.planType, status: 'active', price: request.amount, startDate: new Date() },
                create: { userId: request.userId, planType: request.planType, status: 'active', price: request.amount }
              });
              console.log(`[Webhook] Activated subscription for ${request.userId}`);
            }
            break;

          case 'payment.failed':
            await prisma.paymentRequest.update({
              where: { id: request.id },
              data: { 
                status: 'FAILED',
                adminNotes: `Payment failed: ${payload.payment.entity.error_description || 'Unknown error'}`
              }
            });
            break;

          case 'refund.processed':
            await prisma.paymentRequest.update({
              where: { id: request.id },
              data: { 
                status: 'REFUNDED',
                adminNotes: `Refund processed for amount: ${payload.refund.entity.amount / 100}`
              }
            });
            break;

          case 'payment.dispute.created':
            await prisma.paymentRequest.update({
              where: { id: request.id },
              data: { 
                status: 'DISPUTED',
                adminNotes: `Dispute created. Status: ${payload.dispute.entity.status}`
              }
            });
            break;
        }
      }

      res.status(200).json({ status: 'ok' });
    } else {
      res.status(400).json({ status: 'error', message: 'Invalid signature' });
    }
  } catch (error: any) {
    console.error('[Webhook Error]', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * @desc    Admin: Get All Payment Logs
 * @route   GET /api/payments/logs
 */
export const getAllPaymentLogs = async (req: any, res: Response) => {
    try {
        const logs = await prisma.paymentLog.findMany({
            include: {
                paymentRequest: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 logs for performance
        });

        res.status(200).json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
