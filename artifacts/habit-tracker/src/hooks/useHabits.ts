import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

export interface Habit {
  id: string;
  name: string;
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedHabits = localStorage.getItem('habits');
      if (storedHabits) setHabits(JSON.parse(storedHabits));

      const storedCompletions = localStorage.getItem('completions');
      if (storedCompletions) setCompletions(JSON.parse(storedCompletions));

      const storedMonth = localStorage.getItem('currentMonth');
      if (storedMonth) setCurrentMonth(storedMonth);
    } catch (error) {
      console.error('Failed to load data from localStorage', error);
    }
    setIsLoaded(true);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('habits', JSON.stringify(habits));
    localStorage.setItem('completions', JSON.stringify(completions));
    localStorage.setItem('currentMonth', currentMonth);
  }, [habits, completions, currentMonth, isLoaded]);

  const addHabit = useCallback((name: string) => {
    if (!name.trim()) return;
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: name.trim(),
    };
    setHabits(prev => [...prev, newHabit]);
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    
    // Clean up completions for this habit
    setCompletions(prev => {
      const newCompletions = { ...prev };
      Object.keys(newCompletions).forEach(key => {
        if (key.startsWith(`${habitId}-`)) {
          delete newCompletions[key];
        }
      });
      return newCompletions;
    });
  }, []);

  const toggleCompletion = useCallback((habitId: string, dateStr: string) => {
    const key = `${habitId}-${dateStr}`;
    setCompletions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  return {
    habits,
    completions,
    currentMonth,
    setCurrentMonth,
    addHabit,
    deleteHabit,
    toggleCompletion,
    isLoaded
  };
}
