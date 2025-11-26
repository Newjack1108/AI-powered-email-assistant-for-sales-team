import { initDb, getUserByEmail, createUser } from './db';
import { hashPassword } from './auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize admin user from environment variables if they don't exist
 * This allows setting up admin credentials via Railway environment variables
 */
export async function initAdminFromEnv() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  if (!adminEmail || !adminPassword) {
    console.log('No admin credentials found in environment variables');
    return;
  }

  try {
    // Initialize database first
    await initDb();

    // Check if admin user already exists
    const existingUser = await getUserByEmail(adminEmail);
    if (existingUser) {
      console.log(`Admin user with email ${adminEmail} already exists`);
      return;
    }

    // Create admin user
    const passwordHash = await hashPassword(adminPassword);
    const userId = uuidv4();

    await createUser({
      id: userId,
      email: adminEmail,
      name: adminName,
      password_hash: passwordHash,
      role: 'admin',
    });

    console.log(`✅ Admin user created from environment variables: ${adminEmail}`);
  } catch (error: any) {
    console.error('Error creating admin user from environment variables:', error);
  }
}

