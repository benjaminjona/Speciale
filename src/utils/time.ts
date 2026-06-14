export const epochToWaybackNumber = (epochMs: number): number => {
  const date = new Date(epochMs);
  const YYYY = date.getUTCFullYear().toString();
  const MM = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const DD = date.getUTCDate().toString().padStart(2, '0');
  const HH = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  return Number(`${YYYY}${MM}${DD}${HH}${mm}${ss}`);
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const fmtWayback = (ts: number): string => {
  const s = ts.toString();
  if (s.length !== 14) return s;
  const d = new Date(Date.UTC(
    +s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8),
    +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14)
  ));
  return d.toLocaleString();
};

export const waybackToMs = (ts: number): number => {
  const s = ts.toString().padStart(14, "0");
  return Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8),
    +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14));
};

export const msToDateInput = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
};

export const msToWayback = (ms: number, endOfDay = false): number => {
  const d = new Date(ms);
  const pad = (n: number, l = 2) => n.toString().padStart(l, "0");
  return parseInt(`${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${endOfDay ? "235959" : "000000"}`);
};

export const dateInputToMs = (str: string): number => {
  const [y, m, dy] = str.split("-").map(Number);
  return Date.UTC(y, m - 1, dy);
};

export const getTimeJumpToastDescription = (pageCrawlTime: number, baseCrawlTime: number | null): string => {
  if (!baseCrawlTime) return "No comparison date available";
  const d1 = new Date(pageCrawlTime < 10000000000 ? pageCrawlTime * 1000 : pageCrawlTime);
  const d2 = new Date(baseCrawlTime < 10000000000 ? baseCrawlTime * 1000 : baseCrawlTime);

  const [start, end] = d1 < d2 ? [d1, d2] : [d2, d1];

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    const lastDayOfPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += lastDayOfPrevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const plural = (num: number, label: string) => `${num} ${label}${num === 1 ? "" : "s"}`;
  return [
    years > 0 && plural(years, "year"),
    months > 0 && plural(months, "month"),
    days > 0 && plural(days, "day")
  ]
    .filter(Boolean)
    .join(", ");
};
