import { int, mysqlEnum, mysqlTable, text, mediumtext, timestamp, varchar, boolean as mysqlBoolean, bigint, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contact lists for organizing recipients
 */
export const contactLists = mysqlTable("contact_lists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  folder: varchar("folder", { length: 255 }),
  contactCount: int("contactCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContactList = typeof contactLists.$inferSelect;
export type InsertContactList = typeof contactLists.$inferInsert;

/**
 * Individual contacts (CRM)
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  subscribed: mysqlBoolean("subscribed").default(true).notNull(),
  customFields: json("customFields"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Many-to-many relationship between contacts and lists
 */
export const contactListMembers = mysqlTable("contact_list_members", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  listId: int("listId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type ContactListMember = typeof contactListMembers.$inferSelect;

/**
 * Email campaigns
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["draft", "subject_defined", "subject_confirmed", "content_ready", "test_sent", "sending", "sent", "failed"]).default("draft").notNull(),
  listId: int("listId"),
  subject: varchar("subject", { length: 500 }),
  subjectConfirmed: mysqlBoolean("subjectConfirmed").default(false).notNull(),
  previewText: varchar("previewText", { length: 500 }),
  senderName: varchar("senderName", { length: 255 }),
  senderEmail: varchar("senderEmail", { length: 320 }),
  contentType: mysqlEnum("contentType", ["html", "image", "template"]).default("html"),
  htmlContent: mediumtext("htmlContent"),
  imageUrl: text("imageUrl"),
  recipientCount: int("recipientCount").default(0),
  sentCount: int("sentCount").default(0),
  failedCount: int("failedCount").default(0),
  testSentAt: timestamp("testSentAt"),
  testSentTo: varchar("testSentTo", { length: 320 }),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Campaign attachments stored in S3
 */
export const campaignAttachments = mysqlTable("campaign_attachments", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignAttachment = typeof campaignAttachments.$inferSelect;

/**
 * Audit logs for all operations
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  details: text("details"),
  status: mysqlEnum("status", ["success", "error", "pending", "in_progress"]).default("success").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * SMTP settings per user
 */
export const smtpSettings = mysqlTable("smtp_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").default(587).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 500 }).notNull(),
  encryption: mysqlEnum("encryption", ["tls", "ssl", "none"]).default("tls").notNull(),
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  isActive: mysqlBoolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmtpSettings = typeof smtpSettings.$inferSelect;
export type InsertSmtpSettings = typeof smtpSettings.$inferInsert;
