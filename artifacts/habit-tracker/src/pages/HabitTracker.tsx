import { useState, useMemo } from 'react';
import {
  format,
  addMonths,
  subMonths,
  getDaysInMonth,
  isToday,
  isFuture,
  parseISO,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';

const PALETTE = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export default function HabitTracker() {
  const {
    habits,
    completions,
    currentMonth,
    setCurrentMonth,
    addHabit,
    deleteHabit,
    toggleCompletion,
    isLoaded,
  } = useHabits();

  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [showForm, setShowForm] = useState(false);

  const monthDate = useMemo(() => parseISO(`${currentMonth}-01`), [currentMonth]);
  const daysInMonth = useMemo(() => getDaysInMonth(monthDate), [monthDate]);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
      const dateObj = parseISO(dateStr);
      return {
        day,
        dateStr,
        isToday: isToday(dateObj),
        isFuture: isFuture(dateObj),
      };
    });
  }, [daysInMonth, currentMonth]);

  const handlePrevMonth = () =>
    setCurrentMonth(format(subMonths(monthDate, 1), 'yyyy-MM'));
  const handleNextMonth = () =>
    setCurrentMonth(format(addMonths(monthDate, 1), 'yyyy-MM'));

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabitName.trim()) {
      addHabit(newHabitName, selectedColor);
      setNewHabitName('');
      setSelectedColor(PALETTE[0]);
      setShowForm(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-black border-b border-white/10 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Habits</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              data-testid="button-prev-month"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 active:bg-white/12 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white/50" />
            </button>
            <span
              className="text-sm font-medium text-white/60 w-28 text-center"
              data-testid="text-current-month"
            >
              {format(monthDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={handleNextMonth}
              data-testid="button-next-month"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 active:bg-white/12 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>
      </header>

      {/* Grid — horizontally scrollable */}
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-max">

          {/* Day header row */}
          <div className="flex sticky top-[89px] z-20 bg-black border-b border-white/10">
            {/* Habit name column header */}
            <div className="sticky left-0 z-10 bg-black w-36 shrink-0 px-4 py-2 flex items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Habit</span>
            </div>
            {/* Day numbers */}
            {days.map(({ day, isToday: todayFlag, isFuture: futureFlag }) => (
              <div
                key={day}
                className={`w-9 shrink-0 flex items-center justify-center py-2 ${futureFlag ? 'opacity-30' : ''}`}
              >
                <span
                  className={`text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${todayFlag ? 'bg-white text-black' : 'text-white/40'}`}
                >
                  {day}
                </span>
              </div>
            ))}
            {/* Progress header spacer */}
            <div className="w-16 shrink-0" />
          </div>

          {/* Habit rows */}
          {habits.length === 0 ? (
            <div className="py-20 text-center text-white/30 px-6">
              <p className="text-sm">No habits yet.</p>
              <p className="text-xs mt-1">Tap the + button to add one.</p>
            </div>
          ) : (
            <AnimatePresence>
              {habits.map((habit) => {
                const completed = days.filter(
                  d => completions[`${habit.id}-${d.dateStr}`]
                ).length;

                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center border-b border-white/6 last:border-b-0"
                    data-testid={`row-habit-${habit.id}`}
                  >
                    {/* Sticky habit name */}
                    <div className="sticky left-0 z-10 bg-black w-36 shrink-0 px-4 py-3 flex items-center justify-between gap-1">
                      <span className="text-sm font-medium truncate leading-tight">{habit.name}</span>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        data-testid={`button-delete-${habit.id}`}
                        aria-label={`Delete ${habit.name}`}
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white/20 hover:text-white/60 active:text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Checkboxes */}
                    {days.map(({ dateStr, isFuture: futureFlag }) => {
                      const isChecked = !!completions[`${habit.id}-${dateStr}`];
                      return (
                        <div
                          key={dateStr}
                          className={`w-9 shrink-0 flex items-center justify-center py-3 ${futureFlag ? 'opacity-25' : ''}`}
                        >
                          <button
                            onClick={() => !futureFlag && toggleCompletion(habit.id, dateStr)}
                            disabled={futureFlag}
                            data-testid={`checkbox-${habit.id}-${dateStr}`}
                            style={
                              isChecked
                                ? { backgroundColor: habit.color, borderColor: habit.color }
                                : { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent' }
                            }
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-150
                              ${futureFlag ? 'cursor-not-allowed' : 'cursor-pointer active:scale-90'}
                            `}
                          >
                            <AnimatePresence>
                              {isChecked && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                                >
                                  <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                        </div>
                      );
                    })}

                    {/* Progress */}
                    <div className="w-16 shrink-0 px-2 py-3 flex items-center justify-end">
                      <span className="text-xs text-white/30 tabular-nums">
                        {completed}/{daysInMonth}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Add habit form */}
      <div className="sticky bottom-0 bg-black border-t border-white/10 px-4 pt-3 pb-6">
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="mb-3"
            >
              <form onSubmit={handleAddHabit} className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setShowForm(false)}
                  placeholder="Habit name..."
                  data-testid="input-new-habit"
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-white/15 bg-white/8 text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors"
                />
                {/* Color swatches */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 mr-1">Color</span>
                  {PALETTE.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      data-testid={`swatch-${color}`}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        selectedColor === color
                          ? 'scale-125 ring-2 ring-offset-2 ring-offset-black ring-white/30'
                          : 'opacity-60 hover:opacity-100 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white/50 bg-white/8 hover:bg-white/12 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newHabitName.trim()}
                    data-testid="button-add-habit"
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white text-black disabled:opacity-30 transition-opacity"
                  >
                    Add Habit
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            data-testid="button-show-form"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-medium active:scale-[.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            Add Habit
          </button>
        )}
      </div>
    </div>
  );
}
