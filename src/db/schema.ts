import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  nim: text('nim').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('student'), // 'student' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  reporterId: integer('reporter_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  reportType: text('report_type').notNull(), // 'found' | 'lost'
  title: text('title').notNull(),
  category: text('category').notNull(),
  location: text('location').notNull(),
  eventTime: text('event_time').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url'),
  secretNote: text('secret_note').notNull(),
  status: text('status').notNull().default('pending_review'), // 'pending_review' | 'verified' | 'claimed' | 'rejected'
  adminNote: text('admin_note'),
  verifiedBy: integer('verified_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const claims = pgTable('claims', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .references(() => items.id, { onDelete: 'cascade' })
    .notNull(),
  claimantId: integer('claimant_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  claimantNim: text('claimant_nim').notNull(),
  secretAnswer: text('secret_answer').notNull(),
  ktmImageUrl: text('ktm_image_url'),
  contactInfo: text('contact_info').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  adminNote: text('admin_note'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  claims: many(claims),
  sessions: many(sessions),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  reporter: one(users, {
    fields: [items.reporterId],
    references: [users.id],
  }),
  claims: many(claims),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  item: one(items, {
    fields: [claims.itemId],
    references: [items.id],
  }),
  claimant: one(users, {
    fields: [claims.claimantId],
    references: [users.id],
  }),
}));
