import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, habitsTable, completionsTable } from "@workspace/db";
import {
  CreateHabitBody,
  UpdateHabitBody,
  UpdateHabitParams,
  UpdateHabitResponse,
  DeleteHabitParams,
  ReorderHabitsBody,
  ListHabitsResponse,
  ReorderHabitsResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

// The create response is the Habit entity, identical to UpdateHabitResponse
// (Orval does not emit a separate schema for the 201 response).
const HabitResponse = UpdateHabitResponse;

const router: IRouter = Router();

function toHabit(row: typeof habitsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
  };
}

router.get("/habits", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const rows = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.userId, userId))
    .orderBy(habitsTable.position);
  res.json(ListHabitsResponse.parse(rows.map(toHabit)));
});

router.post("/habits", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${habitsTable.position}), -1)` })
    .from(habitsTable)
    .where(eq(habitsTable.userId, userId));

  const [row] = await db
    .insert(habitsTable)
    .values({
      id: randomUUID(),
      userId,
      name: parsed.data.name,
      color: parsed.data.color,
      position: Number(max) + 1,
    })
    .returning();

  res.status(201).json(HabitResponse.parse(toHabit(row)));
});

router.post("/habits/reorder", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const parsed = ReorderHabitsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < parsed.data.ids.length; i++) {
      await tx
        .update(habitsTable)
        .set({ position: i })
        .where(
          and(
            eq(habitsTable.id, parsed.data.ids[i]),
            eq(habitsTable.userId, userId),
          ),
        );
    }
  });

  const rows = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.userId, userId))
    .orderBy(habitsTable.position);
  res.json(ReorderHabitsResponse.parse(rows.map(toHabit)));
});

router.patch("/habits/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const params = UpdateHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(habitsTable)
    .set(parsed.data)
    .where(
      and(eq(habitsTable.id, params.data.id), eq(habitsTable.userId, userId)),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }
  res.json(UpdateHabitResponse.parse(toHabit(row)));
});

router.delete("/habits/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const params = DeleteHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(habitsTable)
    .where(
      and(eq(habitsTable.id, params.data.id), eq(habitsTable.userId, userId)),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }

  await db
    .delete(completionsTable)
    .where(
      and(
        eq(completionsTable.habitId, params.data.id),
        eq(completionsTable.userId, userId),
      ),
    );

  res.sendStatus(204);
});

export default router;
