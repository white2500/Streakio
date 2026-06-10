import { useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  format,
  getDaysInMonth,
  getDate,
  parseISO,
  subDays,
} from "date-fns";
import { ChevronLeft, Lock, Sparkles } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { usePremium } from "@/context/PremiumProvider";
import { completionKey } from "@/lib/completionKey";
import { UPGRADE_COPY } from "@/lib/features";

function longestStreak(dates: Set<string>): number {
  const sorted = [...dates].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of sorted) {
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

function currentStreak(dates: Set<string>): number {
  let streak = 0;
  let cursor = new Date();
  // Allow the streak to count from today or yesterday so a not-yet-checked
  // today doesn't zero an active streak.
  if (!dates.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = subDays(cursor, 1);
  }
  while (dates.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export default function Analytics() {
  const [, setLocation] = useLocation();
  const { isPremium } = usePremium();
  const { habits, completions, isLoaded } = useHabits();

  const stats = useMemo(() => {
    const now = new Date();
    const monthStr = format(now, "yyyy-MM");
    const daysInMonth = getDaysInMonth(now);
    const dayOfMonth = getDate(now);

    let totalCheckins = 0;
    let monthCheckins = 0;
    const perHabit = habits.map((h) => {
      const dates = new Set<string>();
      let monthCount = 0;
      Object.keys(completions).forEach((key) => {
        if (!completions[key]) return;
        if (!key.startsWith(`${h.id}-`)) return;
        const date = key.slice(-10);
        dates.add(date);
        totalCheckins += 1;
        if (date.startsWith(monthStr)) {
          monthCount += 1;
          monthCheckins += 1;
        }
      });
      return {
        habit: h,
        monthCount,
        current: currentStreak(dates),
        longest: longestStreak(dates),
      };
    });

    const possibleThisMonth = habits.length * dayOfMonth;
    const monthRate =
      possibleThisMonth > 0
        ? Math.round((monthCheckins / possibleThisMonth) * 100)
        : 0;

    return {
      totalCheckins,
      monthCheckins,
      monthRate,
      daysInMonth,
      perHabit: perHabit.sort((a, b) => b.current - a.current),
    };
  }, [habits, completions]);

  if (!isPremium) {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex flex-col">
        <header className="flex items-center gap-2 px-4 pt-6 pb-2">
          <button
            onClick={() => setLocation("/app")}
            data-testid="button-back"
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/8 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-white/60" />
          </button>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Lock className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Advanced analytics
          </h1>
          <p className="mt-2 max-w-xs text-sm text-white/50">
            Unlock streaks, trends, and completion insights with Premium.
            {" "}
            {UPGRADE_COPY.subheadline}
          </p>
          <button
            onClick={() => setLocation("/upgrade")}
            data-testid="button-unlock-analytics"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black active:scale-[.98] transition-transform"
          >
            <Sparkles className="h-4 w-4" />
            Unlock Premium Forever
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <header className="flex items-center gap-2 px-4 pt-6 pb-2">
        <button
          onClick={() => setLocation("/app")}
          data-testid="button-back"
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/8 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-white/60" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
      </header>

      <main className="flex-1 overflow-auto px-4 pb-10">
        {!isLoaded ? null : habits.length === 0 ? (
          <div className="py-20 text-center text-white/30 text-sm">
            Add habits to see your analytics.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-3 gap-3 mt-2">
              <Stat label="This month" value={`${stats.monthRate}%`} />
              <Stat label="Check-ins" value={`${stats.monthCheckins}`} />
              <Stat label="All time" value={`${stats.totalCheckins}`} />
            </div>

            <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              By habit
            </h2>
            <div className="space-y-2">
              {stats.perHabit.map(({ habit, monthCount, current, longest }) => (
                <div
                  key={habit.id}
                  data-testid={`analytics-row-${habit.id}`}
                  className="rounded-xl border border-white/10 bg-neutral-950 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="text-sm font-medium truncate">
                      {habit.name}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="This month" value={`${monthCount}`} />
                    <MiniStat label="Current" value={`${current}d`} />
                    <MiniStat label="Best" value={`${longest}d`} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-950 p-4 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/35">
        {label}
      </div>
    </div>
  );
}
