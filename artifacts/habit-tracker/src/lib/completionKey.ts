/**
 * Completion records are keyed `${habitId}-${date}` where date is a fixed
 * 10-char `YYYY-MM-DD` string. Habit ids are UUIDs (which contain dashes), so
 * the date is always the last 10 characters and the separator is the 11th from
 * the end.
 */
export function completionKey(habitId: string, date: string): string {
  return `${habitId}-${date}`;
}

export function parseCompletionKey(key: string): {
  habitId: string;
  date: string;
} {
  const date = key.slice(-10);
  const habitId = key.slice(0, -11);
  return { habitId, date };
}
