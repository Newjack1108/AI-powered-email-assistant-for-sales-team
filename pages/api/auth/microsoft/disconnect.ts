import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is authenticated
    const token = getAuthTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const authUser = verifyToken(token);
    if (!authUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database
    const user = await getUserById(authUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear OAuth configuration
    await updateUser(authUser.id, {
      email_provider: null,
      email_oauth_access_token: null,
      email_oauth_refresh_token: null,
      email_oauth_expires_at: null,
      email_configured_at: null,
    });

    return res.status(200).json({ success: true, message: 'Microsoft account disconnected' });
  } catch (error: any) {
    console.error('OAuth disconnect error:', error);
    return res.status(500).json({ error: 'Failed to disconnect Microsoft account', message: error.message });
  }
}

