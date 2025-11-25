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
    const formData: EmailFormData = req.body;

    if (!formData.recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const { subject, body } = await generateEmail(formData);

    return res.status(200).json({ subject, body });
  } catch (error: any) {
    console.error('Error generating email:', error);
    return res.status(500).json({ 
      error: 'Failed to generate email',
      message: error.message 
    });
  }
}

