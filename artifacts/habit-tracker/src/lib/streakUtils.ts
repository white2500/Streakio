import { format, parseISO, subDays } from "date-fns";

export function currentStreakForHabit(
  completions: Record<string, boolean>,
  habitId: string,
): number {
  let streak = 0;
  let cursor = new Date();
  if (!completions[`${habitId}-${format(cursor, "yyyy-MM-dd")}`]) {
    cursor = subDays(cursor, 1);
  }
  while (completions[`${habitId}-${format(cursor, "yyyy-MM-dd")}`]) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function longestStreakForHabit(
  completions: Record<string, boolean>,
  habitId: string,
): number {
  const dates = Object.keys(completions)
    .filter((k) => k.startsWith(`${habitId}-`) && completions[k])
    .map((k) => k.slice(-10))
    .sort();

  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of dates) {
    const cur = parseISO(d);
    if (prev && (cur.getTime() - prev.getTime()) / 86400000 === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

export function totalCheckinsForHabit(
  completions: Record<string, boolean>,
  habitId: string,
): number {
  return Object.keys(completions).filter(
    (k) => k.startsWith(`${habitId}-`) && completions[k],
  ).length;
}

export interface Milestone {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

const MILESTONE_DEFS: {
  threshold: number;
  type: "streak" | "checkins";
  milestone: Milestone;
}[] = [
  { threshold: 7,   type: "streak",   milestone: { id: "streak-7",     emoji: "🔥", label: "Week warrior",   description: "7-day streak" } },
  { threshold: 14,  type: "streak",   milestone: { id: "streak-14",    emoji: "⚡", label: "Two weeks",      description: "14-day streak" } },
  { threshold: 30,  type: "streak",   milestone: { id: "streak-30",    emoji: "💎", label: "Monthly master", description: "30-day streak" } },
  { threshold: 100, type: "streak",   milestone: { id: "streak-100",   emoji: "👑", label: "Century streak", description: "100-day streak" } },
  { threshold: 50,  type: "checkins", milestone: { id: "checkins-50",  emoji: "⭐", label: "50 check-ins",   description: "50 total check-ins" } },
  { threshold: 100, type: "checkins", milestone: { id: "checkins-100", emoji: "🏆", label: "Century club",   description: "100 total check-ins" } },
];

export function getMilestonesForHabit(
  completions: Record<string, boolean>,
  habitId: string,
): Milestone[] {
  const streak = currentStreakForHabit(completions, habitId);
  const total = totalCheckinsForHabit(completions, habitId);
  return MILESTONE_DEFS.filter((m) =>
    m.type === "streak" ? streak >= m.threshold : total >= m.threshold,
  ).map((m) => m.milestone);
}

export function getMilestoneProgress(
  completions: Record<string, boolean>,
  habitId: string,
): {
  earned: Milestone[];
  next: Milestone | null;
  remaining: number;
  progressPct: number;
} {
  const streak = currentStreakForHabit(completions, habitId);
  const total = totalCheckinsForHabit(completions, habitId);
  const earned: Milestone[] = [];
  let next: { milestone: Milestone; remaining: number } | null = null;
  let nextType: "streak" | "checkins" | null = null;

  for (const def of MILESTONE_DEFS) {
    const current = def.type === "streak" ? streak : total;
    if (current >= def.threshold) {
      earned.push(def.milestone);
    } else if (!next) {
      next = { milestone: def.milestone, remaining: def.threshold - current };
      nextType = def.type;
    }
  }

  const progressPct = next && nextType
    ? Math.min(
        100,
        Math.round(
          ((nextType === "streak" ? streak : total) /
            (nextType === "streak" ? streak + next.remaining : total + next.remaining)) *
            100,
        ),
      )
    : 100;

  return {
    earned,
    next: next?.milestone ?? null,
    remaining: next?.remaining ?? 0,
    progressPct,
  };
}

export function nextMilestoneForHabit(
  completions: Record<string, boolean>,
  habitId: string,
): { milestone: Milestone; remaining: number } | null {
  const streak = currentStreakForHabit(completions, habitId);
  const total = totalCheckinsForHabit(completions, habitId);
  for (const def of MILESTONE_DEFS) {
    const current = def.type === "streak" ? streak : total;
    if (current < def.threshold) {
      return { milestone: def.milestone, remaining: def.threshold - current };
    }
  }
  return null;
}
