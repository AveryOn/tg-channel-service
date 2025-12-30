import { randomUUID } from 'crypto';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

const id = text('id')
  .primaryKey()
  .notNull()
  .$defaultFn(() => randomUUID());
const createdAt = integer('created_at')
  .notNull()
  .$defaultFn(() => Date.now());
const updatedAt = integer('updated_at')
  .notNull()
  .$defaultFn(() => Date.now());

// TG users
export const tgUsersTable = sqliteTable('tg_users', {
  id: integer('id').primaryKey(), // telegram user id
  createdAt,
  updatedAt,
});

export const tasksTable = sqliteTable('tasks', {
  id,
  createdAt,
  updatedAt,
  rawText: text('raw_text').notNull(),
  rawDeliveryAt: text('raw_delivery_at'),
  parsedJson: text('parsed_json'),
  nextRunAt: integer('next_run_at'),
  timezone: text('timezone').notNull(),
  type: text('type').notNull().default('reminder'), // reminder
  status: text('status').notNull().default('active'), // active | paused | done | error
  lastRunAt: integer('last_run_at'),
  tgUserId: integer('tg_user_id')
    .notNull()
    .references(() => tgUsersTable.id, { onDelete: 'cascade' }),
});

export enum TaskStatus {
  active = 'active',
  paused = 'paused',
  done = 'done',
  error = 'error',
}

export enum TaskType {
  reminder = 'reminder',
}
