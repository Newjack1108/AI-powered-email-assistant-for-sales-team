import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmails, getEmail, initDb } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ensure database is initialized (with error handling)
  try {
    await initDb();
  } catch (error: any) {
    console.error('Database initialization error:', error);
    // Continue anyway - initDb should be idempotent
  }

  if (req.method === 'GET') {
    try {
      const { id, limit } = req.query;
      
      if (id) {
        const email = await getEmail(id as string);
        if (!email) {
          return res.status(404).json({ error: 'Email not found' });
        }
        return res.status(200).json(email);
      }

      const emails = await getEmails(limit ? parseInt(limit as string) : 50);
      return res.status(200).json(emails || []);
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      return res.status(500).json({ error: 'Failed to fetch emails' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

