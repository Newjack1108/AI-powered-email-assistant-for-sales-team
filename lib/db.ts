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

export interface SpecialOffer {
  id: string;
  name: string;
  description: string;
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
  created_at: string;
  updated_at: string;
}

// Dynamically import the appropriate database module
let dbModule: any;

if (process.env.DATABASE_URL) {
  // Use PostgreSQL (Railway production)
  dbModule = require('./db-postgres');
} else {
  // Use SQLite (local development)
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
  const initDb = async () => {
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

    // Create users table
    await dbRun(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create special_offers table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS special_offers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  };

  const saveEmail = async (email: Omit<EmailRecord, 'created_at' | 'sent_at'> & { sent_at?: string }) => {
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
  };

  const updateEmailStatus = async (id: string, status: string, sentAt?: string, sentVia?: string) => {
    await dbRun(
      `UPDATE emails SET status = ?, sent_at = ?, sent_via = ? WHERE id = ?`,
      [status, sentAt || null, sentVia || null, id]
    );
  };

  const getEmails = async (limit: number = 50): Promise<EmailRecord[]> => {
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
  };

  const getEmail = async (id: string): Promise<EmailRecord | undefined> => {
    return (await dbGet(`SELECT * FROM emails WHERE id = ?`, [id])) as EmailRecord | undefined;
  };

  const saveTemplate = async (template: Omit<Template, 'created_at' | 'updated_at'>) => {
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
  };

  const getTemplates = async (): Promise<Template[]> => {
    try {
      const result = await dbAll(`SELECT * FROM templates ORDER BY updated_at DESC`);
      return Array.isArray(result) ? (result as Template[]) : [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  };

  const getTemplate = async (id: string): Promise<Template | undefined> => {
    return (await dbGet(`SELECT * FROM templates WHERE id = ?`, [id])) as Template | undefined;
  };

  const deleteTemplate = async (id: string) => {
    await dbRun(`DELETE FROM templates WHERE id = ?`, [id]);
  };

  // Export SQLite functions
  dbModule = {
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

  // User management functions
  const getUserByEmail = async (email: string): Promise<User | undefined> => {
    return (await dbGet(`SELECT * FROM users WHERE email = ?`, [email])) as User | undefined;
  };

  const getUserById = async (id: string): Promise<User | undefined> => {
    return (await dbGet(`SELECT * FROM users WHERE id = ?`, [id])) as User | undefined;
  };

  const createUser = async (user: Omit<User, 'created_at' | 'updated_at'>) => {
    await dbRun(
      `INSERT INTO users (id, email, password_hash, name, role, signature_name, signature_title, signature_phone, signature_email, signature_company, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
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
      ]
    );
  };

  const updateUser = async (id: string, updates: Partial<Omit<User, 'id' | 'email' | 'password_hash' | 'created_at'>>) => {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.signature_name !== undefined) {
      fields.push('signature_name = ?');
      values.push(updates.signature_name);
    }
    if (updates.signature_title !== undefined) {
      fields.push('signature_title = ?');
      values.push(updates.signature_title);
    }
    if (updates.signature_phone !== undefined) {
      fields.push('signature_phone = ?');
      values.push(updates.signature_phone);
    }
    if (updates.signature_email !== undefined) {
      fields.push('signature_email = ?');
      values.push(updates.signature_email);
    }
    if (updates.signature_company !== undefined) {
      fields.push('signature_company = ?');
      values.push(updates.signature_company);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await dbRun(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  };

  const updateUserPassword = async (id: string, passwordHash: string) => {
    await dbRun(
      `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [passwordHash, id]
    );
  };

  // Initialize database on import (but don't block)
  initDb().catch((error) => {
    console.error('Error initializing SQLite database:', error);
  });

  // Export SQLite functions
  dbModule = {
    initDb,
    saveEmail,
    updateEmailStatus,
    getEmails,
    getEmail,
    saveTemplate,
    getTemplates,
    getTemplate,
    deleteTemplate,
    getUserByEmail,
    getUserById,
    createUser,
    updateUser,
    updateUserPassword,
  };
}

// Export all functions from the appropriate module
// Wrap in functions to ensure dbModule is initialized
export const initDb = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.initDb(...args);
};

export const saveEmail = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.saveEmail(...args);
};

export const updateEmailStatus = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.updateEmailStatus(...args);
};

export const getEmails = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.getEmails(...args);
};

export const getEmail = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.getEmail(...args);
};

export const saveTemplate = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.saveTemplate(...args);
};

export const getTemplates = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.getTemplates(...args);
};

export const getTemplate = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.getTemplate(...args);
};

export const deleteTemplate = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.deleteTemplate(...args);
};

export const getUserByEmail = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.getUserByEmail(...args);
};

export const getUserById = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.getUserById(...args);
};

export const createUser = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.createUser(...args);
};

export const updateUser = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.updateUser(...args);
};

export const updateUserPassword = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.updateUserPassword(...args);
};

export const saveSpecialOffer = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.saveSpecialOffer(...args);
};

export const getSpecialOffers = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.getSpecialOffers(...args);
};

export const getSpecialOffer = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.getSpecialOffer(...args);
};

export const deleteSpecialOffer = (...args: any[]) => {
  if (!dbModule) {
    throw new Error('Database module not initialized');
  }
  return dbModule.deleteSpecialOffer(...args);
};
