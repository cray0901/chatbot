#!/usr/bin/env node

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import crypto from 'crypto';

async function initializeDatabase() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "chatbot.db");
  const db = new Database(dbPath);

  try {
    console.log('Initializing SQLite database...');

    // Enable foreign keys
    db.pragma("foreign_keys = ON");

    // Create all tables
    createTables(db);

    // Create admin user if doesn't exist
    await createAdminUser(db);

    console.log('SQLite database initialized successfully');
    db.close();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    db.close();
    process.exit(1);
  }
}

function createTables(db) {
  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire TEXT NOT NULL
    )
  `);

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      first_name TEXT,
      last_name TEXT,
      profile_image_url TEXT,
      is_active INTEGER DEFAULT 1,
      is_admin INTEGER DEFAULT 0,
      token_quota INTEGER DEFAULT 10000,
      token_used INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_token_expiry TEXT,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create admin_config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_provider TEXT NOT NULL DEFAULT 'openai',
      api_key TEXT NOT NULL,
      api_endpoint TEXT,
      model_name TEXT NOT NULL DEFAULT 'gpt-4',
      default_token_quota INTEGER DEFAULT 10000,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      role TEXT NOT NULL,
      attachments TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);
}

async function createAdminUser(db) {
  const adminEmail = 'admin@localhost';
  const adminPassword = 'admin123';
  
  // Check if admin user already exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const adminId = 'admin-' + crypto.randomUUID();
    
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, email, password, first_name, last_name, 
        is_active, is_admin, email_verified, token_quota,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertUser.run(
      adminId,
      adminEmail,
      hashedPassword,
      'Admin',
      'User',
      1, // is_active
      1, // is_admin
      1, // email_verified
      100000, // token_quota
      new Date().toISOString(),
      new Date().toISOString()
    );
    
    console.log('✓ Admin user created:', { id: adminId, email: adminEmail });
    console.log('  Default password: admin123 (change after first login)');
  } else {
    console.log('✓ Admin user already exists');
  }
}

// Run initialization
initializeDatabase().catch(console.error);