import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId: string;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    // TEMP: debug why Clerk can't resolve the session
    const clerkReason = res.getHeader("x-clerk-auth-reason") as string | undefined;
    console.log(
      "[requireAuth] 401 — cookies:",
      req.headers.cookie,
      "| clerk-auth-reason:", clerkReason,
      "| origin:", req.headers.origin,
      "| host:", req.headers.host,
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
}
