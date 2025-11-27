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
      const { id, page } = req.query;
      
      if (id) {
        const email = await getEmail(id as string);
        if (!email) {
          return res.status(404).json({ error: 'Email not found' });
        }
        return res.status(200).json(email);
      }

      const pageNumber = page ? parseInt(page as string) : 1;
      const limit = 15;
      const offset = (pageNumber - 1) * limit;
      
      const emails = await getEmails(limit, offset);
      return res.status(200).json(emails || []);
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      return res.status(500).json({ error: 'Failed to fetch emails' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

