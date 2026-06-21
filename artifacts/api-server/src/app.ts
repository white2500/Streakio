import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Mount the Clerk proxy before body parsers (it streams raw bytes).
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TEMP: debug endpoint to inspect headers and cookies
app.get("/api/debug-headers", (req, res) => {
  res.json({
    cookie: req.headers.cookie,
    origin: req.headers.origin,
    host: req.headers.host,
    forwardedHost: req.headers["x-forwarded-host"],
    forwardedProto: req.headers["x-forwarded-proto"],
    allHeaders: Object.fromEntries(
      Object.entries(req.headers).filter(([k]) => !k.startsWith("sec-") && k !== "cookie"),
    ),
  });
});

// TEMP: debug all incoming requests
app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie;
  const clerkCookies = cookieHeader
    ?.split(";")
    .map((c) => c.trim())
    .filter((c) => c.includes("clerk") || c.includes("__session") || c.includes("dev-browser"));
  console.log("[DEBUG]", req.method, req.url, "cookies:", clerkCookies, "| origin:", req.headers.origin, "| host:", req.headers.host, "| x-forwarded-host:", req.headers["x-forwarded-host"]);
  next();
});

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
