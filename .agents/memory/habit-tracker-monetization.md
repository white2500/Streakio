---
name: Habit tracker monetization architecture
description: How the free/premium split, auth, and data layer work in the habit-tracker artifact.
---

# Monetization model

- All users sign in via Clerk. Entitlement (premium lifetime) is stored **server-side per Clerk userId**, so premium auto-restores on any device after login. Never trust client-only flags for gating real value.
- Free tier: habits live in `localStorage` (device-local), plus a bottom banner ad on the tracker only (never interstitial).
- Premium lifetime (one purchase): ad-free, cloud sync (server-stored habits/completions), advanced analytics, data export, premium themes.
- Purchase is **simulated** (`POST /api/me/purchase` grants entitlement). Architected so real Stripe drops in later by reusing the server-side grant logic — keep grant logic server-side, not in the client.

# Data layer (useHabits)

**Why both backends always run:** `useHabits()` calls both `useLocalHabits()` and `useCloudHabits()` unconditionally, then selects based on premium — this preserves rules-of-hooks (no conditional hook calls). Do not refactor into an `if (premium) useCloud()` shape.

**Loading deadlock footgun:** cloud `isLoaded` must be `!isLoading` on both queries (settles on success OR error), NOT `isSuccess && isSuccess`. The latter traps the app on a perpetual spinner if any query errors.

# Migration on upgrade

**Why `purchase()` returns `{ migrated }`:** the entitlement grant and the local→cloud import are separate steps. The grant must succeed (throws on failure → real purchase error). The import is best-effort and **never deletes the local copy**, so a migration failure is recoverable. `purchase()` returns `{ migrated: boolean }` so the Upgrade UI can honestly tell the user their data is safe locally even if it didn't sync. Do not silently swallow migration failures with no user signal.

# Completion keys

Format is `${habitId}-${date}` where habitId is a UUID (contains dashes) and date is `YYYY-MM-DD`. Parse with `date = key.slice(-10)`, `habitId = key.slice(0, -11)` — never naive `split("-")`.
