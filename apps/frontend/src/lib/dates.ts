export function formatWarsawDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function toMs(date: Date): number {
  return date.getTime();
}

export function fromMs(ms: number): Date {
  return new Date(ms);
}
