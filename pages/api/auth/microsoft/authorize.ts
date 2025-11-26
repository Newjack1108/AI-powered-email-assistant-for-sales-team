import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth';
import { getAuthUrl } from '@/lib/microsoft-oauth';
import { v4 as uuidv4 } from 'uuid';

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

    // Generate state parameter (include user ID to verify on callback)
    const state = `${authUser.id}:${uuidv4()}`;

    // Store state in session/cookie for verification (simplified - in production use proper session storage)
    res.setHeader(
      'Set-Cookie',
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
    );

    // Generate OAuth URL
    const authUrl = getAuthUrl(state);

    // Redirect to Microsoft OAuth
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('OAuth authorize error:', error);
    return res.status(500).json({ error: 'Failed to initiate OAuth flow', message: error.message });
  }
}

