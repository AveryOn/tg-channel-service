import { randomUUID } from 'crypto';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

const id = text('id')
  .primaryKey()
  .notNull()
  .$defaultFn(() => randomUUID());
const createdAt = integer('created_at')
  .notNull()
  .$defaultFn(() => Date.now());

export const guinnessTopicsTable = sqliteTable('guinness_topics', {
  id: id,
  title: text('title').notNull().unique(),
  hash: text('hash').notNull().unique(),
  templateKey: integer('template_key').notNull().default(1),
  createdAt,
});
