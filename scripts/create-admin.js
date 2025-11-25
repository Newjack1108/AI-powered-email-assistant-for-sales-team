#!/usr/bin/env node

/**
 * Admin User Setup Script
 * 
 * Usage:
 *   node scripts/create-admin.js
 *   or
 *   npm run create-admin
 * 
 * This script creates the first admin user for the Sales Email Assistant.
 * It will prompt you for email, password, and name.
 */

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Import database functions
const path = require('path');
const fs = require('fs');

// Determine which database to use
let dbModule;
if (process.env.DATABASE_URL) {
  // PostgreSQL
  dbModule = require('../lib/db-postgres');
} else {
  // SQLite
  const sqlite3 = require('sqlite3');
  const { promisify } = require('util');
  const dbPath = path.join(process.cwd(), 'data', 'emails.db');
  const db = new sqlite3.Database(dbPath);
  const dbRun = promisify(db.run.bind(db));
  const dbGet = promisify(db.get.bind(db));

  dbModule = {
    initDb: async () => {
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
    },
    getUserByEmail: async (email) => {
      return await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    },
    createUser: async (user) => {
      await dbRun(
        `INSERT INTO users (id, email, password_hash, name, role, signature_name, signature_title, signature_phone, signature_email, signature_company, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          user.id,
          user.email,
          user.password_hash,
          user.name,
          user.role || 'admin',
          user.signature_name || null,
          user.signature_title || null,
          user.signature_phone || null,
          user.signature_email || null,
          user.signature_company || null,
        ]
      );
    },
  };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('\n=== Admin User Setup ===\n');
    console.log('This script will create the first admin user for the Sales Email Assistant.\n');

    // Initialize database
    console.log('Initializing database...');
    await dbModule.initDb();
    console.log('✓ Database initialized\n');

    // Get user input
    const email = await question('Enter admin email: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      rl.close();
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await dbModule.getUserByEmail(email);
    if (existingUser) {
      console.error(`❌ User with email ${email} already exists!`);
      rl.close();
      process.exit(1);
    }

    const name = await question('Enter admin name: ');
    if (!name || name.trim().length === 0) {
      console.error('❌ Name is required');
      rl.close();
      process.exit(1);
    }

    const password = await question('Enter admin password: ');
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      rl.close();
      process.exit(1);
    }

    const confirmPassword = await question('Confirm password: ');
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      rl.close();
      process.exit(1);
    }

    // Hash password
    console.log('\nHashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    console.log('Creating admin user...');
    const userId = uuidv4();
    await dbModule.createUser({
      id: userId,
      email: email.trim(),
      password_hash: passwordHash,
      name: name.trim(),
      role: 'admin',
    });

    console.log('\n✅ Admin user created successfully!\n');
    console.log('User Details:');
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log(`  Role: admin`);
    console.log(`  ID: ${userId}\n`);
    console.log('You can now login at /login\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdmin();

