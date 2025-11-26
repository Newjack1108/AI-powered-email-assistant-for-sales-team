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

    const { 
      name, 
      signature_name, 
      signature_title, 
      signature_phone, 
      signature_email, 
      signature_company,
      email_provider,
      email_smtp_host,
      email_smtp_port,
      email_smtp_user,
      email_smtp_password,
      email_from_name,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Prepare update object
    const updates: any = {
      name,
      signature_name: signature_name || null,
      signature_title: signature_title || null,
      signature_phone: signature_phone || null,
      signature_email: signature_email || null,
      signature_company: signature_company || null,
    };

    // Handle email configuration if provided
    if (email_provider !== undefined) {
      if (email_provider === 'smtp') {
        // Validate SMTP configuration
        if (!email_smtp_host || !email_smtp_port || !email_smtp_user) {
          return res.status(400).json({ error: 'SMTP host, port, and username are required' });
        }

        // Encrypt SMTP password if provided
        const { encrypt } = await import('@/lib/encryption');
        const encryptedPassword = email_smtp_password 
          ? encrypt(email_smtp_password)
          : undefined; // Don't update if not provided

        updates.email_provider = 'smtp';
        updates.email_smtp_host = email_smtp_host;
        updates.email_smtp_port = parseInt(email_smtp_port);
        updates.email_smtp_user = email_smtp_user;
        if (encryptedPassword !== undefined) {
          updates.email_smtp_password = encryptedPassword;
        }
        updates.email_from_name = email_from_name || null;
        updates.email_configured_at = new Date().toISOString();
      } else if (email_provider === null) {
        // Clear email configuration
        updates.email_provider = null;
        updates.email_smtp_host = null;
        updates.email_smtp_port = null;
        updates.email_smtp_user = null;
        updates.email_smtp_password = null;
        updates.email_from_name = null;
        updates.email_configured_at = null;
      }
    }

    // Update user profile
    await updateUser(authUser.id, updates);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

