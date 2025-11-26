import type { NextApiRequest, NextApiResponse } from 'next';
import { getProductTypes, getProductType, saveProductType, deleteProductType, initDb } from '@/lib/db';
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await initDb(); // Ensure DB is initialized

  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (id) {
        const productType = await getProductType(id as string);
        if (!productType) {
          return res.status(404).json({ error: 'Product type not found' });
        }
        return res.status(200).json(productType);
      }

      const productTypes = await getProductTypes();
      return res.status(200).json(productTypes || []);
    } catch (error: any) {
      console.error('Error fetching product types:', error);
      return res.status(500).json({ error: 'Failed to fetch product types', message: error.message });
    }
  }

  // All other methods require admin authentication
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const authUser = verifyToken(token);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  if (req.method === 'POST') {
    try {
      const { name, description, id } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const productTypeId = id || uuidv4();
      await saveProductType({
        id: productTypeId,
        name,
        description: description || null,
      });

      return res.status(200).json({ success: true, id: productTypeId });
    } catch (error: any) {
      console.error('Error saving product type:', error);
      return res.status(500).json({ error: 'Failed to save product type', message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Product type ID is required' });
      }

      await deleteProductType(id as string);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error deleting product type:', error);
      return res.status(500).json({ error: 'Failed to delete product type', message: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

