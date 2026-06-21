import { useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { format, getDaysInMonth, getDate } from "date-fns";
import { ChevronLeft, Lock, Sparkles } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { usePremium } from "@/context/PremiumProvider";
import { UPGRADE_COPY } from "@/lib/features";
import {
  currentStreakForHabit,
  longestStreakForHabit,
  totalCheckinsForHabit,
  getMilestonesForHabit,
  nextMilestoneForHabit,
} from "@/lib/streakUtils";

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
      const current = currentStreakForHabit(completions, h.id);
      const longest = longestStreakForHabit(completions, h.id);
      const allTime = totalCheckinsForHabit(completions, h.id);
      const milestones = getMilestonesForHabit(completions, h.id);
      const next = nextMilestoneForHabit(completions, h.id);

      let monthCount = 0;
      Object.keys(completions).forEach((key) => {
        if (!completions[key]) return;
        if (!key.startsWith(`${h.id}-`)) return;
        const date = key.slice(-10);
        totalCheckins += 1;
        if (date.startsWith(monthStr)) {
          monthCount += 1;
          monthCheckins += 1;
        }
      });

      const monthRate =
        dayOfMonth > 0 ? Math.round((monthCount / dayOfMonth) * 100) : 0;

      return { habit: h, monthCount, monthRate, current, longest, allTime, milestones, next };
    });

    const possibleThisMonth = habits.length * dayOfMonth;
    const overallMonthRate =
      possibleThisMonth > 0
        ? Math.round((monthCheckins / possibleThisMonth) * 100)
        : 0;

    return {
      totalCheckins,
      monthCheckins,
      overallMonthRate,
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
            Unlock streaks, trends, completion rates and milestones with
            Premium. {UPGRADE_COPY.subheadline}
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
            {/* Overview stats */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              <Stat label="Completion" value={`${stats.overallMonthRate}%`} sub="this month" />
              <Stat label="Check-ins" value={`${stats.monthCheckins}`} sub="this month" />
              <Stat label="All time" value={`${stats.totalCheckins}`} sub="check-ins" />
            </div>

            {/* Per-habit */}
            <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              By habit
            </h2>
            <div className="space-y-3">
              {stats.perHabit.map(
                ({ habit, monthCount, monthRate, current, longest, allTime, milestones, next }) => (
                  <div
                    key={habit.id}
                    data-testid={`analytics-row-${habit.id}`}
                    className="rounded-xl border border-white/10 bg-neutral-950 p-4"
                  >
                    {/* Habit name + milestone badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: habit.color }}
                      />
                      <span className="flex-1 text-sm font-medium truncate">
                        {habit.name}
                      </span>
                      {milestones.length > 0 && (
                        <span
                          className="text-base"
                          title={milestones.map((m) => m.description).join(" · ")}
                        >
                          {milestones[milestones.length - 1].emoji}
                        </span>
                      )}
                    </div>

                    {/* Completion rate bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${monthRate}%`,
                            backgroundColor: habit.color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-white/40 tabular-nums w-8 text-right">
                        {monthRate}%
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      <MiniStat label="Month" value={`${monthCount}`} />
                      <MiniStat label="All time" value={`${allTime}`} />
                      <MiniStat label="Streak" value={current > 0 ? `🔥 ${current}d` : "—"} />
                      <MiniStat label="Best" value={`${longest}d`} />
                    </div>

                    {/* Milestones earned */}
                    {milestones.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {milestones.map((m) => (
                          <span
                            key={m.id}
                            title={m.description}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60"
                          >
                            {m.emoji} {m.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Next milestone hint */}
                    {next && (
                      <p className="mt-2 text-[10px] text-white/30">
                        {next.remaining}d to {next.milestone.emoji} {next.milestone.label}
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Milestones legend */}
            <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              Milestones
            </h2>
            <div className="rounded-xl border border-white/10 bg-neutral-950 p-4 grid grid-cols-2 gap-3">
              {[
                { emoji: "🔥", label: "Week warrior", desc: "7-day streak" },
                { emoji: "⚡", label: "Two weeks", desc: "14-day streak" },
                { emoji: "💎", label: "Monthly master", desc: "30-day streak" },
                { emoji: "👑", label: "Century streak", desc: "100-day streak" },
                { emoji: "⭐", label: "50 check-ins", desc: "50 total" },
                { emoji: "🏆", label: "Century club", desc: "100 total" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="text-lg">{m.emoji}</span>
                  <div>
                    <p className="text-xs font-medium text-white/70">{m.label}</p>
                    <p className="text-[10px] text-white/35">{m.desc}</p>
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-950 p-4 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      {sub && <div className="text-[9px] text-white/25">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/35">{label}</div>
    </div>
  );
}
