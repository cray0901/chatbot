import {
  sqliteTable as table,
  text,
  integer,
  real,
  blob,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = table(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(), // JSON stored as text
    expire: text("expire").notNull(), // ISO timestamp as text
  },
);

// User storage table.
export const users = table("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").notNull(),
  password: text("password"), // For local auth, nullable for OAuth
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false),
  tokenQuota: integer("token_quota").default(10000), // Monthly token limit
  tokenUsed: integer("token_used").default(0), // Current month usage
  resetToken: text("reset_token"), // For password reset
  resetTokenExpiry: text("reset_token_expiry"), // ISO timestamp as text
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  verificationToken: text("verification_token"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// Admin configuration table for API settings
export const adminConfig = table("admin_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apiProvider: text("api_provider").notNull().default("openai"), // openai, anthropic, etc
  apiKey: text("api_key").notNull(),
  apiEndpoint: text("api_endpoint"),
  modelName: text("model_name").notNull().default("gpt-4"),
  defaultTokenQuota: integer("default_token_quota").default(10000),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const conversations = table("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const messages = table("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  attachments: text("attachments"), // JSON stored as text
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Insert schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAdminConfigSchema = createInsertSchema(adminConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Auth schemas with relaxed email validation for localhost
export const registerSchema = z.object({
  email: z.string().min(1).refine((email) => {
    // Allow basic email format including localhost domains
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith('@localhost');
  }, "Invalid email format"),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().min(1).refine((email) => {
    // Allow basic email format including localhost domains
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith('@localhost');
  }, "Invalid email format"),
  password: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  email: z.string().min(1).refine((email) => {
    // Allow basic email format including localhost domains
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith('@localhost');
  }, "Invalid email format"),
});

export const newPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AdminConfig = typeof adminConfig.$inferSelect;
export type InsertAdminConfig = z.infer<typeof insertAdminConfigSchema>;
export type RegisterUser = z.infer<typeof registerSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
