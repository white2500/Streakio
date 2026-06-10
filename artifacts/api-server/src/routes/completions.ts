import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, completionsTable } from "@workspace/db";
import {
  ListCompletionsResponse,
  ToggleCompletionBody,
  ToggleCompletionResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/completions", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const rows = await db
    .select()
    .from(completionsTable)
    .where(eq(completionsTable.userId, userId));
  res.json(
    ListCompletionsResponse.parse(
      rows.map((r) => ({ habitId: r.habitId, date: r.date })),
    ),
  );
});

router.post(
  "/completions/toggle",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = (req as AuthedRequest).userId;
    const parsed = ToggleCompletionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { habitId, date } = parsed.data;

    const [existing] = await db
      .select()
      .from(completionsTable)
      .where(
        and(
          eq(completionsTable.userId, userId),
          eq(completionsTable.habitId, habitId),
          eq(completionsTable.date, date),
        ),
      );

    let completed: boolean;
    if (existing) {
      await db
        .delete(completionsTable)
        .where(eq(completionsTable.id, existing.id));
      completed = false;
    } else {
      await db
        .insert(completionsTable)
        .values({ userId, habitId, date })
        .onConflictDoNothing();
      completed = true;
    }

    res.json(ToggleCompletionResponse.parse({ habitId, date, completed }));
  },
);

export default router;
