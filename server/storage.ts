import {
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { db, initializeDatabase } from "./db";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Conversation operations
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: number, userId: string): Promise<void>;
  
  // Message operations
  getConversationMessages(conversationId: number): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to update
    const updateStmt = db.prepare(`
      UPDATE users 
      SET email = ?, firstName = ?, lastName = ?, profileImageUrl = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const updateResult = updateStmt.run(
      userData.email,
      userData.firstName,
      userData.lastName,
      userData.profileImageUrl,
      userData.id
    );

    if (updateResult.changes === 0) {
      // Insert if update didn't affect any rows
      const insertStmt = db.prepare(`
        INSERT INTO users (id, email, firstName, lastName, profileImageUrl, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      insertStmt.run(
        userData.id,
        userData.email,
        userData.firstName,
        userData.lastName,
        userData.profileImageUrl
      );
    }

    // Return the user
    const selectStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return selectStmt.get(userData.id) as User;
  }

  // Conversation operations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const stmt = db.prepare(`
      SELECT * FROM conversations 
      WHERE userId = ? 
      ORDER BY updatedAt DESC
    `);
    return stmt.all(userId) as Conversation[];
  }

  async getConversation(id: number, userId: string): Promise<Conversation | undefined> {
    const stmt = db.prepare(`
      SELECT * FROM conversations 
      WHERE id = ? AND userId = ?
    `);
    return stmt.get(id, userId) as Conversation | undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const stmt = db.prepare(`
      INSERT INTO conversations (userId, title, createdAt, updatedAt)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(conversation.userId, conversation.title);
    
    const selectStmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
    return selectStmt.get(result.lastInsertRowid) as Conversation;
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation> {
    if (updates.title) {
      const stmt = db.prepare(`
        UPDATE conversations 
        SET title = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(updates.title, id);
    } else {
      const stmt = db.prepare(`
        UPDATE conversations 
        SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(id);
    }

    const selectStmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
    return selectStmt.get(id) as Conversation;
  }

  async deleteConversation(id: number, userId: string): Promise<void> {
    const stmt = db.prepare(`
      DELETE FROM conversations 
      WHERE id = ? AND userId = ?
    `);
    stmt.run(id, userId);
  }

  // Message operations
  async getConversationMessages(conversationId: number): Promise<Message[]> {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE conversationId = ? 
      ORDER BY createdAt ASC
    `);
    
    const messages = stmt.all(conversationId) as any[];
    
    // Parse JSON attachments
    return messages.map(msg => ({
      ...msg,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : null
    }));
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const stmt = db.prepare(`
      INSERT INTO messages (conversationId, content, role, attachments, createdAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      message.conversationId,
      message.content,
      message.role,
      message.attachments ? JSON.stringify(message.attachments) : null
    );
    
    const selectStmt = db.prepare('SELECT * FROM messages WHERE id = ?');
    const newMessage = selectStmt.get(result.lastInsertRowid) as any;
    
    return {
      ...newMessage,
      attachments: newMessage.attachments ? JSON.parse(newMessage.attachments) : null
    };
  }

  async deleteMessage(id: number): Promise<void> {
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    stmt.run(id);
  }
}

export const storage = new DatabaseStorage();
