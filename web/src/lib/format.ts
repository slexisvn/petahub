const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;
const BYTE_STEP = 1024;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["year", 365 * DAY],
  ["month", 30 * DAY],
  ["week", 7 * DAY],
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
  ["second", SECOND]
];

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const absoluteFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });
const exactFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" });
const countFormat = new Intl.NumberFormat(undefined, { notation: "compact" });
const plainFormat = new Intl.NumberFormat();

export function formatBytes(count: number): string {
  let value = count;
  let unit = 0;
  while (value >= BYTE_STEP && unit < BYTE_UNITS.length - 1) {
    value /= BYTE_STEP;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${BYTE_UNITS[unit]}`;
}

export function formatCount(count: number): string {
  return countFormat.format(count);
}

export function formatExactCount(count: number): string {
  return plainFormat.format(count);
}

export function formatDate(iso: string): string {
  return absoluteFormat.format(new Date(iso));
}

export function formatExactDate(iso: string): string {
  return exactFormat.format(new Date(iso));
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  const elapsed = new Date(iso).getTime() - now;
  const magnitude = Math.abs(elapsed);
  for (const [unit, span] of RELATIVE_UNITS) {
    if (magnitude >= span) {
      return relativeFormat.format(Math.round(elapsed / span), unit);
    }
  }
  return relativeFormat.format(0, "second");
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
