// Working-day helpers — Mon–Fri only. UK bank holidays out of scope for v1.
// Used by the onboarding dashboard's overdue indicators and by the
// reminders edge function to determine deadline timestamps.

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Returns a new Date `days` working days after `start`. Mon–Fri only.
 * `days` of 0 returns the start date unchanged. Negative values throw.
 */
export function addWorkingDays(start: Date, days: number): Date {
  if (days < 0) throw new Error("addWorkingDays: days must be non-negative");
  const result = new Date(start.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

/**
 * True when `now` is strictly after the deadline of `start + days` working days.
 */
export function isOverdueWorkingDays(start: Date, days: number, now: Date = new Date()): boolean {
  const deadline = addWorkingDays(start, days);
  return now.getTime() > deadline.getTime();
}
