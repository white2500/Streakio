import * as XLSX from "xlsx";
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

function triggerDownloadBlob(blob: Blob, filename: string) {
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

export function exportAsExcel(
  { habits, completions }: ExportPayload,
  currentMonth: string,
) {
  const year = parseInt(currentMonth.slice(0, 4));
  const month = parseInt(currentMonth.slice(5, 7));
  const daysInMonth = new Date(year, month, 0).getDate();

  const headers = ["Habit", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), "Total"];
  const rows = habits.map((h) => {
    const row: (string | number)[] = [h.name];
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${currentMonth}-${String(d).padStart(2, "0")}`;
      const key = `${h.id}-${dayStr}`;
      const done = !!completions[key];
      row.push(done ? "\u2713" : "");
      if (done) total++;
    }
    row.push(total);
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Habits");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownloadBlob(blob, `habits-${currentMonth}.xlsx`);
}
