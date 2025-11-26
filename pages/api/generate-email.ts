import type { NextApiRequest, NextApiResponse } from 'next';
import { generateEmail, EmailFormData } from '@/lib/ai';
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth';
import { getUserById, initDb } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initDb();
  } catch (error: any) {
    console.error('Database initialization error:', error);
  }

  // Initialize admin from environment variables if needed (only on first request)
  try {
    const { initAdminFromEnv } = await import('@/lib/init-admin');
    await initAdminFromEnv();
  } catch (error: any) {
    // Silently fail - admin init is optional
  }

  try {
    // DEBUG: Log API key status (without exposing the actual key)
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
    const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 7) || 'none';
    console.log(`🔑 API Key check: exists=${hasApiKey}, length=${apiKeyLength}, prefix=${apiKeyPrefix}...`);
    
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key is not configured',
        message: 'Please set OPENAI_API_KEY in your environment variables'
      });
    }

    // Get current user for signature (optional - don't require auth for email generation)
    let userSignature = undefined;
    try {
      const token = getAuthTokenFromRequest(req);
      if (token) {
        const authUser = verifyToken(token);
        if (authUser) {
          const user = await getUserById(authUser.id);
          if (user && (user.signature_name || user.signature_title || user.signature_phone || user.signature_email || user.signature_company)) {
            userSignature = {
              name: user.signature_name || undefined,
              title: user.signature_title || undefined,
              phone: user.signature_phone || undefined,
              email: user.signature_email || undefined,
              company: user.signature_company || undefined,
            };
          }
        }
      }
    } catch (error) {
      // Ignore auth errors - signature is optional
      console.log('Could not get user signature:', error);
    }

    const formData: EmailFormData = {
      ...req.body,
      userSignature,
    };

    // If receivedEmail is provided, recipientEmail is optional (AI will extract it)
    // Otherwise, recipientEmail is required
    if (!formData.receivedEmail && !formData.recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required, or paste a received email to reply to' });
    }

    const { subject, body } = await generateEmail(formData);

    return res.status(200).json({ subject, body });
  } catch (error: any) {
    console.error('❌ Error generating email:', error);
    console.error('   Error type:', error?.constructor?.name);
    console.error('   Error message:', error?.message);
    console.error('   Error stack:', error?.stack);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate email';
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      errorMessage = 'OpenAI API key is invalid or missing';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'OpenAI API rate limit exceeded';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

