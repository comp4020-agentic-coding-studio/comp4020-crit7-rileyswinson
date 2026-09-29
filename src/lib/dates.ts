// Due dates are stored as Canberra wall-clock strings ("YYYY-MM-DDTHH:mm",
// exactly what <input type="datetime-local"> produces), so they compare as
// plain strings and never shift with the server's timezone. This module is
// pure: the pages import it on the server and in client scripts alike.

export const TIMEZONE = "Australia/Canberra";

export function nowLocal(date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// ANU procedure counts extensions in working days (ANUP_004604 cl. 12), so
// weekends are skipped. Public holidays are not modelled.
export function addWorkingDays(dueAt: string, days: number): string {
  const [datePart, timePart = "23:59"] = dueAt.split("T");
  const d = new Date(`${datePart}T00:00:00Z`);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return `${d.toISOString().slice(0, 10)}T${timePart}`;
}

export function isPast(dueAt: string, now = nowLocal()): boolean {
  return now > dueAt;
}

export function formatDue(dueAt: string): string {
  const [datePart, timePart = "00:00"] = dueAt.split("T");
  const d = new Date(`${datePart}T${timePart}:00Z`);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
