import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

export interface Habit {
  id: string;
  name: string;
  color: string;
}

const STORAGE_KEYS = {
  habits: 'habits',
  completions: 'completions',
  currentMonth: 'currentMonth',
} as const;

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedHabits = localStorage.getItem(STORAGE_KEYS.habits);
      if (storedHabits) setHabits(JSON.parse(storedHabits));

      const storedCompletions = localStorage.getItem(STORAGE_KEYS.completions);
      if (storedCompletions) setCompletions(JSON.parse(storedCompletions));

      const storedMonth = localStorage.getItem(STORAGE_KEYS.currentMonth);
      if (storedMonth) setCurrentMonth(storedMonth);
    } catch {
      // ignore parse errors
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(habits));
    localStorage.setItem(STORAGE_KEYS.completions, JSON.stringify(completions));
    localStorage.setItem(STORAGE_KEYS.currentMonth, currentMonth);
  }, [habits, completions, currentMonth, isLoaded]);

  const addHabit = useCallback((name: string, color: string) => {
    if (!name.trim()) return;
    setHabits(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), color },
    ]);
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setCompletions(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${habitId}-`)) delete next[k];
      });
      return next;
    });
  }, []);

  const toggleCompletion = useCallback((habitId: string, dateStr: string) => {
    const key = `${habitId}-${dateStr}`;
    setCompletions(prev => ({ ...prev, [key]: !prev[key] }));
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
    toggleCompletion,
    reorderHabits,
    isLoaded,
  };
}
