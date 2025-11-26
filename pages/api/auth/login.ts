import type { NextApiRequest, NextApiResponse } from 'next';
import { initDb, getUserByEmail } from '@/lib/db';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initDb();
    console.log('✅ Database initialized');
  } catch (error: any) {
    console.error('❌ Database initialization error:', error);
    return res.status(500).json({ error: 'Database initialization failed', details: error.message });
  }

  // Initialize admin from environment variables if needed (only on first request)
  try {
    const { initAdminFromEnv } = await import('@/lib/init-admin');
    await initAdminFromEnv();
    console.log('✅ Admin initialization check completed');
  } catch (error: any) {
    // Log but don't fail - admin init is optional
    console.log('⚠️ Admin initialization skipped:', error.message);
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log(`🔐 Attempting login for email: ${email}`);
    
    const user = await getUserByEmail(email);
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`✅ User found: ${user.email}, role: ${user.role}`);
    console.log(`🔑 Verifying password...`);

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      console.log(`❌ Invalid password for user: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`✅ Password verified for user: ${email}`);

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'user',
      signature_name: user.signature_name,
      signature_title: user.signature_title,
      signature_phone: user.signature_phone,
      signature_email: user.signature_email,
      signature_company: user.signature_company,
    });

    setAuthCookie(res, token);
    console.log(`✅ Login successful for user: ${email}`);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        signature_name: user.signature_name,
        signature_title: user.signature_title,
        signature_phone: user.signature_phone,
        signature_email: user.signature_email,
        signature_company: user.signature_company,
      },
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    console.error('   Error type:', error?.constructor?.name);
    console.error('   Error message:', error?.message);
    console.error('   Error stack:', error?.stack);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

