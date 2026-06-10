import { Router, type IRouter } from "express";
import healthRouter from "./health";
import entitlementRouter from "./entitlement";
import habitsRouter from "./habits";
import completionsRouter from "./completions";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(entitlementRouter);
router.use(habitsRouter);
router.use(completionsRouter);
router.use(syncRouter);

export default router;
