export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function isToday(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return dateStr === todayIsoDate();
}

export function isPastDate(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return dateStr < todayIsoDate();
}

export function isDueSoon(dateStr: string | null | undefined, withinDays = 7) {
  if (!dateStr) return false;
  const due = new Date(`${dateStr}T00:00:00`);
  const today = new Date(`${todayIsoDate()}T00:00:00`);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= withinDays;
}

export function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function padDay(day: number) {
  return String(day).padStart(2, "0");
}
