export const TIMEZONE = 'Asia/Hong_Kong';

export function getCurrentHKTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
}

export function formatHKTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

export function toHKTimestamp(date: Date): string {
  return date.toLocaleString('sv-SE', { timeZone: TIMEZONE });
}