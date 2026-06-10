import { Router, type IRouter } from "express";
import { GetEntitlementResponse, PurchaseLifetimeResponse } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { readEntitlement, grantLifetime } from "../lib/entitlement";

const router: IRouter = Router();

router.get("/me/entitlement", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const entitlement = await readEntitlement(userId);
  res.json(GetEntitlementResponse.parse(entitlement));
});

router.post(
  "/me/entitlement/purchase",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = (req as AuthedRequest).userId;
    // Simulated purchase. Real Stripe integration drops in by verifying payment
    // in a webhook and calling grantLifetime(userId, "stripe") there instead.
    const entitlement = await grantLifetime(userId, "simulated");
    req.log.info({ userId }, "Granted lifetime entitlement (simulated)");
    res.json(PurchaseLifetimeResponse.parse(entitlement));
  },
);

export default router;
