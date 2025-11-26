// PostgreSQL database configuration for Railway
import { Pool } from 'pg';

// Railway provides DATABASE_URL automatically when you add PostgreSQL service
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export interface EmailRecord {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  lead_source?: string;
  product_type?: string;
  urgency?: string;
  is_followup: number;
  qualification_info?: string;
  special_offers?: string;
  lead_times?: string;
  template_used?: string;
  attachments?: string;
  status: string;
  created_at: string;
  sent_at?: string;
  sent_via?: string;
}

export interface Template {
  id: string;
  name: string;
  subject?: string;
  body: string;
  attachments?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'user';
  signature_name?: string;
  signature_title?: string;
  signature_phone?: string;
  signature_email?: string;
  signature_company?: string;
  // Email configuration fields
  email_provider?: 'oauth' | 'smtp' | null;
  email_oauth_access_token?: string | null;
  email_oauth_refresh_token?: string | null;
  email_oauth_expires_at?: string | null;
  email_smtp_host?: string | null;
  email_smtp_port?: number | null;
  email_smtp_user?: string | null;
  email_smtp_password?: string | null;
  email_from_name?: string | null;
  email_configured_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecialOffer {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ProductType {
  id: string;
  name: string;
  trading_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Initialize database tables
export async function initDb() {
  // Create emails table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      lead_source TEXT,
      product_type TEXT,
      urgency TEXT,
      is_followup INTEGER DEFAULT 0,
      qualification_info TEXT,
      special_offers TEXT,
      lead_times TEXT,
      template_used TEXT,
      attachments TEXT,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sent_at TIMESTAMP,
      sent_via TEXT
    )
  `);

  // Create templates table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      attachments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      signature_name TEXT,
      signature_title TEXT,
      signature_phone TEXT,
      signature_email TEXT,
      signature_company TEXT,
      email_provider TEXT,
      email_oauth_access_token TEXT,
      email_oauth_refresh_token TEXT,
      email_oauth_expires_at TIMESTAMP,
      email_smtp_host TEXT,
      email_smtp_port INTEGER,
      email_smtp_user TEXT,
      email_smtp_password TEXT,
      email_from_name TEXT,
      email_configured_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add email configuration columns if they don't exist (for existing databases)
  try {
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_provider') THEN
          ALTER TABLE users ADD COLUMN email_provider TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_oauth_access_token') THEN
          ALTER TABLE users ADD COLUMN email_oauth_access_token TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_oauth_refresh_token') THEN
          ALTER TABLE users ADD COLUMN email_oauth_refresh_token TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_oauth_expires_at') THEN
          ALTER TABLE users ADD COLUMN email_oauth_expires_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_smtp_host') THEN
          ALTER TABLE users ADD COLUMN email_smtp_host TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_smtp_port') THEN
          ALTER TABLE users ADD COLUMN email_smtp_port INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_smtp_user') THEN
          ALTER TABLE users ADD COLUMN email_smtp_user TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_smtp_password') THEN
          ALTER TABLE users ADD COLUMN email_smtp_password TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_from_name') THEN
          ALTER TABLE users ADD COLUMN email_from_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_configured_at') THEN
          ALTER TABLE users ADD COLUMN email_configured_at TIMESTAMP;
        END IF;
      END $$;
    `);
  } catch (error: any) {
    // Ignore errors - columns may already exist
    console.log('Note: Some email configuration columns may already exist');
  }

  // Create special_offers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS special_offers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create product_types table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function saveEmail(email: Omit<EmailRecord, 'created_at' | 'sent_at'> & { sent_at?: string }) {
  await pool.query(
    `INSERT INTO emails (
      id, recipient_email, recipient_name, subject, body, lead_source, 
      product_type, urgency, is_followup, qualification_info, special_offers, lead_times,
      template_used, attachments, status, sent_at, sent_via
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      sent_at = EXCLUDED.sent_at,
      sent_via = EXCLUDED.sent_via`,
    [
      email.id,
      email.recipient_email,
      email.recipient_name || null,
      email.subject,
      email.body,
      email.lead_source || null,
      email.product_type || null,
      email.urgency || null,
      email.is_followup || 0,
      email.qualification_info || null,
      email.special_offers || null,
      email.lead_times || null,
      email.template_used || null,
      email.attachments || null,
      email.status || 'draft',
      email.sent_at || null,
      email.sent_via || null,
    ]
  );
}

