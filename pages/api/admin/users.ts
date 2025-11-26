import type { NextApiRequest, NextApiResponse } from 'next';
import { initDb, getUsers, getUserByEmail, getUserById, createUser, updateUser, updateUserPassword, deleteUser } from '@/lib/db';
import { getAuthTokenFromRequest, verifyToken, hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await initDb();
  } catch (error: any) {
    console.error('Database initialization error:', error);
  }

  try {
    // Verify authentication and admin role
    const token = getAuthTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const authUser = verifyToken(token);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      // Get all users
      const users = await getUsers();
      return res.status(200).json({ users: users || [] });
    }

    if (req.method === 'POST') {
      // Create new user
      const { email, name, password, role } = req.body;

      if (!email || !name || !password) {
        return res.status(400).json({ error: 'Email, name, and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userId = uuidv4();
      await createUser({
        id: userId,
        email,
        name,
        password_hash: passwordHash,
        role: role === 'admin' ? 'admin' : 'user',
      });

      return res.status(201).json({ success: true, id: userId });
    }

    if (req.method === 'PUT') {
      // Update existing user
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const { name, password, role } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Get existing user
      const existingUser = await getUserById(id as string);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user
      await updateUser(id as string, {
        name,
        role: role === 'admin' ? 'admin' : 'user',
      });

      // Update password if provided
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        const passwordHash = await hashPassword(password);
        await updateUserPassword(id as string, passwordHash);
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      // Delete user
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Prevent deleting yourself
      if (id === authUser.id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }

      await deleteUser(id as string);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Admin users API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

