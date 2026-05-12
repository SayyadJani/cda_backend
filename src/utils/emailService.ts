import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('[EmailService] SMTP Connection Error:', error);
  } else {
    console.log('[EmailService] SMTP Server is ready to take messages');
  }
});

export const sendOTP = async (email: string, otp: string) => {
  const mailOptions = {
    from: `"Nexvelt Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Password Reset OTP',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <img src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/NVlogo.png" alt="Nexvelt Logo" style="height: 48px; object-fit: contain; margin-bottom: 16px;" />
          <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase; font-style: italic;">Nexvelt Security</h1>
          <div style="height: 4px; width: 40px; background-color: #2dd4bf; margin: 8px auto; border-radius: 2px;"></div>
        </div>
        
        <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">You have requested a password reset. Please use the following code to verify your identity:</p>
        
        <div style="background-color: #f8fafc; padding: 32px; text-align: center; font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #0f172a; border-radius: 16px; margin: 32px 0; border: 2px solid #e2e8f0; font-family: monospace;">
          ${otp}
        </div>
        
        <div style="text-align: center; color: #f59e0b; margin-bottom: 32px;">
          <p style="margin: 0; font-size: 14px; font-weight: 700;">Code expires in 10 minutes</p>
        </div>
        
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; text-align: center;">If you did not initiate this request, please secure your account immediately.</p>
        
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        
        <div style="text-align: center;">
          <p style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Verified Security Encryption</p>
          <p style="font-size: 11px; color: #cbd5e1; margin: 0;">&copy; ${new Date().getFullYear()} Nexvelt CDA Platform. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Error sending email:`, error);
    // In dev, if email fails, we might still want to proceed or just log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV MODE] OTP for ${email} is: ${otp}`);
      return true; 
    }
    return false;
  }
};

export const sendPaymentOTP = async (email: string, otp: string, planName: string, amount: number) => {
  const mailOptions = {
    from: `"Nexvelt Payments" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Action Required: Verify Your Payment Request',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <img src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/NVlogo.png" alt="Nexvelt Logo" style="height: 48px; object-fit: contain; margin-bottom: 16px;" />
          <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase; font-style: italic;">Nexvelt Intelligence</h1>
          <div style="height: 4px; width: 40px; background-color: #2dd4bf; margin: 8px auto; border-radius: 2px;"></div>
        </div>
        
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">You are requesting access to the <strong>${planName}</strong> plan for <strong>$${amount}/mo</strong>.</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Please use the following verification code to authorize this request:</p>
        
        <div style="background-color: #f8fafc; padding: 32px; text-align: center; font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #0f172a; border-radius: 16px; margin: 32px 0; border: 2px solid #e2e8f0; font-family: monospace;">
          ${otp}
        </div>
        
        <div style="text-align: center; color: #f59e0b; margin-bottom: 32px;">
          <p style="margin: 0; font-size: 14px; font-weight: 700;">Code expires in 10 minutes</p>
        </div>
        
        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">If you did not initiate this request, please secure your account immediately.</p>
        
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        
        <div style="text-align: center;">
          <p style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Verified Security Encryption</p>
          <p style="font-size: 11px; color: #cbd5e1; margin: 0;">&copy; 2026 Nexvelt CDA Platform. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Payment OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Error sending payment email:`, error);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV MODE] Payment OTP for ${email} is: ${otp}`);
      return true; 
    }
    return false;
  }
};

export const sendInvoiceEmail = async (email: string, planName: string, amount: number, invoiceUrl?: string) => {
  const mailOptions = {
    from: `"Nexvelt Billing" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Invoice Ready: Complete Your Payment',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <img src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/NVlogo.png" alt="Nexvelt Logo" style="height: 48px; object-fit: contain; margin-bottom: 16px;" />
          <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase; font-style: italic;">Nexvelt Billing</h1>
          <div style="height: 4px; width: 40px; background-color: #2dd4bf; margin: 8px auto; border-radius: 2px;"></div>
        </div>
        
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello,</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Your manual payment request for the <strong>${planName}</strong> plan ($${amount}) has been reviewed. We have generated an invoice for you.</p>
        
        <div style="background-color: #f8fafc; padding: 24px; border-radius: 16px; margin: 32px 0; border: 1px solid #e2e8f0;">
          <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Payment Instructions:</h4>
          <ol style="color: #475569; font-size: 14px; margin: 0; padding-left: 20px;">
            <li>Pay <strong>$${amount}</strong> to the account details provided in your dashboard.</li>
            <li>Take a screenshot or save the PDF receipt of your payment.</li>
            <li>Log in to your <strong>Nexvelt Dashboard</strong> and upload the proof.</li>
          </ol>
          ${invoiceUrl ? `
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; font-weight: bold;">ATTACHED INVOICE LINK:</p>
            <a href="${invoiceUrl}" style="color: #2dd4bf; text-decoration: underline; font-weight: bold; font-size: 13px;">Download Invoice File</a>
          </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/plans" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Upload Payment Proof</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        
        <div style="text-align: center;">
          <p style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Official Billing Notification</p>
          <p style="font-size: 11px; color: #cbd5e1; margin: 0;">&copy; 2026 Nexvelt CDA Platform. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Invoice notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Error sending invoice email:`, error);
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  const mailOptions = {
    from: `"Nexvelt Onboarding" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Nexvelt Core Infrastructure',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <img src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/NVlogo.png" alt="Nexvelt Logo" style="height: 48px; object-fit: contain; margin-bottom: 16px;" />
          <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase; font-style: italic;">Welcome to Nexvelt</h1>
          <div style="height: 4px; width: 40px; background-color: #4f46e5; margin: 8px auto; border-radius: 2px;"></div>
        </div>
        
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Your node has been successfully provisioned. Welcome to the Nexvelt Intelligence Platform—the most advanced AI-driven career discovery and placement ecosystem.</p>
        
        <div style="background-color: #f8fafc; padding: 24px; border-radius: 16px; margin: 32px 0; border: 1px solid #e2e8f0;">
          <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Next Steps Configuration:</h4>
          <ol style="color: #475569; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Complete your <strong>Identity Parameters</strong> (resume and preferences).</li>
            <li>Sync your account to activate the <strong>Data Factory</strong> scanners.</li>
            <li>Review and apply to <strong>High-Match Leads</strong> automatically generated for you.</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Initialize Dashboard</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        
        <div style="text-align: center;">
          <p style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Official Node Provisioning</p>
          <p style="font-size: 11px; color: #cbd5e1; margin: 0;">&copy; ${new Date().getFullYear()} Nexvelt CDA Platform. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Error sending welcome email:`, error);
    return false;
  }
};
