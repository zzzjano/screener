export function formatWarsawDate(date: Date | string | number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

export function toMs(date: Date): number {
  return date.getTime();
}

export function fromMs(ms: number): Date {
  return new Date(ms);
}
