import nodemailer from 'nodemailer';

/**
 * Email Utility
 * -------------
 * Sends transactional emails using SMTP credentials from environment variables.
 * If SMTP is not configured, logs a warning and no-ops (so local dev doesn't break).
 */

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const defaultFrom = process.env.EMAIL_FROM || 'no-reply@campuslostfound.local';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('[email] SMTP not configured. Set SMTP_HOST/PORT/USER/PASS to enable emails.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: { user: smtpUser, pass: smtpPass },
  });
  return transporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<void> {
  const tx = getTransporter();
  const { to, subject, html, text, from } = params;

  if (!to) {
    console.warn('[email] Missing recipient. Skipping send.');
    return;
  }

  if (!tx) {
    // No-op fallback: log to console so developers can see the content
    console.log(`\n[email preview] → To: ${to}\nSubject: ${subject}\n------ HTML ------\n${html}\n-----------------\n`);
    return;
  }

  await tx.sendMail({
    from: from || defaultFrom,
    to,
    subject,
    text,
    html,
  });
}

// Simple HTML templates
export function claimCreatedTemplate(opts: {
  posterName?: string | null;
  itemTitle: string;
  claimerName?: string | null;
  claimerEmail?: string | null;
}) {
  const { posterName, itemTitle, claimerName, claimerEmail } = opts;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New Claim Submitted</h2>
      <p>Hi ${posterName || 'there'},</p>
      <p>Your item <strong>${itemTitle}</strong> has received a new claim.</p>
      <p><strong>Claimer:</strong> ${claimerName || 'Unknown'} (${claimerEmail || 'no email'})</p>
      <p>Please review the claim in your dashboard and approve or reject it.</p>
    </div>
  `;
}

export function claimStatusUpdatedTemplate(opts: {
  claimerName?: string | null;
  itemTitle: string;
  status: 'APPROVED' | 'REJECTED';
  notes?: string | null;
}) {
  const { claimerName, itemTitle, status, notes } = opts;
  const friendly = status === 'APPROVED' ? 'approved ✅' : 'rejected ❌';
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Your Claim Was ${friendly}</h2>
      <p>Hi ${claimerName || 'there'},</p>
      <p>Your claim for <strong>${itemTitle}</strong> was <strong>${status}</strong>.</p>
      ${notes ? `<p><strong>Notes from the poster:</strong> ${notes}</p>` : ''}
      <p>If approved, please coordinate with the poster to retrieve the item.</p>
    </div>
  `;
}

export function verificationEmailTemplate(opts: {
  name?: string | null;
  verifyUrl: string;
  expiresAt?: Date;
}) {
  const { name, verifyUrl, expiresAt } = opts;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Verify Your Email</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Thanks for signing up for <strong>Campus Lost & Found</strong>.</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;"><a href="${verifyUrl}">${verifyUrl}</a></p>
      ${expiresAt ? `<p><em>This link expires on ${expiresAt.toUTCString()}.</em></p>` : ''}
    </div>
  `;
}

export function buildVerificationLink(token: string) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  // Expect a frontend route to capture token and call POST /api/auth/verify-email
  return `${frontend.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Password Reset Email Template
 * 
 * Interview Q: Why separate reset link from verification?
 * -> Different security requirements (reset = 1 hour, verify = 24 hours)
 * -> Different user flows
 * -> Clearer code and audit trail
 */
export function passwordResetEmailTemplate(opts: {
  name?: string | null;
  resetUrl: string;
  expiresAt?: Date;
}) {
  const { name, resetUrl, expiresAt } = opts;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Reset Your Password</h2>
      <p>Hi ${name || 'there'},</p>
      <p>You requested to reset your password for <strong>Campus Lost & Found</strong>.</p>
      <p>Click the button below to set a new password:</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p>If you didn't request this, you can safely ignore this email. Your password won't change.</p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
      ${expiresAt ? `<p><em>This link expires on ${expiresAt.toUTCString()} (1 hour).</em></p>` : ''}
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        <strong>Security tip:</strong> Never share this link with anyone. 
        Our team will never ask for your password.
      </p>
    </div>
  `;
}

export function buildPasswordResetLink(token: string) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontend.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Password Changed Confirmation Email
 * 
 * Interview Q: Why send confirmation after password change?
 * -> Security alert: User knows if someone else changed their password
 * -> Good UX practice
 */
export function passwordChangedEmailTemplate(opts: {
  name?: string | null;
}) {
  const { name } = opts;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Password Changed Successfully</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Your password for <strong>Campus Lost & Found</strong> was successfully changed.</p>
      <p>If you made this change, no further action is needed.</p>
      <p style="color: #dc2626;"><strong>If you did NOT make this change, please contact support immediately.</strong></p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        Time: ${new Date().toUTCString()}
      </p>
    </div>
  `;
}