export async function updateEmailStatus(id: string, status: string, sentAt?: string, sentVia?: string) {
  await pool.query(
    `UPDATE emails SET status = $1, sent_at = $2, sent_via = $3 WHERE id = $4`,
    [status, sentAt || null, sentVia || null, id]
  );
}

export async function getEmails(limit: number = 50): Promise<EmailRecord[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM emails ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => ({
      ...row,
      is_followup: row.is_followup ? 1 : 0,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      sent_at: row.sent_at?.toISOString(),
    })) as EmailRecord[];
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

export async function getEmail(id: string): Promise<EmailRecord | undefined> {
  try {
    const result = await pool.query(`SELECT * FROM emails WHERE id = $1`, [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      is_followup: row.is_followup ? 1 : 0,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      sent_at: row.sent_at?.toISOString(),
    } as EmailRecord;
  } catch (error) {
    console.error('Error fetching email:', error);
    return undefined;
  }
}

export async function saveTemplate(template: Omit<Template, 'created_at' | 'updated_at'>) {
  await pool.query(
    `INSERT INTO templates (id, name, subject, body, attachments, updated_at) 
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       name = EXCLUDED.name,
       subject = EXCLUDED.subject,
       body = EXCLUDED.body,
       attachments = EXCLUDED.attachments,
       updated_at = CURRENT_TIMESTAMP`,
    [template.id, template.name, template.subject || null, template.body, template.attachments || null]
  );
}

export async function getTemplates(): Promise<Template[]> {
  try {
    const result = await pool.query(`SELECT * FROM templates ORDER BY updated_at DESC`);
    return result.rows.map(row => ({
      ...row,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    })) as Template[];
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  try {
    const result = await pool.query(`SELECT * FROM templates WHERE id = $1`, [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    } as Template;
  } catch (error) {
    console.error('Error fetching template:', error);
    return undefined;
  }
}

export async function deleteTemplate(id: string) {
  await pool.query(`DELETE FROM templates WHERE id = $1`, [id]);
}

// User management functions
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  if (result.rows.length === 0) return undefined;
  const row = result.rows[0];
  return {
    ...row,
    created_at: row.created_at?.toISOString() || new Date().toISOString(),
    updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
  } as User;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (result.rows.length === 0) return undefined;
  const row = result.rows[0];
  return {
    ...row,
    created_at: row.created_at?.toISOString() || new Date().toISOString(),
    updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
  } as User;
}

export async function createUser(user: Omit<User, 'created_at' | 'updated_at'>) {
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, role, signature_name, signature_title, signature_phone, signature_email, signature_company, email_provider, email_oauth_access_token, email_oauth_refresh_token, email_oauth_expires_at, email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_password, email_from_name, email_configured_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP)`,
    [
      user.id,
      user.email,
      user.password_hash,
      user.name,
      user.role || 'user',
      user.signature_name || null,
      user.signature_title || null,
      user.signature_phone || null,
      user.signature_email || null,
      user.signature_company || null,
      user.email_provider || null,
      user.email_oauth_access_token || null,
      user.email_oauth_refresh_token || null,
      user.email_oauth_expires_at || null,
      user.email_smtp_host || null,
      user.email_smtp_port || null,
      user.email_smtp_user || null,
      user.email_smtp_password || null,
      user.email_from_name || null,
      user.email_configured_at || null,
    ]
  );
}

export async function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'email' | 'password_hash' | 'created_at'>>) {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramCount++}`);
    values.push(updates.role);
  }
  if (updates.signature_name !== undefined) {
    fields.push(`signature_name = $${paramCount++}`);
    values.push(updates.signature_name);
  }
  if (updates.signature_title !== undefined) {
    fields.push(`signature_title = $${paramCount++}`);
    values.push(updates.signature_title);
  }
  if (updates.signature_phone !== undefined) {
    fields.push(`signature_phone = $${paramCount++}`);
    values.push(updates.signature_phone);
  }
  if (updates.signature_email !== undefined) {
    fields.push(`signature_email = $${paramCount++}`);
    values.push(updates.signature_email);
  }
  if (updates.signature_company !== undefined) {
    fields.push(`signature_company = $${paramCount++}`);
    values.push(updates.signature_company);
  }
  if (updates.email_provider !== undefined) {
    fields.push(`email_provider = $${paramCount++}`);
    values.push(updates.email_provider);
  }
  if (updates.email_oauth_access_token !== undefined) {
    fields.push(`email_oauth_access_token = $${paramCount++}`);
    values.push(updates.email_oauth_access_token);
  }
  if (updates.email_oauth_refresh_token !== undefined) {
    fields.push(`email_oauth_refresh_token = $${paramCount++}`);
    values.push(updates.email_oauth_refresh_token);
  }
  if (updates.email_oauth_expires_at !== undefined) {
    fields.push(`email_oauth_expires_at = $${paramCount++}`);
    values.push(updates.email_oauth_expires_at);
  }
  if (updates.email_smtp_host !== undefined) {
    fields.push(`email_smtp_host = $${paramCount++}`);
    values.push(updates.email_smtp_host);
  }
  if (updates.email_smtp_port !== undefined) {
    fields.push(`email_smtp_port = $${paramCount++}`);
    values.push(updates.email_smtp_port);
  }
  if (updates.email_smtp_user !== undefined) {
    fields.push(`email_smtp_user = $${paramCount++}`);
    values.push(updates.email_smtp_user);
  }
  if (updates.email_smtp_password !== undefined) {
    fields.push(`email_smtp_password = $${paramCount++}`);
    values.push(updates.email_smtp_password);
  }
  if (updates.email_from_name !== undefined) {
    fields.push(`email_from_name = $${paramCount++}`);
    values.push(updates.email_from_name);
  }
  if (updates.email_configured_at !== undefined) {
    fields.push(`email_configured_at = $${paramCount++}`);
    values.push(updates.email_configured_at);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount}`,
    values
  );
}

export async function updateUserPassword(id: string, passwordHash: string) {
  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [passwordHash, id]
  );
}

export async function getUsers(): Promise<User[]> {
  try {
    const result = await pool.query(`SELECT * FROM users ORDER BY created_at DESC`);
    return result.rows.map(row => ({
      ...row,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    })) as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function deleteUser(id: string) {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
}

// Special offers functions
export async function saveSpecialOffer(offer: Omit<SpecialOffer, 'created_at' | 'updated_at'>) {
  await pool.query(
    `INSERT INTO special_offers (id, name, description, updated_at) 
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       updated_at = CURRENT_TIMESTAMP`,
    [offer.id, offer.name, offer.description]
  );
}

export async function getSpecialOffers(): Promise<SpecialOffer[]> {
  try {
    const result = await pool.query(`SELECT * FROM special_offers ORDER BY updated_at DESC`);
    return result.rows.map(row => ({
      ...row,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    })) as SpecialOffer[];
  } catch (error) {
    console.error('Error fetching special offers:', error);
    return [];
  }
}

export async function getSpecialOffer(id: string): Promise<SpecialOffer | undefined> {
  try {
    const result = await pool.query(`SELECT * FROM special_offers WHERE id = $1`, [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    } as SpecialOffer;
  } catch (error) {
    console.error('Error fetching special offer:', error);
    return undefined;
  }
}

export async function deleteSpecialOffer(id: string) {
  await pool.query(`DELETE FROM special_offers WHERE id = $1`, [id]);
}

// Product types functions
export async function saveProductType(productType: Omit<ProductType, 'created_at' | 'updated_at'>) {
  await pool.query(
    `INSERT INTO product_types (id, name, trading_name, description, updated_at) 
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       name = EXCLUDED.name,
       trading_name = EXCLUDED.trading_name,
       description = EXCLUDED.description,
       updated_at = CURRENT_TIMESTAMP`,
    [productType.id, productType.name, productType.trading_name || null, productType.description || null]
  );
}

export async function getProductTypes(): Promise<ProductType[]> {
  try {
    const result = await pool.query(`SELECT * FROM product_types ORDER BY name ASC`);
    return result.rows.map(row => ({
      ...row,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    })) as ProductType[];
  } catch (error) {
    console.error('Error fetching product types:', error);
    return [];
  }
}

export async function getProductType(id: string): Promise<ProductType | undefined> {
  try {
    const result = await pool.query(`SELECT * FROM product_types WHERE id = $1`, [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    } as ProductType;
  } catch (error) {
    console.error('Error fetching product type:', error);
    return undefined;
  }
}

export async function deleteProductType(id: string) {
  await pool.query(`DELETE FROM product_types WHERE id = $1`, [id]);
}

// Initialize database on import (only if DATABASE_URL is set)
// Don't block - let it initialize in the background
if (process.env.DATABASE_URL) {
  initDb().catch((error) => {
    console.error('Error initializing PostgreSQL database:', error);
  });
}

