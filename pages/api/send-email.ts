import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmail, sendToMakeWebhook } from '@/lib/email';
import { saveEmail, updateEmailStatus, initDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ensure database is initialized (with error handling)
  try {
    await initDb();
  } catch (error: any) {
    console.error('Database initialization error:', error);
    // Continue anyway - initDb should be idempotent
  }

  try {
    const {
      recipientEmail,
      recipientName,
      subject,
      body,
      leadSource,
      productType,
      urgency,
      isFollowUp,
      qualificationInfo,
      specialOffers,
      leadTimes,
      templateUsed,
      attachments,
      sendNow = false,
      status: customStatus,
    } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailId = uuidv4();
    const attachmentsJson = attachments ? JSON.stringify(attachments) : null;

    // Save email to database
    await saveEmail({
      id: emailId,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      body,
      lead_source: leadSource,
      product_type: productType,
      urgency,
      is_followup: isFollowUp ? 1 : 0,
      qualification_info: qualificationInfo,
      special_offers: specialOffers,
      lead_times: leadTimes,
      template_used: templateUsed,
      attachments: attachmentsJson,
      status: customStatus || (sendNow ? 'sent' : 'draft'),
      sent_at: sendNow ? new Date().toISOString() : undefined,
      sent_via: sendNow ? 'outlook' : (customStatus === 'opened_in_client' ? 'mailto' : customStatus === 'downloaded' ? 'eml_file' : undefined),
    });

    // If sending now, actually send the email
    if (sendNow) {
      try {
        // Convert attachment paths to nodemailer format if needed
        const emailAttachments = attachments?.map((att: any) => {
          // Handle both relative paths (from uploads) and absolute paths
          const attachmentPath = att.path.startsWith('/')
            ? path.join(process.cwd(), 'public', att.path)
            : att.path;
          
          return {
            filename: att.filename,
            path: attachmentPath,
          };
        }) || [];

        await sendEmail({
          to: recipientEmail,
          subject,
          body,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });

        // Send to Make.com webhook
        await sendToMakeWebhook({
          event: 'email_sent',
          emailId,
          recipientEmail,
          recipientName,
          subject,
          sentAt: new Date().toISOString(),
        });
      } catch (emailError: any) {
        // Update status to failed
        await updateEmailStatus(emailId, 'failed');
        throw emailError;
      }
    }

    return res.status(200).json({ 
      success: true, 
      emailId,
      status: sendNow ? 'sent' : 'draft'
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      message: error.message 
    });
  }
}

