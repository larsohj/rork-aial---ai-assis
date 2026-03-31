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
