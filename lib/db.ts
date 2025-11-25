// Database configuration - automatically uses PostgreSQL if DATABASE_URL is set, otherwise SQLite
// This allows the app to work locally with SQLite and on Railway with PostgreSQL

// Export interfaces (same for both databases)
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

// Use PostgreSQL if DATABASE_URL is set (Railway), otherwise use SQLite (local)
if (process.env.DATABASE_URL) {
  // Re-export everything from PostgreSQL module
  module.exports = require('./db-postgres');
} else {
  // Use SQLite for local development
  const sqlite3 = require('sqlite3');
  const { promisify } = require('util');
  const path = require('path');
  const fs = require('fs');

  const dbPath = path.join(process.cwd(), 'data', 'emails.db');
  const dbDir = path.dirname(dbPath);

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new sqlite3.Database(dbPath);

  // Promisify database methods
  const dbRun = promisify(db.run.bind(db));
  const dbAll = promisify(db.all.bind(db));
  const dbGet = promisify(db.get.bind(db));

  // Initialize database tables
  async function initDb() {
    await dbRun(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,
        sent_via TEXT
      )
    `);

    // Add product_type column if it doesn't exist
    try {
      const tableInfo = await dbAll(`PRAGMA table_info(emails)`);
      const hasProductType = Array.isArray(tableInfo) && (tableInfo as any[]).some((col: any) => col.name === 'product_type');
      if (!hasProductType) {
        await dbRun(`ALTER TABLE emails ADD COLUMN product_type TEXT`);
      }
    } catch (error: any) {
      // Ignore errors
    }

    await dbRun(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        attachments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add attachments column if it doesn't exist
    try {
      const tableInfo = await dbAll(`PRAGMA table_info(templates)`);
      const hasAttachments = Array.isArray(tableInfo) && (tableInfo as any[]).some((col: any) => col.name === 'attachments');
      if (!hasAttachments) {
        await dbRun(`ALTER TABLE templates ADD COLUMN attachments TEXT`);
      }
    } catch (error: any) {
      // Ignore errors
    }
  }

  async function saveEmail(email: Omit<EmailRecord, 'created_at' | 'sent_at'>) {
    await dbRun(
      `INSERT INTO emails (
        id, recipient_email, recipient_name, subject, body, lead_source, 
        product_type, urgency, is_followup, qualification_info, special_offers, lead_times,
        template_used, attachments, status, sent_at, sent_via
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  async function updateEmailStatus(id: string, status: string, sentAt?: string, sentVia?: string) {
    await dbRun(
      `UPDATE emails SET status = ?, sent_at = ?, sent_via = ? WHERE id = ?`,
      [status, sentAt || null, sentVia || null, id]
    );
  }

  async function getEmails(limit: number = 50): Promise<EmailRecord[]> {
    try {
      const result = await dbAll(
        `SELECT * FROM emails ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );
      return Array.isArray(result) ? (result as EmailRecord[]) : [];
    } catch (error) {
      console.error('Error fetching emails:', error);
      return [];
    }
  }

  async function getEmail(id: string): Promise<EmailRecord | undefined> {
    return (await dbGet(`SELECT * FROM emails WHERE id = ?`, [id])) as EmailRecord | undefined;
  }

  async function saveTemplate(template: Omit<Template, 'created_at' | 'updated_at'>) {
    await dbRun(
      `INSERT INTO templates (id, name, subject, body, attachments, updated_at) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         subject = excluded.subject,
         body = excluded.body,
         attachments = excluded.attachments,
         updated_at = CURRENT_TIMESTAMP`,
      [template.id, template.name, template.subject || null, template.body, template.attachments || null]
    );
  }

  async function getTemplates(): Promise<Template[]> {
    try {
      const result = await dbAll(`SELECT * FROM templates ORDER BY updated_at DESC`);
      return Array.isArray(result) ? (result as Template[]) : [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  async function getTemplate(id: string): Promise<Template | undefined> {
    return (await dbGet(`SELECT * FROM templates WHERE id = ?`, [id])) as Template | undefined;
  }

  async function deleteTemplate(id: string) {
    await dbRun(`DELETE FROM templates WHERE id = ?`, [id]);
  }

  // Initialize database on import
  initDb().catch(console.error);

  // Export SQLite functions
  module.exports = {
    initDb,
    saveEmail,
    updateEmailStatus,
    getEmails,
    getEmail,
    saveTemplate,
    getTemplates,
    getTemplate,
    deleteTemplate,
  };
}
