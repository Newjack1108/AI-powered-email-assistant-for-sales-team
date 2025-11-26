import type { NextApiRequest, NextApiResponse } from 'next';
import { initDb, getUserById, updateUser } from '@/lib/db';
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth';

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

  try {
    // Verify authentication
    const token = getAuthTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const authUser = verifyToken(token);
    if (!authUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { name, signature_name, signature_title, signature_phone, signature_email, signature_company } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Update user profile
    await updateUser(authUser.id, {
      name,
      signature_name: signature_name || null,
      signature_title: signature_title || null,
      signature_phone: signature_phone || null,
      signature_email: signature_email || null,
      signature_company: signature_company || null,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

