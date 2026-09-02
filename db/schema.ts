import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const progress = sqliteTable("progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  questionDate: text("question_date").notNull(),
  answer: text("answer").notNull(),
  score: integer("score_tenths").notNull(),
  resultLabel: text("result_label").notNull(),
  hits: text("hits_json").notNull().default("[]"),
  misses: text("misses_json").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_progress_user_date").on(table.userId, table.questionDate)]);
