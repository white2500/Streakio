import { eq } from "drizzle-orm";
import { db, entitlementsTable } from "@workspace/db";

export interface EntitlementResult {
  premium: boolean;
  tier: string | null;
  source: string | null;
  grantedAt: string | null;
}

const NONE: EntitlementResult = {
  premium: false,
  tier: null,
  source: null,
  grantedAt: null,
};

/**
 * Read the user's current entitlement. The source of truth for premium status
 * lives server-side so it is secure, cross-device, and auto-restores on login.
 */
export async function readEntitlement(
  userId: string,
): Promise<EntitlementResult> {
  const [row] = await db
    .select()
    .from(entitlementsTable)
    .where(eq(entitlementsTable.userId, userId));

  if (!row) return NONE;

  return {
    premium: true,
    tier: row.tier,
    source: row.source,
    grantedAt: row.grantedAt.toISOString(),
  };
}

/**
 * Grant a lifetime entitlement. This is the single grant path: the simulated
 * purchase calls it with source "simulated", and a future Stripe webhook would
 * call the same function with source "stripe" once payment is verified.
 */
export async function grantLifetime(
  userId: string,
  source: "simulated" | "stripe" = "simulated",
): Promise<EntitlementResult> {
  await db
    .insert(entitlementsTable)
    .values({ userId, tier: "lifetime", source })
    .onConflictDoUpdate({
      target: entitlementsTable.userId,
      set: { tier: "lifetime" },
    });

  return readEntitlement(userId);
}
