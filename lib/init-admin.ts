import { initDb, getUserByEmail, createUser } from './db';
import { hashPassword } from './auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize admin user from environment variables if they don't exist
 * This allows setting up admin credentials via Railway environment variables
 */
export async function initAdminFromEnv() {
  // Get all possible variations of the env var names (case-insensitive check)
  const allEnvVars = Object.keys(process.env);
  const adminEmailKey = allEnvVars.find(key => key.toUpperCase() === 'ADMIN_EMAIL');
  const adminPasswordKey = allEnvVars.find(key => key.toUpperCase() === 'ADMIN_PASSWORD');
  const adminNameKey = allEnvVars.find(key => key.toUpperCase() === 'ADMIN_NAME');
  
  const adminEmail = adminEmailKey ? process.env[adminEmailKey] : process.env.ADMIN_EMAIL;
  const adminPassword = adminPasswordKey ? process.env[adminPasswordKey] : process.env.ADMIN_PASSWORD;
  const adminName = adminNameKey ? process.env[adminNameKey] : (process.env.ADMIN_NAME || 'Admin User');

  console.log('🔍 Checking for admin credentials in environment variables...');
  console.log(`   ADMIN_EMAIL: ${adminEmail ? `SET (value: ${adminEmail.substring(0, 3)}...)` : 'NOT SET'}`);
  console.log(`   ADMIN_PASSWORD: ${adminPassword ? 'SET (hidden)' : 'NOT SET'}`);
  console.log(`   ADMIN_NAME: ${adminName}`);
  console.log(`   Total env vars: ${allEnvVars.length}`);
  console.log(`   Env var keys containing 'ADMIN': ${allEnvVars.filter(k => k.toUpperCase().includes('ADMIN')).join(', ') || 'NONE'}`);

  if (!adminEmail || !adminPassword) {
    console.log('⚠️ No admin credentials found in environment variables');
    console.log('   To create an admin user, set ADMIN_EMAIL, ADMIN_PASSWORD, and optionally ADMIN_NAME');
    return;
  }

  try {
    // Initialize database first
    console.log('📦 Initializing database...');
    await initDb();
    console.log('✅ Database initialized');

    // Check if admin user already exists
    console.log(`🔍 Checking if admin user exists: ${adminEmail}`);
    const existingUser = await getUserByEmail(adminEmail);
    if (existingUser) {
      console.log(`✅ Admin user with email ${adminEmail} already exists (role: ${existingUser.role})`);
      return;
    }

    // Create admin user
    console.log(`👤 Creating admin user: ${adminEmail}`);
    const passwordHash = await hashPassword(adminPassword);
    const userId = uuidv4();

    await createUser({
      id: userId,
      email: adminEmail,
      name: adminName,
      password_hash: passwordHash,
      role: 'admin',
    });

    console.log(`✅ Admin user created from environment variables:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Role: admin`);
    console.log(`   ID: ${userId}`);
  } catch (error: any) {
    console.error('❌ Error creating admin user from environment variables:', error);
    console.error('   Error type:', error?.constructor?.name);
    console.error('   Error message:', error?.message);
    console.error('   Error stack:', error?.stack);
    throw error; // Re-throw so caller knows it failed
  }
}

