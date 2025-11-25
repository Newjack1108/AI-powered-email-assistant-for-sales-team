import type { NextApiRequest, NextApiResponse } from 'next';
import { initDb, getUserByEmail, createUser } from '@/lib/db';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

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
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (default to 'user' role unless explicitly set to 'admin')
    const userId = uuidv4();
    await createUser({
      id: userId,
      email,
      password_hash: passwordHash,
      name,
      role: role === 'admin' ? 'admin' : 'user',
    });

    const token = generateToken({
      id: userId,
      email,
      name,
      role: role === 'admin' ? 'admin' : 'user',
    });

    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        role: role === 'admin' ? 'admin' : 'user',
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

