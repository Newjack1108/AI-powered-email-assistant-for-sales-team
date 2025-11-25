import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating upload directory:', error);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now, can be restricted later
    cb(null, true);
  },
});

// Disable body parser for this route (multer handles it)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadSingle = upload.single('attachment');

  // Type assertion to work with Next.js API routes
  uploadSingle(req as any, res as any, (err: any) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'File upload failed', message: err.message });
    }

    if (!(req as any).file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = (req as any).file;

    return res.status(200).json({
      success: true,
      file: {
        filename: file.originalname,
        path: `/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      },
    });
  });
}

