import type { NextApiRequest, NextApiResponse } from 'next';
import { initAdminFromEnv } from '@/lib/init-admin';

/**
 * API endpoint to initialize admin user from environment variables
 * This can be called once to set up the admin user, or run automatically on startup
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initAdminFromEnv();
    return res.status(200).json({ 
      success: true, 
      message: 'Admin initialization completed. Check server logs for details.' 
    });
  } catch (error: any) {
    console.error('Error initializing admin:', error);
    return res.status(500).json({ 
      error: 'Failed to initialize admin',
      message: error.message 
    });
  }
}

