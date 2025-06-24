import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

// Use SQLite as a simple alternative to MS SQL for development
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "chatbot.db");

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

export const initializeDatabase = async () => {
  try {
    // Enable foreign keys
    sqlite.pragma("foreign_keys = ON");
    
    // Create tables if they don't exist
    createTables();
    
    console.log("Connected to SQLite database (MS SQL compatible schema)");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};

const createTables = () => {
  // Create sessions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire TEXT NOT NULL
    )
  `);

  // Create users table
  sqlite.exec(`
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
  sqlite.exec(`
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
  sqlite.exec(`
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
  sqlite.exec(`
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
};