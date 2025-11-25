// Alternative database configuration for Railway/PostgreSQL
// This is a template - you can use this if you want to switch to PostgreSQL

import { Pool } from 'pg';

// Railway provides DATABASE_URL automatically if you add PostgreSQL service
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function initDbPostgres() {
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
}

// Note: This is just a template. To use PostgreSQL, you would need to:
// 1. Add 'pg' package: npm install pg @types/pg
// 2. Add PostgreSQL service in Railway
// 3. Update lib/db.ts to use PostgreSQL instead of SQLite
// 4. Update all database functions to use pool.query() instead of dbRun/dbAll/dbGet

