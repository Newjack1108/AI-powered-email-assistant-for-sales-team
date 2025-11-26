import type { NextApiRequest, NextApiResponse } from 'next';
import { initDb, getUserById } from '@/lib/db';
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initDb();
  } catch (error: any) {
    console.error('Database initialization error:', error);
  }

  try {
    const token = getAuthTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get full user details from database
    const fullUser = await getUserById(user.id);
    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: fullUser.role,
        signature_name: fullUser.signature_name,
        signature_title: fullUser.signature_title,
        signature_phone: fullUser.signature_phone,
        signature_email: fullUser.signature_email,
        signature_company: fullUser.signature_company,
        email_provider: fullUser.email_provider,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

