import React, { useState, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  getDaysInMonth, 
  isToday, 
  isFuture,
  parseISO
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HabitTracker() {
  const {
    habits,
    completions,
    currentMonth,
    setCurrentMonth,
    addHabit,
    deleteHabit,
    toggleCompletion,
    isLoaded
  } = useHabits();

  const [newHabitName, setNewHabitName] = useState('');

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
        isFuture: isFuture(dateObj)
      };
    });
  }, [daysInMonth, currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(format(subMonths(monthDate, 1), 'yyyy-MM'));
  const handleNextMonth = () => setCurrentMonth(format(addMonths(monthDate, 1), 'yyyy-MM'));

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabitName.trim()) {
      addHabit(newHabitName);
      setNewHabitName('');
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-12 px-4 sm:px-8 font-sans selection:bg-primary selection:text-primary-foreground">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-serif text-primary tracking-tight">Rituals</h1>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrevMonth}
              data-testid="button-prev-month"
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <h2 className="text-xl font-medium w-36 text-center" data-testid="text-current-month">
              {format(monthDate, 'MMMM yyyy')}
            </h2>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextMonth}
              data-testid="button-next-month"
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Grid Container */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto relative">
          <div className="min-w-max p-6">
            
            {/* Table Header (Days) */}
            <div className="flex items-end mb-4 relative">
              {/* Left Spacer for habit names */}
              <div className="w-56 shrink-0 flex items-center pr-4">
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Habit</span>
              </div>
              
              {/* Day Columns */}
              <div className="flex flex-1 gap-1">
                {days.map(({ day, isToday, isFuture }) => (
                  <div 
                    key={day} 
                    className={`w-8 flex flex-col items-center justify-end pb-2 shrink-0 ${isFuture ? 'opacity-40' : ''}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center' : 'text-muted-foreground'}`}>
                      {day}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Right Spacer for stats */}
              <div className="w-24 shrink-0 pl-4 flex items-end justify-end pb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Progress</span>
              </div>
            </div>

            {/* Habit Rows */}
            <div className="space-y-2">
              <AnimatePresence>
                {habits.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg"
                  >
                    <p>No rituals defined for this month.</p>
                    <p className="text-sm mt-1">Add one below to get started.</p>
                  </motion.div>
                ) : (
                  habits.map((habit) => {
                    const completedDays = days.filter(d => completions[`${habit.id}-${d.dateStr}`]).length;
                    
                    return (
                      <motion.div 
                        key={habit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        className="flex items-center group/row relative rounded-md hover:bg-muted/30 transition-colors"
                      >
                        {/* Habit Info */}
                        <div className="w-56 shrink-0 pr-4 py-2 flex items-center justify-between">
                          <span className="font-medium text-[15px] truncate pr-2">{habit.name}</span>
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            data-testid={`button-delete-${habit.id}`}
                            aria-label={`Delete ${habit.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Checkboxes */}
                        <div className="flex flex-1 gap-1 py-2">
                          {days.map(({ dateStr, isToday, isFuture }) => {
                            const isChecked = !!completions[`${habit.id}-${dateStr}`];
                            return (
                              <div key={dateStr} className={`w-8 shrink-0 flex justify-center items-center ${isFuture ? 'opacity-40' : ''}`}>
                                <button
                                  onClick={() => !isFuture && toggleCompletion(habit.id, dateStr)}
                                  disabled={isFuture}
                                  data-testid={`checkbox-${habit.id}-${dateStr}`}
                                  className={`
                                    w-6 h-6 rounded flex items-center justify-center transition-all duration-200
                                    ${isChecked ? 'bg-primary text-primary-foreground border-transparent' : 'bg-transparent border border-border hover:border-primary/50'}
                                    ${isToday && !isChecked ? 'ring-1 ring-primary/20 ring-offset-1 ring-offset-background' : ''}
                                    ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'}
                                  `}
                                >
                                  <AnimatePresence>
                                    {isChecked && (
                                      <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                      >
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Progress */}
                        <div className="w-24 shrink-0 pl-4 py-2 flex items-center justify-end">
                          <span className="text-sm text-muted-foreground font-mono">
                            {completedDays} <span className="opacity-50">/</span> {daysInMonth}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
            
          </div>
        </div>

        {/* Add Habit Form */}
        <div className="mt-8">
          <form onSubmit={handleAddHabit} className="flex gap-2 max-w-md mx-auto">
            <Input
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Add a new ritual..."
              className="bg-card border-border focus-visible:ring-primary/20"
              data-testid="input-new-habit"
            />
            <Button type="submit" data-testid="button-add-habit" disabled={!newHabitName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
