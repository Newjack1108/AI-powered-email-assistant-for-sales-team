import type { NextApiRequest, NextApiResponse } from 'next';
import { generateEmail, EmailFormData } from '@/lib/ai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    const formData: EmailFormData = req.body;

    if (!formData.recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const { subject, body } = await generateEmail(formData);

    return res.status(200).json({ subject, body });
  } catch (error: any) {
    console.error('Error generating email:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate email';
    if (error.message?.includes('API key')) {
      errorMessage = 'OpenAI API key is invalid or missing';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'OpenAI API rate limit exceeded';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      message: error.message || 'Unknown error occurred'
    });
  }
}

