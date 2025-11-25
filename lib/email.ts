import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';

// Configure email transporter
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

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
  attachments?: Attachment[];
  cc?: string;
  bcc?: string;
}

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

