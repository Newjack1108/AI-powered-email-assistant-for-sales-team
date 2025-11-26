import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';
import { getUserById, updateUser } from './db';
import { decrypt, encrypt } from './encryption';
import { sendEmailViaGraph, refreshAccessToken, isTokenExpired } from './microsoft-oauth';

// Configure email transporter (legacy - for system default SMTP)
// For Outlook/Office365, you'll need to configure SMTP settings
export function createTransporter() {
  // For Outlook/Office365 SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  });

  return transporter;
}

// Create transporter for user-specific SMTP configuration
export function createTransporterForUser(smtpConfig: {
  host: string;
  port: number;
  user: string;
  password: string;
}) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.password,
    },
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
  attachments?: Attachment[];
  cc?: string;
  bcc?: string;
}

// Send email using user's configuration (OAuth or SMTP)
export async function sendEmailForUser(
  userId: string,
  options: SendEmailOptions
): Promise<void> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if user has email configured
  if (!user.email_provider) {
    throw new Error('User has not configured email. Please set up email in your profile.');
  }

  if (user.email_provider === 'oauth') {
    // Send via Microsoft Graph API
    await sendEmailWithOAuth(user, options);
  } else if (user.email_provider === 'smtp') {
    // Send via SMTP
    await sendEmailWithSMTP(user, options);
  } else {
    throw new Error('Invalid email provider configuration');
  }
}

// Send email using OAuth (Microsoft Graph API)
async function sendEmailWithOAuth(
  user: any,
  options: SendEmailOptions
): Promise<void> {
  if (!user.email_oauth_access_token || !user.email_oauth_refresh_token) {
    throw new Error('OAuth tokens not found');
  }

  // Decrypt tokens
  let accessToken = decrypt(user.email_oauth_access_token);
  let refreshToken = decrypt(user.email_oauth_refresh_token);

  // Check if token is expired and refresh if needed
  if (isTokenExpired(user.email_oauth_expires_at)) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;
      refreshToken = newTokens.refresh_token;

      // Encrypt and save new tokens
      await updateUser(user.id, {
        email_oauth_access_token: encrypt(newTokens.access_token),
        email_oauth_refresh_token: encrypt(newTokens.refresh_token),
        email_oauth_expires_at: newTokens.expires_at.toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to refresh OAuth token:', error);
      throw new Error('OAuth token expired and refresh failed. Please reconnect your Microsoft account.');
    }
  }

  // Get from email/name
  const fromEmail = user.email_smtp_user || user.email || options.from;
  const fromName = user.email_from_name || user.name || process.env.SMTP_FROM_NAME || 'Sales Team';

  // Send via Microsoft Graph
  await sendEmailViaGraph(
    accessToken,
    options.to,
    options.subject,
    options.body,
    fromEmail,
    fromName,
    options.attachments?.map(att => ({
      filename: (att as any).filename || 'attachment',
      path: (att as any).path || '',
    }))
  );
}

// Send email using SMTP
async function sendEmailWithSMTP(
  user: any,
  options: SendEmailOptions
): Promise<void> {
  if (!user.email_smtp_host || !user.email_smtp_port || !user.email_smtp_user || !user.email_smtp_password) {
    throw new Error('SMTP configuration incomplete');
  }

  // Decrypt SMTP password
  const smtpPassword = decrypt(user.email_smtp_password);

  // Create transporter for user
  const transporter = createTransporterForUser({
    host: user.email_smtp_host,
    port: user.email_smtp_port,
    user: user.email_smtp_user,
    password: smtpPassword,
  });

  const fromEmail = user.email_smtp_user || options.from;
  const fromName = user.email_from_name || user.name || 'Sales Team';

  // Convert plain text to HTML if needed
  const htmlBody = options.body.includes('<') 
    ? options.body 
    : options.body.replace(/\n/g, '<br>');

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    html: htmlBody,
    text: options.body,
    attachments: options.attachments,
  });
}

// Legacy function - uses system default SMTP (for backward compatibility)
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transporter = createTransporter();
  
  const fromEmail = options.from || process.env.SMTP_USER || 'noreply@example.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Sales Team';

  // Convert plain text to HTML if needed
  const htmlBody = options.body.includes('<') 
    ? options.body 
    : options.body.replace(/\n/g, '<br>');

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    html: htmlBody,
    text: options.body,
    attachments: options.attachments,
  });
}

// For Make.com webhook integration
export async function sendToMakeWebhook(data: any): Promise<void> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('Make.com webhook URL not configured, skipping webhook call');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending to Make.com webhook:', error);
    // Don't throw - webhook failures shouldn't break email sending
  }
}

