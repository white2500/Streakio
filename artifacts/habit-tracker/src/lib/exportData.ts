import ExcelJS from "exceljs";
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

/** Convert #rrggbb to ExcelJS ARGB string (fully opaque). */
function toArgb(hex: string): string {
  return "FF" + hex.replace("#", "").toUpperCase();
}

/** Blend a hex color with black at `amount` opacity (0–1). */
function blendWithBlack(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * amount);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * amount);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * amount);
  return (
    "FF" +
    r.toString(16).padStart(2, "0").toUpperCase() +
    g.toString(16).padStart(2, "0").toUpperCase() +
    b.toString(16).padStart(2, "0").toUpperCase()
  );
}

export async function exportAsExcel(
  { habits, completions }: ExportPayload,
  currentMonth: string,
) {
  const year = parseInt(currentMonth.slice(0, 4));
  const month = parseInt(currentMonth.slice(5, 7));
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLabel = new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Habito";
  const ws = wb.addWorksheet("Habits");

  const TOTAL_COLS = 2 + daysInMonth; // col A = habit, cols B..B+days = days, last = total

  const BG_DEEP = "FF0A0A0A";
  const BG_HEADER = "FF161616";
  const BG_CELL = "FF111111";
  const FG_WHITE = "FFFFFFFF";
  const FG_DIM = "FF666666";

  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }];

  // ── Row 1: App title ──────────────────────────────────────────────────────
  const titleRow = ws.addRow(["Habito — " + monthLabel]);
  ws.mergeCells(1, 1, 1, TOTAL_COLS);
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 14, color: { argb: FG_WHITE }, name: "Calibri" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BG_DEEP } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  titleRow.height = 28;

  // ── Row 2: empty spacer ───────────────────────────────────────────────────
  const spacerRow = ws.addRow([]);
  for (let c = 1; c <= TOTAL_COLS; c++) {
    const cell = spacerRow.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BG_DEEP } };
  }
  spacerRow.height = 4;

  // ── Row 3: Column headers ─────────────────────────────────────────────────
  const today = new Date();
  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.getDate()
      : -1;

  const headerValues: (string | number)[] = ["Habit"];
  for (let d = 1; d <= daysInMonth; d++) headerValues.push(d);
  headerValues.push("Total");
  const headerRow = ws.addRow(headerValues);
  headerRow.height = 22;
  headerRow.eachCell((cell, colNum) => {
    const isHabitCol = colNum === 1;
    const isTotalCol = colNum === TOTAL_COLS;
    const dayNum = colNum - 1;
    const isToday = dayNum === todayDay;
    cell.font = {
      bold: isHabitCol || isTotalCol || isToday,
      size: isHabitCol ? 10 : 9,
      color: { argb: isToday ? FG_WHITE : isHabitCol || isTotalCol ? FG_WHITE : FG_DIM },
      name: "Calibri",
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isToday ? "FF2A2A2A" : BG_HEADER },
    };
    cell.alignment = { horizontal: isHabitCol ? "left" : "center", vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF222222" } },
    };
  });

  // ── Habit rows ────────────────────────────────────────────────────────────
  for (const habit of habits) {
    const color = habit.color || "#6366f1";
    const bgFull = toArgb(color);
    const bgDim = blendWithBlack(color, 0.22);

    let total = 0;
    const rowValues: (string | number)[] = [habit.name];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${currentMonth}-${String(d).padStart(2, "0")}`;
      const done = !!completions[`${habit.id}-${dayStr}`];
      rowValues.push(done ? "\u2713" : "");
      if (done) total++;
    }
    rowValues.push(total);

    const row = ws.addRow(rowValues);
    row.height = 20;

    row.eachCell((cell, colNum) => {
      const isHabitCol = colNum === 1;
      const isTotalCol = colNum === TOTAL_COLS;
      const dayNum = colNum - 1;
      const isChecked = !isHabitCol && !isTotalCol && cell.value === "\u2713";

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: isHabitCol
            ? bgFull
            : isChecked
              ? bgDim
              : BG_CELL,
        },
      };
      cell.font = {
        bold: isHabitCol || isTotalCol,
        size: isHabitCol ? 10 : isChecked ? 10 : 9,
        color: {
          argb: isHabitCol
            ? FG_WHITE
            : isChecked
              ? toArgb(color)
              : isTotalCol
                ? FG_WHITE
                : "FF333333",
        },
        name: "Calibri",
      };
      cell.alignment = {
        horizontal: isHabitCol ? "left" : "center",
        vertical: "middle",
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF0D0D0D" } },
        right:
          isHabitCol
            ? { style: "thin", color: { argb: "FF1E1E1E" } }
            : undefined,
      };
      if (dayNum === todayDay && !isHabitCol && !isTotalCol) {
        cell.border = {
          ...cell.border,
          top: { style: "thin", color: { argb: toArgb(color) } },
          bottom: { style: "thin", color: { argb: toArgb(color) } },
        };
      }
    });
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  ws.getColumn(1).width = 22;
  for (let c = 2; c <= daysInMonth + 1; c++) {
    ws.getColumn(c).width = 3.6;
  }
  ws.getColumn(TOTAL_COLS).width = 7;

  // ── Write & download ──────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `habits-${currentMonth}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
