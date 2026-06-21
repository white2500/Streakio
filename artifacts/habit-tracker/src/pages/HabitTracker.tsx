import { useState, useMemo, useEffect, useRef } from "react";
import {
  format,
  addMonths,
  subMonths,
  getDaysInMonth,
  isToday,
  isFuture,
  parseISO,
} from "date-fns";
import { Reorder, useDragControls, AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  GripVertical,
  BarChart3,
  Settings,
  Download,
  Palette,
  LogOut,
  Sparkles,
  Cloud,
  Bell,
  BellOff,
  Smartphone,
  X,
  ChevronRight as ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useHabits, type Habit } from "@/hooks/useHabits";
import { usePremium, useFeature } from "@/context/PremiumProvider";
import { useTheme } from "@/context/ThemeProvider";
import { PremiumBadge } from "@/components/PremiumBadge";
import { AdBanner } from "@/components/AdBanner";
import { exportAsJson, exportAsCsv, exportAsExcel } from "@/lib/exportData";
import { THEMES } from "@/lib/themes";
import { useNotifications } from "@/hooks/useNotifications";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#fb923c",
  "#84cc16",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#d946ef",
  "#f59e0b",
  "#10b981",
  "#64748b",
  "#94a3b8",
];

function HabitRow({
  habit,
  days,
  completions,
  onDelete,
  onToggle,
}: {
  habit: Habit;
  days: { day: number; dateStr: string; isToday: boolean; isFuture: boolean }[];
  completions: Record<string, boolean>;
  onDelete: (id: string) => void;
  onToggle: (id: string, dateStr: string) => void;
}) {
  const controls = useDragControls();
  const completed = days.filter(
    (d) => completions[`${habit.id}-${d.dateStr}`],
  ).length;

  return (
    <Reorder.Item
      value={habit}
      dragListener={false}
      dragControls={controls}
      className="bg-neutral-950 border border-white/10 rounded-2xl overflow-hidden"
      data-testid={`row-habit-${habit.id}`}
    >
      <div className="p-4">
        {/* Card header */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onPointerDown={(e) => controls.start(e)}
            data-testid={`handle-${habit.id}`}
            className="touch-none shrink-0 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: habit.color }}
          />
          <span className="flex-1 text-sm font-medium truncate">
            {habit.name}
          </span>
          <span className="text-xs text-white/30 tabular-nums">
            {completed}/{days.length}
          </span>
          <button
            onClick={() => onDelete(habit.id)}
            data-testid={`button-delete-${habit.id}`}
            aria-label={`Delete ${habit.name}`}
            className="shrink-0 text-white/20 hover:text-white/60 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Day grid — 10 columns, ~3 rows for a 30-day month */}
        <div className="grid grid-cols-10 gap-1">
          {days.map(
            ({ day, dateStr, isToday: todayFlag, isFuture: futureFlag }) => {
              const isChecked = !!completions[`${habit.id}-${dateStr}`];
              return (
                <div
                  key={dateStr}
                  className={`flex flex-col items-center gap-0.5 ${futureFlag ? "opacity-25" : ""}`}
                >
                  <span
                    className={`text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full
                    ${todayFlag ? "bg-white/20 text-white" : "text-white/40"}`}
                  >
                    {day}
                  </span>
                  <button
                    onClick={() =>
                      !futureFlag && onToggle(habit.id, dateStr)
                    }
                    disabled={futureFlag}
                    data-testid={`checkbox-${habit.id}-${dateStr}`}
                    style={
                      isChecked
                        ? {
                            backgroundColor: habit.color,
                            borderColor: habit.color,
                          }
                        : {
                            borderColor: "rgba(255,255,255,0.18)",
                            backgroundColor: "transparent",
                          }
                    }
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-150
                    ${futureFlag ? "cursor-not-allowed" : "cursor-pointer active:scale-90"}`}
                  >
                    <AnimatePresence>
                      {isChecked && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 28,
                          }}
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              );
            },
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}

function WidgetGuideModal({ onClose }: { onClose: () => void }) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-white/10 p-6 text-white"
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-white/60" />
            <h3 className="text-base font-semibold">Add to Home Screen</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors"
          >
            <X className="h-4 w-4 text-white/50" />
          </button>
        </div>

        {isIOS && (
          <div className="space-y-3 text-sm text-white/70">
            <p className="text-white/50 text-xs uppercase tracking-wider font-semibold">iPhone / iPad</p>
            <ol className="space-y-2.5">
              {[
                "Open Streakio in Safari",
                'Tap the Share button (□↑) at the bottom of the screen',
                'Scroll down and tap "Add to Home Screen"',
                'Tap "Add" in the top-right corner',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 text-[11px] font-semibold text-white/60 flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-white/40 text-xs pt-1">
              Once added, Streakio opens full-screen like a native app with no browser chrome.
            </p>
          </div>
        )}

        {isAndroid && (
          <div className="space-y-3 text-sm text-white/70">
            <p className="text-white/50 text-xs uppercase tracking-wider font-semibold">Android</p>
            <ol className="space-y-2.5">
              {[
                "Open Streakio in Chrome",
                "Tap the three-dot menu (⋮) in the top-right",
                'Tap "Add to Home screen"',
                'Tap "Add" to confirm',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 text-[11px] font-semibold text-white/60 flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-white/40 text-xs pt-1">
              You may also see an "Install app" banner at the bottom of the screen — tap it for a shortcut.
            </p>
          </div>
        )}

        {!isIOS && !isAndroid && (
          <div className="space-y-3 text-sm text-white/70">
            <div className="space-y-3">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2">iPhone / iPad (Safari)</p>
                <p>Tap Share (□↑) → "Add to Home Screen" → Add</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2">Android (Chrome)</p>
                <p>Menu (⋮) → "Add to Home screen" → Add</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2">Desktop (Chrome / Edge)</p>
                <p>Click the install icon (⊕) in the address bar, or Menu → "Install Streakio"</p>
              </div>
            </div>
            <p className="text-white/40 text-xs pt-1">
              Once installed, Streakio runs as a standalone app with no browser chrome.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SettingsMenu({
  onExport,
  habitsCount,
}: {
  onExport: (kind: "json" | "csv" | "xlsx") => void;
  habitsCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [showWidgetGuide, setShowWidgetGuide] = useState(false);
  const { isPremium } = usePremium();
  const { signOut } = useClerk();
  const { themeId, setTheme } = useTheme();
  const { supported: notifSupported, permission, settings: notifSettings, enable: enableNotif, disable: disableNotif, setTime: setNotifTime } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotifToggle = async () => {
    if (notifSettings.enabled) {
      disableNotif();
    } else {
      await enableNotif();
    }
  };

  const notifBlocked = permission === "denied";

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          data-testid="button-settings"
          aria-label="Settings"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors"
        >
          <Settings className="w-4 h-4 text-white/60" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-white/10 bg-neutral-950 p-2 shadow-xl"
              data-testid="menu-settings"
            >
              <div className="px-2 py-1.5 flex items-center gap-1.5 text-[11px] text-white/40">
                {isPremium ? (
                  <>
                    <Cloud className="h-3 w-3" /> Synced across devices
                  </>
                ) : (
                  "Stored on this device"
                )}
              </div>

              <div className="my-1 border-t border-white/8" />

              {/* Theme */}
              <div className="px-2 py-1.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/35">
                  <Palette className="h-3 w-3" /> Theme
                </div>
                <div className="flex items-center gap-2">
                  {THEMES.map((t) => {
                    const locked = t.premium && !isPremium;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        data-testid={`theme-${t.id}`}
                        title={t.name + (locked ? " (Premium)" : "")}
                        style={{ backgroundColor: t.accent }}
                        className={`relative h-6 w-6 rounded-full transition-transform ${
                          themeId === t.id
                            ? "ring-2 ring-offset-2 ring-offset-neutral-950 ring-white/50 scale-110"
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        {locked && (
                          <span className="absolute -right-1 -top-1 text-[8px]">
                            <Sparkles className="h-2.5 w-2.5 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="my-1 border-t border-white/8" />

              {/* Notifications */}
              <div className="px-2 py-1.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/35">
                  <Bell className="h-3 w-3" /> Daily Reminder
                </div>
                {!notifSupported ? (
                  <p className="text-[11px] text-white/30 px-0.5">Not supported in this browser</p>
                ) : notifBlocked ? (
                  <p className="text-[11px] text-white/30 px-0.5">
                    Blocked — allow notifications in your browser settings
                  </p>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={handleNotifToggle}
                      className={`flex items-center gap-1.5 text-sm rounded-lg px-2 py-1.5 transition-colors ${
                        notifSettings.enabled
                          ? "text-white bg-white/10 hover:bg-white/15"
                          : "text-white/60 hover:bg-white/8"
                      }`}
                    >
                      {notifSettings.enabled ? (
                        <><Bell className="h-3.5 w-3.5" /> On</>
                      ) : (
                        <><BellOff className="h-3.5 w-3.5" /> Off</>
                      )}
                    </button>
                    {notifSettings.enabled && (
                      <input
                        type="time"
                        value={notifSettings.time}
                        onChange={(e) => setNotifTime(e.target.value)}
                        className="bg-white/8 border border-white/15 text-white text-sm rounded-lg px-2 py-1 outline-none focus:border-white/40 transition-colors"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="my-1 border-t border-white/8" />

              {/* Add to home screen */}
              <button
                onClick={() => {
                  setOpen(false);
                  setShowWidgetGuide(true);
                }}
                data-testid="button-add-to-home"
                className="w-full flex items-center justify-between rounded-lg px-2 py-2 text-sm text-white/80 hover:bg-white/8 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5" /> Add to Home Screen
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-white/30" />
              </button>

              <div className="my-1 border-t border-white/8" />

              {/* Export */}
              <button
                onClick={() => { onExport("csv"); setOpen(false); }}
                disabled={habitsCount === 0}
                data-testid="button-export-csv"
                className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/80 hover:bg-white/8 disabled:opacity-30 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
              <button
                onClick={() => { onExport("json"); setOpen(false); }}
                disabled={habitsCount === 0}
                data-testid="button-export-json"
                className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/80 hover:bg-white/8 disabled:opacity-30 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
              <button
                onClick={() => { onExport("xlsx"); setOpen(false); }}
                disabled={habitsCount === 0}
                data-testid="button-export-excel"
                className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/80 hover:bg-white/8 disabled:opacity-30 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export Excel
              </button>

              <div className="my-1 border-t border-white/8" />

              <button
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                data-testid="button-sign-out"
                className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/80 hover:bg-white/8 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showWidgetGuide && (
          <WidgetGuideModal onClose={() => setShowWidgetGuide(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

export default function Streakio() {
  const {
    habits,
    completions,
    currentMonth,
    setCurrentMonth,
    addHabit,
    deleteHabit,
    toggleCompletion,
    reorderHabits,
    isLoaded,
  } = useHabits();

  const [, setLocation] = useLocation();
  const { isPremium } = usePremium();
  const analytics = useFeature("advancedAnalytics");
  const dataExport = useFeature("dataExport");
  const { theme } = useTheme();

  const [newHabitName, setNewHabitName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmDeleteHabit = habits.find((h) => h.id === confirmDeleteId);

  const monthDate = useMemo(
    () => parseISO(`${currentMonth}-01`),
    [currentMonth],
  );
  const daysInMonth = useMemo(() => getDaysInMonth(monthDate), [monthDate]);

  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${currentMonth}-${day.toString().padStart(2, "0")}`;
        const dateObj = parseISO(dateStr);
        return {
          day,
          dateStr,
          isToday: isToday(dateObj),
          isFuture: isFuture(dateObj),
        };
      }),
    [daysInMonth, currentMonth],
  );

  const handlePrevMonth = () =>
    setCurrentMonth(format(subMonths(monthDate, 1), "yyyy-MM"));
  const handleNextMonth = () =>
    setCurrentMonth(format(addMonths(monthDate, 1), "yyyy-MM"));

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabitName.trim()) {
      addHabit(newHabitName, selectedColor);
      setNewHabitName("");
      setSelectedColor(PALETTE[0]);
      setShowForm(false);
    }
  };

  const handleExport = (kind: "json" | "csv" | "xlsx") => {
    if (!dataExport.ensure()) return;
    if (kind === "json") exportAsJson({ habits, completions });
    else if (kind === "csv") exportAsCsv({ habits, completions });
    else void exportAsExcel({ habits, completions }, currentMonth);
  };

  const handleAnalytics = () => {
    if (!analytics.ensure()) return;
    setLocation("/analytics");
  };

  if (!isLoaded) return null;

  return (
    <div className="h-screen bg-black text-white flex flex-col font-sans select-none overflow-hidden">
      <header className="shrink-0 bg-black border-b border-white/10 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={`${basePath}/logo.svg`}
              alt="Streakio"
              className="h-7 w-auto"
            />
            {isPremium ? (
              <PremiumBadge />
            ) : (
              <button
                onClick={() => setLocation("/upgrade")}
                data-testid="button-upgrade"
                className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60 hover:text-white hover:border-white/30 transition-colors"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Upgrade
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAnalytics}
              data-testid="button-analytics"
              aria-label="Analytics"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-white/60" />
            </button>
            <SettingsMenu onExport={handleExport} habitsCount={habits.length} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1">
          <button
            onClick={handlePrevMonth}
            data-testid="button-prev-month"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 active:bg-white/12 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white/50" />
          </button>
          <span
            className="text-sm font-medium text-white/60 w-32 text-center"
            data-testid="text-current-month"
          >
            {format(monthDate, "MMMM yyyy")}
          </span>
          <button
            onClick={handleNextMonth}
            data-testid="button-next-month"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 active:bg-white/12 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {habits.length === 0 ? (
            <div className="py-20 text-center text-white/30 px-6">
              <p className="text-sm">No habits yet.</p>
              <p className="text-xs mt-1">Tap the + button to add one.</p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={habits}
              onReorder={reorderHabits}
              className="flex flex-col gap-3 outline-none"
            >
              {habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  days={days}
                  completions={completions}
                  onDelete={setConfirmDeleteId}
                  onToggle={toggleCompletion}
                />
              ))}
            </Reorder.Group>
          )}
        </div>
      </div>

      <AdBanner />

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {confirmDeleteId && confirmDeleteHabit && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-white/10 p-6 text-white"
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              data-testid="dialog-confirm-delete"
            >
              <div className="flex items-center gap-3 mb-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: confirmDeleteHabit.color }}
                />
                <h3 className="text-base font-semibold tracking-tight truncate">
                  {confirmDeleteHabit.name}
                </h3>
              </div>
              <p className="mt-2 text-sm text-white/50">
                Delete this habit? All tracked days will be lost and this cannot
                be undone.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={() => {
                    deleteHabit(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  data-testid="button-confirm-delete"
                  className="w-full rounded-xl bg-red-500/15 border border-red-500/25 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 active:scale-[.98] transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  data-testid="button-cancel-delete"
                  className="w-full rounded-xl py-2.5 text-sm font-medium text-white/45 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shrink-0 bg-black border-t border-white/10 px-4 pt-3 pb-8">
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
                  onChange={(e) => setNewHabitName(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setShowForm(false)}
                  placeholder="Habit name..."
                  data-testid="input-new-habit"
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-white/15 bg-white/8 text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 mr-1">Color</span>
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      data-testid={`swatch-${color}`}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        selectedColor === color
                          ? "scale-125 ring-2 ring-offset-2 ring-offset-black ring-white/30"
                          : "opacity-60 hover:opacity-100 hover:scale-110"
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
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.accentForeground,
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-30 transition-opacity"
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
            style={{
              backgroundColor: theme.accent,
              color: theme.accentForeground,
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium active:scale-[.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            Add Habit
          </button>
        )}
      </div>
    </div>
  );
}
