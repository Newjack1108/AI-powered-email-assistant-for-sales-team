import type { NextApiRequest, NextApiResponse } from 'next';
import { initDb, getUserByEmail, getUsers } from '@/lib/db';
import { initAdminFromEnv } from '@/lib/init-admin';

/**
 * Debug endpoint to check admin user status
 * This helps diagnose login issues
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database
    await initDb();
    
    // Check environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    
    // Try to initialize admin from env
    try {
      await initAdminFromEnv();
    } catch (error: any) {
      console.error('Admin init error:', error);
    }
    
    // Get all users
    const allUsers = await getUsers();
    
    // Check if admin user exists
    let adminUser = null;
    if (adminEmail) {
      adminUser = await getUserByEmail(adminEmail);
    }
    
    return res.status(200).json({
      environment: {
        ADMIN_EMAIL: adminEmail ? 'SET' : 'NOT SET',
        ADMIN_PASSWORD: adminPassword ? 'SET' : 'NOT SET',
        ADMIN_NAME: adminName,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET (PostgreSQL)' : 'NOT SET (SQLite)',
      },
      adminUser: adminUser ? {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        created_at: adminUser.created_at,
      } : null,
      allUsers: allUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        created_at: u.created_at,
      })),
      totalUsers: allUsers.length,
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

