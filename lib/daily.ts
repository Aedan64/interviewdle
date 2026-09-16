const DAY_MS = 86_400_000;
const START_DAY = Date.UTC(2026, 8, 1);

/** Calendar dates, not elapsed 24-hour periods, keep DST from skipping days. */
export function getEasternDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map((name) => parts.find((part) => part.type === name)!.value).join("-");
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function questionNumberFromDate(date: string) {
  if (!isCalendarDate(date)) throw new Error("Invalid daily question date");
  return Math.max(1, Math.floor((Date.parse(`${date}T00:00:00Z`) - START_DAY) / DAY_MS) + 1);
}

export function streakFrom(dates: string[], today = getEasternDate()) {
  const completed = new Set(dates);
  const cursor = new Date(`${today}T00:00:00Z`);
  // Yesterday's streak remains active until today's opportunity has passed.
  if (!completed.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let total = 0;
  while (completed.has(cursor.toISOString().slice(0, 10))) {
    total++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return total;
}
