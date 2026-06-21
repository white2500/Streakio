import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListHabits,
  useListCompletions,
  useCreateHabit,
  useDeleteHabit,
  useUpdateHabit,
  useReorderHabits,
  useToggleCompletion,
  getListHabitsQueryKey,
  getListCompletionsQueryKey,
} from "@workspace/api-client-react";
import { usePremium } from "@/context/PremiumProvider";
import { completionKey } from "@/lib/completionKey";

export interface Habit {
  id: string;
  name: string;
  color: string;
}

interface ApiHabit {
  id: string;
  name: string;
  color: string;
  position: number;
}
interface ApiCompletion {
  habitId: string;
  date: string;
}

export interface HabitsApi {
  habits: Habit[];
  completions: Record<string, boolean>;
  currentMonth: string;
  setCurrentMonth: (m: string) => void;
  addHabit: (name: string, color: string) => void;
  deleteHabit: (habitId: string) => void;
  updateHabit: (habitId: string, color: string) => void;
  toggleCompletion: (habitId: string, dateStr: string) => void;
  reorderHabits: (newOrder: Habit[]) => void;
  isLoaded: boolean;
  isCloud: boolean;
}

const STORAGE_KEYS = {
  habits: "habits",
  completions: "completions",
  currentMonth: "currentMonth",
} as const;

/** Month being viewed — UI state shared by both storage backends. */
function useCurrentMonth() {
  const [currentMonth, setMonth] = useState<string>(
    () =>
      localStorage.getItem(STORAGE_KEYS.currentMonth) ||
      format(new Date(), "yyyy-MM"),
  );
  const setCurrentMonth = useCallback((m: string) => {
    setMonth(m);
    localStorage.setItem(STORAGE_KEYS.currentMonth, m);
  }, []);
  return [currentMonth, setCurrentMonth] as const;
}

