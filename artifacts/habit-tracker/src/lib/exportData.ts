import type { Habit } from "@/hooks/useHabits";
import { parseCompletionKey } from "@/lib/completionKey";

export interface ExportPayload {
  habits: Habit[];
  completions: Record<string, boolean>;
}

function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function activeCompletions(completions: Record<string, boolean>) {
  return Object.entries(completions)
    .filter(([, done]) => done)
    .map(([key]) => parseCompletionKey(key));
}

export function exportAsJson({ habits, completions }: ExportPayload) {
  const data = {
    exportedAt: new Date().toISOString(),
    habits,
    completions: activeCompletions(completions),
  };
  triggerDownload(
    JSON.stringify(data, null, 2),
    `habits-export-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
  );
}

export function exportAsCsv({ habits, completions }: ExportPayload) {
  const habitName = new Map(habits.map((h) => [h.id, h.name]));
  const rows = [["habit", "date"]];
  activeCompletions(completions).forEach(({ habitId, date }) => {
    const name = habitName.get(habitId) ?? habitId;
    rows.push([`"${name.replace(/"/g, '""')}"`, date]);
  });
  const csv = rows.map((r) => r.join(",")).join("\n");
  triggerDownload(
    csv,
    `habits-export-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv",
  );
}
