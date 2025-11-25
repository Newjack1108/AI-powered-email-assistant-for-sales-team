import type { NextApiRequest, NextApiResponse } from 'next';
import { getSpecialOffers, getSpecialOffer, saveSpecialOffer, deleteSpecialOffer, initDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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
      const { id } = req.query;
      
      if (id) {
        const offer = await getSpecialOffer(id as string);
        if (!offer) {
          return res.status(404).json({ error: 'Special offer not found' });
        }
        return res.status(200).json(offer);
      }

      const offers = await getSpecialOffers();
      return res.status(200).json(offers || []);
    } catch (error: any) {
      console.error('Error fetching special offers:', error);
      return res.status(500).json({ error: 'Failed to fetch special offers' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, id } = req.body;

      if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
      }

      const offerId = id || uuidv4();
      await saveSpecialOffer({
        id: offerId,
        name,
        description,
      });

      return res.status(200).json({ success: true, id: offerId });
    } catch (error: any) {
      console.error('Error saving special offer:', error);
      return res.status(500).json({ error: 'Failed to save special offer' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Special offer ID is required' });
      }

      await deleteSpecialOffer(id as string);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error deleting special offer:', error);
      return res.status(500).json({ error: 'Failed to delete special offer' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

