const MONTHS_NO: string[] = [
  "jan", "feb", "mar", "apr", "mai", "jun",
  "jul", "aug", "sep", "okt", "nov", "des",
];

const DAYS_NO: string[] = [
  "søndag", "mandag", "tirsdag", "onsdag",
  "torsdag", "fredag", "lørdag",
];

export function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "Dato ikke oppgitt";
  try {
    const d = new Date(dateStr);
    const day = DAYS_NO[d.getDay()];
    const date = d.getDate();
    const month = MONTHS_NO[d.getMonth()];
    return `${day} ${date}. ${month}`;
  } catch {
    return "Dato ikke oppgitt";
  }
}

function hasNoRealTime(dateStr: string): boolean {
  if (dateStr.includes("T00:00:00")) return true;
  const d = new Date(dateStr);
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
}

export function formatEventTime(
  startStr: string | null,
  endStr: string | null
): string | null {
  if (!startStr) return null;
  try {
    if (hasNoRealTime(startStr)) return null;

    const start = new Date(startStr);
    const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;

    if (endStr && !hasNoRealTime(endStr)) {
      const end = new Date(endStr);
      const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
      return `${startTime} – ${endTime}`;
    }

    return startTime;
  } catch {
    return null;
  }
}

export function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return "Dato ikke oppgitt";
  try {
    const d = new Date(dateStr);
    const day = DAYS_NO[d.getDay()];
    const date = d.getDate();
    const month = MONTHS_NO[d.getMonth()];
    const year = d.getFullYear();
    return `${day.charAt(0).toUpperCase() + day.slice(1)} ${date}. ${month} ${year}`;
  } catch {
    return "Dato ikke oppgitt";
  }
}

export function getRelativeDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "I dag";
    if (diffDays === 1) return "I morgen";
    if (diffDays < 7) return DAYS_NO[d.getDay()].charAt(0).toUpperCase() + DAYS_NO[d.getDay()].slice(1);
    return null;
  } catch {
    return null;
  }
}

export interface DateSection {
  title: string;
  data: import("@/types/event").EventData[];
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0;
}

export function groupEventsByDate(events: import("@/types/event").EventData[]): DateSection[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const currentDay = today.getDay();
  let daysUntilFriday = 5 - currentDay;
  if (daysUntilFriday < 0) daysUntilFriday += 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
  const nextSunday = new Date(nextFriday);
  nextSunday.setDate(nextSunday.getDate() + 2);
  nextSunday.setHours(23, 59, 59, 999);

  const isCurrentlyWeekend = isWeekend(today);

  const buckets = new Map<string, { title: string; events: import("@/types/event").EventData[]; sortKey: number }>();

  const sorted = [...events].sort((a, b) => {
    const dA = a.start_at ? new Date(a.start_at).getTime() : 0;
    const dB = b.start_at ? new Date(b.start_at).getTime() : 0;
    return dA - dB;
  });

  for (const event of sorted) {
    if (!event.start_at) {
      const key = "__unknown";
      if (!buckets.has(key)) buckets.set(key, { title: "Dato ikke oppgitt", events: [], sortKey: 999999 });
      buckets.get(key)!.events.push(event);
      continue;
    }

    const eventDate = new Date(event.start_at);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const diffDays = Math.floor((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const key = "__today";
      if (!buckets.has(key)) buckets.set(key, { title: "I dag", events: [], sortKey: 0 });
      buckets.get(key)!.events.push(event);
    } else if (diffDays === 1) {
      const key = "__tomorrow";
      if (!buckets.has(key)) buckets.set(key, { title: "I morgen", events: [], sortKey: 1 });
      buckets.get(key)!.events.push(event);
    } else if (!isCurrentlyWeekend && diffDays >= 2 && eventDay.getTime() <= nextSunday.getTime() && isWeekend(eventDay)) {
      const key = "__weekend";
      if (!buckets.has(key)) buckets.set(key, { title: "Denne helgen", events: [], sortKey: 2 });
      buckets.get(key)!.events.push(event);
    } else if (diffDays < 7) {
      const key = "__thisweek";
      if (!buckets.has(key)) buckets.set(key, { title: "Denne uken", events: [], sortKey: 3 });
      buckets.get(key)!.events.push(event);
    } else if (diffDays < 14) {
      const key = "__nextweek";
      if (!buckets.has(key)) buckets.set(key, { title: "Neste uke", events: [], sortKey: 4 });
      buckets.get(key)!.events.push(event);
    } else {
      const weekNum = getWeekNumber(eventDate);
      const monthName = MONTHS_NO[eventDate.getMonth()];
      const key = `__week_${eventDate.getFullYear()}_${weekNum}`;
      const title = `Uke ${weekNum} · ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
      if (!buckets.has(key)) buckets.set(key, { title, events: [], sortKey: 100 + diffDays });
      buckets.get(key)!.events.push(event);
    }
  }

  const sections = [...buckets.values()]
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ title, events: sectionEvents }) => ({ title, data: sectionEvents }));

  return sections;
}
