import {
  pgTable,
  serial,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const completionsTable = pgTable(
  "completions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    habitId: text("habit_id").notNull(),
    date: text("date").notNull(),
  },
  (table) => [
    uniqueIndex("completions_habit_date_idx").on(table.habitId, table.date),
    index("completions_user_id_idx").on(table.userId),
  ],
);

export const insertCompletionSchema = createInsertSchema(completionsTable).omit({
  id: true,
});
export type InsertCompletion = z.infer<typeof insertCompletionSchema>;
export type Completion = typeof completionsTable.$inferSelect;
