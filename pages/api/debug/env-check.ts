import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Debug endpoint to check all environment variables (safely)
 * This helps diagnose why ADMIN_EMAIL and ADMIN_PASSWORD might not be found
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const allEnvVars = Object.keys(process.env);
    const adminRelatedVars: Record<string, string> = {};
    
    // Find all environment variables related to admin
    allEnvVars.forEach(key => {
      if (key.toUpperCase().includes('ADMIN')) {
        const value = process.env[key];
        // Mask sensitive values
        if (key.toUpperCase().includes('PASSWORD') || key.toUpperCase().includes('SECRET')) {
          adminRelatedVars[key] = value ? `${value.substring(0, 2)}***` : 'NOT SET';
        } else if (key.toUpperCase().includes('EMAIL')) {
          adminRelatedVars[key] = value ? `${value.substring(0, 3)}***` : 'NOT SET';
        } else {
          adminRelatedVars[key] = value || 'NOT SET';
        }
      }
    });

    // Check specifically for the variables we need
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME;

    return res.status(200).json({
      adminCredentials: {
        ADMIN_EMAIL: adminEmail ? `${adminEmail.substring(0, 3)}***` : 'NOT SET',
        ADMIN_PASSWORD: adminPassword ? 'SET (hidden)' : 'NOT SET',
        ADMIN_NAME: adminName || 'NOT SET (will use default)',
      },
      allAdminRelatedVars: adminRelatedVars,
      totalEnvVars: allEnvVars.length,
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      // Show first few characters of DATABASE_URL to verify it's set
      databaseUrlPreview: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'NOT SET',
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
    });
  }
}

