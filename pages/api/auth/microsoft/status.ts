import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { isTokenExpired } from '@/lib/microsoft-oauth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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

    // Check OAuth status
    const hasOAuth = user.email_provider === 'oauth' && 
                     user.email_oauth_access_token && 
                     user.email_oauth_refresh_token;
    
    const isExpired = hasOAuth ? isTokenExpired(user.email_oauth_expires_at) : true;

    return res.status(200).json({
      connected: hasOAuth && !isExpired,
      provider: user.email_provider,
      email: user.email_smtp_user || null, // Microsoft email stored here
      expiresAt: user.email_oauth_expires_at,
      isExpired: isExpired,
      configuredAt: user.email_configured_at,
    });
  } catch (error: any) {
    console.error('OAuth status error:', error);
    return res.status(500).json({ error: 'Failed to get OAuth status', message: error.message });
  }
}

