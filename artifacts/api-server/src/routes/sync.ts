import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, habitsTable, completionsTable } from "@workspace/db";
import { ImportStateBody, ImportStateResponse } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

/**
 * Replace the user's cloud habit data with the supplied state. Used when a user
 * upgrades and their local (device-only) data is migrated to the cloud.
 */
router.post("/sync/import", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const parsed = ImportStateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { habits, completions } = parsed.data;
  const habitIds = new Set(habits.map((h) => h.id));
  // Only import completions that belong to an imported habit.
  const validCompletions = completions.filter((c) => habitIds.has(c.habitId));

  await db.transaction(async (tx) => {
    await tx.delete(habitsTable).where(eq(habitsTable.userId, userId));
    await tx
      .delete(completionsTable)
      .where(eq(completionsTable.userId, userId));

    if (habits.length > 0) {
      await tx.insert(habitsTable).values(
        habits.map((h) => ({
          id: h.id,
          userId,
          name: h.name,
          color: h.color,
          position: h.position,
        })),
      );
    }

    if (validCompletions.length > 0) {
      await tx
        .insert(completionsTable)
        .values(
          validCompletions.map((c) => ({
            userId,
            habitId: c.habitId,
            date: c.date,
          })),
        )
        .onConflictDoNothing();
    }
  });

  const habitRows = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.userId, userId))
    .orderBy(habitsTable.position);
  const completionRows = await db
    .select()
    .from(completionsTable)
    .where(eq(completionsTable.userId, userId));

  res.json(
    ImportStateResponse.parse({
      habits: habitRows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
      })),
      completions: completionRows.map((r) => ({
        habitId: r.habitId,
        date: r.date,
      })),
    }),
  );
});

export default router;
