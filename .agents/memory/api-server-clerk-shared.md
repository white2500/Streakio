---
name: API server @clerk/shared build fix
description: How to fix the @clerk/shared/keys esbuild + runtime resolution errors in the API server
---

## The rule
Externalizing `@clerk/*` in `build.mjs` is necessary but not sufficient — if `@clerk/shared` is only a transitive dep (not listed in api-server's own `package.json`), Node.js ESM cannot find it at runtime even though it's installed in the workspace root.

**Why:** esbuild leaves externalized imports as bare specifiers in the output bundle. At runtime Node resolves them relative to the output file's location (`dist/`), not the workspace root, so transitive deps that aren't hoisted into the artifact's `node_modules` are not found.

**How to apply:** For any `@clerk/*` subpath import in `api-server/src/`, either:
1. Add the package as a direct dep (`pnpm add @clerk/shared --filter @workspace/api-server`), OR
2. Remove the import and inline the logic. For `publishableKeyFromHost`, the single-domain case is just `process.env.CLERK_PUBLISHABLE_KEY` — no helper needed.
