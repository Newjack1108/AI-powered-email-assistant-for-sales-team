import type { NextApiRequest, NextApiResponse } from 'next';
import { initDb, getUserByEmail, createUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manual admin creation endpoint
 * This can be used if environment variables aren't working
 * 
 * Usage: POST /api/admin/create-manual
 * Body: { email: "admin@example.com", password: "password123", name: "Admin User" }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initDb();
    
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['email', 'password', 'name']
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
        }
      });
    }

    // Create admin user
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    await createUser({
      id: userId,
      email: email,
      name: name,
      password_hash: passwordHash,
      role: 'admin',
    });

    console.log(`✅ Admin user created manually: ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: userId,
        email: email,
        name: name,
        role: 'admin',
      },
    });
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

