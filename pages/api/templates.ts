import type { NextApiRequest, NextApiResponse } from 'next';
import { getTemplates, getTemplate, saveTemplate, deleteTemplate, initDb } from '@/lib/db';
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
        const template = await getTemplate(id as string);
        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }
        return res.status(200).json(template);
      }

      const templates = await getTemplates();
      return res.status(200).json(templates || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, subject, body, id, attachments } = req.body;

      if (!name || !body) {
        return res.status(400).json({ error: 'Name and body are required' });
      }

      const templateId = id || uuidv4();
      
      // Serialize attachments if it's an array
      let attachmentsData = null;
      if (attachments) {
        if (Array.isArray(attachments)) {
          attachmentsData = JSON.stringify(attachments);
        } else if (typeof attachments === 'string') {
          // Already a string, might be JSON
          try {
            JSON.parse(attachments); // Validate it's valid JSON
            attachmentsData = attachments;
          } catch {
            attachmentsData = JSON.stringify([attachments]);
          }
        } else {
          attachmentsData = JSON.stringify(attachments);
        }
      }

      // Use dynamic import to ensure dbModule is initialized
      const { saveTemplate: saveTemplateFn } = await import('@/lib/db');
      await saveTemplateFn({
        id: templateId,
        name,
        subject: subject || null,
        body,
        attachments: attachmentsData,
      });

      return res.status(200).json({ success: true, id: templateId });
    } catch (error: any) {
      console.error('Error saving template:', error);
      return res.status(500).json({ 
        error: 'Failed to save template',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Template ID is required' });
      }

      await deleteTemplate(id as string);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      return res.status(500).json({ error: 'Failed to delete template' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