/** Free tier: device-local storage. */
function useLocalHabits(): HabitsApi {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [currentMonth, setCurrentMonth] = useCurrentMonth();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedHabits = localStorage.getItem(STORAGE_KEYS.habits);
      if (storedHabits) setHabits(JSON.parse(storedHabits));
      const storedCompletions = localStorage.getItem(STORAGE_KEYS.completions);
      if (storedCompletions) setCompletions(JSON.parse(storedCompletions));
    } catch {
      // ignore parse errors
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(habits));
    localStorage.setItem(STORAGE_KEYS.completions, JSON.stringify(completions));
  }, [habits, completions, isLoaded]);

  const addHabit = useCallback((name: string, color: string) => {
    if (!name.trim()) return;
    setHabits((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), color },
    ]);
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setCompletions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${habitId}-`)) delete next[k];
      });
      return next;
    });
  }, []);

  const updateHabit = useCallback((habitId: string, color: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, color } : h)),
    );
  }, []);

  const toggleCompletion = useCallback((habitId: string, dateStr: string) => {
    const key = completionKey(habitId, dateStr);
    setCompletions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const reorderHabits = useCallback((newOrder: Habit[]) => {
    setHabits(newOrder);
  }, []);

  return {
    habits,
    completions,
    currentMonth,
    setCurrentMonth,
    addHabit,
    deleteHabit,
    updateHabit,
    toggleCompletion,
    reorderHabits,
    isLoaded,
    isCloud: false,
  };
}

/** Premium tier: cloud-synced storage (cross-device). */
function useCloudHabits(enabled: boolean): HabitsApi {
  const qc = useQueryClient();
  const habitsKey = getListHabitsQueryKey();
  const completionsKey = getListCompletionsQueryKey();
  const [currentMonth, setCurrentMonth] = useCurrentMonth();

  const habitsQuery = useListHabits({
    query: { enabled, queryKey: habitsKey },
  });
  const completionsQuery = useListCompletions({
    query: { enabled, queryKey: completionsKey },
  });

  const createM = useCreateHabit({
    mutation: {
      onSettled: () => qc.invalidateQueries({ queryKey: habitsKey }),
    },
  });

  const deleteM = useDeleteHabit({
    mutation: {
      onMutate: async ({ id }) => {
        await qc.cancelQueries({ queryKey: habitsKey });
        const prev = qc.getQueryData<ApiHabit[]>(habitsKey);
        qc.setQueryData<ApiHabit[]>(habitsKey, (old = []) =>
          old.filter((h) => h.id !== id),
        );
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(habitsKey, ctx.prev);
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: habitsKey });
        qc.invalidateQueries({ queryKey: completionsKey });
      },
    },
  });

  const updateM = useUpdateHabit({
    mutation: {
      onMutate: async ({ id, data }) => {
        await qc.cancelQueries({ queryKey: habitsKey });
        const prev = qc.getQueryData<ApiHabit[]>(habitsKey);
        qc.setQueryData<ApiHabit[]>(habitsKey, (old = []) =>
          old.map((h) => (h.id === id ? { ...h, ...data } : h)),
        );
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(habitsKey, ctx.prev);
      },
      onSettled: () => qc.invalidateQueries({ queryKey: habitsKey }),
    },
  });

  const reorderM = useReorderHabits({
    mutation: {
      onMutate: async ({ data }) => {
        await qc.cancelQueries({ queryKey: habitsKey });
        const prev = qc.getQueryData<ApiHabit[]>(habitsKey);
        qc.setQueryData<ApiHabit[]>(habitsKey, (old = []) => {
          const byId = new Map(old.map((h) => [h.id, h]));
          return data.ids
            .map((id, i) => {
              const h = byId.get(id);
              return h ? { ...h, position: i } : undefined;
            })
            .filter((h): h is ApiHabit => !!h);
        });
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(habitsKey, ctx.prev);
      },
      onSettled: () => qc.invalidateQueries({ queryKey: habitsKey }),
    },
  });

  const toggleM = useToggleCompletion({
    mutation: {
      onMutate: async ({ data }) => {
        await qc.cancelQueries({ queryKey: completionsKey });
        const prev = qc.getQueryData<ApiCompletion[]>(completionsKey);
        qc.setQueryData<ApiCompletion[]>(completionsKey, (old = []) => {
          const exists = old.some(
            (c) => c.habitId === data.habitId && c.date === data.date,
          );
          return exists
            ? old.filter(
                (c) => !(c.habitId === data.habitId && c.date === data.date),
              )
            : [...old, { habitId: data.habitId, date: data.date }];
        });
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(completionsKey, ctx.prev);
      },
      onSettled: () => qc.invalidateQueries({ queryKey: completionsKey }),
    },
  });

  const habits: Habit[] = (habitsQuery.data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    color: h.color,
  }));

  const completions: Record<string, boolean> = {};
  (completionsQuery.data ?? []).forEach((c) => {
    completions[completionKey(c.habitId, c.date)] = true;
  });

  const addHabit = useCallback(
    (name: string, color: string) => {
      if (!name.trim()) return;
      createM.mutate({ data: { name: name.trim(), color } });
    },
    [createM],
  );

  const deleteHabit = useCallback(
    (habitId: string) => {
      deleteM.mutate({ id: habitId });
    },
    [deleteM],
  );

  const updateHabit = useCallback(
    (habitId: string, color: string) => {
      updateM.mutate({ id: habitId, data: { color } });
    },
    [updateM],
  );

  const toggleCompletion = useCallback(
    (habitId: string, dateStr: string) => {
      toggleM.mutate({ data: { habitId, date: dateStr } });
    },
    [toggleM],
  );

  const reorderHabits = useCallback(
    (newOrder: Habit[]) => {
      reorderM.mutate({ data: { ids: newOrder.map((h) => h.id) } });
    },
    [reorderM],
  );

  return {
    habits,
    completions,
    currentMonth,
    setCurrentMonth,
    addHabit,
    deleteHabit,
    updateHabit,
    toggleCompletion,
    reorderHabits,
    // Unblock the UI once both queries settle — success OR error — so a
    // transient fetch failure never traps the app on a perpetual spinner.
    isLoaded: enabled
      ? !habitsQuery.isLoading && !completionsQuery.isLoading
      : true,
    isCloud: true,
  };
}

/**
 * Unified habit data layer. Free users read/write device-local storage;
 * premium users read/write the cloud (synced cross-device). Both hooks always
 * run to satisfy the rules of hooks; only the active backend is returned.
 */
export function useHabits(): HabitsApi {
  const { isPremium, isLoading } = usePremium();
  const local = useLocalHabits();
  const cloud = useCloudHabits(isPremium && !isLoading);
  const active = isPremium ? cloud : local;
  return { ...active, isLoaded: !isLoading && active.isLoaded };
}
