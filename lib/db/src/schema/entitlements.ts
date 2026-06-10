import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const entitlementsTable = pgTable("entitlements", {
  userId: text("user_id").primaryKey(),
  tier: text("tier").notNull().default("lifetime"),
  source: text("source").notNull().default("simulated"),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertEntitlementSchema = createInsertSchema(entitlementsTable).omit({
  grantedAt: true,
});
export type InsertEntitlement = z.infer<typeof insertEntitlementSchema>;
export type Entitlement = typeof entitlementsTable.$inferSelect;
