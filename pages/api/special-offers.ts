import type { NextApiRequest, NextApiResponse } from 'next';
import { initDb } from '@/lib/db';
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
        const { getSpecialOffer: getOffer } = await import('@/lib/db');
        const offer = await getOffer(id as string);
        if (!offer) {
          return res.status(404).json({ error: 'Special offer not found' });
        }
        return res.status(200).json(offer);
      }

      const { getSpecialOffers: getOffers } = await import('@/lib/db');
      const offers = await getOffers();
      return res.status(200).json(offers || []);
    } catch (error: any) {
      console.error('Error fetching special offers:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch special offers',
        message: error.message || 'Unknown error'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, id } = req.body;

      if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
      }

      const offerId = id || uuidv4();
      const { saveSpecialOffer: saveOffer } = await import('@/lib/db');
      await saveOffer({
        id: offerId,
        name,
        description,
      });

      return res.status(200).json({ success: true, id: offerId });
    } catch (error: any) {
      console.error('Error saving special offer:', error);
      return res.status(500).json({ 
        error: 'Failed to save special offer',
        message: error.message || 'Unknown error'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Special offer ID is required' });
      }

      const { deleteSpecialOffer: deleteOffer } = await import('@/lib/db');
      await deleteOffer(id as string);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error deleting special offer:', error);
      return res.status(500).json({ 
        error: 'Failed to delete special offer',
        message: error.message || 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

